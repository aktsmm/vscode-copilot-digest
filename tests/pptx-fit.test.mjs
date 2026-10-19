// Builds the PowerPoint for every real slide in a browser and fails when any text box would overflow into the next one
// (the builder records those in window.__pptxOverflow). Pass slide ids as the first argument (comma separated) to check only those.
// Skips (exit 0) when no Chromium-compatible browser is available.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { downloadPanelHtml, downloadsCss, downloadsJs } from "../scripts/lib/downloads.mjs";

let chromium;
try { ({ chromium } = await import("playwright")); } catch { console.log("pptx-fit: playwright missing; skipped"); process.exit(0); }
let browser;
for (const options of [{}, { channel: "msedge" }, { channel: "chrome" }]) {
  try { browser = await chromium.launch(options); break; } catch { /* try next */ }
}
if (!browser) { console.log("pptx-fit: no browser available; skipped"); process.exit(0); }

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pptx-fit-"));
const siteDir = path.join(tmp, "site");
await fs.mkdir(path.join(siteDir, "slides"), { recursive: true });
await fs.mkdir(path.join(siteDir, "data"), { recursive: true });
await fs.mkdir(path.join(siteDir, "assets", "vendor"), { recursive: true });

const onlyIds = process.argv[2] ? process.argv[2].split(",") : null;
const slides = [];
for (const name of (await fs.readdir("data/slides")).filter((n) => n.endsWith(".json") && (!onlyIds || onlyIds.includes(n.replace(/\.json$/, ""))))) {
  const slide = JSON.parse(await fs.readFile(path.join("data/slides", name), "utf8"));
  slides.push(slide);
  await fs.writeFile(path.join(siteDir, "slides", name), JSON.stringify(slide));
}
await fs.writeFile(path.join(siteDir, "data", "slides.json"), JSON.stringify({
  schema: "vscode-copilot-digest/slides-manifest/v1", retentionSince: "2000-01-01", pdfCrypto: { unused: true }, sample: null,
  slides: slides.map((s) => ({ id: s.id, date: s.date, topic: s.topic, status: s.status, title: s.title.ja, source: s.references.source, pdf: `pdf/${s.id}.pdf`, encrypted: false })),
}));
await fs.writeFile(path.join(siteDir, "assets", "downloads.js"), downloadsJs());
for (const [from, to] of [["pdf-lib/dist/pdf-lib.min.js", "pdf-lib.min.js"], ["pptxgenjs/dist/pptxgen.bundle.js", "pptxgen.bundle.js"]]) {
  await fs.copyFile(path.join("node_modules", ...from.split("/")), path.join(siteDir, "assets", "vendor", to));
}
await fs.writeFile(path.join(siteDir, "index.html"), `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${downloadsCss()}</style></head><body>${downloadPanelHtml("ja")}<script src="./assets/downloads.js?v=1" defer></script></body></html>`);

// One run per group of dates, so that no run holds more slides than the panel merges at once.
const byDate = new Map();
for (const s of slides) byDate.set(s.date, (byDate.get(s.date) ?? 0) + 1);
const groups = [];
let current = { from: null, to: null, count: 0 };
for (const date of [...byDate.keys()].sort()) {
  const n = byDate.get(date);
  assert.ok(n <= 90, `${date} has ${n} slides; the test cannot split a single day`);
  if (current.count + n > 90) { groups.push(current); current = { from: null, to: null, count: 0 }; }
  current.from ??= date; current.to = date; current.count += n;
}
if (current.count) groups.push(current);

assert.ok(slides.length > 0, "no slides to check");
const mime = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  try { res.setHeader("content-type", mime[path.extname(p)] ?? "application/octet-stream"); res.end(await fs.readFile(path.join(siteDir, p))); } catch { res.statusCode = 404; res.end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const problems = [];
const scales = [];
let saved = false;
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept(""));
  await page.goto(base);
  await page.waitForSelector("[data-dl-panel]:not([hidden])");
  for (const group of groups) {
    await page.evaluate(({ from, to }) => {
      for (const [selector, value] of [["[data-dl-from]", from], ["[data-dl-to]", to]]) {
        const input = document.querySelector(selector);
        input.value = value;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, group);
    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 240000 }), page.click('[data-dl="pptx"]')]);
    if (process.env.PPTX_OUT && !saved) { await download.saveAs(process.env.PPTX_OUT); saved = true; } else await download.path();
    problems.push(...await page.evaluate(() => window.__pptxOverflow ?? null));
    scales.push(...await page.evaluate(() => window.__pptxScales ?? []));
  }
} finally {
  await browser.close();
  server.close();
  await fs.rm(tmp, { recursive: true, force: true });
}

assert.ok(!problems.includes(null), "the builder did not report its overflow list");
assert.equal(problems.length, 0, `text does not fit its box in the PowerPoint: ${problems.slice(0, 8).map((p) => `${p.id} (${p.what})`).join(", ")}${problems.length > 8 ? `, and ${problems.length - 8} more` : ""}`);
const shrunk = scales.filter((k) => k < 1).length;
console.log(`pptx-fit tests passed (${slides.length} slides; ${shrunk} of ${scales.length} text boxes needed a smaller font, smallest scale ${Math.min(...scales)})`);
