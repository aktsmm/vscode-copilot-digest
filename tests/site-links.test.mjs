// Every internal link and asset in the generated site must resolve to a file (run `npm run build:pages` first).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = "site";
const skipDirs = new Set(["raw", "pagefind"]);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (!entry.isDirectory()) return [path.join(dir, entry.name)];
  if (skipDirs.has(entry.name) || entry.name.startsWith("pagefind-")) return [];
  return walk(path.join(dir, entry.name));
});

const missing = new Map();
let pages = 0;
for (const file of walk(root).filter((name) => name.endsWith(".html"))) {
  pages += 1;
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const ref = match[1];
    // Scripts build URLs from templates such as ' + escapeHtml(row.url) + '; those are not links.
    if (/^(?:https?:|mailto:|data:|javascript:|\/\/)/.test(ref) || /['+]/.test(ref)) continue;
    let target = ref.startsWith("/") ? path.join(root, ref) : path.normalize(path.join(path.dirname(file), ref));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) missing.set(path.relative(root, target), file);
  }
}

assert.ok(pages > 100, "the site must be built before the link test");
assert.equal(missing.size, 0, `broken internal links: ${[...missing].slice(0, 8).map(([target, from]) => `${target} (from ${path.relative(root, from)})`).join(", ")}`);
console.log(`site-links tests passed (${pages} pages)`);
