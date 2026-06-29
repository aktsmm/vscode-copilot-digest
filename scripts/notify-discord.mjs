import fs from "node:fs/promises";
import path from "node:path";

import * as cheerio from "cheerio";

import {
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  summarizeEventSet,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const eventsDir = path.join(workspaceRoot, "data", "events");
const DISCORD_CONTENT_LIMIT = 1900;
const DISCORD_SUMMARY_LIMIT = 520;
const DISCORD_WEEKLY_SUMMARY_LIMIT = 620;
const DISCORD_DAILY_EVENT_LIMIT = 4;
const DISCORD_WINDOW_EVENT_LIMIT = 4;
const DISCORD_WEEKLY_EVENT_LIMIT = 6;
const DISCORD_EMBED_LIMIT = 10;
const DISCORD_EMBED_TOTAL_TEXT_LIMIT = 6000;
const DISCORD_EMBED_TITLE_LIMIT = 256;
const DISCORD_EMBED_DESCRIPTION_LIMIT = 900;
const DISCORD_EMBED_FIELD_VALUE_LIMIT = 1024;
const OG_FETCH_TIMEOUT_MS = 2500;

const discordColorByScore = [
  0x6b7280, 0x6b7280, 0x84cc16, 0xf59e0b, 0xea580c, 0xdc2626,
];

function parseArgs(argv) {
  const options = {
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    forcePreview: false,
    windowDays: 1,
    cadenceDays: 1,
    anchorDate: null,
    includeOg: false,
    threadId: null,
    threadName: null,
    mode: "daily",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--date") {
      options.date = parseDateKeyOption(argv[index + 1], "--date");
      index += 1;
      continue;
    }

    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (argument === "--force-preview") {
      options.forcePreview = true;
      continue;
    }

    if (argument === "--include-og") {
      options.includeOg = true;
      continue;
    }

    if (argument === "--thread-id") {
      options.threadId = String(argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (argument === "--thread-name") {
      options.threadName = String(argv[index + 1] ?? "").trim() || null;
      index += 1;
      continue;
    }

    if (argument === "--window-days") {
      options.windowDays = parsePositiveInteger(
        argv[index + 1],
        "--window-days",
      );
      index += 1;
      continue;
    }

    if (argument === "--cadence-days") {
      options.cadenceDays = parsePositiveInteger(
        argv[index + 1],
        "--cadence-days",
      );
      index += 1;
      continue;
    }

    if (argument === "--anchor-date") {
      options.anchorDate = parseDateKeyOption(argv[index + 1], "--anchor-date");
      index += 1;
      continue;
    }

    if (argument === "--mode") {
      options.mode = argv[index + 1] ?? "daily";
      index += 1;
    }
  }

  return options;
}

function parsePositiveInteger(value, optionName) {
  const text = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(text)) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  const number = Number(text);
  if (!Number.isSafeInteger(number) || number > 31) {
    throw new Error(`${optionName} must be between 1 and 31.`);
  }

  return number;
}

function parseDateKeyOption(value, optionName) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${optionName} must use YYYY-MM-DD.`);
  }

  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || toDateKey(date) !== text) {
    throw new Error(`${optionName} must be a valid calendar date.`);
  }

  return text;
}

function compactDateKey(dateKey) {
  return String(dateKey ?? "").replace(/-/g, "");
}

function toDateKey(value) {
  const date = value instanceof Date ? value : parseDateKey(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function listEventLogDates() {
  const files = await fs.readdir(eventsDir);
  return files
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

async function readEventLog(date) {
  const filePath = path.join(eventsDir, `${date}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function diffDays(leftDateKey, rightDateKey) {
  const left = parseDateKey(leftDateKey);
  const right = parseDateKey(rightDateKey);
  return Math.floor((left - right) / 86400000);
}

function resolveAnchorDate(availableDates, explicitAnchorDate, targetDate) {
  if (explicitAnchorDate) {
    return explicitAnchorDate;
  }

  return availableDates[0] ?? targetDate;
}

function shouldNotify(targetDate, anchorDate, cadenceDays) {
  if (cadenceDays <= 1) {
    return true;
  }

  const delta = diffDays(targetDate, anchorDate);
  return delta >= 0 && delta % cadenceDays === 0;
}

function resolveWindowDates(availableDates, targetDate, windowDays) {
  return availableDates
    .filter((date) => date <= targetDate)
    .slice(-Math.max(windowDays, 1));
}

function resolveCalendarWindow(targetDate, windowDays) {
  const endDate = parseDateKey(targetDate);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (Math.max(windowDays, 1) - 1));

  return {
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
  };
}

