// Lists updates whose card still shows a source excerpt: no slide covers them and no summary is written.
// Reads the generated static API (run `npm run build:pages` first). Usage: [--months 3] [--limit 30] [--skip a,b] [--ids a,b]
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
const normalizeUrl = (url) => String(url ?? "").replace(/\?[^#]*/, "").replace(/\/+(?=#|$)/, "");
// Page changes and release-note sections have their own card even when the page already has a slide.
const ownPage = (item) => item.sourceKind === "html_snapshot_change" || item.sourceKind === "vscode_release_note_section";

export function selectNeedingSummary(items, { slideIds, slideUrls, written, months = 3, limit = 30, ids = null, skip = [], today = new Date() }) {
  const cutoff = retentionStart(months, today);
  return items
    .filter((item) => item.sourceKind !== "html_snapshot_change" || item.changes?.length > 0)
    .filter((item) => !AGENT_UNREACHABLE.test(item.resources?.source?.url ?? item.urls?.source ?? ""))
    .filter((item) => !slideIds.has(item.id) && !written.has(item.id) && !skip.includes(item.id))
    .filter((item) => ownPage(item) || !slideUrls.has(normalizeUrl(item.resources?.source?.url ?? item.urls?.source)))
    .filter((item) => (ids ? ids.includes(item.id) : item.digestDate >= cutoff))
    .sort((a, b) => a.digestDate.localeCompare(b.digestDate) || b.importance.score - a.importance.score || a.id.localeCompare(b.id))
    // The same article can arrive from two feeds on different days; one entry covers it (the earliest item).
    .filter((item, index, all) => {
      const url = normalizeUrl(item.resources?.source?.url ?? item.urls?.source);
      return ownPage(item) || !url || all.findIndex((o) => !ownPage(o) && normalizeUrl(o.resources?.source?.url ?? o.urls?.source) === url) === index;
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
  const slideIds = new Set();
  const slideUrls = new Set();
  for (const file of (await fs.readdir(slidesDir).catch(() => [])).filter((f) => f.endsWith(".json"))) {
    const slide = JSON.parse(await fs.readFile(path.join(slidesDir, file), "utf8"));
    slideIds.add(file.replace(/\.json$/, ""));
    if (slide.references?.source?.url) slideUrls.add(normalizeUrl(slide.references.source.url));
  }
  const writtenMap = JSON.parse(await fs.readFile(path.join(root, "data", "summaries-ja.json"), "utf8").catch(() => "{}"));
  // An entry without a title and concrete points is handed back so it can be rewritten with them.
  const written = new Set(Object.entries(writtenMap).filter(([, e]) => e.title && Array.isArray(e.points) && e.points.length > 0).map(([id]) => id));
  const ids = option("ids", "")?.split(",").filter(Boolean);
  const pending = selectNeedingSummary(items, {
    slideIds, slideUrls, written,
    months: Number(option("months", 3)),
    limit: Number(option("limit", 30)),
    ids: ids?.length ? ids : null,
    skip: option("skip", "")?.split(",").filter(Boolean) ?? [],
  });
  console.log(JSON.stringify(pending.map((i) => ({
    id: i.id, digestDate: i.digestDate, title: i.title.original || i.title.en, source: i.resources.source.url,
    excerpt: (i.summary?.en || "").slice(0, 400),
    ...(writtenMap[i.id]?.summary ? { current: writtenMap[i.id].summary } : {}),
    ...(i.changes?.length ? { kind: "page-change", changes: i.changes } : {}),
  })), null, 2));
}

if (process.argv[1]?.endsWith("pending-summaries.mjs")) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
