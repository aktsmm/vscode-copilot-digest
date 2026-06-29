import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function readSiteFile(relativePath) {
  return fs.readFileSync(`site/${relativePath}`, "utf8");
}

const indexHtml = readSiteFile("index.html");
assert.match(
  indexHtml,
  /href="\.\/weeks\/index\.html">週間ダイジェスト/,
  "home Weekly nav must point to the weekly archive",
);
assert.doesNotMatch(indexHtml, /href="undefined"/, "home nav must not render undefined links");

const searchHtml = readSiteFile("search.html");
assert.match(
  searchHtml,
  /data-search-filters/,
  "search page must render source/topic facet controls",
);
assert.match(
  searchHtml,
  /href="\.\/weeks\/index\.html">週間ダイジェスト/,
  "search Weekly nav must point to the weekly archive",
);
assert.doesNotMatch(
  searchHtml,
  /index\.html#weekly-archive/,
  "search Weekly nav must not use the home fragment",
);
assert.match(
  searchHtml,
  /function normalizeSearchQuery/,
  "search page must normalize common query variants before Pagefind search",
);
assert.match(
  searchHtml,
  /function dedupeRows/,
  "search page must dedupe Pagefind sub-result rows",
);

const latestDay = fs
  .readdirSync("site/days")
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name))
  .sort()
  .at(-1);
assert.ok(latestDay, "generated daily detail page must exist");
const dayHtml = readSiteFile(`days/${latestDay}`);
assert.match(
  dayHtml,
  /href="\.\.\/weeks\/index\.html">週間ダイジェスト/,
  "daily detail Weekly nav must point to the weekly archive",
);
assert.match(
  dayHtml,
  /data-filter-kind="topic"/,
  "detail pages must expose topic filters",
);
assert.match(
  dayHtml,
  /data-filter-kind="importance"/,
  "detail pages must expose importance filters",
);
assert.match(
  dayHtml,
  /data-filter-kind="sort"/,
  "detail pages must expose sort controls",
);
assert.match(
  dayHtml,
  /data-sort-list/,
  "detail pages must mark sortable update lists",
);
assert.match(
  dayHtml,
  /data-sort-score=/,
  "detail cards must include sort score metadata",
);

const highlightsHtml = readSiteFile("highlights.html");
assert.match(
  highlightsHtml,
  /data-pagefind-body/,
  "highlight archive items must be included in the Pagefind index",
);
assert.match(
  highlightsHtml,
  /data-filter-kind="importance"/,
  "highlight archive must expose importance filters",
);

const weeklyDryRun = spawnSync(
  process.execPath,
  [
    "scripts/notify-discord.mjs",
    "--mode",
    "weekly",
    "--date",
    "2026-06-29",
    "--window-days",
    "7",
    "--dry-run",
    "--force-preview",
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.equal(weeklyDryRun.status, 0, weeklyDryRun.stderr);
const jsonStart = weeklyDryRun.stdout.indexOf("{\n");
const jsonEnd = weeklyDryRun.stdout.lastIndexOf("\n}");
assert.ok(
  jsonStart >= 0 && jsonEnd > jsonStart,
  "dry-run must print JSON payload",
);
const payload = JSON.parse(weeklyDryRun.stdout.slice(jsonStart, jsonEnd + 2));
assert.ok(
  payload.content.includes("週間Pages:"),
  "weekly content must link to weekly Pages",
);
assert.ok(
  payload.content.includes("検索:"),
  "Discord content must include a search landing URL",
);
assert.equal(
  payload.embeds[0]?.title,
  "週次要約",
  "first embed must be the weekly summary",
);
assert.ok(
  payload.embeds.some((embed) =>
    (embed.fields ?? []).some(
      (field) =>
        field.name === "Pages" &&
        /^https:\/\/aktsmm\.github\.io\/vscode-copilot-digest\/days\//.test(
          field.value,
        ),
    ),
  ),
  "event embeds must include digest Pages links",
);

console.log("pages-discord-ux.test.mjs: OK");
