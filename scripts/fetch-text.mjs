// Prints the readable text of one web page (and its links) for the agentic workflows, whose agent has no web-fetch tool.
// Usage: node scripts/fetch-text.mjs <https url> [--max 60000]
// Only the hosts a slide or summary may cite are fetched, and only over https.
import { execFileSync } from "node:child_process";
import * as cheerio from "cheerio";
import { ALLOWED_HOSTS } from "./lib/slides.mjs";

const url = process.argv[2];
const maxIndex = process.argv.indexOf("--max");
const max = maxIndex > 0 ? Number(process.argv[maxIndex + 1]) || 60000 : 60000;

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("usage: node scripts/fetch-text.mjs <https url>");
  process.exit(2);
}
const hosts = new Set([...ALLOWED_HOSTS, "marketplace.visualstudio.com", "vscode.dev", "raw.githubusercontent.com", "aktsmm.github.io"]);
if (parsed.protocol !== "https:" || !hosts.has(parsed.hostname)) {
  console.error(`host not allowed: ${parsed.hostname}`);
  process.exit(3);
}

let html;
try {
  html = execFileSync("curl", ["-sSL", "--fail", "--max-time", "40", "--max-filesize", "5000000", "-A", "vscode-copilot-digest-agent", parsed.href], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
} catch (error) {
  console.error(`fetch failed: ${String(error.stderr || error.message).split("\n")[0]}`);
  process.exit(4);
}

const $ = cheerio.load(html);
$("script, style, noscript, svg, nav, footer, header, form, iframe").remove();
const root = $("main").length ? $("main").first() : $("article").length ? $("article").first() : $("body");
const lines = [];
root.find("h1, h2, h3, h4, p, li, pre, td, th, blockquote").each((_, element) => {
  const text = $(element).text().replace(/\s+/g, " ").trim();
  if (text) lines.push(/^h\d$/i.test(element.tagName) ? `\n## ${text}` : text);
});
const links = [];
const seen = new Set();
root.find("a[href]").each((_, element) => {
  try {
    const href = new URL($(element).attr("href"), parsed.href).href.split("#")[0];
    const label = $(element).text().replace(/\s+/g, " ").trim();
    if (!seen.has(href) && label && /^https:/.test(href)) { seen.add(href); links.push(`- ${label}: ${href}`); }
  } catch { /* ignore malformed hrefs */ }
});

const body = `# ${$("title").first().text().replace(/\s+/g, " ").trim()}\nURL: ${parsed.href}\n\n${lines.join("\n")}\n\n## Links\n${links.slice(0, 80).join("\n")}\n`;
process.stdout.write(body.length > max ? `${body.slice(0, max)}\n[truncated]\n` : body);