function rankEvent(event) {
  return (
    Number(event.score ?? 0) + (event.kind === "html_snapshot_change" ? 2 : 0)
  );
}

function trimLine(value, maxLength = 180) {
  const normalized = String(value ?? "")
    .replace(/\.{3,}/g, "…")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sentence = normalized.slice(0, maxLength + 1);
  const sentenceBreak = Math.max(
    sentence.lastIndexOf("。"),
    sentence.lastIndexOf(".") > 0 ? sentence.lastIndexOf(".") : -1,
    sentence.lastIndexOf("！"),
    sentence.lastIndexOf("!"),
    sentence.lastIndexOf("？"),
    sentence.lastIndexOf("?"),
  );
  if (sentenceBreak >= Math.floor(maxLength * 0.55)) {
    return sentence.slice(0, sentenceBreak + 1).trimEnd();
  }

  const fallback = normalized.slice(0, maxLength - 1);
  const wordBreak = Math.max(
    fallback.lastIndexOf(" "),
    fallback.lastIndexOf("、"),
    fallback.lastIndexOf(","),
  );
  const trimmed =
    wordBreak >= Math.floor(maxLength * 0.6)
      ? fallback.slice(0, wordBreak)
      : fallback;

  return `${trimmed.trimEnd()}…`;
}

function sanitizeDiscordContent(value) {
  return String(value ?? "").replace(/\.{3,}/g, "…");
}

function wrapReadableText(value, maxLineLength = 180) {
  const normalized = sanitizeDiscordContent(value).replace(/\s+/g, " ").trim();
  const lines = [];
  let remaining = normalized;

  while (remaining.length > maxLineLength) {
    const window = remaining.slice(0, maxLineLength + 1);
    const sentenceBreak = Math.max(
      window.lastIndexOf("。"),
      window.lastIndexOf("！"),
      window.lastIndexOf("!"),
      window.lastIndexOf("？"),
      window.lastIndexOf("?"),
    );
    const softBreak = Math.max(
      window.lastIndexOf("、"),
      window.lastIndexOf(","),
      window.lastIndexOf(" "),
    );
    const breakIndex =
      sentenceBreak >= Math.floor(maxLineLength * 0.45)
        ? sentenceBreak + 1
        : softBreak >= Math.floor(maxLineLength * 0.55)
          ? softBreak + 1
          : maxLineLength;

    lines.push(remaining.slice(0, breakIndex).trim());
    remaining = remaining.slice(breakIndex).trim();
  }

  if (remaining) {
    lines.push(remaining);
  }

  return lines;
}

function assertReadableDiscordPayload(payload) {
  const content = String(payload.content ?? "");
  if (content.length > DISCORD_CONTENT_LIMIT) {
    throw new Error(
      `Discord payload exceeds ${DISCORD_CONTENT_LIMIT} characters: ${content.length}`,
    );
  }

  if (/\.\.\./.test(content)) {
    throw new Error(
      "Discord payload contains ASCII ellipsis; use readable truncation.",
    );
  }

  const longLines = content
    .split("\n")
    .filter(
      (line) =>
        line.length > 240 &&
        !/^\s*(リンク|Pages|週間Pages|日次サマリー|週間ドラフト):\s+https?:\/\//.test(
          line,
        ),
    );
  if (longLines.length > 0) {
    throw new Error(
      `Discord payload contains ${longLines.length} overlong non-URL line(s).`,
    );
  }

  const embeds = payload.embeds ?? [];
  if (embeds.length > DISCORD_EMBED_LIMIT) {
    throw new Error(`Discord payload has too many embeds: ${embeds.length}`);
  }

  const embedTextLength = embeds.reduce((total, embed) => {
    const fieldLength = (embed.fields ?? []).reduce(
      (fieldTotal, field) =>
        fieldTotal +
        String(field.name ?? "").length +
        String(field.value ?? "").length,
      0,
    );
    return (
      total +
      String(embed.title ?? "").length +
      String(embed.description ?? "").length +
      String(embed.footer?.text ?? "").length +
      fieldLength
    );
  }, 0);

  if (embedTextLength > DISCORD_EMBED_TOTAL_TEXT_LIMIT) {
    throw new Error(
      `Discord embeds exceed ${DISCORD_EMBED_TOTAL_TEXT_LIMIT} text characters: ${embedTextLength}`,
    );
  }

  for (const embed of embeds) {
    if (String(embed.title ?? "").length > DISCORD_EMBED_TITLE_LIMIT) {
      throw new Error("Discord embed title exceeds limit.");
    }

    if (
      String(embed.description ?? "").length > DISCORD_EMBED_DESCRIPTION_LIMIT
    ) {
      throw new Error(
        "Discord embed description exceeds local readability limit.",
      );
    }

    for (const field of embed.fields ?? []) {
      if (String(field.value ?? "").length > DISCORD_EMBED_FIELD_VALUE_LIMIT) {
        throw new Error("Discord embed field value exceeds limit.");
      }
    }
  }
}

