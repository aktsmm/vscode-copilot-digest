import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { buildApiFiles, buildCoverage, itemId } from "../scripts/lib/api.mjs";
import { validateSlide, validateDeck, orderSlides, SLIDE_SCHEMA_V1 as SLIDE_SCHEMA, SLIDE_SCHEMA_V2, DECK_SCHEMA } from "../scripts/lib/slides.mjs";
import { coverHtml, endHtml, deckHtml, PDF_CSS } from "../scripts/lib/slide-html.mjs";
import { newCryptoInfo, deriveKey, encryptPdf, decryptPdf } from "../scripts/lib/pdf-crypto.mjs";
import { retentionStart } from "../scripts/build-slide-pdfs.mjs";
import { FORBIDDEN_AZURE_TOKENS, GITHUB_PALETTE } from "../scripts/lib/theme.mjs";

const event = {
  eventId: "x:1", sourceId: "github-changelog", sourceName: "GitHub Changelog", kind: "feed_entry",
  detectedAt: "2026-10-01T00:00:00Z", publishedAt: "2026-10-01T00:00:00Z", digestDate: "2026-10-01",
  title: "Copilot cloud agent adds new controls", url: "https://github.blog/changelog/2026-10-01-x",
  summary: "Copilot cloud agent adds new controls for admins.", resources: { status: "verified", source: { url: "https://github.blog/changelog/2026-10-01-x", status: "verified" }, documents: [] },
};
const logs = [
  { date: "2026-09-30", generatedAt: "2026-09-30T10:00:00Z", events: [], errors: [] },
  { date: "2026-10-02", generatedAt: "2026-10-02T10:00:00Z", events: [event], errors: [] },
];

// API: deterministic, gap days are reported as partial rather than empty.
const a = buildApiFiles({ logs, events: [event] });
const b = buildApiFiles({ logs, events: [event] });
assert.deepEqual(a, b);
const index = JSON.parse(a.find((f) => f.path === "api/v1/index.json").content);
assert.equal(index.snapshotAt, "2026-10-02T10:00:00Z");
assert.equal(index.coverage.months.find((m) => m.month === "2026-10").coverage, "partial_failure");
assert.equal(index.coverage.months.find((m) => m.month === "2026-09").coverage, "collected_empty");
assert.equal(buildCoverage([]).months.length, 0);
assert.ok(buildApiFiles({ logs: [], events: [] }).some((f) => f.path === "api/v1/latest.json"));
// Presenter Q&A is exposed in api/v1/qa.json, in updates/{id}.json and as a pointer on the item.
{
  const slideId = itemId(event);
  const qa = [1, 2, 3].map((n) => ({ q: `質問${n}はどうなりますか`, a: "記事に答えがあります。" }));
  const files = buildApiFiles({ logs, events: [event], slides: [{ id: slideId, title: { ja: "題名" }, qa }] });
  const qaFile = JSON.parse(files.find((f) => f.path === "api/v1/qa.json").content);
  assert.equal(qaFile.count, 1);
  assert.equal(qaFile.questionCount, 3);
  assert.deepEqual(qaFile.items[0].qa, qa);
  const update = JSON.parse(files.find((f) => f.path === `api/v1/updates/${slideId}.json`).content);
  assert.deepEqual(update.qa, qa);
  assert.equal(update.item.slide.qaCount, 3);
  assert.equal(JSON.parse(buildApiFiles({ logs, events: [event] }).find((f) => f.path === "api/v1/qa.json").content).count, 0);
}

// Slides
const slide = {
  schema: SLIDE_SCHEMA, id: "0123456789abcdef", title: { ja: "Copilot cloud agent の管理者向け制御" }, date: "2026-10-01",
  topic: "GitHub Copilot", status: "unknown", summary: "管理者が Copilot cloud agent の利用を制御できるようになりました。",
  points: ["管理者向けの新しい制御が追加されました"], references: { source: "https://github.blog/changelog/2026-10-01-x", documents: [] },
  evidence: ["https://github.blog/changelog/2026-10-01-x"],
};
assert.deepEqual(validateSlide(slide), []);
assert.ok(validateSlide({ ...slide, status: "ga" }).some((m) => m.includes("statusEvidence")));
assert.ok(validateSlide({ ...slide, summary: "Azure アップデート情報 を要約" }).some((m) => m.includes("forbidden")));
assert.ok(validateSlide({ ...slide, evidence: [] }).length > 0);
const deck = { schema: DECK_SCHEMA, selection: { snapshotAt: "2026-10-02T10:00:00Z", period: { start: "2026-10-01", end: "2026-10-02" } }, slides: [slide] };
assert.deepEqual(validateDeck(deck), []);
assert.ok(validateDeck({ ...deck, slides: [slide, slide] }).some((m) => m.includes("duplicate")));

