import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import * as cheerio from "cheerio";
import { diffLines } from "diff";
import { XMLParser } from "fast-xml-parser";

import {
  applyEditorialPolicy,
  buildDailyDigest,
  buildEditorialNote,
  importanceReason,
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  originalTitle,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const configFile = path.join(workspaceRoot, "config", "sources.json");
const stateFile = path.join(workspaceRoot, "data", "state.json");
const eventsDir = path.join(workspaceRoot, "data", "events");
const snapshotsDir = path.join(workspaceRoot, "data", "snapshots");
const summaryDir = path.join(workspaceRoot, "summaries", "daily");

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: true,
});

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeDate(value) {
  const date = new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function isoDate(value) {
  return safeDate(value).toISOString();
}

function stripHtml(html) {
  const $ = cheerio.load(String(html ?? ""));
  return normalizeWhitespace($.text());
}

function createExcerpt(text, maxLength = 320) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function readXmlText(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return value["#text"] ?? value.__cdata ?? "";
  }

  return String(value);
}

async function readJson(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallbackValue;
    }

    throw error;
  }
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "github-actions-update-monitor/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

function parseFeed(source, xmlText) {
  const document = xmlParser.parse(xmlText);

  if (document.rss?.channel) {
    const items = toArray(document.rss.channel.item);
    return items.slice(0, source.maxItems ?? items.length).map((item) => {
      const categories = toArray(item.category).map((entry) =>
        readXmlText(entry),
      );
      const content = item.description ?? item["content:encoded"] ?? "";

      return {
        id:
          readXmlText(item.guid) ||
          readXmlText(item.link) ||
          hashText(JSON.stringify(item)),
        title: normalizeWhitespace(readXmlText(item.title)),
        url: normalizeWhitespace(readXmlText(item.link)),
        publishedAt: isoDate(item.pubDate),
        summary: createExcerpt(stripHtml(content)),
        categories,
      };
    });
  }

  if (document.feed) {
    const entries = toArray(document.feed.entry);
    return entries.slice(0, source.maxItems ?? entries.length).map((entry) => {
      const link = toArray(entry.link).find(
        (candidate) => candidate.rel === "alternate" || !candidate.rel,
      );
      const content = entry.content ?? entry.summary ?? "";
      const categories = toArray(entry.category).map(
        (candidate) => candidate.term ?? readXmlText(candidate),
      );

      return {
        id:
          normalizeWhitespace(readXmlText(entry.id)) ||
          normalizeWhitespace(link?.href) ||
          hashText(JSON.stringify(entry)),
        title: normalizeWhitespace(readXmlText(entry.title)),
        url: normalizeWhitespace(link?.href),
        publishedAt: isoDate(entry.updated ?? entry.published),
        summary: createExcerpt(stripHtml(readXmlText(content))),
        categories,
      };
    });
  }

  throw new Error(`Unsupported feed format for source ${source.id}`);
}

function matchesKeywords(source, entry) {
  const keywords = source.includeKeywords ?? [];
  if (keywords.length === 0) {
    return true;
  }

  const haystack = [entry.title, entry.summary, entry.categories.join(" ")]
    .join("\n")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function buildHtmlSnapshot(source, html) {
  const $ = cheerio.load(html);
  const root = $(source.rootSelector ?? "main").first();
  const target = root.length > 0 ? root : $("body").first();

  target.find("script, style, noscript, svg, img, video, iframe").remove();

  const lines = [];
  target
    .find(source.contentSelector ?? "h1, h2, h3, p, li")
    .each((_, element) => {
      const tag = String(element.tagName ?? "").toLowerCase();
      const text = normalizeWhitespace($(element).text());
      if (!text) {
        return;
      }

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        lines.push(`${tag.toUpperCase()}: ${text}`);
        return;
      }

      lines.push(text);
    });

  const normalizedText = normalizeWhitespace(lines.join("\n"));
  const headings = lines
    .filter(
      (line) =>
        line.startsWith("H1:") ||
        line.startsWith("H2:") ||
        line.startsWith("H3:"),
    )
    .map((line) => line.replace(/^H[123]:\s*/, ""));

  return {
    normalizedText,
    headings,
  };
}

function summarizeDiff(previousText, nextText, maxDiffLines) {
  const addedLines = [];
  for (const part of diffLines(previousText, nextText)) {
    if (!part.added) {
      continue;
    }

    for (const line of part.value.split("\n")) {
      const normalizedLine = normalizeWhitespace(line);
      if (normalizedLine) {
        addedLines.push(normalizedLine);
      }
    }
  }

  const uniqueLines = [...new Set(addedLines)];
  const headingLines = uniqueLines
    .filter(
      (line) =>
        line.startsWith("H1:") ||
        line.startsWith("H2:") ||
        line.startsWith("H3:"),
    )
    .map((line) => line.replace(/^H[123]:\s*/, ""));

  return {
    addedLineCount: uniqueLines.length,
    headings: headingLines.slice(0, maxDiffLines),
    additions: uniqueLines.slice(0, maxDiffLines),
  };
}