function buildRepoSummaryUrl(date) {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const refName = process.env.GITHUB_REF_NAME || "main";

  if (!serverUrl || !repository) {
    return null;
  }

  return `${serverUrl}/${repository}/blob/${refName}/summaries/daily/${date}.md`;
}

function buildRepoWeeklyDraftUrl(startDate, endDate) {
  const serverUrl = process.env.GITHUB_SERVER_URL;
  const repository = process.env.GITHUB_REPOSITORY;
  const refName = process.env.GITHUB_REF_NAME || "main";

  if (!serverUrl || !repository || !startDate || !endDate) {
    return null;
  }

  return `${serverUrl}/${repository}/blob/${refName}/drafts/weekly-${compactDateKey(startDate)}-${compactDateKey(endDate)}.md`;
}

function buildPagesDigestUrl(date) {
  const baseUrl =
    process.env.PAGES_BASE_URL ||
    "https://aktsmm.github.io/vscode-copilot-digest";

  return `${baseUrl.replace(/\/$/, "")}/days/${date}.html`;
}

function buildPagesWeeklyDigestUrl(startDate, endDate) {
  const baseUrl =
    process.env.PAGES_BASE_URL ||
    "https://aktsmm.github.io/vscode-copilot-digest";

  if (!startDate || !endDate) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}/weeks/${compactDateKey(startDate)}-${compactDateKey(endDate)}.html`;
}

function buildPagesSearchUrl(query) {
  const baseUrl =
    process.env.PAGES_BASE_URL ||
    "https://aktsmm.github.io/vscode-copilot-digest";
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/search.html`);
  if (query) {
    url.searchParams.set("q", trimLine(query, 80));
  }

  return url.toString();
}

function buildEventPagesUrl(event) {
  const date = event.dateKeys?.at(-1) ?? event.dateKey;
  return date ? buildPagesDigestUrl(date) : null;
}

async function fetchOgMetadata(url) {
  if (!url || !/^https?:\/\//.test(url)) {
    return null;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "vscode-copilot-digest/0.1 Discord preview metadata",
      },
    });
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const image = $('meta[property="og:image"]').attr("content") || null;
    if (!image) {
      return null;
    }

    return { image: new URL(image, url).toString() };
  } catch {
    return null;
  }
}

function buildSummaryEmbed(summary, options = {}) {
  if (!summary) {
    return null;
  }

  return {
    title: options.title ?? "要約",
    url: options.url ?? undefined,
    description: trimLine(summary, options.maxLength ?? 620),
    color: 0x0f766e,
    fields: options.searchUrl
      ? [
          {
            name: "検索",
            value: options.searchUrl,
            inline: false,
          },
        ]
      : [],
    footer: {
      text: options.footer ?? "Pages で詳細を確認できます",
    },
  };
}

function buildRepoWeeklyDraftPath(startDate, endDate) {
  return path.join(
    workspaceRoot,
    "drafts",
    `weekly-${compactDateKey(startDate)}-${compactDateKey(endDate)}.md`,
  );
}

function buildPagesWeeklyDigestPath(startDate, endDate) {
  return path.join(
    workspaceRoot,
    "site",
    "weeks",
    `${compactDateKey(startDate)}-${compactDateKey(endDate)}.html`,
  );
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function dedupeEvents(events) {
  const deduped = new Map();

  for (const event of events) {
    const key = event.url || event.title;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, {
        ...event,
        sourceNames: [event.sourceName],
        dateKeys: [event.dateKey],
      });
      continue;
    }

    deduped.set(key, {
      ...existing,
      score: Math.max(Number(existing.score ?? 0), Number(event.score ?? 0)),
      sourceNames: [...new Set([...existing.sourceNames, event.sourceName])],
      dateKeys: [...new Set([...existing.dateKeys, event.dateKey])].sort(),
    });
  }

  return [...deduped.values()];
}

