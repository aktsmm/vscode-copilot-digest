// Compares what the feeds published recently with what data/events holds, so articles that were
// dropped or never collected are noticed. Usage: node scripts/coverage-report.mjs [--days 14] [--json] [--strict]
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const unwrap = (value) => String(value ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export const normalizeUrl = (url) => String(url ?? "").replace(/[#?].*$/, "").replace(/\/+$/, "");

export function parseFeed(xml) {
  const blocks = [...String(xml).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/g)].map((m) => m[0]);
  return blocks.map((block) => {
    const link = block.match(/<link>([^<]+)<\/link>/)?.[1] ?? block.match(/<link\b[^>]*href="([^"]+)"/)?.[1] ?? "";
    const date = block.match(/<(?:pubDate|published|updated)>([^<]+)</)?.[1] ?? "";
    const title = unwrap(block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1]);
    return { url: normalizeUrl(unwrap(link)), title, date: Date.parse(date) || null };
  }).filter((entry) => entry.url);
}

// Items that were published in the window but are absent from the known event URLs.
export function findMissing(entries, knownUrls, { since, until }) {
  return entries.filter((entry) => entry.date && entry.date >= since && entry.date <= until && !knownUrls.has(entry.url));
}

export async function buildReport(days = 14) {
  const now = Date.now();
  const sources = JSON.parse(await fs.readFile(path.join(root, "config", "sources.json"), "utf8"));
  const feeds = (sources.sources ?? sources).filter((s) => (s.kind === "rss" || s.kind === "atom") && !s.includeKeywords);

  const eventsDir = path.join(root, "data", "events");
  const known = new Set();
  const knownIds = new Set();
  const skippedEntries = [];
  const cutoffDay = new Date(now - days * 86400000).toISOString().slice(0, 10);
  for (const file of (await fs.readdir(eventsDir)).filter((f) => f.endsWith(".json"))) {
    const day = JSON.parse(await fs.readFile(path.join(eventsDir, file), "utf8"));
    for (const event of day.events ?? []) { known.add(normalizeUrl(event.url)); knownIds.add(event.eventId); }
    if (file.slice(0, 10) >= cutoffDay) skippedEntries.push(...(day.latestRun?.skippedLowInformationEvents ?? []));
  }

  const missing = [];
  for (const source of feeds) {
    try {
      const response = await fetch(source.url, { redirect: "follow", headers: { "user-agent": "vscode-copilot-digest-coverage" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      for (const entry of findMissing(parseFeed(await response.text()), known, { since: now - days * 86400000, until: now })) {
        missing.push({ source: source.id, title: entry.title, url: entry.url, date: new Date(entry.date).toISOString().slice(0, 10) });
      }
    } catch (error) {
      console.error(`::warning::could not read ${source.id}: ${error.message}`);
    }
  }
  // An entry dropped earlier counts only while its article is still absent from the events.
  const skipped = skippedEntries.filter((entry) => /:https?:/.test(entry.eventId) && !knownIds.has(entry.eventId) && !known.has(normalizeUrl(entry.eventId.slice(entry.eventId.indexOf(":") + 1)))).length;
  return { windowDays: days, missing, skippedLowInformation: skipped };
}

async function main() {
  const report = await buildReport(Number(option("days", 14)));
  const { missing, skippedLowInformation: skipped, windowDays: days } = report;
  console.log(args.includes("--json") ? JSON.stringify(report, null, 2) : [
    `Feed articles in the last ${days} days missing from data/events: ${missing.length}`,
    ...missing.map((m) => `- ${m.date} [${m.source}] ${m.title} ${m.url}`),
    `Dropped as low-information in the window: ${skipped}`,
  ].join("\n"));
  if (args.includes("--strict") && (missing.length > 0 || skipped > 0)) process.exit(1);
}

if (process.argv[1]?.endsWith("coverage-report.mjs")) {
  main().catch((error) => { console.error(error.message); process.exit(2); });
}
