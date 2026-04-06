import fs from "node:fs/promises";
import path from "node:path";

import {
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const eventsDir = path.join(workspaceRoot, "data", "events");
const DISCORD_CONTENT_LIMIT = 1900;

function parseArgs(argv) {
  const options = {
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    forcePreview: false,
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
    }

    if (argument === "--force-preview") {
      options.forcePreview = true;
    }
  }

  return options;
}

async function readEventLog(date) {
  const filePath = path.join(eventsDir, `${date}.json`);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
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

function buildPagesDigestUrl(date) {
  const baseUrl =
    process.env.PAGES_BASE_URL ||
    "https://aktsmm.github.io/vscode-copilot-digest";

  return `${baseUrl.replace(/\/$/, "")}/days/${date}.html`;
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
      });
      continue;
    }

    deduped.set(key, {
      ...existing,
      score: Math.max(Number(existing.score ?? 0), Number(event.score ?? 0)),
      sourceNames: [...new Set([...existing.sourceNames, event.sourceName])],
    });
  }

  return [...deduped.values()];
}

function joinLines(lines) {
  return lines.join("\n");
}

function buildPayload(date, eventLog, options = {}) {
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
  const newEvents = candidateEvents.sort(
    (left, right) => rankEvent(right) - rankEvent(left),
  );
  const uniqueEvents = dedupeEvents(newEvents).sort(
    (left, right) => rankEvent(right) - rankEvent(left),
  );

  const summaryUrl = buildRepoSummaryUrl(date);
  const pagesUrl = buildPagesDigestUrl(date);
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

  const headerLines = [
    options.forcePreview && latestRun.newEventsCount === 0
      ? `GitHub Copilot / VS Code 監視の preview として ${uniqueEvents.length} 件の更新候補を表示します。`
      : `GitHub Copilot / VS Code 監視で ${uniqueEvents.length} 件の新着を検知しました。`,
    `日付: ${date}`,
  ];

  if (options.forcePreview && latestRun.newEventsCount === 0) {
    headerLines.push(
      "注記: これは通知 preview です。直近 run に新着がないため、その日の既存イベントから代表項目を表示しています。",
    );
  }

  if (eventLog.editorialNote) {
    headerLines.push(eventLog.editorialNote);
  }

  if (sourceSummary) {
    headerLines.push(`内訳: ${sourceSummary}`);
  }

  const footerLines = [];
  if (summaryUrl) {
    footerLines.push(`日次サマリー: ${summaryUrl}`);
  }

  if (pagesUrl) {
    footerLines.push(`Pages: ${pagesUrl}`);
  }

  const eventBlocks = uniqueEvents.slice(0, 5).map((event) => {
    const block = [
      `- [${localizedImportanceLabel(event)}] ${trimLine(localizedTitle(event), 120)}`,
      `  ${trimLine(localizedSummary(event), 120)}`,
      `  ${event.url}`,
    ];

    if (event.sourceNames.length > 1) {
      block.push(`  ソース: ${event.sourceNames.join(", ")}`);
    }

    return block;
  });

  let lines = [...headerLines];
  if (eventBlocks.length > 0) {
    lines.push("");
  }

  for (const block of eventBlocks) {
    const nextLines = lines.at(-1) === "" ? [...lines, ...block] : [...lines, "", ...block];
    const candidateLines = footerLines.length > 0 ? [...nextLines, "", ...footerLines] : nextLines;

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
  const eventLog = await readEventLog(options.date);
  const latestRun = eventLog.latestRun ?? { newEventsCount: 0 };

  if (latestRun.newEventsCount === 0 && !options.forcePreview) {
    console.log(
      `No new events for ${options.date}. Skipping Discord notification.`,
    );
    return;
  }

  const payload = buildPayload(options.date, eventLog, options);
  await postWebhook(payload, options.dryRun);
  console.log(
    options.forcePreview && latestRun.newEventsCount === 0
      ? `Prepared Discord preview payload for ${options.date}.`
      : `Prepared Discord notification for ${latestRun.newEventsCount} new event(s).`,
  );
}

await main();