function scoreEntry(entry) {
  const text = `${entry.title} ${entry.summary}`.toLowerCase();
  let score = 0;

  if (
    entry.categories.some(
      (category) => String(category).toLowerCase() === "release",
    )
  ) {
    score += 3;
  }

  if (
    entry.categories.some(
      (category) => String(category).toLowerCase() === "retired",
    )
  ) {
    score += 3;
  }

  for (const keyword of [
    "copilot",
    "agent",
    "sdk",
    "release notes",
    "vscode",
    "visual studio code",
    "ga",
    "public preview",
  ]) {
    if (text.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}

async function collectFeedSource(source, sourceState) {
  const xmlText = await fetchText(source.url);
  const entries = parseFeed(source, xmlText)
    .filter((entry) => matchesKeywords(source, entry))
    .filter((entry) => safeDate(entry.publishedAt) <= new Date());
  const seenIds = new Set(sourceState.seenIds ?? []);
  const events = [];

  for (const entry of entries) {
    if (seenIds.has(entry.id)) {
      continue;
    }

    events.push({
      eventId: `${source.id}:${entry.id}`,
      sourceId: source.id,
      sourceName: source.name,
      kind: "feed_entry",
      detectedAt: new Date().toISOString(),
      publishedAt: entry.publishedAt,
      title: entry.title,
      url: entry.url,
      summary: entry.summary,
      categories: entry.categories,
      score: scoreEntry(entry),
    });
  }

  const updatedSeenIds = [
    ...new Set([...entries.map((entry) => entry.id), ...seenIds]),
  ].slice(0, 500);

  return {
    events,
    nextState: {
      ...sourceState,
      seenIds: updatedSeenIds,
      lastCheckedAt: new Date().toISOString(),
    },
  };
}

async function collectHtmlSnapshotSource(source, sourceState) {
  const html = await fetchText(source.url);
  const { normalizedText, headings } = buildHtmlSnapshot(source, html);
  const snapshotHash = hashText(normalizedText);
  const snapshotFile = path.join(snapshotsDir, `${source.id}.txt`);
  const previousText = await fs
    .readFile(snapshotFile, "utf8")
    .catch((error) => {
      if (error.code === "ENOENT") {
        return "";
      }

      throw error;
    });

  const events = [];
  if (sourceState.snapshotHash && sourceState.snapshotHash !== snapshotHash) {
    const diffSummary = summarizeDiff(
      previousText,
      normalizedText,
      source.maxDiffLines ?? 12,
    );
    events.push({
      eventId: `${source.id}:${snapshotHash}`,
      sourceId: source.id,
      sourceName: source.name,
      kind: "html_snapshot_change",
      detectedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      title: `${source.name} changed`,
      url: source.url,
      summary: `Detected ${diffSummary.addedLineCount} added lines on the monitored page.`,
      categories: ["snapshot"],
      diffSummary,
      headings: headings.slice(0, 12),
      score: 2 + diffSummary.headings.length,
    });
  }

  await fs.writeFile(snapshotFile, normalizedText, "utf8");

  return {
    events,
    nextState: {
      ...sourceState,
      snapshotHash,
      lastCheckedAt: new Date().toISOString(),
    },
  };
}

function renderMarkdownSummary(dateKey, eventLog) {
  const digest = buildDailyDigest(eventLog);
  const lines = [
    `# Daily Update Summary - ${dateKey}`,
    "",
    `Generated at: ${eventLog.generatedAt}`,
    "",
  ];

  lines.push("## 概況", "");
  lines.push(`- 直近 run の新規件数: ${digest.latestRun.newEventsCount}`);
  lines.push(`- 重複除去後の更新件数: ${digest.uniqueEventCount}`);
  lines.push(`- 収集対象イベント数: ${digest.rawEventCount}`);
  lines.push(`- 更新を拾ったソース数: ${digest.sourceBreakdown.length}`);
  lines.push(`- 取得エラー数: ${digest.errorCount}`);
  lines.push("");

  if (digest.editorialNote) {
    lines.push(`- ${digest.editorialNote}`);
    lines.push("");
  }

  if (digest.uniqueEventCount === 0) {
    lines.push("この日の新しい更新はありませんでした。", "");
  } else {
    lines.push("## 注目トピック", "");
    for (const [index, event] of digest.highlights.entries()) {
      lines.push(`### ${index + 1}. ${localizedTitle(event)}`);
      lines.push("");
      const rawTitle = originalTitle(event);
      lines.push(`- ラベル: ${localizedImportanceLabel(event)}`);
      if (rawTitle) {
        lines.push(`- 原題: ${rawTitle}`);
      }
      lines.push(`- なぜ重要か: ${importanceReason(event)}`);
      lines.push(`- URL: ${event.url}`);
      lines.push(`- ソース: ${(event.sourceNames ?? [event.sourceName]).join(", ")}`);
      lines.push(`- 要点: ${localizedSummary(event)}`);
      lines.push("");
    }

    lines.push("## テーマ別まとめ", "");
    for (const topic of digest.topics) {
      lines.push(`### ${topic.name} (${topic.count})`, "");
      if (topic.count === 0) {
        lines.push("- このテーマの更新はありませんでした。", "");
        continue;
      }

      for (const event of topic.events.slice(0, 6)) {
        lines.push(`- ${localizedTitle(event)}`);
        lines.push(`  - ラベル: ${localizedImportanceLabel(event)}`);
        lines.push(`  - URL: ${event.url}`);
      }
      lines.push("");
    }

    lines.push("## ソース内訳", "");
    for (const source of digest.sourceBreakdown) {
      lines.push(`- ${source.name}: ${source.count}`);
    }
    lines.push("");

    lines.push("## 全件一覧", "");
    for (const topic of digest.topics) {
      if (topic.count === 0) {
        continue;
      }

      lines.push(`### ${topic.name}`, "");
      for (const event of topic.events) {
        lines.push(`- ${localizedTitle(event)}`);
        lines.push(`  - 公開日時: ${event.publishedAt}`);
        lines.push(`  - ラベル: ${localizedImportanceLabel(event)}`);
        lines.push(`  - ソース: ${(event.sourceNames ?? [event.sourceName]).join(", ")}`);
        lines.push(`  - URL: ${event.url}`);
        const rawTitle = originalTitle(event);
        if (rawTitle) {
          lines.push(`  - 原題: ${rawTitle}`);
        }
        if ((event.categories ?? []).length > 0) {
          lines.push(`  - カテゴリ: ${event.categories.join(", ")}`);
        }
        lines.push(`  - 要点: ${localizedSummary(event)}`);
        lines.push("");
      }
    }

    lines.push("## データファイル", "");
    lines.push(`- JSON: data/events/${dateKey}.json`);
    lines.push(`- Markdown: summaries/daily/${dateKey}.md`);
    lines.push("");
  }

  if ((eventLog.errors ?? []).length > 0) {
    lines.push("## Errors", "");
    for (const error of eventLog.errors) {
      lines.push(`- ${error.sourceId}: ${error.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  await Promise.all([
    ensureDirectory(eventsDir),
    ensureDirectory(snapshotsDir),
    ensureDirectory(summaryDir),
  ]);

  const [sources, state] = await Promise.all([
    readJson(configFile, []),
    readJson(stateFile, { version: 1, sources: {} }),
  ]);

  const nextState = {
    version: 1,
    sources: { ...(state.sources ?? {}) },
  };

  const errors = [];
  const events = [];

  for (const source of sources) {
    const sourceState = nextState.sources[source.id] ?? {};
    try {
      const result =
        source.kind === "html_snapshot"
          ? await collectHtmlSnapshotSource(source, sourceState)
          : await collectFeedSource(source, sourceState);

      nextState.sources[source.id] = result.nextState;
      events.push(...result.events);
    } catch (error) {
      errors.push({
        sourceId: source.id,
        message: error instanceof Error ? error.message : String(error),
      });

      nextState.sources[source.id] = {
        ...sourceState,
        lastCheckedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const eventFile = path.join(eventsDir, `${today}.json`);
  const existingEventLog = await readJson(eventFile, {
    date: today,
    generatedAt: null,
    latestRun: null,
    events: [],
  });
  const mergedEvents = [...existingEventLog.events];
  const seenEventIds = new Set(mergedEvents.map((event) => event.eventId));
  for (const event of events) {
    if (!seenEventIds.has(event.eventId)) {
      mergedEvents.push(event);
    }
  }

  mergedEvents.sort(
    (left, right) => safeDate(right.publishedAt) - safeDate(left.publishedAt),
  );
  const collectionTime = new Date();
  const filteredMergedEvents = applyEditorialPolicy(
    mergedEvents.filter(
      (event) => safeDate(event.publishedAt ?? event.detectedAt) <= collectionTime,
    ),
  );

  const latestRun = {
    generatedAt: new Date().toISOString(),
    newEventsCount: events.length,
    newEventIds: events.map((event) => event.eventId),
    errorCount: errors.length,
  };

  const eventLog = {
    date: today,
    generatedAt: latestRun.generatedAt,
    latestRun,
    editorialNote: buildEditorialNote(today, filteredMergedEvents),
    events: filteredMergedEvents,
    errors,
  };
  const summaryMarkdown = renderMarkdownSummary(today, eventLog);

  await Promise.all([
    fs.writeFile(eventFile, JSON.stringify(eventLog, null, 2), "utf8"),
    fs.writeFile(path.join(summaryDir, `${today}.md`), summaryMarkdown, "utf8"),
    fs.writeFile(stateFile, JSON.stringify(nextState, null, 2), "utf8"),
  ]);

  console.log(`Collected ${events.length} new event(s).`);
  console.log(`Latest run metadata written to ${eventFile}.`);
  if (errors.length > 0) {
    console.warn(`Encountered ${errors.length} error(s).`);
  }
}

await main();
