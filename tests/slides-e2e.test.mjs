// End-to-end check of the slide PDF pipeline and the inline download panel.
// Needs a Chromium-compatible browser; skips (exit 0) when none can be launched.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { SLIDE_SCHEMA_V1 as SLIDE_SCHEMA, validateDeck } from "../scripts/lib/slides.mjs";
import { downloadPanelHtml, downloadsCss, downloadsJs } from "../scripts/lib/downloads.mjs";

let chromium;
try { ({ chromium } = await import("playwright")); } catch { console.log("slides-e2e: playwright missing; skipped"); process.exit(0); }
let browser;
for (const options of [{}, { channel: "msedge" }, { channel: "chrome" }]) {
  try { browser = await chromium.launch(options); break; } catch { /* try next */ }
}
if (!browser) { console.log("slides-e2e: no browser available; skipped"); process.exit(0); }

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "slides-e2e-"));
const slidesDir = path.join(tmp, "slides");
const siteDir = path.join(tmp, "site");
await fs.mkdir(slidesDir);
const today = new Date().toISOString().slice(0, 10);
const ids = ["0123456789abcdef", "fedcba9876543210", "aaaaaaaaaaaaaaaa"];
for (const [i, id] of ids.entries()) {
  await fs.writeFile(path.join(slidesDir, `${id}.json`), JSON.stringify({
    schema: SLIDE_SCHEMA, id, title: { ja: `テスト更新 ${i + 1}` }, date: today, topic: i === 2 ? "VS Code" : "GitHub Copilot", status: i === 0 ? "ga" : "unknown",
    ...(i === 0 ? { statusEvidence: "generally available" } : {}),
    summary: "テスト用の要約です。", points: ["テスト用の要点です"],
    references: { source: "https://github.blog/changelog/x", documents: [] }, evidence: ["https://github.blog/changelog/x"],
  }));
}
// An invalid slide must be skipped without blocking the others.
await fs.writeFile(path.join(slidesDir, "bbbbbbbbbbbbbbbb.json"), JSON.stringify({ schema: SLIDE_SCHEMA, id: "bbbbbbbbbbbbbbbb" }));
const run = (env) => execFileSync(process.execPath, ["scripts/build-slide-pdfs.mjs"], { env: { ...process.env, SLIDES_DIR: slidesDir, SITE_DIR: siteDir, ...env }, encoding: "utf8" });
const readManifest = async () => JSON.parse(await fs.readFile(path.join(siteDir, "data", "slides.json"), "utf8"));

// Without a password no PDF is published, but slide JSON still is.
run({ PDF_PASSWORD: "" });
let manifest = await readManifest();
assert.equal(manifest.pdfCrypto, null);
assert.equal(manifest.sample, null);
assert.equal(manifest.slides.length, 3);
assert.ok(manifest.slides.every((s) => s.pdf === null));
await assert.rejects(fs.stat(path.join(siteDir, "pdf")));
await fs.stat(path.join(siteDir, "slides", `${ids[0]}.json`));

const output = run({ PDF_PASSWORD: "e2e-password" });
assert.ok(output.includes("skipping bbbbbbbbbbbbbbbb.json"), "invalid slide is reported, not fatal");
manifest = await readManifest();
assert.ok(manifest.pdfCrypto?.salt && manifest.slides.every((s) => s.pdf));
const sample = manifest.slides[0];
assert.equal(manifest.sample, sample.pdf);
assert.equal(sample.encrypted, false, "the newest slide is a free sample");
assert.ok(manifest.slides.slice(1).every((s) => s.encrypted && s.pdf.endsWith(".pdf.enc")));
const samplePdf = await fs.readFile(path.join(siteDir, sample.pdf));
assert.equal(samplePdf.subarray(0, 5).toString(), "%PDF-");
assert.equal((await PDFDocument.load(samplePdf)).getPageCount(), 1);
assert.notEqual((await fs.readFile(path.join(siteDir, manifest.slides[1].pdf))).subarray(0, 5).toString(), "%PDF-");