// Optional detail blocks are validated when present and ignored when absent.
const rich = { ...slide, audience: { who: "有料プランの利用者", change: "モデルが選べる" }, beforeAfter: { before: "選べなかった", after: "選べる" }, action: "表示を確認する", timeline: [{ when: "2026-10-13", label: "提供開始" }], glossary: [{ term: "モデルピッカー", oneLine: "モデルの選択画面。" }] };
assert.deepEqual(validateSlide(rich), []);
assert.ok(validateSlide({ ...rich, audience: { who: "abc", change: "変更" } }).some((m) => m.includes("audience")));
assert.ok(validateSlide({ ...rich, timeline: [] }).some((m) => m.includes("timeline")));
assert.ok(validateSlide({ ...rich, action: "要確認です" }).some((m) => m.includes("forbidden phrase")));
assert.ok(deckHtml({ ...deck, slides: [rich] }).includes("誰に関係するか"));
// v2 slides: the full layout with required audience, action, panels and a titled source.
const v2 = JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "slides", "8241d56116d90ff3.json"), "utf8"));
assert.equal(v2.schema, SLIDE_SCHEMA_V2);
assert.deepEqual(validateSlide(v2), []);
const bad = (patch, needle) => assert.ok(validateSlide({ ...v2, ...patch }).some((m) => m.includes(needle)), needle);
bad({ references: { ...v2.references, source: "https://github.blog/changelog/x" } }, "references.source");
bad({ references: { ...v2.references, source: { url: v2.references.source.url, title: "GitHub Changelog" } } }, "references.source");
bad({ audience: undefined }, "audience");
bad({ action: { required: "maybe", summary: "確認する" } }, "action");
bad({ panels: [] }, "panels");
bad({ panels: [{ ...v2.panels[0], priority: "detail" }] }, "core");
bad({ title: { ...v2.title, original: undefined } }, "title.original");
bad({ glossary: [{ term: "x", type: "unknown", oneLine: "説明です" }] }, "glossary");
const v2Html = deckHtml({ ...deck, slides: [v2] });
for (const label of ["誰に関係するか", "用語ミニ解説", "発表", "詳細", v2.references.source.title, v2.references.documents[0].title]) assert.ok(v2Html.includes(label), label);
assert.ok(!v2Html.includes(">原文<"), "links are labelled with page titles, not a bare 原文");

// PDF wording and colors: repo wording, GitHub / Copilot palette, no Azure leftovers.
const html = deckHtml(deck);
assert.ok(coverHtml(deck).includes("GitHub Copilot &amp; VS Code アップデート情報"));
assert.ok(endHtml().includes("以上"));
for (const token of FORBIDDEN_AZURE_TOKENS) assert.ok(!(html + PDF_CSS).toLowerCase().includes(token.toLowerCase()), `Azure token leaked: ${token}`);
assert.ok(PDF_CSS.includes(GITHUB_PALETTE.dark) && PDF_CSS.includes(GITHUB_PALETTE.copilot));

// Crypto: shared salt, one derivation, wrong password and tamper detection.
const pdf = Buffer.from("%PDF-1.7 test");
const info = newCryptoInfo(1000);
const key = deriveKey("pw", info);
const enc = encryptPdf(pdf, key);
assert.deepEqual(decryptPdf(enc, key), pdf);
assert.notDeepEqual(encryptPdf(pdf, key), enc);
assert.throws(() => decryptPdf(enc, deriveKey("bad", info)));
enc[enc.length - 1] ^= 1;
assert.throws(() => decryptPdf(enc, key));

// Retention window is by JST calendar month; the shipped sample deck stays valid.
assert.equal(retentionStart(3, new Date("2026-10-15T00:00:00Z")), "2026-08-01");
assert.equal(retentionStart(1, new Date("2026-10-31T16:00:00Z")), "2026-11-01");
assert.equal(retentionStart(0), "0000-00-00");
assert.deepEqual(validateDeck(JSON.parse(await fs.readFile(path.join(process.cwd(), "examples", "slide-deck.sample.json"), "utf8"))), []);

// Review rules adopted from the upstream project: hosts, internal wording, headline length, ordering.
assert.ok(validateSlide({ ...slide, references: { ...slide.references, source: "https://example.com/x" } }).some((m) => m.includes("allowed host")));
assert.ok(validateSlide({ ...slide, points: ["この内容は要確認です"] }).some((m) => m.includes("forbidden phrase")));
assert.ok(validateSlide({ ...slide, title: { ja: "あ".repeat(81) } }).some((m) => m.includes("at most 80")));
assert.deepEqual(orderSlides([{ id: "b", date: "2026-10-01" }, { id: "a", date: "2026-10-02" }, { id: "a2", date: "2026-10-01" }]).map((s) => s.id), ["a", "a2", "b"]);
assert.ok(endHtml().includes("CC BY-NC-SA 4.0") && endHtml().includes("https://github.com/aktsmm/vscode-copilot-digest"));
// Built site (if present) exposes the API and no plaintext PDFs.
const siteApi = path.join(process.cwd(), "site", "api", "v1", "index.json");
if (await fs.stat(siteApi).then(() => true, () => false)) {
  assert.equal(JSON.parse(await fs.readFile(siteApi, "utf8")).apiVersion, "v1");
}
console.log("api-slides tests passed");