function joinLines(lines) {
  return lines.join("\n");
}

function discordColorForEvent(event) {
  const score = Number(event.score ?? 1);
  if (!Number.isFinite(score)) {
    return discordColorByScore[1];
  }

  return discordColorByScore[Math.min(Math.max(score, 0), 5)];
}

async function buildEventEmbed(event, options = {}) {
  const mode = options.mode ?? "daily";
  const titleLimit = DISCORD_EMBED_TITLE_LIMIT - 16;
  const summaryLimit = mode === "weekly" ? 520 : 460;
  const title = localizedTitle(event);
  const summary = localizedSummary(event);
  const pagesUrl = options.pagesUrl ?? buildEventPagesUrl(event);
  const fields = [
    {
      name: "重要度",
      value: localizedImportanceLabel(event),
      inline: true,
    },
    {
      name: "ソース",
      value: trimLine(event.sourceNames.join(" / "), 220),
      inline: true,
    },
  ];

  if (options.includeDates && event.dateKeys?.length > 0) {
    fields.push({
      name: "日付",
      value: event.dateKeys.join(" / "),
      inline: false,
    });
  }

  if (pagesUrl) {
    fields.push({
      name: "Pages",
      value: pagesUrl,
      inline: false,
    });
  }

  const og = options.includeOg ? await fetchOgMetadata(event.url) : null;

  return {
    title: `[${localizedImportanceLabel(event)}] ${trimLine(title, titleLimit)}`,
    url: event.url,
    description: trimLine(summary, summaryLimit),
    color: discordColorForEvent(event),
    fields,
    ...(og?.image ? { thumbnail: { url: og.image } } : {}),
    footer: {
      text:
        event.kind === "html_snapshot_change"
          ? "固定ページ差分"
          : "更新フィード",
    },
  };
}

function selectDiscordEvents(uniqueEvents, options = {}) {
  const maxEvents = options.maxEvents ?? 5;
  const maxPerDate = options.maxPerDate ?? Number.POSITIVE_INFINITY;
  const selected = [];
  const perDateCounts = new Map();

  for (const event of uniqueEvents.slice(0, maxEvents)) {
    const dateKey = event.dateKeys?.at(-1) ?? event.dateKey;
    const currentCount = perDateCounts.get(dateKey) ?? 0;
    if (currentCount >= maxPerDate) {
      continue;
    }

    perDateCounts.set(dateKey, currentCount + 1);
    selected.push(event);
  }

  return selected;
}

