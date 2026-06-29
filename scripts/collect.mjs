import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import * as cheerio from "cheerio";
import { diffLines } from "diff";
import { XMLParser } from "fast-xml-parser";

import {
  applyEditorialPolicy,
  buildDailyDigest,
  importanceReason,
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  originalTitle,
  summarizeEventSet,
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
    if (raw.trim() === "") {
      return fallbackValue;
    }

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

async function readExistingEventLogs() {
  const entries = await fs
    .readdir(eventsDir, { withFileTypes: true })
    .catch((error) => {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    });

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(eventsDir, entry.name));

  const logs = [];
  for (const filePath of files) {
    logs.push(await readJson(filePath, null));
  }

  return logs.filter(Boolean);
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
  const rootMatched = root.length > 0;
  const target = rootMatched ? root : $("body").first();

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
    rootMatched,
  };
}

function normalizeUrl(baseUrl, href) {
  try {
    return new URL(String(href ?? ""), baseUrl).toString();
  } catch {
    return "";
  }
}

function parseVsCodeReleaseVersion(url) {
  const match = String(url ?? "").match(/\/updates\/v(\d+)_(\d+)(?:$|[#/?])/i);
  if (!match) {
    return null;
  }

  return `${match[1]}.${match[2]}`;
}

function compareVersionStrings(left, right) {
  const leftParts = String(left ?? "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right ?? "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function discoverVsCodeReleaseNoteSources(indexSource, html) {
  const $ = cheerio.load(html);
  const root = $(indexSource.rootSelector ?? "main").first();
  const target = root.length > 0 ? root : $("body").first();
  const releaseLinks = new Map();
  const currentStableVersion =
    normalizeWhitespace(target.text()).match(
      /Visual Studio Code ([0-9.]+)/i,
    )?.[1] ?? null;

  target.find('a[href*="/updates/v"]').each((_, element) => {
    const url = normalizeUrl(indexSource.url, $(element).attr("href"));
    const version = parseVsCodeReleaseVersion(url);
    if (!version) {
      return;
    }

    if (
      currentStableVersion &&
      compareVersionStrings(version, currentStableVersion) > 0
    ) {
      return;
    }

    releaseLinks.set(version, url.split("#")[0]);
  });

  const sortedReleases = [...releaseLinks.entries()]
    .sort((left, right) => compareVersionStrings(right[0], left[0]))
    .slice(0, 4);

  return sortedReleases.map(([version, url]) => ({
    id: `vscode-release-notes-${version.replace(/\./g, "-")}`,
    name: `VS Code Release Notes ${version}`,
    kind: "html_snapshot",
    url,
    rootSelector: indexSource.rootSelector ?? "main",
    contentSelector: indexSource.contentSelector ?? "h1, h2, h3, p, li",
    maxDiffLines: 24,
    emitOnInitialSnapshot: true,
    eventTitleMode: "heading",
    trackSections: version === currentStableVersion,
  }));
}

function parseReleaseDateFromText(text) {
  const match = text.match(/Release date:\s*([A-Za-z]+ \d{1,2}, \d{4})/i);
  if (!match) {
    return null;
  }

  const date = new Date(match[1]);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isRelevantVsCodeReleaseSection(section) {
  const text =
    `${section.parentHeading} ${section.title} ${section.summary}`.toLowerCase();
  return /chat|copilot|agent|semantic|workspace search|#codebase|troubleshoot|session|mcp|claude|tool approval|approval|prompt|debug|github pull requests|extension api|extensions?/i.test(
    text,
  );
}

function extractVsCodeReleaseSections(source, html) {
  if (!source.trackSections) {
    return { releaseTitle: null, publishedAt: null, sections: [] };
  }

  const $ = cheerio.load(html);
  const root = $(source.rootSelector ?? "main").first();
  const target = root.length > 0 ? root : $("body").first();
  const releaseTitle = normalizeWhitespace(target.find("h1").first().text());
  const publishedAt = parseReleaseDateFromText(
    normalizeWhitespace(target.text()),
  );
  const sections = [];
  let currentH2 = "";
  let currentSection = null;

  target.find("h2, h3, p, li").each((_, element) => {
    const tag = String(element.tagName ?? "").toLowerCase();
    const text = normalizeWhitespace($(element).text());
    if (!text) {
      return;
    }

    if (tag === "h2") {
      currentH2 = text;
      currentSection = null;
      return;
    }

    if (tag === "h3") {
      currentSection = {
        parentHeading: currentH2,
        title: text,
        lines: [],
      };
      sections.push(currentSection);
      return;
    }

    if (currentSection) {
      currentSection.lines.push(text);
    }
  });

  return {
    releaseTitle,
    publishedAt,
    sections: sections
      .map((section) => ({
        ...section,
        summary: createExcerpt(section.lines.join(" "), 420),
      }))
      .filter(
        (section) => section.summary && isRelevantVsCodeReleaseSection(section),
      )
      .slice(0, 4),
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

function buildVsCodeSectionStateKey(sourceId, sectionHeading, sectionTitle) {
  return `${sourceId}:${sectionHeading}:${sectionTitle}`;
}

function getVsCodeSectionTitle(event) {
  if (event.sectionTitle) {
    return String(event.sectionTitle);
  }

  const title = String(event.title ?? "");
  const separatorIndex = title.indexOf(": ");
  return separatorIndex >= 0 ? title.slice(separatorIndex + 2) : title;
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
  const entries = parseFeed(source, xmlText).filter((entry) =>
    matchesKeywords(source, entry),
  );
  const collectionTime = new Date();
  const seenIds = new Set(sourceState.seenIds ?? []);
  const futureSeenIds = new Set(sourceState.futureSeenIds ?? []);
  const events = [];

  const publishedEntries = entries.filter(
    (entry) => safeDate(entry.publishedAt) <= collectionTime,
  );
  const futureEntries = entries.filter(
    (entry) => safeDate(entry.publishedAt) > collectionTime,
  );

  for (const entry of publishedEntries) {
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
      isFutureDated: false,
      score: scoreEntry(entry),
    });
  }

  for (const entry of futureEntries) {
    if (seenIds.has(entry.id) || futureSeenIds.has(entry.id)) {
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
      isFutureDated: true,
      score: scoreEntry(entry),
    });
  }

  const updatedSeenIds = [
    ...new Set([...publishedEntries.map((entry) => entry.id), ...seenIds]),
  ].slice(0, 500);
  const updatedFutureSeenIds = [
    ...new Set([
      ...futureEntries.map((entry) => entry.id),
      ...[...futureSeenIds].filter(
        (entryId) => !updatedSeenIds.includes(entryId),
      ),
    ]),
  ].slice(0, 500);

  return {
    events,
    nextState: {
      ...sourceState,
      seenIds: updatedSeenIds,
      futureSeenIds: updatedFutureSeenIds,
      lastCheckedAt: new Date().toISOString(),
    },
  };
}

async function collectHtmlSnapshotSource(source, sourceState) {
  const html = await fetchText(source.url);
  const { normalizedText, headings, rootMatched } = buildHtmlSnapshot(
    source,
    html,
  );
  // Guard against a "blind" extraction poisoning the baseline. If the page's
  // DOM changed so rootSelector no longer matches, or contentSelector yields no
  // text, we must not overwrite the last-good snapshot/hash: doing so would
  // silently stop change detection (or fire a spurious whole-page diff). Throw
  // instead so the dispatcher records an error and preserves the prior state.
  if (!rootMatched) {
    throw new Error(
      `html_snapshot rootSelector "${source.rootSelector ?? "main"}" matched no elements for ${source.url}`,
    );
  }
  if (!normalizedText.trim()) {
    throw new Error(
      `html_snapshot contentSelector "${source.contentSelector ?? "(default)"}" extracted no content for ${source.url}`,
    );
  }
  const { releaseTitle, publishedAt, sections } = extractVsCodeReleaseSections(
    source,
    html,
  );
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
  const headingTitle = headings[0] || releaseTitle || source.name;
  const basePublishedAt =
    publishedAt ??
    parseReleaseDateFromText(normalizedText) ??
    new Date().toISOString();
  const shouldEmitSnapshotEvent = !(
    source.trackSections && sections.length > 0
  );

  if (
    shouldEmitSnapshotEvent &&
    !sourceState.snapshotHash &&
    source.emitOnInitialSnapshot
  ) {
    events.push({
      eventId: `${source.id}:${snapshotHash}`,
      sourceId: source.id,
      sourceName: source.name,
      kind: "html_snapshot_change",
      detectedAt: new Date().toISOString(),
      publishedAt: basePublishedAt,
      title:
        source.eventTitleMode === "heading"
          ? headingTitle
          : `${source.name} changed`,
      url: source.url,
      summary:
        headings.length > 1
          ? `Captured the current snapshot for ${headingTitle}.`
          : `Captured the current snapshot for ${source.name}.`,
      categories: ["snapshot"],
      headings: headings.slice(0, 12),
      score: 2 + headings.length,
    });
  } else if (
    shouldEmitSnapshotEvent &&
    sourceState.snapshotHash &&
    sourceState.snapshotHash !== snapshotHash
  ) {
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
      publishedAt: basePublishedAt,
      title:
        source.eventTitleMode === "heading"
          ? headingTitle
          : `${source.name} changed`,
      url: source.url,
      summary: `Detected ${diffSummary.addedLineCount} added lines on the monitored page.`,
      categories: ["snapshot"],
      diffSummary,
      headings: headings.slice(0, 12),
      score: 2 + diffSummary.headings.length,
    });
  }

  if (source.trackSections && sections.length > 0) {
    const knownSections = {
      ...(sourceState.sectionHashes ?? {}),
    };
    const nextSectionHashes = {};

    for (const section of sections) {
      const sectionKey = buildVsCodeSectionStateKey(
        source.id,
        section.parentHeading,
        section.title,
      );
      const sectionHash = hashText(
        `${section.parentHeading}\n${section.title}\n${section.summary}`,
      );
      nextSectionHashes[sectionKey] = sectionHash;
      if (knownSections[sectionKey] === sectionHash) {
        continue;
      }

      events.push({
        eventId: `${source.id}:section:${sectionHash}`,
        sourceId: source.id,
        sourceName: source.name,
        kind: "vscode_release_note_section",
        detectedAt: new Date().toISOString(),
        publishedAt: basePublishedAt,
        title: `${headingTitle}: ${section.title}`,
        url: source.url,
        summary: section.summary,
        categories: ["release", "section", section.parentHeading].filter(
          Boolean,
        ),
        sectionHeading: section.parentHeading,
        sectionTitle: section.title,
        score: 4,
      });
    }

    sourceState = {
      ...sourceState,
      sectionHashes: nextSectionHashes,
    };
  }

  await fs.writeFile(snapshotFile, normalizedText, "utf8");

  return {
    events,
    nextState: {
      ...sourceState,
      releasePublishedAt: basePublishedAt,
      releaseTitle: headingTitle,
      snapshotHash,
      lastCheckedAt: new Date().toISOString(),
    },
  };
}

function normalizeTrackedEventMetadata(events, sourceStates) {
  return (events ?? [])
    .map((event) => {
      const sourceId = String(event.sourceId ?? "");
      if (!sourceId.startsWith("vscode-release-notes-")) {
        return event;
      }

      const sourceState = sourceStates?.[sourceId];
      const releasePublishedAt = sourceState?.releasePublishedAt;
      if (!releasePublishedAt || event.publishedAt === releasePublishedAt) {
        return event;
      }

      return {
        ...event,
        publishedAt: releasePublishedAt,
      };
    })
    .filter((event) => {
      const sourceId = String(event.sourceId ?? "");
      if (!sourceId.startsWith("vscode-release-notes-")) {
        return true;
      }

      const sourceState = sourceStates?.[sourceId];
      const sectionHashes = sourceState?.sectionHashes ?? {};
      const hasTrackedSections = Object.keys(sectionHashes).length > 0;

      if (event.kind === "html_snapshot_change" && hasTrackedSections) {
        return false;
      }

      if (event.kind !== "vscode_release_note_section" || !hasTrackedSections) {
        return true;
      }

      const sectionKey = buildVsCodeSectionStateKey(
        sourceId,
        String(event.sectionHeading ?? ""),
        getVsCodeSectionTitle(event),
      );

      return Boolean(sectionHashes[sectionKey]);
    });
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
  lines.push(`- 未来日付の予告件数: ${digest.futureUniqueCount}`);
  lines.push(`- 収集対象イベント数: ${digest.rawEventCount}`);
  lines.push(`- 更新を拾ったソース数: ${digest.sourceBreakdown.length}`);
  lines.push(`- 取得エラー数: ${digest.errorCount}`);
  if (digest.uniqueEventCount > 0) {
    lines.push(
      `- 公開済み更新サマリー: ${summarizeEventSet(digest.uniqueEvents, "ja", { maxLength: 960, maxHighlights: 5 })}`,
    );
  }
  lines.push("");

  if (digest.futureUniqueCount > 0) {
    lines.push("## 先行検知した未来日付の項目", "");
    lines.push(
      "- 注記: feed 上では見えているものの、公開日が未来なので通常のハイライトやテーマ別まとめにはまだ混ぜていません。正式公開までは文言や URL が変わる可能性があります。",
      "",
    );
    for (const [index, event] of digest.futureEvents.entries()) {
      lines.push(`### F${index + 1}. ${localizedTitle(event)}`);
      lines.push("");
      lines.push(`- 公開予定日: ${event.publishedAt}`);
      lines.push(`- URL: ${event.url}`);
      lines.push(
        `- ソース: ${(event.sourceNames ?? [event.sourceName]).join(", ")}`,
      );
      lines.push(`- 要点: ${localizedSummary(event)}`);
      lines.push("");
    }
  }

  if (digest.uniqueEventCount === 0) {
    lines.push("この日の公開済み更新はありませんでした。", "");
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
      lines.push(
        `- ソース: ${(event.sourceNames ?? [event.sourceName]).join(", ")}`,
      );
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
        lines.push(
          `  - ソース: ${(event.sourceNames ?? [event.sourceName]).join(", ")}`,
        );
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

function shouldWriteDailySummary(eventLog) {
  const digest = buildDailyDigest(eventLog);
  return digest.uniqueEventCount > 0 || digest.futureUniqueCount > 0;
}

async function main() {
  await Promise.all([
    ensureDirectory(eventsDir),
    ensureDirectory(snapshotsDir),
    ensureDirectory(summaryDir),
  ]);

  const [configuredSources, state] = await Promise.all([
    readJson(configFile, []),
    readJson(stateFile, { version: 1, sources: {} }),
  ]);
  const logs = await readExistingEventLogs();

  const sources = [...configuredSources];
  const vscodeUpdatesSource = configuredSources.find(
    (source) => source.id === "vscode-updates",
  );
  if (vscodeUpdatesSource) {
    try {
      const indexHtml = await fetchText(vscodeUpdatesSource.url);
      const dynamicReleaseSources = discoverVsCodeReleaseNoteSources(
        vscodeUpdatesSource,
        indexHtml,
      );
      const configuredIds = new Set(sources.map((source) => source.id));
      for (const source of dynamicReleaseSources) {
        if (!configuredIds.has(source.id)) {
          sources.push(source);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to discover VS Code release notes: ${message}`);
    }
  }

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
  const seenEventIds = new Map(
    mergedEvents.map((event, index) => [event.eventId, index]),
  );
  for (const event of events) {
    const existingIndex = seenEventIds.get(event.eventId);
    if (existingIndex === undefined) {
      mergedEvents.push(event);
      seenEventIds.set(event.eventId, mergedEvents.length - 1);
      continue;
    }

    const existingEvent = mergedEvents[existingIndex];
    if (existingEvent?.isFutureDated && !event.isFutureDated) {
      mergedEvents[existingIndex] = {
        ...existingEvent,
        ...event,
      };
    }
  }

  const normalizedMergedEvents = normalizeTrackedEventMetadata(
    mergedEvents,
    nextState.sources,
  );

  normalizedMergedEvents.sort(
    (left, right) => safeDate(right.publishedAt) - safeDate(left.publishedAt),
  );
  const collectionTime = new Date();
  const filteredMergedEvents = applyEditorialPolicy(normalizedMergedEvents);
  const publishedEvents = filteredMergedEvents.filter(
    (event) =>
      !event.isFutureDated &&
      safeDate(event.publishedAt ?? event.detectedAt) <= collectionTime,
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
    events: filteredMergedEvents,
    errors,
  };
  const allLogs = [...logs.filter((log) => log.date !== today), eventLog].sort(
    (left, right) => safeDate(left.date) - safeDate(right.date),
  );
  const summaryWrites = allLogs.map(async (log) => {
    const summaryFile = path.join(summaryDir, `${log.date}.md`);
    if (!shouldWriteDailySummary(log)) {
      await fs.rm(summaryFile, { force: true });
      return;
    }

    await fs.writeFile(
      summaryFile,
      renderMarkdownSummary(log.date, log),
      "utf8",
    );
  });

  await Promise.all([
    fs.writeFile(eventFile, JSON.stringify(eventLog, null, 2), "utf8"),
    fs.writeFile(stateFile, JSON.stringify(nextState, null, 2), "utf8"),
    ...summaryWrites,
  ]);

  console.log(`Collected ${events.length} new event(s).`);
  console.log(`Latest run metadata written to ${eventFile}.`);
  if (errors.length > 0) {
    console.warn(`Encountered ${errors.length} error(s).`);
  }
}

await main();
