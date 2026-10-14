// Restores real articles that an earlier collect run dropped as "low information".
// It re-reads each skipped feed article from its own page and writes it back into the day file
// it was dropped from. Usage: node scripts/backfill-skipped.mjs [--dry-run]
import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";

const root = process.cwd();
const eventsDir = path.join(root, "data", "events");
const dryRun = process.argv.includes("--dry-run");
const FEED_SOURCES = new Set(["github-changelog", "github-changelog-copilot", "github-copilot-blog", "vscode-feed"]);

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function parseArticle(html, url) {
  const $ = cheerio.load(html);
  const meta = (name) => clean($(`meta[property="${name}"], meta[name="${name}"]`).first().attr("content"));
  const title = clean(meta("og:title") || $("h1").first().text() || $("title").text()).replace(/\s*[|–-]\s*(GitHub Changelog|The GitHub Blog|Visual Studio Code).*$/i, "");
  const urlDate = url.match(/\/(\d{4})-(\d{2})-(\d{2})-/);
  const published = meta("article:published_time") || $("time[datetime]").first().attr("datetime") || (urlDate ? `${urlDate[1]}-${urlDate[2]}-${urlDate[3]}T00:00:00.000Z` : null);
  const paragraphs = $("article p, main p").map((_, el) => clean($(el).text())).get().filter((text) => text.length > 40);
  const excerpt = clean(paragraphs.slice(0, 2).join(" ") || meta("og:description") || meta("description")).slice(0, 420);
  return { title, published, excerpt };
}

async function fetchArticle(url) {
  const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "vscode-copilot-digest-backfill" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { finalUrl: response.url, html: await response.text() };
}

async function main() {
  const files = (await fs.readdir(eventsDir)).filter((f) => f.endsWith(".json")).sort();
  const days = new Map();
  const have = new Set();
  const skipped = new Map();
  for (const file of files) {
    const day = JSON.parse(await fs.readFile(path.join(eventsDir, file), "utf8"));
    days.set(file, day);
    for (const event of day.events ?? []) { have.add(event.eventId); have.add(event.url); }
    for (const entry of day.latestRun?.skippedLowInformationEvents ?? []) {
      if (FEED_SOURCES.has(entry.sourceId) && !skipped.has(entry.eventId)) skipped.set(entry.eventId, { file, ...entry });
    }
  }

  const changed = new Set();
  const seenUrls = new Set();
  let restored = 0, failed = 0;
  for (const entry of skipped.values()) {
    const url = entry.eventId.slice(entry.eventId.indexOf(":") + 1);
    if (have.has(entry.eventId) || have.has(url) || seenUrls.has(url)) continue;
    seenUrls.add(url);
    try {
      const { finalUrl, html } = await fetchArticle(url);
      const article = parseArticle(html, finalUrl);
      if (!article.title || article.excerpt.length < 40) throw new Error("no readable article text");
      const day = days.get(entry.file);
      const published = article.published ? new Date(article.published).toISOString() : `${entry.file.slice(0, 10)}T00:00:00.000Z`;
      day.events.push({
        eventId: entry.eventId,
        sourceId: entry.sourceId,
        sourceName: entry.sourceId.replace(/-/g, " "),
        kind: "feed_entry",
        detectedAt: day.generatedAt ?? published,
        publishedAt: published,
        title: article.title,
        url: finalUrl,
        summary: article.excerpt,
        categories: ["copilot"],
        isFutureDated: false,
        score: 3,
        backfilled: true,
      });
      changed.add(entry.file);
      restored += 1;
      console.log(`restored ${entry.file.slice(0, 10)} ${article.title}`);
    } catch (error) {
      failed += 1;
      console.warn(`skipped ${url}: ${error.message}`);
    }
  }
  if (!dryRun) {
    for (const file of changed) await fs.writeFile(path.join(eventsDir, file), `${JSON.stringify(days.get(file), null, 2)}\n`, "utf8");
  }
  console.log(`${dryRun ? "Would restore" : "Restored"} ${restored} article(s); ${failed} could not be read.`);
}

if (process.argv[1]?.endsWith("backfill-skipped.mjs")) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
