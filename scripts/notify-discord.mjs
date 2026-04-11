import fs from "node:fs/promises";
import path from "node:path";

import {
  localizedDigestMention,
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  summarizeEventSet,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const eventsDir = path.join(workspaceRoot, "data", "events");
const DISCORD_CONTENT_LIMIT = 1900;

function parseArgs(argv) {
  const options = {
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    forcePreview: false,
    windowDays: 1,
    cadenceDays: 1,
    anchorDate: null,
    mode: "daily",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--date") {
      options.date = argv[index + 1];
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

    if (argument === "--window-days") {
      options.windowDays = Number.parseInt(argv[index + 1] ?? "1", 10);
      index += 1;
      continue;
    }

    if (argument === "--cadence-days") {
      options.cadenceDays = Number.parseInt(argv[index + 1] ?? "1", 10);
      index += 1;
      continue;
    }

    if (argument === "--anchor-date") {
      options.anchorDate = argv[index + 1] ?? null;
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
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
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

function buildEventBlock(event, options = {}) {
  const mode = options.mode ?? "daily";
  const title =
    mode === "weekly"
      ? localizedDigestMention(event, "ja", 110)
      : localizedTitle(event);
  const summary = localizedSummary(event);
  const block = [
    `- [${localizedImportanceLabel(event)}] ${trimLine(title, mode === "weekly" ? 110 : 120)}`,
    `  ${trimLine(summary, mode === "weekly" ? 150 : 120)}`,
    `  ${event.url}`,
  ];

  if (options.includeDates && event.dateKeys?.length > 0) {
    block.splice(2, 0, `  日付: ${event.dateKeys.join(", ")}`);
  }

  if (event.sourceNames.length > 1) {
    block.push(`  ソース: ${event.sourceNames.join(", ")}`);
  }

  return block;
}

function buildGroupedEventBlocks(uniqueEvents, options = {}) {
  const maxEvents = options.maxEvents ?? 5;
  const maxPerDate = options.maxPerDate ?? Number.POSITIVE_INFINITY;
  const grouped = new Map();

  for (const event of uniqueEvents.slice(0, maxEvents)) {
    const dateKey = event.dateKeys?.at(-1) ?? event.dateKey;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey).push(event);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, events]) => {
      const block = [`【${dateKey}】`];

      for (const [index, event] of events.slice(0, maxPerDate).entries()) {
        if (index > 0) {
          block.push("");
        }
        block.push(...buildEventBlock(event, options));
      }

      return block;
    });
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
    ? (await fileExists(
        buildPagesWeeklyDigestPath(range.startDate, range.endDate),
      ))
      ? buildPagesWeeklyDigestUrl(range.startDate, range.endDate)
      : null
    : buildPagesDigestUrl(date);
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
    maxLength: isWeeklyMode ? 1000 : 520,
    maxHighlights: isWeeklyMode ? 6 : 4,
  });

  const headerLines = [
    isWeeklyMode
      ? options.forcePreview && uniqueEvents.length === 0
        ? `GitHub Copilot / VS Code の週次 preview として更新候補を表示します。`
        : `GitHub Copilot / VS Code の週次まとめを送ります。`
      : options.windowDays > 1
        ? options.forcePreview && uniqueEvents.length === 0
          ? `GitHub Copilot / VS Code 監視の ${options.windowDays}日分 preview として更新候補を表示します。`
          : `GitHub Copilot / VS Code 監視で直近${options.windowDays}日分の新着 ${uniqueEvents.length} 件をまとめました。`
        : options.forcePreview && uniqueEvents.length === 0
          ? `GitHub Copilot / VS Code 監視の preview として ${uniqueEvents.length} 件の更新候補を表示します。`
          : `GitHub Copilot / VS Code 監視で ${uniqueEvents.length} 件の新着を検知しました。`,
    options.windowDays > 1 || isWeeklyMode
      ? `対象期間: ${activeWindowLabel}`
      : `日付: ${date}`,
  ];

  if (aggregateSummary && uniqueEvents.length > 0) {
    headerLines.push(`要約: ${aggregateSummary}`);
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
      `${isWeeklyMode ? "日別内訳" : "日別件数"}: ${dailySummary}`,
    );
  }

  if (sourceSummary) {
    headerLines.push(`内訳: ${sourceSummary}`);
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

  const eventBlocks =
    options.windowDays > 1 || isWeeklyMode
      ? buildGroupedEventBlocks(uniqueEvents, {
          mode: isWeeklyMode ? "weekly" : "daily",
          maxEvents: isWeeklyMode ? 10 : 5,
          maxPerDate: isWeeklyMode ? 2 : 5,
        })
      : uniqueEvents
          .slice(0, 5)
          .map((event) =>
            buildEventBlock(event, { includeDates: false, mode: "daily" }),
          );

  let lines = [...headerLines];
  if (eventBlocks.length > 0) {
    lines.push("");
  }

  for (const block of eventBlocks) {
    const nextLines =
      lines.at(-1) === "" ? [...lines, ...block] : [...lines, "", ...block];
    const candidateLines =
      footerLines.length > 0 ? [...nextLines, "", ...footerLines] : nextLines;

    if (joinLines(candidateLines).length > DISCORD_CONTENT_LIMIT) {
      break;
    }

    lines = nextLines;
  }

  if (footerLines.length > 0) {
    if (lines.at(-1) !== "") {
      lines.push("");
    }
    lines.push(...footerLines);
  }

  let content = joinLines(lines);
  if (content.length > DISCORD_CONTENT_LIMIT) {
    const footer = footerLines.length > 0 ? joinLines(footerLines) : "";
    const reserved = footer ? footer.length + 2 : 0;
    const prefixLimit = Math.max(0, DISCORD_CONTENT_LIMIT - reserved);
    let prefix = joinLines(headerLines).slice(0, prefixLimit);
    prefix = prefix.replace(/\n?[^\n]*$/, "").trimEnd();
    content = footer ? [prefix, footer].filter(Boolean).join("\n\n") : prefix;
  }

  return { content };
}

async function postWebhook(payload, dryRun) {
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

  const response = await fetch(webhookUrl, {
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
  await postWebhook(payload, options.dryRun);
  console.log(
    options.forcePreview && totalNewEvents === 0
      ? `Prepared Discord preview payload for ${options.date}.`
      : `Prepared Discord notification for ${totalNewEvents} new event(s) across ${windowDates.length} day(s).`,
  );
}

await main();
