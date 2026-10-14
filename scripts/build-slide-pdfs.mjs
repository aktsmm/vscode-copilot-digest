// Renders data/slides/*.json into per-update PDFs under site/pdf and writes site/data/slides.json.
// The newest slide is published as a free sample; the others are encrypted with PDF_PASSWORD.
// Fail-closed: without a password or a browser no PDF is published, but the site deploy is never blocked.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { orderSlides, validateSlide } from "./lib/slides.mjs";
import { fitFontSize, slideDocHtml } from "./lib/slide-html.mjs";
import { deriveKey, encryptPdf, newCryptoInfo } from "./lib/pdf-crypto.mjs";
import { slidesPageHtml, slidesUiJs } from "./lib/slides-ui.mjs";

const root = process.cwd();
const slidesDir = path.resolve(process.env.SLIDES_DIR ?? path.join(root, "data", "slides"));
const siteDir = path.resolve(process.env.SITE_DIR ?? path.join(root, "site"));
const retentionMonths = Number(process.env.PDF_RETENTION_MONTHS ?? "3");

// First day of the oldest retained month in JST; 0 keeps everything.
export function retentionStart(months, now = new Date()) {
  if (!(months > 0)) return "0000-00-00";
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const start = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() - (months - 1), 1));
  return start.toISOString().slice(0, 10);
}

const warn = (message) => console.log(`::warning::${message}`);

async function readSlides(since) {
  const names = await fs.readdir(slidesDir).catch((e) => (e.code === "ENOENT" ? [] : Promise.reject(e)));
  const slides = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    try {
      const slide = JSON.parse(await fs.readFile(path.join(slidesDir, name), "utf8"));
      const errors = validateSlide(slide);
      if (errors.length) throw new Error(errors[0]);
      if (slide.date >= since) slides.push(slide);
    } catch (error) {
      warn(`skipping ${name}: ${error.message}`);
    }
  }
  return orderSlides(slides);
}

export async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }
  for (const options of [{}, { channel: "chrome" }, { channel: "msedge" }]) {
    try {
      return await chromium.launch(options);
    } catch {
      /* try the next browser */
    }
  }
  return null;
}

async function writeUi() {
  const assetVersion = (text) => createHash("sha256").update(text).digest("hex").slice(0, 12);
  const js = slidesUiJs();
  await fs.mkdir(path.join(siteDir, "assets", "vendor"), { recursive: true });
  await fs.writeFile(path.join(siteDir, "assets", "slides-ui.js"), js, "utf8");
  await fs.copyFile(path.join(root, "node_modules", "pdf-lib", "dist", "pdf-lib.min.js"), path.join(siteDir, "assets", "vendor", "pdf-lib.min.js"));
  await fs.writeFile(path.join(siteDir, "slides.html"), slidesPageHtml(assetVersion(js)), "utf8");
}

async function main() {
  const since = retentionStart(retentionMonths);
  const slides = await readSlides(since);
  await fs.mkdir(path.join(siteDir, "data"), { recursive: true });
  await fs.mkdir(path.join(siteDir, "slides"), { recursive: true });
  await writeUi();
  for (const slide of slides) {
    await fs.writeFile(path.join(siteDir, "slides", `${slide.id}.json`), `${JSON.stringify(slide, null, 2)}\n`, "utf8");
  }

  const entries = slides.map((s) => ({ id: s.id, date: s.date, topic: s.topic, status: s.status, title: s.title.ja, source: s.references.source, pdf: null, encrypted: false }));
  const manifest = { schema: "vscode-copilot-digest/slides-manifest/v1", retentionSince: since, pdfCrypto: null, slides: entries };
  const finish = async (message) => {
    await fs.writeFile(path.join(siteDir, "data", "slides.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(message);
  };

  const password = process.env.PDF_PASSWORD;
  if (slides.length === 0) return finish("No slides; PDF generation skipped.");
  if (!password) return finish("PDF_PASSWORD is not set; PDFs are not published.");
  const browser = await launchBrowser();
  if (!browser) {
    warn("no Chromium-compatible browser is available; PDFs are not published");
    return finish("PDF generation skipped (no browser).");
  }

  const info = newCryptoInfo();
  const key = deriveKey(password, info);
  let published = 0;
  try {
    await fs.mkdir(path.join(siteDir, "pdf"), { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    for (const [index, slide] of slides.entries()) {
      try {
        const fontSize = await fitFontSize(page, slide);
        if (fontSize === null) throw new Error("content overflows at the smallest font size");
        const pdf = await page.pdf({ width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true });
        const entry = entries[index];
        const sample = index === 0;
        const file = sample ? `pdf/${slide.id}.pdf` : `pdf/${slide.id}.pdf.enc`;
        await fs.writeFile(path.join(siteDir, file), sample ? pdf : encryptPdf(pdf, key));
        entry.pdf = file;
        entry.encrypted = !sample;
        published += 1;
      } catch (error) {
        warn(`skipping PDF for ${slide.id}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
  }
  if (published > 0) manifest.pdfCrypto = info;
  await finish(`Wrote ${published} PDF(s) (newest is a free sample, the rest are encrypted).`);
}

if (process.argv[1]?.endsWith("build-slide-pdfs.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
