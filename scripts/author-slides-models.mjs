// Authors slide JSON with GitHub Models when the Copilot agent lane is unavailable (for example
// when its token has expired). It runs inside Actions with the built-in GITHUB_TOKEN, so it has
// no personal token to expire. Output is validated with the same rules as every other slide.
//
// Usage: node scripts/author-slides-models.mjs [--limit 3] [--skip id,id] [--ids id,id]
// Needs: site/api/v1/months (run `npm run build:pages` first) and env GITHUB_TOKEN.
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { selectPending } from "./pending-slides.mjs";
import { SLIDE_SCHEMA_V2, validateSlide } from "./lib/slides.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const ENDPOINT = process.env.MODELS_ENDPOINT ?? "https://models.github.ai/inference/chat/completions";
const MODEL = process.env.MODELS_MODEL ?? "openai/gpt-4.1";
const MAX_ARTICLE_CHARS = 14000;
const MAX_DOC_CHARS = 6000;

export function pageText(html, limit) {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, form, svg, noscript").remove();
  const main = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const lines = main.text().split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  return lines.join("\n").slice(0, limit);
}

export function pageTitle(html) {
  const $ = cheerio.load(html);
  return ($('meta[property="og:title"]').attr("content") || $("title").text() || "").replace(/\s+/g, " ").trim();
}

async function fetchPage(url) {
  const response = await fetch(url, { headers: { "user-agent": "vscode-copilot-digest-slides/1.0" }, redirect: "follow" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

export function buildMessages({ item, article, articleTitle, docs, schemaDoc, example }) {
  const system = [
    "あなたは GitHub Copilot と VS Code の更新を、日本語の 1 枚スライド JSON にまとめる編集者です。",
    "出力は JSON オブジェクト 1 つだけです（前後の文章や Markdown は不要）。",
    "与えられた記事と資料に書かれていることだけを使い、数値・製品名・プラン名・日付を補わないでください。確認できない項目は省略します。",
    `schema は必ず "${SLIDE_SCHEMA_V2}" にしてください。`,
    "",
    "## 規則とフィールド（docs/slide-schema.md）",
    schemaDoc,
    "",
    "## 出力の手本（JSON）",
    JSON.stringify(example),
  ].join("\n");
  const user = [
    `更新 ID: ${item.id}`,
    `掲載日: ${item.digestDate}`,
    `トピック: ${item.topic}`,
    `記事 URL: ${item.source}`,
    `記事ページのタイトル: ${articleTitle}`,
    "",
    "## 記事の本文",
    article,
    ...docs.flatMap((d) => ["", `## 資料: ${d.title}（${d.url}）`, d.text]),
    "",
    "上の記事から、手本と同じ形の JSON を 1 つ作ってください。",
    `references.source は { "title": "${articleTitle}", "url": "${item.source}" } にします。`,
    `references.documents は、上の資料のタイトルと URL をそのまま使ってください（${docs.length} 件）。`,
    "evidence には、記事 URL と実際に使った資料の URL を入れてください。",
  ].join("\n");
  return [{ role: "system", content: system }, { role: "user", content: user }];
}

async function callModel(messages, token) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, response_format: { type: "json_object" } }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    const error = new Error(`models API returned ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Fields the pipeline already knows are set here, so the model cannot change them.
export function finalize(slide, item, articleTitle) {
  return {
    ...slide,
    schema: SLIDE_SCHEMA_V2,
    id: item.id,
    date: item.digestDate,
    topic: item.topic,
    references: { ...slide.references, source: { title: articleTitle, url: item.source } },
  };
}

export async function authorOne(item, ctx, token) {
  const html = await fetchPage(item.source);
  const articleTitle = pageTitle(html);
  const article = pageText(html, MAX_ARTICLE_CHARS);
  if (article.length < 400) throw new Error("the article text is too short to summarise");
  const docs = [];
  for (const doc of (item.documents ?? []).slice(0, 2)) {
    try { docs.push({ title: doc.title, url: doc.url, text: pageText(await fetchPage(doc.url), MAX_DOC_CHARS) }); } catch { /* a missing document is not fatal */ }
  }
  const messages = buildMessages({ item, article, articleTitle, docs, ...ctx });
  let lastErrors = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const raw = await callModel(messages, token);
    let slide;
    try { slide = finalize(JSON.parse(raw), item, articleTitle); } catch { lastErrors = ["the reply was not valid JSON"]; }
    if (slide) {
      lastErrors = validateSlide(slide);
      if (lastErrors.length === 0) return slide;
    }
    messages.push({ role: "assistant", content: raw }, { role: "user", content: `次の検証エラーを直した JSON だけをもう一度返してください:\n- ${lastErrors.join("\n- ")}` });
  }
  throw new Error(`validation failed: ${lastErrors.slice(0, 3).join("; ")}`);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");
  const monthsDir = path.join(root, "site", "api", "v1", "months");
  const items = [];
  for (const file of (await fs.readdir(monthsDir)).filter((f) => f.endsWith(".json")).sort()) {
    items.push(...JSON.parse(await fs.readFile(path.join(monthsDir, file), "utf8")).items);
  }
  const slidesDir = path.join(root, "data", "slides");
  const existing = new Set((await fs.readdir(slidesDir).catch(() => [])).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));
  const ids = option("ids", "")?.split(",").filter(Boolean);
  const pending = selectPending(items, existing, {
    months: Number(option("months", 3)), limit: Number(option("limit", 3)),
    ids: ids?.length ? ids : null, skip: option("skip", "")?.split(",").filter(Boolean) ?? [],
  });
  if (pending.length === 0) { console.log("No updates need a slide."); return; }

  const schemaDoc = await fs.readFile(path.join(root, "docs", "slide-schema.md"), "utf8");
  const sample = JSON.parse(await fs.readFile(path.join(root, "examples", "slide-deck.sample.json"), "utf8"));
  const ctx = { schemaDoc, example: sample.slides[1] };
  await fs.mkdir(slidesDir, { recursive: true });
  let written = 0, authFailure = false;
  for (const item of pending) {
    try {
      const slide = await authorOne(item, ctx, token);
      await fs.writeFile(path.join(slidesDir, `${item.id}.json`), `${JSON.stringify(slide, null, 2)}\n`, "utf8");
      written += 1;
      console.log(`wrote ${item.id}`);
    } catch (error) {
      console.error(`::warning::skipped ${item.id}: ${error.message}`);
      if (error.status === 401 || error.status === 403) { authFailure = true; break; }
    }
  }
  console.log(`Authored ${written} of ${pending.length} slide(s).`);
  if (authFailure && written === 0) process.exit(2);
}

if (process.argv[1]?.endsWith("author-slides-models.mjs")) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
