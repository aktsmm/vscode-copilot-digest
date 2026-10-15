// Lists updates that still need a slide. Reads the generated static API
// (run `npm run build:pages` first) and data/slides.
import fs from "node:fs/promises";
import path from "node:path";
import { retentionStart } from "./build-slide-pdfs.mjs";
import { AGENT_UNREACHABLE } from "./lib/slides.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const normalizeUrl = (url) => String(url ?? "").replace(/[#?].*$/, "").replace(/\/+$/, "");

export function selectPending(items, existingIds, { months = 3, limit = 10, ids = null, skip = [], today = new Date(), existingUrls = new Set() } = {}) {
  // Same calendar-month window as the PDF retention, so every slide made here is also published.
  const cutoffDate = retentionStart(months, today);
  // A page-change item is usable only when it carries the added lines that say what changed.
  return items
    .filter((item) => item.sourceKind !== "html_snapshot_change" || item.changes?.length > 0)
    // The authoring agent cannot open Publickey pages, so it cannot verify them.
    .filter((item) => !AGENT_UNREACHABLE.test(item.resources?.source?.url ?? item.urls?.source ?? ""))
    .filter((item) => !existingIds.has(item.id) && !skip.includes(item.id))
    // A slide written from a page-change item already covers the article it names.
    .filter((item) => item.sourceKind === "html_snapshot_change" || !existingUrls.has(normalizeUrl(item.resources?.source?.url ?? item.urls?.source)))
    .filter((item) => (ids ? ids.includes(item.id) : item.digestDate >= cutoffDate))
    .sort((a, b) => a.digestDate.localeCompare(b.digestDate) || b.importance.score - a.importance.score || a.id.localeCompare(b.id))
    // The same article can arrive from two feeds on different days; one slide covers it (the earliest item).
    .filter((item, index, all) => {
      const url = normalizeUrl(item.resources?.source?.url ?? item.urls?.source);
      return item.sourceKind === "html_snapshot_change" || !url || all.findIndex((o) => o.sourceKind !== "html_snapshot_change" && normalizeUrl(o.resources?.source?.url ?? o.urls?.source) === url) === index;
    })
    .sort((a, b) => b.digestDate.localeCompare(a.digestDate) || b.importance.score - a.importance.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

async function main() {
  const monthsDir = path.join(root, "site", "api", "v1", "months");
  const files = await fs.readdir(monthsDir).catch(() => {
    throw new Error("site/api/v1/months not found; run npm run build:pages first");
  });
  const items = [];
  for (const file of files.filter((f) => f.endsWith(".json")).sort()) {
    items.push(...JSON.parse(await fs.readFile(path.join(monthsDir, file), "utf8")).items);
  }
  const slidesDir = path.join(root, "data", "slides");
  const slideFiles = (await fs.readdir(slidesDir).catch(() => [])).filter((f) => f.endsWith(".json"));
  // --refresh also returns slides written before the detail blocks (audience etc.) existed.
  const refresh = args.includes("--refresh");
  const existing = new Set();
  const existingUrls = new Set();
  for (const file of slideFiles) {
    const slide = JSON.parse(await fs.readFile(path.join(slidesDir, file), "utf8"));
    if (!refresh || slide.schema === "vscode-copilot-digest/slide/v2") existing.add(file.replace(/\.json$/, ""));
    if (!refresh && slide.references?.source?.url) existingUrls.add(normalizeUrl(slide.references.source.url));
  }
  const ids = option("ids", "")?.split(",").filter(Boolean);
  const pending = selectPending(items, existing, {
    months: Number(option("months", 3)),
    limit: Number(option("limit", 10)),
    ids: ids?.length ? ids : null,
    skip: option("skip", "")?.split(",").filter(Boolean) ?? [],
    existingUrls,
  });
  console.log(JSON.stringify(pending.map((i) => ({
    id: i.id, digestDate: i.digestDate, topic: i.topic, title: i.title,
    source: i.resources.source.url, documents: i.resources.documents,
    ...(i.changes?.length ? { kind: "page-change", changes: i.changes } : {}),
  })), null, 2));
}

if (process.argv[1]?.endsWith("pending-slides.mjs")) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
