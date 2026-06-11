import fs from "node:fs/promises";
import path from "node:path";

import {
  applyEditorialPolicy,
  classifyEvent as classifyEventShared,
  dedupeEvents,
  importanceReason,
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  originalTitle,
  rankEvent as rankEventShared,
  safeDate as safeDateShared,
  summarizeEventSet,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const eventsDir = path.join(workspaceRoot, "data", "events");
const draftsDir = path.join(workspaceRoot, "drafts");

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`${optionName} must be a valid calendar date.`);
  }

  return text;
}

function resolveDraftOutputPath(value) {
  const normalizedInput = String(value ?? "").replace(/\\/g, "/");
  if (!/^drafts\/[^/]+\.md$/.test(normalizedInput)) {
    throw new Error("--output must match drafts/<file>.md.");
  }

  const resolved = path.resolve(workspaceRoot, value);
  const relative = path.relative(draftsDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--output must stay inside drafts/.");
  }

  return resolved;
}

function parseArgs(argv) {
  const options = {
    days: 14,
    from: null,
    to: null,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--days") {
      options.days = parsePositiveInteger(argv[index + 1], "--days");
      index += 1;
      continue;
    }

    if (argument === "--from") {
      options.from = parseDateKeyOption(argv[index + 1], "--from");
      index += 1;
      continue;
    }

    if (argument === "--to") {
      options.to = parseDateKeyOption(argv[index + 1], "--to");
      index += 1;
      continue;
    }

    if (argument === "--output") {
      options.output = resolveDraftOutputPath(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}

const safeDate = safeDateShared;

function computeRange(options) {
  const endDate = options.to ? safeDate(options.to) : new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = options.from ? safeDate(options.from) : new Date(endDate);
  if (!options.from) {
    startDate.setDate(startDate.getDate() - (options.days - 1));
  }
  startDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    throw new Error("--from must be on or before --to.");
  }

  return {
    startDate,
    endDate,
  };
}

function isWithinRange(dateString, range) {
  const value = safeDate(dateString);
  value.setHours(0, 0, 0, 0);
  return value >= range.startDate && value <= range.endDate;
}

function classifyEvent(event) {
  const topic = classifyEventShared(event);
  if (topic === "GitHub Platform" || topic === "周辺ニュース") {
    return "周辺ニュース";
  }

  return topic;
}

function rankEvent(event) {
  return rankEventShared(event);
}

function renderFrontmatter(range) {
  return [
    "---",
    `title: GitHub Copilot / VS Code アップデートまとめ (${toDateOnly(range.startDate)}〜${toDateOnly(range.endDate)})`,
    "tags:",
    "  - GitHubCopilot",
    "  - VSCode",
    "  - GitHubActions",
    "  - AI",
    "private: true",
    "tweet: false",
    "status: draft",
    `sourceRangeFrom: ${toDateOnly(range.startDate)}`,
    `sourceRangeTo: ${toDateOnly(range.endDate)}`,
    `generatedAt: ${new Date().toISOString()}`,
    "---",
    "",
  ].join("\n");
}

function renderHighlights(events) {
  if (events.length === 0) {
    return "- 今回の期間では新しい更新は記録されませんでした。";
  }

  return events
    .slice()
    .sort((left, right) => rankEvent(right) - rankEvent(left))
    .slice(0, 5)
    .map((event) => `- ${localizedTitle(event)}: ${localizedSummary(event)}`)
    .join("\n");
}

function renderEventSection(events) {
  if (events.length === 0) {
    return "このカテゴリでは記録された更新はありませんでした。";
  }

  return events
    .slice()
    .sort(
      (left, right) => safeDate(right.publishedAt) - safeDate(left.publishedAt),
    )
    .map((event) => {
      const lines = [
        `### ${localizedTitle(event)}`,
        "",
        `- 文書更新日: ${toDateOnly(safeDate(event.publishedAt))}`,
        `- このサイトに載った日: ${toDateOnly(safeDate(event.detectedAt ?? event.publishedAt))}`,
        `- ソース: ${event.sourceName}`,
        `- URL: ${event.url}`,
        `- ラベル: ${localizedImportanceLabel(event)}`,
        `- 要点: ${localizedSummary(event)}`,
        `- なぜ重要か: ${importanceReason(event)}`,
      ];

      const rawTitle = originalTitle(event);
      if (rawTitle) {
        lines.push(`- 原題: ${rawTitle}`);
      }

      if (event.categories?.length) {
        lines.push(`- 種別: ${event.categories.join(", ")}`);
      }

      if (event.diffSummary?.headings?.length) {
        lines.push(`- 差分メモ: ${event.diffSummary.headings.join(" / ")}`);
      }

      return `${lines.join("\n")}\n`;
    })
    .join("\n");
}

async function readEventLogs() {
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
    const raw = await fs.readFile(filePath, "utf8");
    logs.push(JSON.parse(raw));
  }

  return logs;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const logs = await readEventLogs();
  if (!options.to && logs.length > 0) {
    const latestLog = logs
      .map((log) => safeDate(log.date))
      .sort((left, right) => right - left)[0];
    options.to = toDateOnly(latestLog);
  }
  const range = computeRange(options);
  const sourceEditorialNotes = logs
    .filter((log) =>
      (log.events ?? []).some((event) =>
        isWithinRange(event.publishedAt ?? event.detectedAt, range),
      ),
    )
    .map((log) => log.editorialNote)
    .filter(Boolean);
  const events = dedupeEvents(
    applyEditorialPolicy(
      logs
        .flatMap((log) => log.events ?? [])
        .filter((event) =>
          isWithinRange(event.publishedAt ?? event.detectedAt, range),
        ),
    ),
  ).sort(
    (left, right) =>
      safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
      rankEvent(right) - rankEvent(left),
  );

  const grouped = {
    "GitHub Copilot": [],
    "VS Code": [],
    周辺ニュース: [],
  };

  for (const event of events) {
    grouped[classifyEvent(event)].push(event);
  }

  grouped["周辺ニュース"] = grouped["周辺ニュース"].slice(0, 3);

  const outputFile = options.output
    ? path.resolve(workspaceRoot, options.output)
    : path.join(
        draftsDir,
        `biweekly-${toDateOnly(range.startDate).replace(/-/g, "")}-${toDateOnly(range.endDate).replace(/-/g, "")}.md`,
      );

  await fs.mkdir(path.dirname(outputFile), { recursive: true });

  const sections = [
    renderFrontmatter(range),
    "## 今回のまとめ",
    "",
    summarizeEventSet(events, "ja", {
      topicResolver: classifyEvent,
      maxLength: 1280,
      maxHighlights: 6,
    }),
    "",
    "## 今回の要点",
    "",
    renderHighlights(events),
    "",
    ...(sourceEditorialNotes.length > 0
      ? [
          "## 注記",
          "",
          ...[...new Set(sourceEditorialNotes)].map((note) => `- ${note}`),
          "",
        ]
      : []),
    "## GitHub Copilot",
    "",
    renderEventSection(grouped["GitHub Copilot"]),
    "",
    "## VS Code",
    "",
    renderEventSection(grouped["VS Code"]),
    "",
    "## 周辺ニュース",
    "",
    renderEventSection(grouped["周辺ニュース"]),
    "",
    "## ひとこと",
    "",
    "ここは手動で追記する前提です。今回の更新を通して見えたテーマ、すぐ触るべきもの、様子見でよいものを自分の言葉で追加してください。",
    "",
    "## 参考ソース",
    "",
    ...events
      .slice()
      .sort(
        (left, right) =>
          safeDate(right.publishedAt) - safeDate(left.publishedAt),
      )
      .map((event) => `- ${localizedTitle(event)} - ${event.url}`),
  ];

  await fs.writeFile(outputFile, `${sections.join("\n")}\n`, "utf8");
  console.log(`Wrote draft to ${outputFile}`);
}

await main();
