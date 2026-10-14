// Lists updates that still need a slide. Reads the generated static API
// (run `npm run build:pages` first) and data/slides.
import fs from "node:fs/promises";
import path from "node:path";
import { retentionStart } from "./build-slide-pdfs.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

export function selectPending(items, existingIds, { months = 3, limit = 10, ids = null, skip = [], today = new Date() } = {}) {
  // Same calendar-month window as the PDF retention, so every slide made here is also published.
  const cutoffDate = retentionStart(months, today);
  // Snapshot diffs ("X changed") only say a page changed; a slide needs a real article or release-note section.
  return items
    .filter((item) => item.sourceKind !== "html_snapshot_change")
    // The authoring agent cannot open Publickey pages, so it cannot verify them.
    .filter((item) => !/publickey1\.jp/.test(item.resources?.source?.url ?? item.urls?.source ?? ""))
    .filter((item) => !existingIds.has(item.id) && !skip.includes(item.id))
    .filter((item) => (ids ? ids.includes(item.id) : item.digestDate >= cutoffDate))
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
  for (const file of slideFiles) {
    const slide = refresh ? JSON.parse(await fs.readFile(path.join(slidesDir, file), "utf8")) : null;
    if (!refresh || slide.schema === "vscode-copilot-digest/slide/v2") existing.add(file.replace(/\.json$/, ""));
  }
  const ids = option("ids", "")?.split(",").filter(Boolean);
  const pending = selectPending(items, existing, {
    months: Number(option("months", 3)),
    limit: Number(option("limit", 10)),
    ids: ids?.length ? ids : null,
    skip: option("skip", "")?.split(",").filter(Boolean) ?? [],
  });
  console.log(JSON.stringify(pending.map((i) => ({
    id: i.id, digestDate: i.digestDate, topic: i.topic, title: i.title,
    source: i.resources.source.url, documents: i.resources.documents,
  })), null, 2));
}

if (process.argv[1]?.endsWith("pending-slides.mjs")) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
