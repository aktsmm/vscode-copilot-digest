// Renders data/slides/*.json into encrypted per-update PDFs under site/pdf.
// Fail-closed: without slides, PDF_PASSWORD, or a browser, no PDF is published.
import fs from "node:fs/promises";
import path from "node:path";
import { validateSlide } from "./lib/slides.mjs";
import { deckHtml } from "./lib/slide-html.mjs";
import { encryptPdf, PDF_CRYPTO } from "./lib/pdf-crypto.mjs";

const root = process.cwd();
const slidesDir = path.join(root, "data", "slides");
const siteDir = path.join(root, "site");

async function readSlides() {
  const names = await fs.readdir(slidesDir).catch((e) => (e.code === "ENOENT" ? [] : Promise.reject(e)));
  const slides = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    const slide = JSON.parse(await fs.readFile(path.join(slidesDir, name), "utf8"));
    const errors = validateSlide(slide);
    if (errors.length) throw new Error(`${name}: ${errors.join("; ")}`);
    slides.push(slide);
  }
  return slides;
}

async function main() {
  const slides = await readSlides();
  const password = process.env.PDF_PASSWORD;
  await fs.mkdir(path.join(siteDir, "data"), { recursive: true });
  const manifest = { schema: "vscode-copilot-digest/slides-manifest/v1", pdfCrypto: null, slides: slides.map((s) => ({ id: s.id, date: s.date, pdf: null })) };
  const finish = async (message) => {
    await fs.writeFile(path.join(siteDir, "data", "slides.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(message);
  };

  if (slides.length === 0) return finish("No slides; PDF generation skipped.");
  if (!password) return finish("PDF_PASSWORD is not set; PDFs are not published.");

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("playwright is required to render PDFs; refusing to publish without it");
  }
  const browser = await chromium.launch();
  try {
    await fs.mkdir(path.join(siteDir, "pdf"), { recursive: true });
    for (const slide of slides) {
      const deck = { schema: "vscode-copilot-digest/deck/v1", selection: { snapshotAt: `${slide.date}T00:00:00Z` }, slides: [slide] };
      const page = await browser.newPage();
      await page.setContent(deckHtml(deck), { waitUntil: "load" });
      const pdf = await page.pdf({ width: "1280px", height: "720px", printBackground: true });
      await page.close();
      await fs.writeFile(path.join(siteDir, "pdf", `${slide.id}.pdf.enc`), encryptPdf(pdf, password));
      manifest.slides.find((s) => s.id === slide.id).pdf = `pdf/${slide.id}.pdf.enc`;
    }
  } finally {
    await browser.close();
  }
  manifest.pdfCrypto = { ...PDF_CRYPTO, layout: "salt16|iv12|tag16|ciphertext" };
  await finish(`Wrote ${slides.length} encrypted PDF(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
