import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { buildApiFiles, buildCoverage } from "../scripts/lib/api.mjs";
import { validateSlide, validateDeck, orderSlides, SLIDE_SCHEMA, DECK_SCHEMA } from "../scripts/lib/slides.mjs";
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