// A stand-in page carrying the same panel and script the real pages use.
await fs.mkdir(path.join(siteDir, "assets", "vendor"), { recursive: true });
await fs.writeFile(path.join(siteDir, "assets", "downloads.js"), downloadsJs());
for (const [from, to] of [["pdf-lib/dist/pdf-lib.min.js", "pdf-lib.min.js"], ["pptxgenjs/dist/pptxgen.bundle.js", "pptxgen.bundle.js"]]) {
  await fs.copyFile(path.join("node_modules", ...from.split("/")), path.join(siteDir, "assets", "vendor", to));
}
await fs.writeFile(path.join(siteDir, "index.html"), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${downloadsCss()}</style></head><body>${downloadPanelHtml("ja")}<script src="./assets/downloads.js?v=1" defer></script></body></html>`);

const mime = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".pdf": "application/pdf" };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  try { res.setHeader("content-type", mime[path.extname(p)] ?? "application/octet-stream"); res.end(await fs.readFile(path.join(siteDir, p))); } catch { res.statusCode = 404; res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  let password = "wrong";
  const prompts = [];
  page.on("dialog", (dialog) => { prompts.push(dialog.message()); dialog.accept(password); });
  await page.goto(base);
  await page.waitForSelector("[data-dl-panel]:not([hidden])");
  const text = (sel) => page.textContent(sel);

  // Counts follow the filters.
  assert.equal(await text('[data-dl="json"]'), "JSON（3）");
  await page.check('[data-dl-topic][value="VS Code"]');
  assert.equal(await text('[data-dl="pdf"]'), "PDF（1）");
  await page.uncheck('[data-dl-topic][value="VS Code"]');
  await page.check('[data-dl-kind][value="ga"]');
  assert.equal(await text('[data-dl="json"]'), "JSON（1）");
  await page.click("[data-dl-reset]");
  assert.equal(await text('[data-dl="json"]'), "JSON（3）");
  assert.ok((await page.getAttribute("[data-dl-sample]", "href")).endsWith(sample.pdf));

  // Every slide starts selected; single slides can be dropped, and the files follow the pick.
  await page.click(".dl-items summary");
  assert.equal(await page.locator("[data-dl-item]").count(), 3);
  assert.equal(await page.locator("[data-dl-item]:checked").count(), 3);
  assert.match(await text("[data-dl-items-count]"), /3 \/ 3/);
  await page.uncheck("[data-dl-item] >> nth=0");
  assert.equal(await text(`[data-dl="json"]`), "JSON（2）");
  assert.equal(await text(`[data-dl="pdf"]`), "PDF（2）");
  const [pickedJson] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click(`[data-dl="json"]`)]);
  const pickedFile = path.join(tmp, "picked.json");
  await pickedJson.saveAs(pickedFile);
  assert.equal(JSON.parse(await fs.readFile(pickedFile, "utf8")).slides.length, 2);
  await page.click("[data-dl-none]");
  assert.equal(await page.isDisabled(`[data-dl="json"]`), true);
  await page.click("[data-dl-all]");
  assert.equal(await text(`[data-dl="json"]`), "JSON（3）");
  await page.uncheck("[data-dl-item] >> nth=0");
  await page.click("[data-dl-reset]");
  assert.equal(await text(`[data-dl="json"]`), "JSON（3）", "reset selects everything again");

  // JSON needs no password.
  const [jsonDownload] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click('[data-dl="json"]')]);
  const jsonFile = path.join(tmp, "deck.json");
  await jsonDownload.saveAs(jsonFile);
  assert.deepEqual(validateDeck(JSON.parse(await fs.readFile(jsonFile, "utf8"))), []);
  assert.equal(prompts.length, 0);

  // A wrong password is rejected; the right one merges.
  await page.click('[data-dl="pdf"]');
  await page.waitForFunction(() => document.querySelector("[data-dl-status]").textContent.includes("パスワードが違います"), null, { timeout: 120000 });
  password = "e2e-password";
  const [pdfDownload] = await Promise.all([page.waitForEvent("download", { timeout: 180000 }), page.click('[data-dl="pdf"]')]);
  const pdfFile = path.join(tmp, "merged.pdf");
  await pdfDownload.saveAs(pdfFile);
  assert.equal((await PDFDocument.load(await fs.readFile(pdfFile))).getPageCount(), 7, "cover + toc + summary + 3 slides + end");

  // PowerPoint is a zip with one slide per update plus cover, contents and end.
  const [pptxDownload] = await Promise.all([page.waitForEvent("download", { timeout: 180000 }), page.click('[data-dl="pptx"]')]);
  const pptxFile = path.join(tmp, "merged.pptx");
  await pptxDownload.saveAs(pptxFile);
  const pptx = await fs.readFile(pptxFile);
  assert.equal(pptx.subarray(0, 2).toString(), "PK");
  assert.ok((pptx.toString("latin1").match(/ppt\/slides\/slide\d+\.xml/g) ?? []).length >= 6);

  // A sample-only selection needs no password.
  prompts.length = 0;
  await page.check('[data-dl-kind][value="ga"]');
  const [sampleDownload] = await Promise.all([page.waitForEvent("download", { timeout: 120000 }), page.click('[data-dl="pdf"]')]);
  await sampleDownload.saveAs(path.join(tmp, "sample-merged.pdf"));
  assert.equal(prompts.length, 0, "no password prompt for the sample");
  console.log("slides-e2e passed");
} finally {
  server.close();
  await browser.close();
  await fs.rm(tmp, { recursive: true, force: true });
}
