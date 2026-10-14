// Renders slide JSON to plain (unencrypted) PDFs for local review.
// Usage: npm run pdf -- [--dir data/slides] [--ids a,b] [--out dist-pdf]
import fs from "node:fs/promises";
import path from "node:path";
import { launchBrowser } from "./build-slide-pdfs.mjs";
import { fitFontSize, slideDocHtml } from "./lib/slide-html.mjs";
import { validateSlide } from "./lib/slides.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const dir = path.resolve(option("dir", "data/slides"));
const out = path.resolve(option("out", "dist-pdf"));
const ids = option("ids", "")?.split(",").filter(Boolean);

const names = (await fs.readdir(dir)).filter((n) => n.endsWith(".json") && (!ids.length || ids.includes(n.replace(/\.json$/, "")))).sort();
if (names.length === 0) {
  console.error("No matching slide JSON found.");
  process.exit(1);
}
const browser = await launchBrowser();
if (!browser) {
  console.error("A Chromium-compatible browser is required (install Chrome/Edge or run `npx playwright install chromium`).");
  process.exit(1);
}
await fs.mkdir(out, { recursive: true });
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const name of names) {
    const slide = JSON.parse(await fs.readFile(path.join(dir, name), "utf8"));
    const errors = validateSlide(slide);
    const fontSize = errors.length ? null : await fitFontSize(page, slide);
    if (errors.length || fontSize === null) {
      console.error(`${name}: ${errors[0] ?? "content overflows at the smallest font size"}`);
      failed = true;
      continue;
    }
    await fs.writeFile(path.join(out, `${slide.id}.pdf`), await page.pdf({ width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true }));
    console.log(`${slide.id}.pdf (font ${fontSize}px)`);
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
