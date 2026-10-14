// End-to-end check: encrypted per-update PDFs are decrypted and merged in the browser.
// Needs a Chromium-compatible browser; skips (exit 0) when none can be launched.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { SLIDE_SCHEMA } from "../scripts/lib/slides.mjs";

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
const ids = ["0123456789abcdef", "fedcba9876543210"];
ids.forEach(async () => {});
for (const [i, id] of ids.entries()) {
  await fs.writeFile(path.join(slidesDir, `${id}.json`), JSON.stringify({
    schema: SLIDE_SCHEMA, id, title: { ja: `テスト更新 ${i + 1}` }, date: `2026-10-0${i + 1}`, topic: "GitHub Copilot", status: "unknown",
    summary: "テスト用の要約です。", points: ["テスト用の要点です"],
    references: { source: "https://github.blog/x", documents: [] }, evidence: ["https://github.blog/x"],
  }));
}
const run = (env) => execFileSync(process.execPath, ["scripts/build-slide-pdfs.mjs"], { env: { ...process.env, SLIDES_DIR: slidesDir, SITE_DIR: siteDir, ...env }, encoding: "utf8" });

// Without a password nothing is published.
run({ PDF_PASSWORD: "" });
let manifest = JSON.parse(await fs.readFile(path.join(siteDir, "data", "slides.json"), "utf8"));
assert.equal(manifest.pdfCrypto, null);
assert.ok(manifest.slides.every((s) => s.pdf === null));
await assert.rejects(fs.stat(path.join(siteDir, "pdf")));

run({ PDF_PASSWORD: "e2e-password" });
manifest = JSON.parse(await fs.readFile(path.join(siteDir, "data", "slides.json"), "utf8"));
assert.ok(manifest.pdfCrypto && manifest.slides.every((s) => s.pdf));
manifest.pdfCrypto.iterations = manifest.pdfCrypto.iterations; // published value is used by the browser

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
  await page.click("#pick");
  assert.equal(await page.textContent("#count"), "2");

  await page.fill("#pw", "wrong");
  await page.click("#go");
  await page.waitForFunction(() => document.getElementById("status").textContent.includes("復号に失敗"), null, { timeout: 120000 });

  await page.fill("#pw", "e2e-password");
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 180000 }), page.click("#go")]);
  const file = path.join(tmp, "merged.pdf");
  await download.saveAs(file);
  const merged = await PDFDocument.load(await fs.readFile(file));
  // cover + toc + 2 slides + end
  assert.equal(merged.getPageCount(), 5);
  console.log("slides-e2e passed");
} finally {
  server.close();
  await browser.close();
  await fs.rm(tmp, { recursive: true, force: true });
}
