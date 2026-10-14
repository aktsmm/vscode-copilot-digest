import { FORBIDDEN_AZURE_TOKENS } from "./theme.mjs";

export const SLIDE_SCHEMA = "vscode-copilot-digest/slide/v1";
export const DECK_SCHEMA = "vscode-copilot-digest/deck/v1";
export const SLIDE_STATUSES = ["ga", "preview", "retirement", "announcement", "update", "unknown"];
export const STATUS_LABELS = Object.freeze({ ga: "GA", preview: "Preview", retirement: "廃止", announcement: "アナウンス", update: "更新", unknown: "更新" });
export const TITLE_MAX = 80;

const TOPICS = ["GitHub Copilot", "VS Code", "GitHub Platform", "周辺ニュース"];
// Hosts the sources and the resource ledger actually use; evidence outside them needs a human.
export const ALLOWED_HOSTS = new Set(["github.blog", "github.com", "docs.github.com", "code.visualstudio.com", "www.publickey1.jp", "learn.microsoft.com"]);
// Internal-memo wording that must never reach a reader.
export const FORBIDDEN_PHRASES = ["未確認", "記載なし", "要確認", "推定", "未発表", "判定保留", "AI 生成", "AI生成", "データ時点", "初心者向け"];

const hasJapanese = (v) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(String(v ?? ""));
const allowedUrl = (v) => {
  if (typeof v !== "string") return false;
  try {
    const url = new URL(v);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

export function renderedTexts(slide) {
  return [
    slide.title?.ja, slide.summary, ...(slide.points ?? []), ...(slide.references?.documents ?? []).map((d) => d.title),
    slide.audience?.who, slide.audience?.change, slide.action, slide.beforeAfter?.before, slide.beforeAfter?.after,
    ...(slide.timeline ?? []).flatMap((t) => [t.when, t.label]), ...(slide.glossary ?? []).flatMap((g) => [g.term, g.oneLine]),
  ].filter(Boolean);
}

export function validateSlide(slide) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!slide || typeof slide !== "object") return ["slide must be an object"];
  if (slide.schema !== SLIDE_SCHEMA) err(`schema must be ${SLIDE_SCHEMA}`);
  if (!/^[0-9a-f]{16}$/.test(slide.id ?? "")) err("id must be a 16-char hex update id");
  if (!slide.title?.ja || !hasJapanese(slide.title.ja)) err("title.ja must be Japanese text");
  else if (slide.title.ja.length > TITLE_MAX) err(`title.ja must be at most ${TITLE_MAX} characters`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slide.date ?? "")) err("date must be YYYY-MM-DD");
  if (!TOPICS.includes(slide.topic)) err("topic is not a known topic");
  if (!SLIDE_STATUSES.includes(slide.status)) err("status is not allowed");
  if (!slide.summary || slide.summary.length > 220 || !hasJapanese(slide.summary)) err("summary must be Japanese, 1-220 chars");
  if (!Array.isArray(slide.points) || slide.points.length < 1 || slide.points.length > 5 || slide.points.some((p) => !p || p.length > 120)) err("points must be 1-5 items of up to 120 chars");
  if (!allowedUrl(slide.references?.source)) err("references.source must be an https URL on an allowed host");
  const docs = slide.references?.documents ?? [];
  if (!Array.isArray(docs) || docs.length > 3 || docs.some((d) => !allowedUrl(d.url) || !d.title)) err("references.documents must be up to 3 titled https URLs on allowed hosts");
  if (new Set(docs.map((d) => d.url)).size !== docs.length) err("references.documents has a duplicate URL");
  if (!Array.isArray(slide.evidence) || slide.evidence.length < 1 || !slide.evidence.every(allowedUrl)) err("evidence must list at least one https URL on an allowed host");
  // Optional detail blocks: every field is validated when present, and none is required.
  const short = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max && hasJapanese(v);
  if (slide.audience !== undefined && !(short(slide.audience?.who, 100) && short(slide.audience?.change, 100))) err("audience needs Japanese who and change of up to 100 chars");
  if (slide.action !== undefined && !short(slide.action, 120)) err("action must be Japanese, up to 120 chars");
  if (slide.beforeAfter !== undefined && !(short(slide.beforeAfter?.before, 100) && short(slide.beforeAfter?.after, 100))) err("beforeAfter needs Japanese before and after of up to 100 chars");
  if (slide.timeline !== undefined && (!Array.isArray(slide.timeline) || slide.timeline.length < 1 || slide.timeline.length > 4 || slide.timeline.some((x) => !x?.when || String(x.when).length > 20 || !short(x.label, 40)))) err("timeline must be 1-4 items with when (up to 20) and Japanese label (up to 40)");
  if (slide.glossary !== undefined && (!Array.isArray(slide.glossary) || slide.glossary.length < 1 || slide.glossary.length > 3 || slide.glossary.some((x) => !x?.term || String(x.term).length > 40 || !short(x.oneLine, 100)))) err("glossary must be 1-3 items with term (up to 40) and Japanese oneLine (up to 100)");
  const text = JSON.stringify(slide);
  for (const token of FORBIDDEN_AZURE_TOKENS) if (text.includes(token)) err(`forbidden token: ${token}`);
  for (const rendered of renderedTexts(slide)) {
    for (const phrase of FORBIDDEN_PHRASES) if (rendered.includes(phrase)) err(`forbidden phrase "${phrase}" in: ${rendered.slice(0, 40)}`);
  }
  if (slide.status !== "unknown" && slide.status !== "update" && !slide.statusEvidence) err("a lifecycle status requires statusEvidence quoted from the source");
  return errors;
}

export function validateDeck(deck) {
  const errors = [];
  if (deck?.schema !== DECK_SCHEMA) errors.push("deck schema mismatch");
  if (!Array.isArray(deck?.slides)) return [...errors, "slides must be an array"];
  const seen = new Set();
  deck.slides.forEach((slide, index) => {
    for (const message of validateSlide(slide)) errors.push(`slides[${index}]: ${message}`);
    if (seen.has(slide?.id)) errors.push(`slides[${index}]: duplicate id`);
    seen.add(slide?.id);
  });
  return errors;
}

// Newest first; the id breaks ties so ordering is stable.
export function orderSlides(slides) {
  return [...slides].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
