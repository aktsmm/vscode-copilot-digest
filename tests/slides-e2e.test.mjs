// End-to-end check of the slide PDF pipeline and the browser merge UI.
// Needs a Chromium-compatible browser; skips (exit 0) when none can be launched.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { SLIDE_SCHEMA, validateDeck } from "../scripts/lib/slides.mjs";

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
    schema: SLIDE_SCHEMA, id, title: { ja: `テスト更新 ${i + 1}` }, date: today, topic: "GitHub Copilot", status: i === 0 ? "ga" : "unknown",
    ...(i === 0 ? { statusEvidence: "generally available" } : {}),
    summary: "テスト用の要約です。", points: ["テスト用の要点です"],
    references: { source: "https://github.blog/changelog/x", documents: [] }, evidence: ["https://github.blog/changelog/x"],
  }));
}
// An invalid slide must be skipped without blocking the others.
await fs.writeFile(path.join(slidesDir, "bbbbbbbbbbbbbbbb.json"), JSON.stringify({ schema: SLIDE_SCHEMA, id: "bbbbbbbbbbbbbbbb" }));
const run = (env) => execFileSync(process.execPath, ["scripts/build-slide-pdfs.mjs"], { env: { ...process.env, SLIDES_DIR: slidesDir, SITE_DIR: siteDir, ...env }, encoding: "utf8" });
const readManifest = async () => JSON.parse(await fs.readFile(path.join(siteDir, "data", "slides.json"), "utf8"));

// Without a password no PDF is published, but slide JSON and the UI still are.
run({ PDF_PASSWORD: "" });
let manifest = await readManifest();
assert.equal(manifest.pdfCrypto, null);
assert.equal(manifest.slides.length, 3);
assert.ok(manifest.slides.every((s) => s.pdf === null));
await assert.rejects(fs.stat(path.join(siteDir, "pdf")));
await fs.stat(path.join(siteDir, "slides", `${ids[0]}.json`));

const output = run({ PDF_PASSWORD: "e2e-password" });
assert.ok(output.includes("skipping bbbbbbbbbbbbbbbb.json"), "invalid slide is reported, not fatal");
manifest = await readManifest();
assert.ok(manifest.pdfCrypto?.salt && manifest.slides.every((s) => s.pdf));
const sample = manifest.slides[0];
assert.equal(sample.encrypted, false, "the newest slide is a free sample");
assert.ok(manifest.slides.slice(1).every((s) => s.encrypted && s.pdf.endsWith(".pdf.enc")));
const samplePdf = await fs.readFile(path.join(siteDir, sample.pdf));
assert.equal(samplePdf.subarray(0, 5).toString(), "%PDF-");
assert.equal((await PDFDocument.load(samplePdf)).getPageCount(), 1);
const encrypted = await fs.readFile(path.join(siteDir, manifest.slides[1].pdf));
assert.notEqual(encrypted.subarray(0, 5).toString(), "%PDF-");

const server = http.createServer(async (req, res) => {
  const file = path.join(siteDir, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\//, "") || "slides.html");
  try { res.end(await fs.readFile(file)); } catch { res.statusCode = 404; res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(`${base}slides.html`);
  await page.waitForSelector("#list input");

  // Kind filter narrows the list; the select-all button only takes visible rows.
  await page.selectOption("#kind", "ga");
  await page.click("#pick");
  assert.equal(await page.textContent("#count"), "1");
  await page.selectOption("#kind", "");
  await page.click("#pick");
  assert.equal(await page.textContent("#count"), "3");

  // JSON download works without any password.
  const [jsonDownload] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.click("#json")]);
  const jsonFile = path.join(tmp, "deck.json");
  await jsonDownload.saveAs(jsonFile);
  assert.deepEqual(validateDeck(JSON.parse(await fs.readFile(jsonFile, "utf8"))), []);

  await page.fill("#pw", "wrong");
  await page.click("#go");
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("復号に失敗"), null, { timeout: 120000 });

  await page.fill("#pw", "e2e-password");
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 180000 }), page.click("#go")]);
  const file = path.join(tmp, "merged.pdf");
  await download.saveAs(file);
  // cover + toc + summary + 3 slides + end
  assert.equal((await PDFDocument.load(await fs.readFile(file))).getPageCount(), 7);

  // A sample-only selection needs no password.
  await page.click("#clear");
  await page.fill("#pw", "");
  await page.check(`#list input[value="${sample.id}"]`);
  assert.equal(await page.isDisabled("#go"), false);
  console.log("slides-e2e passed");
} finally {
  server.close();
  await browser.close();
  await fs.rm(tmp, { recursive: true, force: true });
}
