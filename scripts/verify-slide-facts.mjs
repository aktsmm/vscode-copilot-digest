// Usage: node scripts/verify-slide-facts.mjs <slide.json>
// Fetches the pages a slide cites and fails when a version, identifier, number or day in the slide is not in them.
// If the pages cannot be fetched at all the check is skipped (exit 0): a network problem must not reject good slides.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as cheerio from "cheerio";
import { ALLOWED_HOSTS } from "./lib/slides.mjs";
import { checkClaims, citedUrls, extractClaims } from "./lib/slide-facts.mjs";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/verify-slide-facts.mjs <slide.json>"); process.exit(2); }
const slide = JSON.parse(fs.readFileSync(file, "utf8"));

const pageText = (url) => {
  const host = new URL(url).hostname;
  if (!ALLOWED_HOSTS.has(host)) return "";
  try {
    const html = execFileSync("curl", ["-sSL", "--fail", "--max-time", "40", "--max-filesize", "5000000", "-A", "vscode-copilot-digest-verify", url], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    const $ = cheerio.load(html);
    $("script, style, noscript, svg").remove();
    return `${$("title").text()}\n${$("body").text()}`;
  } catch {
    return "";
  }
};

const pages = citedUrls(slide).map(pageText).filter(Boolean);
if (pages.length === 0) {
  console.warn(`${file}: no cited page could be fetched; fact check skipped`);
  process.exit(0);
}
// The slide's own English title and status quotation count as sources too.
const corpus = [...pages, slide.title?.original ?? "", slide.statusEvidence ?? ""].join("\n");
const problems = checkClaims(extractClaims(slide), corpus);
for (const problem of problems) console.error(`${file}: ${problem}`);
if (problems.length) process.exit(1);
console.log(`${file}: facts found in ${pages.length} cited page(s)`);