async function buildPayload(date, datedLogs, options = {}) {
  const isWeeklyMode = options.mode === "weekly";
  const collectedEvents = [];
  const perDateCounts = [];

  for (const { date: entryDate, eventLog } of datedLogs) {
    const latestRun = eventLog.latestRun ?? {
      newEventsCount: 0,
      newEventIds: [],
    };
    const candidateEvents =
      options.forcePreview && latestRun.newEventsCount === 0
        ? [...(eventLog.events ?? [])]
        : (eventLog.events ?? []).filter((event) =>
            latestRun.newEventIds.includes(event.eventId),
          );
    const rankedEvents = candidateEvents
      .map((event) => ({ ...event, dateKey: entryDate }))
      .sort((left, right) => rankEvent(right) - rankEvent(left));

    collectedEvents.push(...rankedEvents);
    perDateCounts.push({ date: entryDate, count: rankedEvents.length });
  }

  const uniqueEvents = dedupeEvents(collectedEvents).sort(
    (left, right) => rankEvent(right) - rankEvent(left),
  );

  const range = isWeeklyMode
    ? resolveCalendarWindow(date, options.windowDays)
    : {
        startDate: datedLogs[0]?.date ?? date,
        endDate: datedLogs[datedLogs.length - 1]?.date ?? date,
      };
  const summaryUrl = isWeeklyMode
    ? (await fileExists(
        buildRepoWeeklyDraftPath(range.startDate, range.endDate),
      ))
      ? buildRepoWeeklyDraftUrl(range.startDate, range.endDate)
      : null
    : buildRepoSummaryUrl(date);
  const pagesUrl = isWeeklyMode
    ? buildPagesWeeklyDigestUrl(range.startDate, range.endDate)
    : buildPagesDigestUrl(date);
  const searchUrl = buildPagesSearchUrl(
    uniqueEvents[0]
      ? localizedTitle(uniqueEvents[0])
      : "GitHub Copilot VS Code",
  );
  const sourceCounts = new Map();
  for (const event of uniqueEvents) {
    sourceCounts.set(
      event.sourceName,
      (sourceCounts.get(event.sourceName) ?? 0) + 1,
    );
  }

  const sourceSummary = [...sourceCounts.entries()]
    .map(([sourceName, count]) => `${sourceName}: ${count}`)
    .join(" / ");
  const activeWindowLabel =
    datedLogs.length > 1 || isWeeklyMode
      ? `${range.startDate}〜${range.endDate}`
      : date;
  const dailySummary = perDateCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.date}: ${entry.count}件`)
    .join(" / ");
  const latestLog = datedLogs[datedLogs.length - 1]?.eventLog;
  const aggregateSummary = summarizeEventSet(uniqueEvents, "ja", {
    maxLength: isWeeklyMode
      ? DISCORD_WEEKLY_SUMMARY_LIMIT
      : DISCORD_SUMMARY_LIMIT,
    maxHighlights: isWeeklyMode ? 4 : 3,
  });

  const headerLines = [
    `**${
      isWeeklyMode
        ? options.forcePreview && uniqueEvents.length === 0
          ? `GitHub Copilot / VS Code 週次 preview`
          : `GitHub Copilot / VS Code 週次まとめ`
        : options.windowDays > 1
          ? options.forcePreview && uniqueEvents.length === 0
            ? `GitHub Copilot / VS Code ${options.windowDays}日分 preview`
            : `GitHub Copilot / VS Code 直近${options.windowDays}日分まとめ`
          : options.forcePreview && uniqueEvents.length === 0
            ? `GitHub Copilot / VS Code preview`
            : `GitHub Copilot / VS Code 新着通知`
    }**`,
    options.windowDays > 1 || isWeeklyMode
      ? `対象期間: ${activeWindowLabel}`
      : `日付: ${date}`,
    `件数: ${uniqueEvents.length}件`,
  ];

  if (aggregateSummary && uniqueEvents.length > 0) {
    headerLines.push(
      "",
      "**要約**",
      ...wrapReadableText(
        trimLine(aggregateSummary, isWeeklyMode ? 620 : 460),
        180,
      ),
    );
  }

  if (options.forcePreview && uniqueEvents.length === 0) {
    headerLines.push(
      options.windowDays > 1 || isWeeklyMode
        ? "注記: これは通知 preview です。対象期間に新着がないため、既存イベントから代表項目を表示しています。"
        : "注記: これは通知 preview です。直近 run に新着がないため、その日の既存イベントから代表項目を表示しています。",
    );
  }

  if (options.windowDays > 1 && !isWeeklyMode) {
    headerLines.push(`通知間隔: ${options.cadenceDays}日ごと`);
  }

  if (dailySummary) {
    headerLines.push(
      "",
      `**${isWeeklyMode ? "日別内訳" : "日別件数"}**`,
      dailySummary,
    );
  }

  if (sourceSummary) {
    headerLines.push("", "**ソース内訳**", sourceSummary);
  }

  const footerLines = [];
  if (summaryUrl) {
    footerLines.push(
      `${isWeeklyMode ? "週間ドラフト" : "日次サマリー"}: ${summaryUrl}`,
    );
  }

  if (pagesUrl) {
    footerLines.push(`${isWeeklyMode ? "週間Pages" : "Pages"}: ${pagesUrl}`);
  }

  if (searchUrl) {
    footerLines.push(`検索: ${searchUrl}`);
  }

  const selectedEvents =
    options.windowDays > 1 || isWeeklyMode
      ? selectDiscordEvents(uniqueEvents, {
          maxEvents: isWeeklyMode
            ? DISCORD_WEEKLY_EVENT_LIMIT
            : DISCORD_WINDOW_EVENT_LIMIT,
          maxPerDate: isWeeklyMode ? 2 : 5,
        })
      : uniqueEvents.slice(0, DISCORD_DAILY_EVENT_LIMIT);

  const omittedEventCount = Math.max(
    0,
    uniqueEvents.length - selectedEvents.length,
  );
  const lines = [...headerLines];
  if (selectedEvents.length > 0) {
    lines.push(
      "",
      `**主な更新**`,
      `${selectedEvents.length}件をカードで表示します。`,
    );
  }

  if (omittedEventCount > 0) {
    lines.push(`※ 残り${omittedEventCount}件はリンク先で確認してください。`);
  }

  if (footerLines.length > 0) {
    if (lines.at(-1) !== "") {
      lines.push("");
    }
    lines.push(...footerLines);
  }

  const eventEmbeds = await Promise.all(
    selectedEvents.map((event) =>
      buildEventEmbed(event, {
        includeDates: options.windowDays > 1 || isWeeklyMode,
        includeOg: options.includeOg,
        mode: isWeeklyMode ? "weekly" : "daily",
      }),
    ),
  );
  const summaryEmbed = buildSummaryEmbed(aggregateSummary, {
    title: isWeeklyMode ? "週次要約" : "要約",
    url: pagesUrl,
    searchUrl,
    maxLength: isWeeklyMode ? 620 : 520,
    footer: isWeeklyMode
      ? "週間 Pages と検索で詳細を確認できます"
      : "Pages と検索で詳細を確認できます",
  });
  const embeds = [summaryEmbed, ...eventEmbeds].filter(Boolean);

  let content = joinLines(lines);
  if (content.length > DISCORD_CONTENT_LIMIT) {
    const footer = footerLines.length > 0 ? joinLines(footerLines) : "";
    const reserved = footer ? footer.length + 2 : 0;
    const prefixLimit = Math.max(0, DISCORD_CONTENT_LIMIT - reserved);
    let prefix = joinLines(headerLines).slice(0, prefixLimit);
    prefix = prefix.replace(/\n?[^\n]*$/, "").trimEnd();
    content = footer ? [prefix, footer].filter(Boolean).join("\n\n") : prefix;
  }

  return { content: sanitizeDiscordContent(content), embeds };
}

function resolveWebhookUrl(webhookUrl, options = {}) {
  const url = new URL(webhookUrl);
  if (options.threadId) {
    url.searchParams.set("thread_id", options.threadId);
  }
  if (options.threadName) {
    url.searchParams.set("thread_name", options.threadName);
  }

  return url.toString();
}

async function postWebhook(payload, dryRun, options = {}) {
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log(
      "DISCORD_WEBHOOK_URL is not set. Skipping Discord notification.",
    );
    return;
  }

  const response = await fetch(resolveWebhookUrl(webhookUrl, options), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText} ${responseBody}`,
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const availableDates = await listEventLogDates();
  const anchorDate = resolveAnchorDate(
    availableDates,
    options.anchorDate,
    options.date,
  );
  const windowDates = resolveWindowDates(
    availableDates,
    options.date,
    options.windowDays,
  );

  if (windowDates.length === 0) {
    throw new Error(`No event logs available up to ${options.date}.`);
  }

  if (
    !options.forcePreview &&
    !shouldNotify(options.date, anchorDate, options.cadenceDays)
  ) {
    console.log(
      `Skipping Discord notification for ${options.date}. The ${options.cadenceDays}-day cadence is anchored at ${anchorDate}.`,
    );
    return;
  }

  const datedLogs = await Promise.all(
    windowDates.map(async (date) => ({
      date,
      eventLog: await readEventLog(date),
    })),
  );
  const totalNewEvents = datedLogs.reduce(
    (sum, { eventLog }) =>
      sum + Number(eventLog.latestRun?.newEventsCount ?? 0),
    0,
  );

  if (totalNewEvents === 0 && !options.forcePreview) {
    console.log(
      `No new events across the last ${windowDates.length} day(s) ending on ${options.date}. Skipping Discord notification.`,
    );
    return;
  }

  const payload = await buildPayload(options.date, datedLogs, options);
  assertReadableDiscordPayload(payload);
  await postWebhook(payload, options.dryRun, options);
  console.log(
    options.forcePreview && totalNewEvents === 0
      ? `Prepared Discord preview payload for ${options.date}.`
      : `Prepared Discord notification for ${totalNewEvents} new event(s) across ${windowDates.length} day(s).`,
  );
}

await main();
