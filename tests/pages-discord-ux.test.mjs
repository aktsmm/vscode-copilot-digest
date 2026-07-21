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
assert.doesNotMatch(
  indexHtml,
  /href="undefined"/,
  "home nav must not render undefined links",
);
assert.match(
  indexHtml,
  /直近読者向け新規/,
  "Japanese home metrics must distinguish reader-facing new items from raw detections",
);
assert.match(
  indexHtml,
  /直近読者向け新規<\/span><strong class="metric-value">0件<\/strong>/,
  "Japanese home metrics must show zero when the latest run contains only audit-only changes",
);
assert.match(
  readSiteFile("en/index.html"),
  /Latest reader-facing items/,
  "English home metrics must distinguish reader-facing new items from raw detections",
);

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

const july20JapaneseHtml = readSiteFile("days/2026-07-20.html");
assert.match(
  july20JapaneseHtml,
  /請求 UI で cost center の AI credit pool を直接管理可能に/,
  "Japanese day page must show the localized billing title",
);
assert.match(
  july20JapaneseHtml,
  /原題: AI credit pools for cost centers in the billing UI/,
  "Japanese day page must retain the original English title",
);
const july20EnglishHtml = readSiteFile("en/days/2026-07-20.html");
assert.match(
  july20EnglishHtml,
  /AI credit pools for cost centers in the billing UI/,
  "English day page must retain the original title",
);
assert.match(
  july20EnglishHtml,
  /You can now manage a cost center/,
  "English day page must retain the source summary",
);
assert.equal(
  fs.existsSync("site/days/2026-07-21.html"),
  false,
  "audit-only snapshot days must not publish an empty reader-facing page",
);
assert.equal(
  fs.existsSync("site/raw/events/2026-07-21.json"),
  true,
  "audit-only snapshot events must remain available as raw audit data",
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

const latestHighlightCards = Array.from(
  indexHtml.matchAll(/<article class="mini-highlight"[\s\S]*?<\/article>/g),
  (match) => match[0],
);
assert.ok(
  latestHighlightCards.length > 0,
  "home page must render latest highlight cards",
);
for (const card of latestHighlightCards) {
  const summary = card.match(/<p class="mini-summary">([^<]+)<\/p>/);
  assert.ok(summary, "latest highlight cards must include an explanation");
  assert.match(
    summary[1],
    /[。！？]$/,
    "Japanese latest highlight explanations must end at a sentence boundary",
  );
  assert.doesNotMatch(
    summary[1],
    /\.\.\.|…/,
    "Japanese latest highlight explanations must not contain ellipsis truncation",
  );
  const why = card.match(/<p class="mini-why">([^<]+)<\/p>/);
  if (why) {
    assert.match(
      why[1],
      /[。！？]$/,
      "Japanese latest highlight importance text must end at a sentence boundary",
    );
    assert.doesNotMatch(
      why[1],
      /\.\.\.|…/,
      "Japanese latest highlight importance text must not contain ellipsis truncation",
    );
  }
}

const englishLatestHighlightCards = Array.from(
  readSiteFile("en/index.html").matchAll(
    /<article class="mini-highlight"[\s\S]*?<\/article>/g,
  ),
  (match) => match[0],
);
assert.ok(
  englishLatestHighlightCards.length > 0,
  "English home page must render latest highlight cards",
);
for (const card of englishLatestHighlightCards) {
  const summary = card.match(/<p class="mini-summary">([^<]+)<\/p>/);
  assert.ok(summary, "English latest highlight cards must include an explanation");
  assert.match(
    summary[1],
    /[.!?]$/,
    "English latest highlight explanations must end at a sentence boundary",
  );
  assert.doesNotMatch(
    summary[1],
    /\.\.\.|…/,
    "English latest highlight explanations must not contain ellipsis truncation",
  );
}

const homeDigestCards = Array.from(
  indexHtml.matchAll(/<article class="digest-card">([\s\S]*?)<\/article>/g),
  (match) => match[1],
);
assert.equal(
  homeDigestCards.length,
  12,
  "home page must render weekly and daily digest cards",
);
for (const card of homeDigestCards) {
  assert.match(
    card,
    /digest-card-focus/,
    "home digest cards must show one compact focus",
  );
  assert.doesNotMatch(
    card,
    /<ul>|件の更新を反映。内訳は/,
    "home digest cards must not repeat aggregate summaries or bullet lists",
  );
  const summary = card.match(/<p class="digest-card-summary">([^<]+)<\/p>/);
  assert.ok(summary, "Japanese home digest cards must include an explanation");
  assert.match(
    summary[1],
    /[。！？]$/,
    "Japanese home card explanations must end at a sentence boundary",
  );
  assert.doesNotMatch(
    summary[1],
    /\.\.\.|…/,
    "Japanese home card explanations must not contain ellipsis truncation",
  );
}

const englishHomeDigestCards = Array.from(
  readSiteFile("en/index.html").matchAll(
    /<article class="digest-card">([\s\S]*?)<\/article>/g,
  ),
  (match) => match[1],
);
assert.equal(
  englishHomeDigestCards.length,
  12,
  "English home page must render weekly and daily digest cards",
);
for (const card of englishHomeDigestCards) {
  assert.match(
    card,
    /digest-card-focus/,
    "English home digest cards must show one compact focus",
  );
  assert.doesNotMatch(
    card,
    /<ul>|Reflects \d+ published updates\./,
    "English home digest cards must not repeat aggregate summaries or bullet lists",
  );
  const summary = card.match(/<p class="digest-card-summary">([^<]+)<\/p>/);
  assert.ok(summary, "English home digest cards must include an explanation");
  assert.match(
    summary[1],
    /[.!?]$/,
    "English home card explanations must end at a sentence boundary",
  );
  assert.doesNotMatch(
    summary[1],
    /\.\.\.|…/,
    "English home card explanations must not contain ellipsis truncation",
  );
}
const opusCardSummary = readSiteFile("en/index.html").match(
  /<p class="digest-card-summary">(Opus 4\.6 \(fast\) will be deprecated across GitHub Copilot experiences[^<]*)<\/p>/,
);
assert.ok(
  opusCardSummary,
  "English card summaries must preserve version numbers at the sentence start",
);
assert.doesNotMatch(
  opusCardSummary[1],
  /\.\.\.|…/,
  "English card summaries must not cut the sentence with an ellipsis",
);

const weeklyArchiveHtml = readSiteFile("weeks/index.html");
assert.match(
  weeklyArchiveHtml,
  /archive-stream-focus/,
  "weekly archive cards must show a single focus",
);
assert.doesNotMatch(
  weeklyArchiveHtml,
  /<div class="archive-stream-body">[\s\S]*?<ul>/,
  "weekly archive cards must not repeat focus items as a second list",
);
const weeklyArchiveSummaries = Array.from(
  weeklyArchiveHtml.matchAll(
    /<div class="archive-stream-body">[\s\S]*?<p class="archive-stream-focus">[^<]+<\/p>\s*<p>([^<]+)<\/p>/g,
  ),
  (match) => match[1],
);
assert.ok(
  weeklyArchiveSummaries.length > 0,
  "weekly archive cards must include a complete explanatory sentence",
);
for (const summary of weeklyArchiveSummaries) {
  assert.match(
    summary,
    /[。！？]$/,
    "weekly archive explanations must end at a Japanese sentence boundary",
  );
  assert.doesNotMatch(
    summary,
    /\.\.\.|…/,
    "weekly archive explanations must not contain ellipsis truncation",
  );
}

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
assert.ok(
  payload.embeds.length <= 3,
  "weekly Discord payload must contain at most three event cards",
);
assert.ok(
  payload.embeds.every((embed) => embed.title !== "週次要約"),
  "weekly Discord payload must not duplicate the textual summary in an embed",
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

const japaneseSurfaceDryRun = spawnSync(
  process.execPath,
  [
    "scripts/notify-discord.mjs",
    "--mode",
    "weekly",
    "--date",
    "2026-06-19",
    "--window-days",
    "7",
    "--dry-run",
    "--force-preview",
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.equal(japaneseSurfaceDryRun.status, 0, japaneseSurfaceDryRun.stderr);
const japanesePayload = parseDryRunPayload(japaneseSurfaceDryRun.stdout);
const japanesePayloadText = JSON.stringify(japanesePayload);
assert.doesNotMatch(
  japanesePayloadText,
  /英語 summary では/,
  "Discord payload must not expose English-summary fallback copy",
);
assert.doesNotMatch(
  japanesePayloadText,
  /\[機能更新\] Copilot code review: AGENTS\.md support and UI improvements/,
  "Discord payload must use the Japanese title for the Copilot code review AGENTS.md update",
);
assert.ok(
  japanesePayload.embeds.length <= 3,
  "weekly payload must select no more than three reader-facing updates",
);

const qualityPayloadRun = spawnSync(
  process.execPath,
  [
    "scripts/notify-discord.mjs",
    "--mode",
    "weekly",
    "--date",
    "2026-07-21",
    "--window-days",
    "7",
    "--dry-run",
    "--force-preview",
  ],
  { cwd: process.cwd(), encoding: "utf8" },
);
assert.equal(qualityPayloadRun.status, 0, qualityPayloadRun.stderr);
const qualityPayload = parseDryRunPayload(qualityPayloadRun.stdout);
assert.ok(
  qualityPayload.embeds.length <= 3,
  "quality-filtered weekly payload must remain within the three-card limit",
);
const qualityPayloadText = JSON.stringify(qualityPayload);
assert.doesNotMatch(
  qualityPayloadText,
  /GitHub Docs \/ Copilot how-tos changed|監視対象ページで差分を検知|Visual Studio Code 1\.130（Insiders）リリース/,
  "audit-only changes and future-dated Insiders releases must not be sent to Discord",
);

console.log("pages-discord-ux.test.mjs: OK");

function parseDryRunPayload(stdout) {
  const start = stdout.indexOf("{\n");
  const end = stdout.lastIndexOf("\n}");
  assert.ok(start >= 0 && end > start, "dry-run must print JSON payload");
  return JSON.parse(stdout.slice(start, end + 2));
}
