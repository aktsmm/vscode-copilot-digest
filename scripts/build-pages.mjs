import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { attachResources, httpUrl, resourceStats } from "./lib/resources.mjs";
import { buildApiFiles } from "./lib/api.mjs";
import { loadSlideSummaries } from "./lib/slide-summaries.mjs";
import { downloadPanelHtml, downloadsCss, downloadsJs } from "./lib/downloads.mjs";

import {
  applyEditorialPolicy,
  buildDailyDigest,
  buildHighlightTags,
  classifyEvent,
  eventKey,
  dedupeEvents,
  importanceReason,
  isHighlightEligible,
  isReaderEvent,
  localizedImportanceLabel,
  localizedDigestMention,
  lowInformationFallbackMarkers,
  localizedSummary,
  localizedTitle,
  originalTitle,
  rankEvent,
  safeDate,
  selectEditorialHighlights,
  sourceGroup,
  summarizeEventSet,
  meaningfulSnapshotAdditions,
  isGenericImportanceReason,
  slideIdFor,
  cardPointsFor,
  jaCardTitleFor,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const eventsDir = path.join(workspaceRoot, "data", "events");
const summariesDir = path.join(workspaceRoot, "summaries", "daily");
const siteDir = path.join(workspaceRoot, "site");
const topicOrder = [
  "GitHub Copilot",
  "VS Code",
  "GitHub Platform",
  "周辺ニュース",
];
const sourceGroupOrder = ["github", "vscode", "platform", "other"];
const sortOrder = ["default", "newest", "oldest", "importance"];
const HOME_HIGHLIGHT_LIMIT = 120;
const HOME_DAILY_CHIPS = 14;
const HOME_ARCHIVE_LIMIT = 6;
const HIGHLIGHTS_PAGE_SIZE = 50;
let archiveDates = new Map();
// "date#anchor" for every update a daily page actually renders; links to other anchors would dangle.
let publishedAnchors = new Set();
let searchVersion = "";

function toDateOnly(value) {
  const date = safeDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractDays(value, days) {
  const next = new Date(value);
  next.setDate(next.getDate() - days);
  next.setHours(0, 0, 0, 0);
  return next;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function trimText(value, maxLength = 180) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function completeSentencePreview(value, locale, maxSentences = 2) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return "";
  }

  const sentences = [];
  let sentenceStart = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const previousCharacter = normalized[index - 1] ?? "";
    const nextCharacter = normalized[index + 1] ?? "";
    const isJapaneseTerminator = locale === "ja" && /[。！？]/.test(character);
    // Excerpts that are still English can appear on Japanese pages, so both kinds of full stop end a sentence.
    const isEnglishTerminator =
      /[.!?]/.test(character) &&
      !(
        character === "." &&
        (previousCharacter === "." || nextCharacter === ".")
      ) &&
      /\s|^$/.test(nextCharacter);

    if (!isJapaneseTerminator && !isEnglishTerminator) {
      continue;
    }

    const sentence = normalized.slice(sentenceStart, index + 1).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    sentenceStart = index + 1;
    while (/\s/.test(normalized[sentenceStart] ?? "")) {
      sentenceStart += 1;
    }

    if (sentences.length === maxSentences) {
      break;
    }
  }

  return sentences.join(" ");
}

function cardDescription(event, locale) {
  const summary = completeSentencePreview(
    localizedSummary(event, locale),
    locale,
  );
  if (summary) {
    return summary;
  }

  const reason = importanceReason(event, locale);
  const fromReason = isGenericImportanceReason(reason) ? "" : completeSentencePreview(reason, locale);
  if (fromReason) {
    return fromReason;
  }

  // A truncated excerpt with no sentence end still beats an empty card.
  const excerpt = String(localizedSummary(event, locale) ?? "")
    .replace(/\s+/g, " ")
    .replace(/(?:…|\.\.\.)+.*$/, "")
    .replace(/[:：,、\s]+$/, "")
    .trim();
  return excerpt ? `${locale === "ja" ? "。" : "."}` : "";
}

function formatDate(value, locale = "ja") {
  return safeDate(value).toLocaleDateString(
    locale === "ja" ? "ja-JP" : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );
}

function formatDateTime(value, locale = "ja") {
  const parts = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(safeDate(value));

  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  if (locale === "ja") {
    return `${lookup.year}/${lookup.month}/${lookup.day} ${lookup.hour}:${lookup.minute} JST`;
  }

  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute} JST`;
}

function formatCount(count, locale, singular, plural) {
  if (locale === "ja") {
    return `${count}`;
  }

  return `${count} ${count === 1 ? singular : plural}`;
}

function sourceGroupMeta(group, text) {
  return {
    label: text.sourceGroupNames[group] ?? group,
    short: text.sourceGroupShort[group] ?? group,
    tag: text.sourceGroupTags[group] ?? `#${group}`,
  };
}

function importanceFilterValue(event) {
  return (
    localizedImportanceLabel(event, "en")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "update"
  );
}

// Retirements, deprecations and migrations: the updates that may force a change in settings or workflows.
function isRetirementEvent(event) {
  return localizedImportanceLabel(event, "en") === "Retired";
}

function sortDateValue(event) {
  return safeDate(
    event.publishedAt ?? event.updatedAt ?? event.dateKey ?? event.date,
  ).getTime();
}

function buildText(locale) {
  if (locale === "en") {
    return {
      htmlLang: "en",
      siteLead:
        "An unofficial daily digest of GitHub Copilot and VS Code updates.",
      footerLabel: "Copyright (c) 2026",
      dailyNav: "Daily",
      weeklyNav: "Weekly",
      searchNav: "Search",
      repositoryNav: "Repository",
      langSwitchLabel: "日本語",
      heroEyebrow: "GitHub Copilot × VS Code daily digest",
      lastUpdatedLabel: "Last updated",
      heroTitle: "What's new in Copilot and VS Code, at a glance, every day.",
      heroCopy:
        "Official GitHub Changelog and VS Code updates, collected daily and summarised in Japanese, with one slide per update. Pick what you need and take it as JSON, PDF or PowerPoint.",
      publishedCount: "Published daily digests",
      publishedCountDetail: "Number of daily digests on Pages",
      overallCount: "Tracked updates",
      overallCountDetail: "Deduplicated running total",
      latestDate: "Latest date",
      latestDateDetail:
        "Most recent published digest. This stays on the last published day when the latest collect run detects 0 new items.",
      latestRunCount: "Latest reader-facing items",
      latestRunCountDetail:
        "Items eligible for reader-facing pages from the most recent collect run. Audit-only changes are not counted.",
      howToReadTitle: "How to read this site",
      howToReadBody1:
        "Start with the highlight cards to see the changes most likely to matter. Drop into topic sections or the full update list only when you need more detail.",
      howToReadBody2:
        "Raw Markdown and JSON are published alongside the rendered pages so you can verify the source material or reuse it in your own workflow.",
      policyTitle: "Coverage policy",
      policyBody1:
        "Official GitHub and VS Code sources are prioritized, future-dated feed items are shown in a warning section until their publish date, and surrounding news is capped to reduce noise.",
      policyBody2:
        "The site is bilingual. Japanese is the default and matching English pages are generated under /en/.",
      latestHighlightsTitle: "Latest highlights",
      latestHighlightsLabel: "Cross-day view",
      latestHighlightsCountSuffix: " items shown",
      searchPageEyebrow: "Search",
      searchPageTitle: "Search across published digests.",
      searchPageCopy:
        "Search published daily digests with Pagefind across titles, summaries, sources, topics, tags, and dates.",
      homeSearchTitle: "Search from the home page",
      homeSearchHelp:
        "Open recent published updates directly from the top page, or move to the full search page for a wider scan.",
      homeSearchOpenLink: "Open full search page",
      searchItemsMetric: "Searchable updates",
      searchItemsMetricDetail: "Published daily updates indexed by Pagefind",
      searchSourcesMetric: "Source groups",
      searchSourcesMetricDetail:
        "Source families represented in indexed daily pages",
      searchTopicsMetric: "Topics",
      searchTopicsMetricDetail:
        "High-level topics represented in indexed daily pages",
      searchTitle: "Site search",
      searchHelp:
        "Results come from published daily pages, newest matching days are shown first, and heading-level matches are expanded.",
      searchPlaceholder: "Search updates, topics, or dates",
      searchInputLabel: "Search published updates",
      searchResultsTitle: "Results",
      searchPrompt: "Type a keyword to start searching.",
      searchLoading: "Searching published updates...",
      searchEmpty: "No matching updates were found.",
      searchOpenDigest: "Open daily page",
      weeklyArchiveTitle: "Weekly digest",
      weeklyArchiveLabel: "Rolling 7-day windows",
      weeklyEmpty: "Weekly digests will appear as more daily logs accumulate.",
      dailyArchiveTitle: "Daily archive",
      dayCountSuffix: " days",
      dayPageEyebrow: "Daily digest",
      weekPageEyebrow: "Weekly digest",
      highlightsTitle: "Highlights",
      topicsTitle: "Topic breakdown",
      sourceBreakdownTitle: "Source breakdown",
      sourceBreakdownLabel: "Before dedupe",
      fullListTitle: "Full update list",
      rawMarkdown: "Open Markdown",
      rawJson: "Open JSON",
      noItems: "No updates were recorded in this category.",
      noteTitle: "Editorial notes",
      futureTitle: "Future-dated items",
      futureDescription:
        "These items were visible in a feed before their publish date. They stay in a separate warning section until that date arrives, because titles, summaries, or URLs may still change.",
      updatedLabel: "Document updated",
      futurePublishedLabel: "Scheduled publish date",
      detectedLabel: "Seen on this site",
      sourceLabel: "Sources",
      whyLabel: "Why it matters",
      originalTitleLabel: "Original",
      futureBadge: "Future-dated",
      rangeLabel: "Coverage",
      rangeDetail: "Date window covered by this digest",
      trackedUpdates: "Deduplicated updates",
      trackedUpdatesDetail: "Number of items rendered on this page",
      trackedSources: "Tracked sources",
      trackedSourcesDetail: "Sources that contributed updates in this digest",
      noteCount: "Editorial notes",
      noteCountDetail: "Notes attached to this digest",
      latestRunMetric: "Latest run new items",
      latestRunMetricDetail: "Detected in the last collect run",
      errorMetric: "Errors",
      errorMetricDetail: "Collection failures in this digest",
      groupedLabel: "Grouped",
      filterTitle: "Filters",
      filterReset: "Clear",
      filterSourceLabel: "Source",
      filterTopicLabel: "Topic",
      filterImportanceLabel: "Importance",
      filterStatusLabel: "Filter status",
      filterClearedStatus: "Filters cleared. Showing all updates.",
      sortTitle: "Sort",
      sortDefault: "Default",
      sortNewest: "Newest",
      sortOldest: "Oldest",
      sortImportance: "Importance",
      shareCopied: "Link copied to clipboard.",
      shareCopyFailed: "Could not copy the link.",
      externalLinkSuffix: "opens in a new window",
      itemSuffix: " items",
      sourceGroupNames: {
        github: "GitHub official",
        vscode: "VS Code official",
        platform: "GitHub Platform",
        other: "Other",
      },
      sourceGroupShort: {
        github: "GH",
        vscode: "VS",
        platform: "PF",
        other: "OT",
      },
      sourceGroupTags: {
        github: "#GitHubOfficial",
        vscode: "#VSCodeOfficial",
        platform: "#GitHubPlatform",
        other: "#Other",
      },
      topicFilterTags: {
        "GitHub Copilot": "#GitHubCopilot",
        "VS Code": "#VSCode",
        "GitHub Platform": "#GitHubPlatform",
        周辺ニュース: "#Ecosystem",
      },
      topicNames: {
        "GitHub Copilot": "GitHub Copilot",
        "VS Code": "VS Code",
        "GitHub Platform": "GitHub Platform",
        周辺ニュース: "Ecosystem",
      },
    };
  }

  return {
    htmlLang: "ja",
    siteLead:
      "GitHub Copilot と VS Code の更新を日次で集約した非公式ダイジェストです。",
    footerLabel: "Copyright (c) 2026",
    dailyNav: "日次ダイジェスト",
    weeklyNav: "週間ダイジェスト",
    searchNav: "検索",
    repositoryNav: "Repository",
    langSwitchLabel: "EN",
    heroEyebrow: "GitHub Copilot × VS Code 日次ダイジェスト",
    lastUpdatedLabel: "最終更新",
    heroTitle: "Copilot と VS Code の最新を、毎日ひと目で。",
    heroCopy:
      "GitHub Changelog と VS Code の公式更新を毎日集め、日本語の要点と 1 更新 1 枚のスライドにしています。気になる更新だけ選んで、JSON / PDF / PowerPoint で持ち帰れます。",
    publishedCount: "公開済み日次",
    publishedCountDetail: "Pages に載っている日次ダイジェスト数",
    overallCount: "累計更新件数",
    overallCountDetail: "重複除去後の累計",
    latestDate: "最新日付",
    latestDateDetail:
      "最後に公開対象になった日次。最新 collect が 0 件なら、この日付は据え置きになります。",
    latestRunCount: "直近読者向け新規",
    latestRunCountDetail:
      "最新 collect 実行で読者向けに掲載する新規件数。監査専用の差分は含みません。",
    howToReadTitle: "このサイトの見方",
    howToReadBody1:
      "まずはハイライトで重要な更新だけを把握し、必要ならテーマ別まとめと全件リストへ降りていく構成です。",
    howToReadBody2:
      "Markdown と JSON の生データも毎日併設しているので、要約の元ネタ確認や二次利用もしやすくしています。",
    policyTitle: "",
    policyBody1:
      "GitHub / VS Code の公式ソースを優先し、未来日付の feed 項目は公開日まで警告付き別セクションで扱い、周辺ニュースは量を絞ってノイズを抑えています。",
    policyBody2:
      "サイトは日本語を既定にしつつ、同じ内容の英語ページを /en/ 配下にも生成します。",
    latestHighlightsTitle: "最新ハイライト",
    latestHighlightsLabel: "最新6件",
    latestHighlightsCountSuffix: "件表示",
    searchPageEyebrow: "検索",
    searchPageTitle: "公開済み更新を横断検索する。",
    searchPageCopy:
      "Pagefind で、公開済みの日次更新をタイトル、要約、ソース、テーマ、タグ、日付から横断検索できます。",
    homeSearchTitle: "トップページから検索",
    homeSearchHelp:
      "ここから最近の公開済み更新を直接探せます。広く見たいときは専用の検索ページを使えます。",
    homeSearchOpenLink: "検索ページを開く",
    searchItemsMetric: "検索対象更新",
    searchItemsMetricDetail: "Pagefind が index する公開済み日次更新数",
    searchSourcesMetric: "ソース群数",
    searchSourcesMetricDetail: "index 対象の日次ページに含まれるソース分類",
    searchTopicsMetric: "テーマ数",
    searchTopicsMetricDetail: "index 対象の日次ページに含まれる大分類",
    searchTitle: "サイト内検索",
    searchHelp:
      "公開済み日次ページだけを対象に、より新しい日付を上に並べつつ、見出し単位の一致を展開します。",
    searchPlaceholder: "更新、テーマ、日付で検索",
    searchInputLabel: "公開済み更新を検索",
    searchResultsTitle: "検索結果",
    searchPrompt: "キーワードを入力すると結果を表示します。",
    searchLoading: "公開済み更新を検索中...",
    searchEmpty: "一致する更新は見つかりませんでした。",
    searchOpenDigest: "この日次を見る",
    weeklyArchiveTitle: "週間ダイジェスト",
    weeklyArchiveLabel: "直近 7 日単位",
    weeklyEmpty: "日次ログが増えると週間ダイジェストもここに並びます。",
    dailyArchiveTitle: "日次アーカイブ",
    dayCountSuffix: "日分",
    dayPageEyebrow: "日次ダイジェスト",
    weekPageEyebrow: "週間ダイジェスト",
    highlightsTitle: "今日のハイライト",
    topicsTitle: "テーマ別まとめ",
    sourceBreakdownTitle: "ソース内訳",
    sourceBreakdownLabel: "重複除去前",
    fullListTitle: "全件リスト",
    rawMarkdown: "Markdown を開く",
    rawJson: "JSON を開く",
    noItems: "このカテゴリの更新はありませんでした。",
    noteTitle: "注記",
    futureTitle: "先行検知した未来日付の項目",
    futureDescription:
      "feed では見えているものの、公開日が未来なので通常のハイライトやテーマ別まとめにはまだ混ぜていません。正式公開までに文言や URL が変わる可能性があります。",
    updatedLabel: "文書更新日",
    futurePublishedLabel: "公開予定日",
    detectedLabel: "このサイトに載った日",
    sourceLabel: "ソース",
    whyLabel: "なぜ重要か",
    originalTitleLabel: "原題",
    futureBadge: "未来日付",
    rangeLabel: "対象期間",
    rangeDetail: "このダイジェストがカバーしている日付範囲",
    trackedUpdates: "重複除去後の更新",
    trackedUpdatesDetail: "このページに表示する基準件数",
    trackedSources: "監視ソース",
    trackedSourcesDetail: "このダイジェストで更新を拾ったソース数",
    noteCount: "注記数",
    noteCountDetail: "このダイジェストに付いた注記の数",
    latestRunMetric: "直近 run の新規",
    latestRunMetricDetail: "最後の collect 実行で検知した件数",
    errorMetric: "エラー",
    errorMetricDetail: "取得失敗の件数",
    groupedLabel: "分類済み",
    filterTitle: "フィルター",
    filterReset: "クリア",
    filterSourceLabel: "ソース",
    filterTopicLabel: "テーマ",
    filterImportanceLabel: "重要度",
    filterStatusLabel: "フィルター状態",
    filterClearedStatus:
      "フィルターをクリアしました。すべての更新を表示しています。",
    sortTitle: "並び順",
    sortDefault: "標準",
    sortNewest: "新しい順",
    sortOldest: "古い順",
    sortImportance: "重要度順",
    shareCopied: "リンクをコピーしました。",
    shareCopyFailed: "リンクをコピーできませんでした。",
    externalLinkSuffix: "新しいウィンドウで開きます",
    itemSuffix: "件",
    sourceGroupNames: {
      github: "GitHub 公式",
      vscode: "VS Code 公式",
      platform: "GitHub Platform",
      other: "その他",
    },
    sourceGroupShort: {
      github: "GH",
      vscode: "VS",
      platform: "PF",
      other: "OT",
    },
    sourceGroupTags: {
      github: "#GitHub公式",
      vscode: "#VSCode公式",
      platform: "#GitHubPlatform",
      other: "#その他",
    },
    topicFilterTags: {
      "GitHub Copilot": "#GitHubCopilot",
      "VS Code": "#VSCode",
      "GitHub Platform": "#GitHubPlatform",
      周辺ニュース: "#周辺ニュース",
    },
    topicNames: {
      "GitHub Copilot": "GitHub Copilot",
      "VS Code": "VS Code",
      "GitHub Platform": "GitHub Platform",
      周辺ニュース: "周辺ニュース",
    },
  };
}

function renderMetric(label, value, detail) {
  return `<article class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><strong class="metric-value">${escapeHtml(value)}</strong><span class="metric-detail">${escapeHtml(detail)}</span></article>`;
}

function renderSectionHeading(title, trailing = "", action = "") {
  return `<div class="section-heading"><h2>${escapeHtml(title)}</h2><div class="section-heading-tools">${trailing ? `<span>${escapeHtml(trailing)}</span>` : ""}${action}</div></div>`;
}

function renderSectionAction(href, label) {
  return `<a class="section-action" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function renderTotalActionLabel(locale, count, unitLabel) {
  if (locale === "ja") {
    return `全${count}${unitLabel}を見る`;
  }

  return `View all ${count}`;
}

function highlightArchiveFileName(pageNumber) {
  return pageNumber <= 1 ? "highlights.html" : `highlights-${pageNumber}.html`;
}

async function listFilesRecursive(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

async function assertNoGenericFallbacksInPublishedOutput() {
  const files = await listFilesRecursive(siteDir);
  const targets = files.filter((filePath) => {
    if (filePath.endsWith(".html")) {
      return true;
    }

    return (
      filePath.endsWith(".md") &&
      filePath.includes(`${path.sep}raw${path.sep}summaries${path.sep}`)
    );
  });

  const hits = [];
  for (const filePath of targets) {
    const text = await fs.readFile(filePath, "utf8");
    for (const phrase of lowInformationFallbackMarkers) {
      if (text.includes(phrase)) {
        hits.push(`${path.relative(workspaceRoot, filePath)} -> ${phrase}`);
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(
      `Low-information fallback copy detected in published output:\n${hits.join("\n")}`,
    );
  }
}

async function assertGeneratedA11yBasics() {
  const files = (await listFilesRecursive(siteDir)).filter((filePath) =>
    filePath.endsWith(".html"),
  );
  const hits = [];

  for (const filePath of files) {
    const text = await fs.readFile(filePath, "utf8");
    const relativePath = path.relative(workspaceRoot, filePath);

    if (!text.includes('class="skip-link" href="#main-content"')) {
      hits.push(`${relativePath} -> missing skip link`);
    }

    if (!text.includes('<main id="main-content">')) {
      hits.push(`${relativePath} -> missing main-content landmark target`);
    }

    if (!/<nav class="site-nav" aria-label="[^"]+">/.test(text)) {
      hits.push(`${relativePath} -> missing primary nav label`);
    }

    if (
      !/<nav class="demo-nav" aria-label="[^"]+">[\s\S]*?<a href="https:\/\/aktsmm\.github\.io\/azure-ops-pulse-demo\/#\/overview">[\s\S]*?<a href="https:\/\/aktsmm\.github\.io\/m365-message-center-dashboard\/">[\s\S]*?<a href="https:\/\/aktsmm\.github\.io\/m365-copilot-update-digest\/">[\s\S]*?<a href="https:\/\/aktsmm\.github\.io\/daily-dev-byte\/">[\s\S]*?<span class="demo-nav-current" aria-current="page">VS Code Copilot Digest<\/span>[\s\S]*?<\/nav>/.test(
        text,
      )
    ) {
      hits.push(`${relativePath} -> missing cross-demo navigation`);
    }

    if (
      !/<button class="lang-toggle" type="button"[^>]*aria-pressed="(?:true|false)"/.test(
        text,
      )
    ) {
      hits.push(`${relativePath} -> missing language toggle state`);
    }

    if (
      !/<span class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-share-feedback><\/span>/.test(
        text,
      )
    ) {
      hits.push(`${relativePath} -> missing share feedback live region`);
    }

    if (
      /target="_blank" rel="noopener"/.test(text) &&
      !/target="_blank" rel="noopener" aria-label="[^"]+\([^)]*(?:new window|新しいウィンドウ)[^)]*\)"/.test(
        text,
      )
    ) {
      hits.push(`${relativePath} -> missing external-link accessibility label`);
    }

    if (text.includes("data-search-root")) {
      if (!/<input class="search-input"[^>]*aria-label="[^"]+"/.test(text)) {
        hits.push(`${relativePath} -> missing search input label`);
      }

      if (
        !/<p class="search-status" role="status" aria-live="polite" aria-atomic="true"/.test(
          text,
        )
      ) {
        hits.push(`${relativePath} -> missing search live status`);
      }
    }

    if (
      /<section class="section-block filter-block [^"]*" data-filter-root>/.test(
        text,
      )
    ) {
      if (!/<fieldset class="filter-row" aria-label="[^"]+">/.test(text)) {
        hits.push(`${relativePath} -> missing filter fieldset label`);
      }

      if (
        !/<div class="filter-chip-row" role="group" aria-label="[^"]+">/.test(
          text,
        )
      ) {
        hits.push(`${relativePath} -> missing filter chip group label`);
      }

      if (
        !/<p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-filter-status>/.test(
          text,
        )
      ) {
        hits.push(`${relativePath} -> missing filter live status`);
      }
    }
  }

  const css = await fs.readFile(
    path.join(siteDir, "assets", "styles.css"),
    "utf8",
  );
  if (!css.includes(".sr-only")) {
    hits.push("site/assets/styles.css -> missing sr-only utility");
  }

  if (
    !css.includes(
      ".latest-highlights-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }",
    )
  ) {
    hits.push(
      "site/assets/styles.css -> missing responsive latest highlight grid",
    );
  }

  if (!css.includes("text-overflow: ellipsis;")) {
    hits.push("site/assets/styles.css -> missing filter chip overflow guard");
  }

  if (hits.length > 0) {
    throw new Error(
      `Generated accessibility basics failed:\n${hits.join("\n")}`,
    );
  }
}

function renderPager(locale, currentPage, totalPages, hrefForPage) {
  if (totalPages <= 1) {
    return "";
  }

  const previousLabel = locale === "ja" ? "前へ" : "Previous";
  const nextLabel = locale === "ja" ? "次へ" : "Next";
  const summary =
    locale === "ja"
      ? `${currentPage} / ${totalPages} ページ`
      : `Page ${currentPage} of ${totalPages}`;

  const numberLinks = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    if (page === currentPage) {
      return `<span class="pager-link is-current">${page}</span>`;
    }

    return `<a class="pager-link" href="${escapeHtml(hrefForPage(page))}">${page}</a>`;
  }).join("");

  return `<nav class="pager" aria-label="${escapeHtml(locale === "ja" ? "ページ送り" : "Pagination")}">
    <div class="pager-summary">${escapeHtml(summary)}</div>
    <div class="pager-links">
      ${currentPage > 1 ? `<a class="pager-link pager-link--edge" href="${escapeHtml(hrefForPage(currentPage - 1))}">${escapeHtml(previousLabel)}</a>` : ""}
      ${numberLinks}
      ${currentPage < totalPages ? `<a class="pager-link pager-link--edge" href="${escapeHtml(hrefForPage(currentPage + 1))}">${escapeHtml(nextLabel)}</a>` : ""}
    </div>
  </nav>`;
}

function renderVisibleCountLabel(locale, count, unitLabel) {
  if (locale === "ja") {
    return `${count}${unitLabel}表示`;
  }

  return `${count} shown`;
}

function renderSourceBadge(event, text) {
  const group = sourceGroup(event);
  const meta = sourceGroupMeta(group, text);

  return `<span class="pill source-badge source-badge--${escapeHtml(group)}"><span class="source-badge-mark">${escapeHtml(meta.short)}</span><span>${escapeHtml(meta.label)}</span></span>`;
}

function renderBadges(event, locale, text) {
  return `<div class="badge-row">${renderSourceBadge(event, text)}${event.isFutureDated ? `<span class="pill pill-warning">${escapeHtml(text.futureBadge)}</span>` : ""}${buildHighlightTags(
    event,
    locale,
  )
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`)
    .join("")}</div>`;
}

function renderDateMeta(event, locale, text) {
  return `<div class="meta-row"><span>${escapeHtml(event.isFutureDated ? text.futurePublishedLabel : text.updatedLabel)}: ${escapeHtml(formatDate(event.publishedAt, locale))}</span><span>${escapeHtml(text.detectedLabel)}: ${escapeHtml(formatDate(event.detectedAt ?? event.publishedAt, locale))}</span></div>`;
}

function renderSourceMeta(event, locale, text) {
  return `<div class="meta-row source-meta"><span>${escapeHtml(text.sourceLabel)}:</span><span class="source-meta-value">${renderSourceBadge(event, text)}<span class="source-name-list">${escapeHtml((event.sourceNames ?? [event.sourceName]).join(" / "))}</span></span></div>`;
}

function buildPublishedEventEntries(dailyDigests, options = {}) {
  const includeFuture = options.includeFuture ?? true;
  const entries = [];
  const seen = new Set();

  for (const digest of dailyDigests) {
    const readerEvents = digest.readerEvents ?? digest.uniqueEvents ?? [];
    const events = includeFuture
      ? [...readerEvents, ...(digest.futureEvents ?? []).filter(isReaderEvent)]
      : readerEvents;

    for (const event of events) {
      const key = eventKey(event);
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      entries.push({ ...event, digestDate: digest.date });
    }
  }

  return entries.sort(
    (left, right) =>
      safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
      rankEvent(right) - rankEvent(left),
  );
}

function buildSourceHighlightGroups(dailyDigests) {
  const events = buildPublishedEventEntries(dailyDigests, {
    includeFuture: false,
  });

  return sourceGroupOrder
    .map((group) => ({
      group,
      events: events
        .filter((event) => sourceGroup(event) === group)
        .slice(0, 6),
    }))
    .filter((entry) => entry.events.length > 0);
}

function renderFilterChip(kind, value, label, extraClass = "") {
  return `<button type="button" class="filter-chip ${extraClass}" data-filter-kind="${escapeHtml(kind)}" data-filter-value="${escapeHtml(value)}" aria-pressed="false">${escapeHtml(label)}</button>`;
}

function renderFilterAxes(events) {
  return {
    showSource: new Set(events.map((event) => sourceGroup(event))).size > 1,
    showTopic: new Set(events.map((event) => classifyEvent(event))).size > 1,
    showImportance:
      new Set(events.map((event) => importanceFilterValue(event))).size > 1,
  };
}

function renderImportanceOptions(events, locale) {
  const options = new Map();
  for (const event of events) {
    const value = importanceFilterValue(event);
    if (!options.has(value)) {
      options.set(value, localizedImportanceLabel(event, locale));
    }
  }

  return [...options.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function renderFilterBar(text, options = {}) {
  const showSource = options.showSource ?? true;
  const showTopic = options.showTopic ?? true;
  const showImportance = options.showImportance ?? false;
  const showSort = options.showSort ?? false;
  const importanceOptions = options.importanceOptions ?? [];
  const showAxisLabels = options.showAxisLabels ?? true;
  const extraClass = options.extraClass ?? "";
  if (!showSource && !showTopic && !showImportance && !showSort) {
    return "";
  }

  const rows = [];
  if (showSource) {
    rows.push(`
      <fieldset class="filter-row" aria-label="${escapeHtml(text.filterSourceLabel)}">
        ${showAxisLabels ? `<legend class="filter-label">${escapeHtml(text.filterSourceLabel)}</legend>` : ""}
        <div class="filter-chip-row" role="group" aria-label="${escapeHtml(text.filterSourceLabel)}">${sourceGroupOrder
          .map((group) =>
            renderFilterChip(
              "source",
              group,
              sourceGroupMeta(group, text).tag,
              `source-badge--${group}`,
            ),
          )
          .join("")}</div>
      </fieldset>`);
  }

  if (showTopic) {
    rows.push(`
      <fieldset class="filter-row" aria-label="${escapeHtml(text.filterTopicLabel)}">
        ${showAxisLabels ? `<legend class="filter-label">${escapeHtml(text.filterTopicLabel)}</legend>` : ""}
        <div class="filter-chip-row" role="group" aria-label="${escapeHtml(text.filterTopicLabel)}">${topicOrder
          .map((topic) =>
            renderFilterChip(
              "topic",
              topic,
              text.topicFilterTags[topic] ?? topic,
            ),
          )
          .join("")}</div>
          </fieldset>`);
  }

  if (showImportance && importanceOptions.length > 0) {
    rows.push(`
      <fieldset class="filter-row" aria-label="${escapeHtml(text.filterImportanceLabel)}">
        ${showAxisLabels ? `<legend class="filter-label">${escapeHtml(text.filterImportanceLabel)}</legend>` : ""}
        <div class="filter-chip-row" role="group" aria-label="${escapeHtml(text.filterImportanceLabel)}">${importanceOptions
          .map(([value, label]) => renderFilterChip("importance", value, label))
          .join("")}</div>
      </fieldset>`);
  }

  if (showSort) {
    const sortLabels = {
      default: text.sortDefault,
      newest: text.sortNewest,
      oldest: text.sortOldest,
      importance: text.sortImportance,
    };
    rows.push(`
      <fieldset class="filter-row" aria-label="${escapeHtml(text.sortTitle)}">
        ${showAxisLabels ? `<legend class="filter-label">${escapeHtml(text.sortTitle)}</legend>` : ""}
        <div class="filter-chip-row" role="group" aria-label="${escapeHtml(text.sortTitle)}">${sortOrder
          .map((sort) =>
            renderFilterChip("sort", sort, sortLabels[sort] ?? sort),
          )
          .join("")}</div>
      </fieldset>`);
  }

  return `<section class="section-block filter-block ${escapeHtml(extraClass)}" data-filter-root>
    <div class="section-heading"><h2>${escapeHtml(text.filterTitle)}</h2><button type="button" class="filter-reset" data-filter-reset>${escapeHtml(text.filterReset)}</button></div>
    <div class="filter-stack">
      ${rows.join("")}
    </div>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-filter-status>${escapeHtml(text.filterStatusLabel)}</p>
  </section>`;
}

function renderSearchFacetBar(text, events) {
  const sourceValues = new Set(events.map((event) => sourceGroup(event)));
  const topicValues = new Set(events.map((event) => classifyEvent(event)));
  return `<section class="section-block filter-block filter-block--compact" data-search-filters>
    <div class="section-heading"><h2>${escapeHtml(text.filterTitle)}</h2><button type="button" class="filter-reset" data-search-filter-reset>${escapeHtml(text.filterReset)}</button></div>
    <div class="filter-stack">
      <fieldset class="filter-row" aria-label="${escapeHtml(text.filterSourceLabel)}">
        <legend class="filter-label">${escapeHtml(text.filterSourceLabel)}</legend>
        <div class="filter-chip-row" role="group" aria-label="${escapeHtml(text.filterSourceLabel)}">${sourceGroupOrder
          .filter((group) => sourceValues.has(group))
          .map((group) =>
            renderFilterChip(
              "source",
              group,
              sourceGroupMeta(group, text).tag,
              `source-badge--${group}`,
            ),
          )
          .join("")}</div>
      </fieldset>
      <fieldset class="filter-row" aria-label="${escapeHtml(text.filterTopicLabel)}">
        <legend class="filter-label">${escapeHtml(text.filterTopicLabel)}</legend>
        <div class="filter-chip-row" role="group" aria-label="${escapeHtml(text.filterTopicLabel)}">${topicOrder
          .filter((topic) => topicValues.has(topic))
          .map((topic) =>
            renderFilterChip(
              "topic",
              topic,
              text.topicFilterTags[topic] ?? topic,
            ),
          )
          .join("")}</div>
      </fieldset>
    </div>
  </section>`;
}

function eventAnchorId(event) {
  return `event-${createHash("sha1").update(eventKey(event)).digest("hex").slice(0, 12)}`;
}

function resourceLabels(locale) {
  return locale === "ja"
    ? { source: "原文", related: "関連ドキュメント", archive: "掲載日のまとめを見る", unconfirmed: "対応資料未確認", fetch_failed: "資料の取得失敗（再確認待ち）", unresearched: "資料未調査" }
    : { source: "Original", related: "Related documentation", archive: "View that day's digest", unconfirmed: "Matching documentation unconfirmed", fetch_failed: "Resource fetch failed (pending retry)", unresearched: "Documentation not yet researched" };
}

function renderResourceLinks(event, locale) {
  const labels = resourceLabels(locale);
  const resources = event.resources ?? { status: "unresearched", documents: [] };
  const source = httpUrl(resources.source?.url ?? event.url);
  const anchor = eventAnchorId(event);
  const date = [event.digestDate, event.archiveDate, archiveDates.get(eventKey(event))]
    .find((candidate) => candidate && publishedAnchors.has(`${candidate}#${anchor}`));
  const archive = date ? `${locale === "en" ? "en/" : ""}days/${date}.html#${eventAnchorId(event)}` : null;
  const external = (url, title) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)} <span aria-hidden="true">&#8599;</span></a>`;
  return `<div class="resource-links" data-pagefind-ignore>
    <div>${source ? external(source, labels.source) : ""}${archive ? ` <a data-archive-path="${escapeHtml(archive)}" href="${escapeHtml(`https://aktsmm.github.io/vscode-copilot-digest/${archive}`)}">${escapeHtml(labels.archive)}</a>` : ""}</div>
    ${resources.documents.length ? `<p class="resource-label">${escapeHtml(labels.related)}</p><ul>${resources.documents.slice(0, 3).map((doc) => `<li>${external(doc.url, doc.title)}</li>`).join("")}</ul>` : ""}
    ${labels[resources.status] && resources.status === "fetch_failed" ? `<p class="resource-status">${escapeHtml(labels[resources.status])}</p>` : ""}
  </div>`;
}

function cardWhy(event, locale) {
  if (event.sourceId === "copilot-whats-new" && event.kind === "html_snapshot_change") {
    return locale === "ja"
      ? "What's New の見出し差分の検出記録で、独立した製品機能の発表ではありません。下の追加内容と原文で実際の変更を確認してください。"
      : "This records changed What's New headings, not a standalone product-feature announcement. See the added items below and the original entry for the actual changes.";
  }
  const reason = importanceReason(event, locale);
  return isGenericImportanceReason(reason) ? "" : reason;
}


// A page-change event has no article, so the added lines are what tells the reader what changed.
function renderSnapshotChanges(event, locale, limit) {
  if (event.kind !== "html_snapshot_change") return "";
  const lines = meaningfulSnapshotAdditions(event).map((line) => line.replace(/^H[1-3]:\s*/, ""));
  if (lines.length === 0) return "";
  const label = locale === "ja" ? "ページに追加された内容" : "Added to the page";
  const more = lines.length > limit ? `<li>${escapeHtml(locale === "ja" ? `ほか ${lines.length - limit} 件` : `and ${lines.length - limit} more`)}</li>` : "";
  return `<div class="snapshot-changes"><p class="resource-label">${escapeHtml(label)}</p><ul>${lines.slice(0, limit).map((line) => `<li>${escapeHtml(trimText(line, 140))}</li>`).join("")}${more}</ul></div>`;
}

// A written Japanese title leads the card; without one the usual title is kept.
function displayTitle(event, locale) {
  return (locale === "ja" && jaCardTitleFor(event)) || localizedTitle(event, locale);
}

function renderCardPoints(event) {
  const points = cardPointsFor(event);
  return points.length ? `<ul class="card-points">${points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>` : "";
}

function renderEventCard(event, locale, text, options = {}) {
  const rawTitle = locale === "ja" ? originalTitle(event) : null;
  const summaryMaxLength = options.compact ? 210 : 340;
  const group = sourceGroup(event);
  const topic = classifyEvent(event);
  const importance = importanceFilterValue(event);
  const anchorId = options.anchorId ?? null;
  const whyText = cardWhy(event, locale);
  const summaryText = options.compact
    ? cardDescription(event, locale)
    : trimText(localizedSummary(event, locale), summaryMaxLength);
  const compactWhy = /\.\.\.|…/.test(whyText)
    ? ""
    : completeSentencePreview(whyText, locale, 1);
  const why = options.includeWhy && whyText
    ? options.compact
      ? compactWhy
        ? `<p class="mini-why">${escapeHtml(compactWhy)}</p>`
        : ""
      : `<p class="why-it-matters"><strong>${escapeHtml(text.whyLabel)}:</strong> ${escapeHtml(whyText)}</p>`
    : "";
  const cardClass = options.compact ? "mini-highlight" : "update-card";

  const isExternal =
    event.url && !event.url.startsWith("./") && !event.url.startsWith("../");
  const linkAttrs = isExternal ? ` target="_blank" rel="noopener"` : "";
  const titleText = displayTitle(event, locale);
  const linkLabel = isExternal
    ? ` aria-label="${escapeHtml(`${titleText} (${text.externalLinkSuffix})`)}"`
    : "";

  const slideId = options.pick ? slideIdFor(event) : null;
  const pickAttrs = options.pick ? ` data-card-date="${escapeHtml(String(event.digestDate ?? ""))}"${slideId ? ` data-slide-id="${escapeHtml(slideId)}"` : ""}` : "";
  const pickBox = slideId ? `<label class="card-pick" title="${escapeHtml(locale === "ja" ? "ダウンロード（JSON / PDF / PPTX）の対象に含める" : "Include in the JSON / PDF / PPTX download")}"><input type="checkbox" data-card-pick value="${escapeHtml(slideId)}" checked><span>${escapeHtml(locale === "ja" ? "スライドあり・保存対象" : "Slide · include in download")}</span></label>` : "";
  return `<article class="${cardClass}"${pickAttrs} data-filter-card data-source-group="${escapeHtml(group)}" data-topic="${escapeHtml(topic)}" data-importance="${escapeHtml(importance)}" data-sort-date="${escapeHtml(String(sortDateValue(event)))}" data-sort-score="${escapeHtml(String(rankEvent(event)))}">
    ${pickBox}
    ${renderBadges(event, locale, text)}
    <h3${anchorId ? ` id="${escapeHtml(anchorId)}"` : ""}><a href="${escapeHtml(event.resources?.source?.url ?? event.url)}"${linkAttrs}${linkLabel}>${escapeHtml(titleText)}${isExternal ? ' <span class="ext-icon" aria-hidden="true">&#8599;</span>' : ""}</a></h3>
    ${rawTitle ? `<p class="original-title">${escapeHtml(text.originalTitleLabel)}: ${escapeHtml(rawTitle)}</p>` : ""}
    ${options.compact ? `<div class="meta-row"><span>${escapeHtml(formatDate(event.publishedAt, locale))}</span><span class="source-name-list">${escapeHtml((event.sourceNames ?? [event.sourceName]).join(" / "))}</span></div>` : `${renderDateMeta(event, locale, text)}
    ${renderSourceMeta(event, locale, text)}`}
    <p${options.compact ? ' class="mini-summary"' : ""}>${escapeHtml(summaryText)}</p>
    ${renderCardPoints(event)}
    ${why}
    ${renderSnapshotChanges(event, locale, options.compact ? 3 : 6)}
    ${renderResourceLinks(event, locale)}
  </article>`;
}

function renderSourceHighlightPanel(entry, locale, text) {
  const itemCount =
    locale === "ja"
      ? `${entry.events.length}${text.itemSuffix}`
      : formatCount(entry.events.length, locale, "item", "items");
  const topicName = sourceGroupMeta(entry.group, text).label;

  return `<div class="source-highlight-panel is-hidden" data-highlight-source-section="${escapeHtml(entry.group)}" data-highlight-count="${escapeHtml(String(entry.events.length))}">
    <div class="section-heading section-heading--sub"><h3>${escapeHtml(topicName)}</h3><span>${escapeHtml(itemCount)}</span></div>
    <div class="highlight-grid latest-highlights-grid">${entry.events.map((event) => renderEventCard(event, locale, text, { compact: true, includeWhy: true })).join("")}</div>
  </div>`;
}

function renderTopicSection(topic, locale, text) {
  const topicName = text.topicNames[topic.name] ?? topic.name;
  if (topic.count === 0) {
    return `<section class="topic-section"><div class="section-heading"><h2>${escapeHtml(topicName)}</h2><span>0</span></div><p class="empty-state">${escapeHtml(text.noItems)}</p></section>`;
  }

  const items = topic.events
    .slice(0, 8)
    .map(
      (event) =>
        `<li><a href="${escapeHtml(event.url)}">${escapeHtml(localizedTitle(event, locale))}</a><span>${escapeHtml(localizedImportanceLabel(event, locale))}</span></li>`,
    )
    .join("");

  return `<section class="topic-section"><div class="section-heading"><h2>${escapeHtml(topicName)}</h2><span>${topic.count}</span></div><ul class="topic-list">${items}</ul></section>`;
}

function renderEditorialNotes(notes, text) {
  if ((notes ?? []).length === 0) {
    return "";
  }

  return `<section class="section-block notice-block"><div class="section-heading"><h2>${escapeHtml(text.noteTitle)}</h2><span>${notes.length}</span></div><div class="notice-list">${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}</div></section>`;
}

function renderFutureSection(events, locale, text) {
  if ((events ?? []).length === 0) {
    return "";
  }

  return `<section class="section-block notice-block future-block"><div class="section-heading"><h2>${escapeHtml(text.futureTitle)}</h2><span>${events.length}</span></div><p class="future-note">${escapeHtml(text.futureDescription)}</p><div class="highlight-grid">${events.map((event) => renderEventCard(event, locale, text, { includeWhy: false, anchorId: eventAnchorId(event) })).join("")}</div></section>`;
}

function buildRangeDigest(logs, range) {
  const endDate = new Date(range.endDate);
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(range.startDate);
  startDate.setHours(0, 0, 0, 0);

  const rawEvents = applyEditorialPolicy(
    logs
      .flatMap((log) => log.events ?? [])
      .filter((event) => {
        const value = safeDate(event.publishedAt ?? event.detectedAt);
        return value >= startDate && value <= endDate;
      }),
  );

  const rawUniqueEvents = dedupeEvents(rawEvents).sort(
    (left, right) =>
      safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
      rankEvent(right) - rankEvent(left),
  );
  const readerEvents = rawUniqueEvents.filter(isReaderEvent);
  const weeklyEvents = readerEvents.filter(isHighlightEligible);
  const uniqueEvents = selectEditorialHighlights(weeklyEvents, 3);

  const sourceBreakdown = new Map();
  for (const event of uniqueEvents) {
    const sourceName = event.sourceName ?? "Unknown";
    if (!sourceBreakdown.has(sourceName)) {
      sourceBreakdown.set(sourceName, new Set());
    }

    sourceBreakdown
      .get(sourceName)
      .add(event.url || event.title || event.eventId);
  }

  const topicMap = new Map(topicOrder.map((topic) => [topic, []]));
  for (const event of uniqueEvents) {
    topicMap.get(classifyEvent(event)).push(event);
  }

  const editorialNotes = [
    ...new Set(
      logs
        .filter(
          (log) =>
            safeDate(log.date) >= startDate && safeDate(log.date) <= endDate,
        )
        .map((log) => log.editorialNote)
        .filter(Boolean),
    ),
  ];

  return {
    kind: range.kind,
    key: range.key,
    startDate: toDateOnly(startDate),
    endDate: toDateOnly(endDate),
    editorialNotes,
    rawEventCount: rawUniqueEvents.length,
    readerEventCount: uniqueEvents.length,
    mediumEventCount: readerEvents.length - uniqueEvents.length,
    auditEventCount: rawUniqueEvents.length - readerEvents.length,
    uniqueEventCount: uniqueEvents.length,
    sourceBreakdown: [...sourceBreakdown.entries()]
      .map(([name, keys]) => ({ name, count: keys.size }))
      .sort(
        (left, right) =>
          right.count - left.count || left.name.localeCompare(right.name, "ja"),
      ),
    highlights: uniqueEvents,
    uniqueEvents,
    readerEvents: uniqueEvents,
    topics: topicOrder.map((topic) => ({
      name: topic,
      count: topicMap.get(topic).length,
      events: topicMap.get(topic),
    })),
  };
}

function buildWeeklyDigests(logs) {
  if (logs.length === 0) {
    return [];
  }

  const latestDate = safeDate(logs[0].date);
  latestDate.setHours(0, 0, 0, 0);
  const oldestDate = safeDate(logs[logs.length - 1].date);
  oldestDate.setHours(0, 0, 0, 0);

  const weeklyDigests = [];
  let endDate = new Date(latestDate);

  while (endDate >= oldestDate) {
    const startDate = subtractDays(endDate, 6);
    const digest = buildRangeDigest(logs, {
      kind: "week",
      key: `${toDateOnly(startDate).replace(/-/g, "")}-${toDateOnly(endDate).replace(/-/g, "")}`,
      startDate,
      endDate,
    });

    digest.key = `${digest.startDate.replace(/-/g, "")}-${digest.endDate.replace(/-/g, "")}`;

    if (digest.uniqueEventCount > 0) {
      weeklyDigests.push(digest);
    }

    endDate = subtractDays(startDate, 1);
  }

  return weeklyDigests;
}

function renderArchiveCard(digest, locale, text, href, kind) {
  const rangeLabel =
    kind === "week" ? `${digest.startDate} - ${digest.endDate}` : digest.date;
  const title =
    kind === "week"
      ? `${digest.startDate} - ${digest.endDate}`
      : `${digest.date}`;
  const displayEvents = digest.readerEvents ?? digest.uniqueEvents;
  const focusEvent = digest.highlights[0] ?? displayEvents[0] ?? null;
  const focusTitle = focusEvent
    ? localizedTitle(focusEvent, locale)
    : locale === "ja"
      ? "主な更新を確認する"
      : "Review the main update";
  const focusSummary = focusEvent ? cardDescription(focusEvent, locale) : "";
  const itemCount =
    locale === "ja"
      ? `${digest.readerEventCount ?? displayEvents.length}${escapeHtml(text.itemSuffix)}`
      : formatCount(
          digest.readerEventCount ?? displayEvents.length,
          locale,
          "item",
          "items",
        );

  return `<article class="digest-card">
    <div class="digest-card-head"><p>${escapeHtml(rangeLabel)}</p><span>${itemCount}</span></div>
    <h3><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h3>
    <p class="digest-card-focus-label">${escapeHtml(locale === "ja" ? "今週の焦点" : "Focus")}</p>
    <p class="digest-card-focus">${escapeHtml(focusTitle)}</p>
    ${focusSummary ? `<p class="digest-card-summary">${escapeHtml(focusSummary)}</p>` : ""}
  </article>`;
}

function renderEventStreamItem(event, locale, text) {
  const rawTitle = locale === "ja" ? originalTitle(event) : null;
  const group = sourceGroup(event);
  const topic = classifyEvent(event);
  const importance = importanceFilterValue(event);
  const isExternal =
    event.url && !event.url.startsWith("./") && !event.url.startsWith("../");
  const linkAttrs = isExternal ? ` target="_blank" rel="noopener"` : "";
  const titleText = displayTitle(event, locale);
  const linkLabel = isExternal
    ? ` aria-label="${escapeHtml(`${titleText} (${text.externalLinkSuffix})`)}"`
    : "";

  return `<article class="stream-item" data-filter-card data-source-group="${escapeHtml(group)}" data-topic="${escapeHtml(topic)}" data-importance="${escapeHtml(importance)}" data-sort-date="${escapeHtml(String(sortDateValue(event)))}" data-sort-score="${escapeHtml(String(rankEvent(event)))}">
    <div class="stream-item-head">
      ${renderBadges(event, locale, text)}
      <div class="stream-item-meta">${renderDateMeta(event, locale, text)}${renderSourceMeta(event, locale, text)}</div>
    </div>
    <div class="stream-item-body">
      <h3 id="${eventAnchorId(event)}"><a href="${escapeHtml(event.resources?.source?.url ?? event.url)}"${linkAttrs}${linkLabel}>${escapeHtml(titleText)}${isExternal ? ' <span class="ext-icon" aria-hidden="true">&#8599;</span>' : ""}</a></h3>
      ${rawTitle ? `<p class="original-title">${escapeHtml(text.originalTitleLabel)}: ${escapeHtml(rawTitle)}</p>` : ""}
      <p>${escapeHtml(trimText(localizedSummary(event, locale), 520))}</p>
      <p class="why-it-matters"><strong>${escapeHtml(text.whyLabel)}:</strong> ${escapeHtml(cardWhy(event, locale))}</p>
      ${renderResourceLinks(event, locale)}
    </div>
  </article>`;
}

function renderDigestStreamItem(digest, locale, text, href, kind) {
  const rangeLabel =
    kind === "week" ? `${digest.startDate} - ${digest.endDate}` : digest.date;
  const displayEvents = digest.readerEvents ?? digest.uniqueEvents;
  const itemCount =
    locale === "ja"
      ? `${digest.readerEventCount ?? displayEvents.length}${text.itemSuffix}`
      : formatCount(
          digest.readerEventCount ?? displayEvents.length,
          locale,
          "item",
          "items",
        );
  const focusEvent = digest.highlights[0] ?? displayEvents[0] ?? null;
  const focusTitle = focusEvent
    ? localizedTitle(focusEvent, locale)
    : locale === "ja"
      ? "主な更新を確認する"
      : "Review the main update";
  const focusSummary = focusEvent ? cardDescription(focusEvent, locale) : "";

  return `<article class="archive-stream-item">
    <div class="archive-stream-side">
      <p class="archive-stream-range">${escapeHtml(rangeLabel)}</p>
      <span class="archive-stream-count">${escapeHtml(itemCount)}</span>
    </div>
    <div class="archive-stream-body">
      <h3><a href="${escapeHtml(href)}">${escapeHtml(rangeLabel)}</a></h3>
      <p class="archive-stream-focus">${escapeHtml(locale === "ja" ? "主な更新" : "Focus")}: ${escapeHtml(focusTitle)}</p>
      ${focusSummary ? `<p>${escapeHtml(focusSummary)}</p>` : ""}
    </div>
    <div class="archive-stream-link">${renderSectionAction(href, locale === "ja" ? "開く" : "Open")}</div>
  </article>`;
}

function renderHighlightsArchivePage(
  events,
  locale,
  text,
  lastUpdatedAt,
  relativePrefix,
  links,
  options = {},
) {
  const pageNumber = options.pageNumber ?? 1;
  const retire = options.retirements === true;
  const totalPages = Math.max(
    1,
    Math.ceil(events.length / HIGHLIGHTS_PAGE_SIZE),
  );
  const pageEvents = events.slice(
    (pageNumber - 1) * HIGHLIGHTS_PAGE_SIZE,
    pageNumber * HIGHLIGHTS_PAGE_SIZE,
  );
  const itemCount =
    locale === "ja"
      ? `${events.length}${text.itemSuffix}`
      : formatCount(events.length, locale, "item", "items");
  const visibleCount =
    locale === "ja"
      ? `${pageEvents.length}${text.itemSuffix}`
      : formatCount(pageEvents.length, locale, "item", "items");
  const sourceCount = new Set(pageEvents.map((event) => sourceGroup(event)))
    .size;
  const latestDate = pageEvents[0]?.publishedAt
    ? formatDate(pageEvents[0].publishedAt, locale)
    : "N/A";
  const filterAxes = renderFilterAxes(pageEvents);
  const pager = renderPager(locale, pageNumber, totalPages, links.pageHref);
  const body = `
    <section class="hero hero-day">
      <div>
        <p class="eyebrow">${escapeHtml(retire ? (locale === "ja" ? "提供終了・廃止" : "Retirements") : (locale === "ja" ? "ハイライト一覧" : "Highlights archive"))}</p>
        <h1>${escapeHtml(retire ? (locale === "ja" ? "提供終了・廃止・移行の更新をまとめて見る。" : "Retirements and deprecations in one place.") : (locale === "ja" ? "最新ハイライトをまとめて見る。" : "Browse all highlights."))}</h1>
        <p class="hero-copy">${escapeHtml(retire ? (locale === "ja" ? "モデルや機能の提供終了・廃止・移行に関わる更新だけを、新しい順に並べています。設定やワークフローの見直しが必要か、早めに確認できます。" : "Only updates about retired, deprecated or migrated models and features, newest first, so you can check early whether settings or workflows need changes.") : (locale === "ja" ? "トップページでは最新の一部だけを見せています。このページでは公開済みのハイライトを時系列でまとめて追えます。50件を超えるとページ分割します。" : "The home page shows only a subset. This page lists published highlights in reverse chronological order and splits them into pages of 50 items."))}</p>
      </div>
      <div class="metrics-grid">
        ${renderMetric(text.trackedUpdates, visibleCount, locale === "ja" ? "このページに表示している件数" : "Items shown on this page")}
        ${renderMetric(text.searchSourcesMetric, locale === "ja" ? `${sourceCount}${text.itemSuffix}` : formatCount(sourceCount, locale, "source", "sources"), text.searchSourcesMetricDetail)}
        ${renderMetric(text.latestDate, latestDate, text.latestDateDetail)}
        ${renderMetric(locale === "ja" ? "公開済みハイライト" : "Published highlights", locale === "ja" ? `${events.length}${text.itemSuffix}` : itemCount, locale === "ja" ? "一覧ページに並ぶ総件数" : "Total number of published highlights in this list")}
      </div>
    </section>

    ${pager}

    ${downloadPanelHtml(locale)}
    ${renderFilterBar(text, { showSource: true, showTopic: true, showImportance: true, showSort: true, importanceOptions: renderImportanceOptions(pageEvents, locale), showAxisLabels: true, extraClass: "filter-block--compact" })}

    <section class="section-block"${retire ? "" : " data-pagefind-body"}>
      ${renderSectionHeading(retire ? (locale === "ja" ? "提供終了・廃止の更新" : "Retirements") : (locale === "ja" ? "ハイライト一覧" : "All highlights"), locale === "ja" ? `${visibleCount} / 全${events.length}${text.itemSuffix}` : `${visibleCount} / ${itemCount}`)}
      <div class="stream-list" data-sort-list style="counter-reset: card-no ${(pageNumber - 1) * HIGHLIGHTS_PAGE_SIZE}">${pageEvents.map((event) => renderEventStreamItem(event, locale, text)).join("")}</div>
    </section>

    ${pager}
  `;

  return renderLayout({
    locale,
    text,
    title: retire
      ? (locale === "ja" ? "提供終了・廃止 | vscode-copilot-digest" : "Retirements | vscode-copilot-digest")
      : locale === "ja"
        ? "ハイライト一覧 | vscode-copilot-digest"
        : "Highlights | vscode-copilot-digest",
    description: retire
      ? (locale === "ja" ? "提供終了・廃止・移行に関わる更新の一覧" : "Updates about retirements and deprecations")
      : locale === "ja"
        ? "公開済みハイライトの一覧ページ"
        : "Published highlights archive",
    body,
    lastUpdatedAt,
    relativePrefix,
    homeHref: links.home,
    weeklyHref: links.weekly,
    langSwitchHref: links.langSwitch,
  });
}

function renderDigestArchivePage(
  digests,
  kind,
  locale,
  text,
  lastUpdatedAt,
  relativePrefix,
  links,
) {
  const countLabel =
    locale === "ja"
      ? `${digests.length}${kind === "day" ? text.dayCountSuffix : text.itemSuffix}`
      : formatCount(
          digests.length,
          locale,
          kind === "day" ? "day" : "window",
          kind === "day" ? "days" : "windows",
        );
  const latestLabel =
    kind === "day"
      ? (digests[0]?.date ?? "N/A")
      : digests[0]
        ? `${digests[0].startDate} - ${digests[0].endDate}`
        : "N/A";
  const totalItems = digests.reduce(
    (sum, digest) => sum + (digest.readerEventCount ?? digest.uniqueEventCount),
    0,
  );
  const body = `
    <section class="hero hero-day">
      <div>
        <p class="eyebrow">${escapeHtml(kind === "day" ? (locale === "ja" ? "日次アーカイブ" : "Daily archive") : locale === "ja" ? "週間アーカイブ" : "Weekly archive")}</p>
        <h1>${escapeHtml(kind === "day" ? (locale === "ja" ? "日次アーカイブをまとめて見る。" : "Browse all daily digests.") : locale === "ja" ? "週間ダイジェストをまとめて見る。" : "Browse all weekly digests.")}</h1>
        <p class="hero-copy">${escapeHtml(kind === "day" ? (locale === "ja" ? "日付ごとのダイジェストを縦に並べて追える一覧です。トップページよりも古い記録までまとめて確認できます。" : "A vertical list of day-by-day digests, including older entries beyond the home page.") : locale === "ja" ? "週単位でまとめたダイジェストを縦一覧で追えます。公開済みの週次をまとめて見返したいとき向けです。" : "A vertical list of rolling weekly digests for reviewing published weekly windows.")}</p>
      </div>
      <div class="metrics-grid">
        ${renderMetric(kind === "day" ? text.dailyArchiveTitle : text.weeklyArchiveTitle, countLabel, locale === "ja" ? "公開済み一覧件数" : "Published archive count")}
        ${renderMetric(text.latestDate, latestLabel, locale === "ja" ? "一番新しい対象期間" : "Newest covered range")}
        ${renderMetric(text.overallCount, locale === "ja" ? `${totalItems}${text.itemSuffix}` : formatCount(totalItems, locale, "item", "items"), text.overallCountDetail)}
        ${renderMetric(locale === "ja" ? "ホーム表示枠" : "Home page batch", locale === "ja" ? `${Math.min(HOME_ARCHIVE_LIMIT, digests.length)}${kind === "day" ? text.dayCountSuffix : text.itemSuffix}` : `${Math.min(HOME_ARCHIVE_LIMIT, digests.length)}`, locale === "ja" ? "トップページで先頭に出す件数" : "Items shown on the home page before opening the full archive")}
      </div>
    </section>

    <section class="section-block">
      ${renderSectionHeading(kind === "day" ? text.dailyArchiveTitle : text.weeklyArchiveTitle, countLabel)}
      <div class="archive-stream">${digests.map((digest) => renderDigestStreamItem(digest, locale, text, kind === "day" ? links.dayHref(digest.date) : links.weekHref(digest.key), kind)).join("")}</div>
    </section>
  `;

  return renderLayout({
    locale,
    text,
    title:
      kind === "day"
        ? locale === "ja"
          ? "日次アーカイブ | vscode-copilot-digest"
          : "Daily archive | vscode-copilot-digest"
        : locale === "ja"
          ? "週間ダイジェスト一覧 | vscode-copilot-digest"
          : "Weekly digests | vscode-copilot-digest",
    description:
      kind === "day"
        ? locale === "ja"
          ? "公開済み日次ダイジェストの一覧ページ"
          : "Published daily digest archive"
        : locale === "ja"
          ? "公開済み週間ダイジェストの一覧ページ"
          : "Published weekly digest archive",
    body,
    lastUpdatedAt,
    relativePrefix,
    homeHref: links.home,
    weeklyHref: links.weekly,
    langSwitchHref: links.langSwitch,
  });
}

function renderRangePage(digest, locale, text, options) {
  const itemCount = (count) =>
    locale === "ja"
      ? `${count}${text.itemSuffix}`
      : formatCount(count, locale, "item", "items");
  const displayEvents = digest.readerEvents ?? digest.uniqueEvents;
  const displayEventCount = digest.readerEventCount ?? displayEvents.length;
  const filterAxes = renderFilterAxes(displayEvents);
  const metrics =
    options.kind === "day"
      ? [
          renderMetric(
            text.trackedUpdates,
            itemCount(displayEventCount),
            text.trackedUpdatesDetail,
          ),
          renderMetric(
            text.latestRunMetric,
            itemCount(
              digest.freshReaderCount ?? digest.latestRun.newEventsCount,
            ),
            text.latestRunMetricDetail,
          ),
          renderMetric(
            text.trackedSources,
            itemCount(digest.sourceBreakdown.length),
            text.trackedSourcesDetail,
          ),
          renderMetric(
            text.errorMetric,
            itemCount(digest.errorCount),
            text.errorMetricDetail,
          ),
        ]
      : [
          renderMetric(
            text.rangeLabel,
            `${digest.startDate} - ${digest.endDate}`,
            text.rangeDetail,
          ),
          renderMetric(
            text.trackedUpdates,
            itemCount(displayEventCount),
            text.trackedUpdatesDetail,
          ),
          renderMetric(
            text.trackedSources,
            itemCount(digest.sourceBreakdown.length),
            text.trackedSourcesDetail,
          ),
          renderMetric(
            text.highlightsTitle,
            itemCount(digest.highlights.length),
            locale === "ja"
              ? "この週の代表ハイライト件数"
              : "Representative highlights in this weekly digest",
          ),
        ];

  const body = `
    <section class="hero hero-day">
      <div>
        <p class="eyebrow">${escapeHtml(options.kind === "day" ? text.dayPageEyebrow : text.weekPageEyebrow)}</p>
        <h1>${escapeHtml(options.kind === "day" ? digest.date : `${digest.startDate} - ${digest.endDate}`)}</h1>
        <p class="hero-copy">${escapeHtml(options.kind === "day" ? (locale === "ja" ? "当日の監視結果を、重複を除いた読みやすい形に再構成しています。" : "This page reorganizes one day's collected updates into a deduplicated, readable digest.") : locale === "ja" ? "直近 7 日の更新をまとめて追えるように、ハイライトと全件を週単位で再構成しています。" : "This page groups the last seven days of updates into a weekly digest with highlights and a full update list.")}</p>
      </div>
      <div class="metrics-grid">${metrics.join("")}</div>
    </section>

    ${options.kind === "day" ? renderFutureSection(digest.futureEvents, locale, text) : ""}

  ${renderFilterBar(text, { showSource: true, showTopic: true, showImportance: true, showSort: true, importanceOptions: renderImportanceOptions(displayEvents, locale), showAxisLabels: true, extraClass: "filter-block--compact" })}

    ${
      digest.highlights.length > 0
        ? `<section class="section-block">
      <div class="section-heading"><h2>${escapeHtml(text.highlightsTitle)}</h2><span>${escapeHtml(itemCount(digest.highlights.length))}</span></div>
      <div class="highlight-grid">${digest.highlights.map((event) => renderEventCard(event, locale, text, { includeWhy: true })).join("")}</div>
    </section>`
        : ""
    }

    <section class="section-block page-grid">
      <div>
        <div class="section-heading"><h2>${escapeHtml(text.topicsTitle)}</h2><span>${escapeHtml(text.groupedLabel)}</span></div>
        ${digest.topics.map((topic) => renderTopicSection(topic, locale, text)).join("")}
      </div>
      <aside class="side-panel">
        <div class="section-heading"><h2>${escapeHtml(text.sourceBreakdownTitle)}</h2><span>${escapeHtml(text.sourceBreakdownLabel)}</span></div>
        <ul class="source-breakdown">${digest.sourceBreakdown.map((source) => `<li><span>${escapeHtml(source.name)}</span><strong>${source.count}</strong></li>`).join("")}</ul>
        ${options.kind === "day" ? `<div class="data-links"><a href="${escapeHtml(options.rawSummaryPath)}">${escapeHtml(text.rawMarkdown)}</a><a href="${escapeHtml(options.rawJsonPath)}">${escapeHtml(text.rawJson)}</a></div>` : ""}
      </aside>
    </section>

    <section class="section-block" data-pagefind-body>
      <div class="section-heading"><h2>${escapeHtml(text.fullListTitle)}</h2><span>${escapeHtml(itemCount(displayEventCount))}</span></div>
      <div class="update-list" data-sort-list>${displayEvents.map((event) => renderEventCard(event, locale, text, { includeWhy: true, anchorId: eventAnchorId(event) })).join("")}</div>
    </section>
  `;

  return renderLayout({
    locale,
    text,
    title: options.pageTitle,
    description: options.description,
    body,
    lastUpdatedAt: options.lastUpdatedAt,
    relativePrefix: options.relativePrefix,
    homeHref: options.homeHref,
    weeklyHref: options.weeklyHref,
    langSwitchHref: options.langSwitchHref,
  });
}

function renderIndexPage(
  { dailyDigests, weeklyDigests, latestCollectDigest },
  locale,
  text,
  lastUpdatedAt,
  relativePrefix,
  links,
) {
  const latestDigest = dailyDigests[0];
  const overallUnique = dailyDigests.reduce(
    (total, digest) =>
      total + (digest.readerEventCount ?? digest.uniqueEventCount),
    0,
  );
  const searchHref = links.home.replace(/index\.html$/, "search.html");
  const allHighlights = buildPublishedEventEntries(dailyDigests, {
    includeFuture: false,
  });
  const latestHighlights = allHighlights.slice(0, HOME_HIGHLIGHT_LIMIT);
  const latestFilterAxes = renderFilterAxes(latestHighlights);
  const sourceHighlightGroups = buildSourceHighlightGroups(dailyDigests);
  const weeklyHomeDigests = weeklyDigests.slice(0, HOME_ARCHIVE_LIMIT);
  const dailyHomeDigests = dailyDigests.slice(0, HOME_DAILY_CHIPS);

  const weeklyMarkup =
    weeklyHomeDigests.length === 0
      ? `<div class="content-card empty-card"><p>${escapeHtml(text.weeklyEmpty)}</p></div>`
      : `<div class="digest-grid">${weeklyHomeDigests.map((digest) => renderArchiveCard(digest, locale, text, links.weekHref(digest.key), "week")).join("")}</div>`;
  // Daily pages hold only a few updates each, so the home page offers them as a row of date links, not cards.
  const dailyMarkup = `<div class="date-chips">${dailyHomeDigests.map((digest) => `<a class="date-chip" href="${escapeHtml(links.dayHref(digest.date))}">${escapeHtml(digest.date.slice(5))}<span>${digest.readerEventCount ?? digest.uniqueEventCount}</span></a>`).join("")}</div>`;

  const body = `
    <section class="hero hero-home">
      <div>
        <p class="eyebrow">${escapeHtml(text.heroEyebrow)}</p>
        <h1>${escapeHtml(text.heroTitle)}</h1>
        <p class="hero-copy">${escapeHtml(text.heroCopy)}</p>
        <div class="hero-search">
          <p class="hero-search-label">${escapeHtml(text.homeSearchTitle)}</p>
          <div class="pagefind-shell pagefind-shell--compact" data-search-root>
            <div class="search-input-row">
              <input class="search-input" type="search" placeholder="${escapeHtml(text.searchPlaceholder)}" aria-label="${escapeHtml(text.searchInputLabel)}" autocomplete="off" data-search-input />
              <button type="button" class="filter-reset" data-search-clear>${escapeHtml(text.filterReset)}</button>
            </div>
            <p class="search-status" role="status" aria-live="polite" aria-atomic="true" data-search-count>${escapeHtml(text.searchPrompt)}</p>
            <p class="search-empty is-hidden" data-search-empty></p>
            <div class="search-results-grid" data-search-results></div>
          </div>
          <p class="hero-search-help">${escapeHtml(text.homeSearchHelp)} <a class="hero-search-link" href="${escapeHtml(searchHref)}">${escapeHtml(text.homeSearchOpenLink)}</a></p>
        </div>
      </div>
      <div class="metrics-grid metrics-grid--compact">
        ${renderMetric(text.publishedCount, locale === "ja" ? `${dailyDigests.length}${escapeHtml(text.dayCountSuffix)}` : formatCount(dailyDigests.length, locale, "day", "days"), text.publishedCountDetail)}
        ${renderMetric(text.overallCount, locale === "ja" ? `${overallUnique}${escapeHtml(text.itemSuffix)}` : formatCount(overallUnique, locale, "item", "items"), text.overallCountDetail)}
        ${renderMetric(text.latestDate, latestDigest ? latestDigest.date : "N/A", text.latestDateDetail)}
        ${renderMetric(text.latestRunCount, locale === "ja" ? (latestCollectDigest ? `${latestCollectDigest.freshReaderCount ?? 0}${escapeHtml(text.itemSuffix)}` : `0${escapeHtml(text.itemSuffix)}`) : formatCount(latestCollectDigest?.freshReaderCount ?? 0, locale, "item", "items"), text.latestRunCountDetail)}
      </div>
    </section>

    ${downloadPanelHtml(locale)}

    ${latestHighlights.length > 0 ? renderFilterBar(text, { showSource: latestFilterAxes.showSource, showTopic: false, showAxisLabels: false, extraClass: "filter-block--compact" }) : ""}

    <section class="section-block" data-latest-highlights data-count-suffix="${escapeHtml(text.latestHighlightsCountSuffix)}">
      ${renderSectionHeading(
        text.latestHighlightsTitle,
        renderVisibleCountLabel(
          locale,
          latestHighlights.length,
          text.itemSuffix,
        ),
        allHighlights.length > 0
          ? renderSectionAction(
              links.highlights,
              renderTotalActionLabel(
                locale,
                allHighlights.length,
                text.itemSuffix,
              ),
            )
          : "",
      )}
      <div class="highlight-grid latest-highlights-grid" data-highlight-group="all">${latestHighlights.map((event) => renderEventCard(event, locale, text, { compact: true, includeWhy: true, pick: true })).join("")}</div>
      ${sourceHighlightGroups.map((entry) => renderSourceHighlightPanel(entry, locale, text)).join("")}
      <p class="latest-highlights-empty is-hidden" data-latest-empty>${escapeHtml(text.noItems)}</p>
    </section>

    <section class="section-block" id="weekly-archive">
      ${renderSectionHeading(
        text.weeklyArchiveTitle,
        weeklyHomeDigests.length === 0
          ? text.weeklyArchiveLabel
          : renderVisibleCountLabel(
              locale,
              weeklyHomeDigests.length,
              text.itemSuffix,
            ),
        weeklyDigests.length > 0
          ? renderSectionAction(
              links.weeklyArchive,
              locale === "ja" ? "すべてを見る" : "View all",
            )
          : "",
      )}
      ${weeklyMarkup}
    </section>

    <section class="section-block">
      ${renderSectionHeading(
        text.dailyArchiveTitle,
        renderVisibleCountLabel(
          locale,
          dailyHomeDigests.length,
          text.dayCountSuffix,
        ),
        dailyDigests.length > 0
          ? renderSectionAction(
              links.dailyArchive,
              locale === "ja" ? "すべてを見る" : "View all",
            )
          : "",
      )}
      ${dailyMarkup}
    </section>
  `;

  return renderLayout({
    locale,
    text,
    title: locale === "ja" ? "GitHub Copilot と VS Code の更新ダイジェスト | vscode-copilot-digest" : "GitHub Copilot & VS Code update digest | vscode-copilot-digest",
    description: text.siteLead,
    body,
    lastUpdatedAt,
    relativePrefix,
    homeHref: links.home,
    weeklyHref: links.weeklyArchive,
    langSwitchHref: links.langSwitch,
    extraScript: renderSearchPageScript({ ...text, searchEntries: allHighlights }, locale, true),
    extraScriptType: "module",
  });
}

function renderSearchPageScript(text, locale, home = false) {
  const searchMetadata = {};
  for (const event of text.searchEntries ?? []) {
    const title = localizedTitle(event, locale);
    searchMetadata[eventAnchorId(event)] = {
      digestDate: event.digestDate,
      title,
      sourceGroup: sourceGroup(event),
      sourceClass: `source-badge--${sourceGroup(event)}`,
      sourceShort: sourceGroupMeta(sourceGroup(event), text).short,
      sourceLabel: sourceGroupMeta(sourceGroup(event), text).label,
      topic: classifyEvent(event),
      topicLabel: text.topicNames[classifyEvent(event)] ?? classifyEvent(event),
      importanceLabel: localizedImportanceLabel(event, locale),
      resourcesHtml: renderResourceLinks(event, locale),
      archivePath: `${locale === "en" ? "en/" : ""}days/${event.digestDate}.html#${eventAnchorId(event)}`,
    };
  }

  const strings = {
    prompt: text.searchPrompt,
    loading: text.searchLoading,
    empty: text.searchEmpty,
    openDigest: text.searchOpenDigest,
  };

  return `const strings = ${JSON.stringify(strings)};
const metadataIndex = ${JSON.stringify(searchMetadata).replace(/</g, "\\u003c")};
const root = document.querySelector("[data-search-root]");
if (!root) {
  throw new Error("Search root not found");
}
const input = root.querySelector("[data-search-input]");
const clearButton = root.querySelector("[data-search-clear]");
const countNode = root.querySelector("[data-search-count]");
const resultsNode = root.querySelector("[data-search-results]");
const emptyNode = root.querySelector("[data-search-empty]");
const filtersRoot = document.querySelector("[data-search-filters]");
const filterReset = filtersRoot ? filtersRoot.querySelector("[data-search-filter-reset]") : null;
const facetState = { source: new Set(), topic: new Set() };
const pathName = window.location.pathname;
const rootPath = pathName.endsWith("/en/")
  ? pathName.slice(0, -3)
  : pathName.replace(/(?:en\\/)?(?:search|index)\\.html$/, "");
const basePath = /\\/$/.test(rootPath) ? rootPath : rootPath + "/";
const pagefind = await import(basePath + "pagefind-${searchVersion}/pagefind.js");
await pagefind.options({
  bundlePath: basePath + "pagefind-${searchVersion}/",
  baseUrl: basePath,
});
await pagefind.init();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractDigestDate(value) {
  const match = String(value ?? "").match(/\\d{4}-\\d{2}-\\d{2}/);
  return match ? match[0] : "";
}

function resultLabel(count) {
  return ${locale === "ja" ? "String(count) + '件'" : "count === 1 ? '1 result' : String(count) + ' results'"};
}

function lookupMeta(row) {
  const anchor = new URL(row.url, window.location.href).hash;
  return metadataIndex[anchor.slice(1)]
    || Object.values(metadataIndex).find((entry) => entry.digestDate === row.digestDate && entry.title === row.title) || null;
}

function readList(value) {
  if (!value) return [];
  return value.split(",").map((item) => decodeURIComponent(item).trim()).filter(Boolean);
}

function syncFacetStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  facetState.source = new Set(readList(params.get("sources")));
  facetState.topic = new Set(readList(params.get("topics")));
}

function syncFacetButtons() {
  if (!filtersRoot) return;
  filtersRoot.querySelectorAll("[data-filter-kind]").forEach((button) => {
    const kind = button.getAttribute("data-filter-kind");
    const value = button.getAttribute("data-filter-value");
    const active = facetState[kind].has(value);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (filterReset) {
    filterReset.disabled = facetState.source.size === 0 && facetState.topic.size === 0;
  }
}

function rowMatchesFacets(row) {
  const meta = lookupMeta(row);
  if (!meta && (facetState.source.size > 0 || facetState.topic.size > 0)) {
    return false;
  }
  const sourceMatch = facetState.source.size === 0 || facetState.source.has(meta?.sourceGroup);
  const topicMatch = facetState.topic.size === 0 || facetState.topic.has(meta?.topic);
  return sourceMatch && topicMatch;
}

function renderRow(row) {
  const meta = lookupMeta(row);
  const excerpt = row.excerpt
    ? '<p class="search-result-excerpt">' + row.excerpt + '</p>'
    : "";
  const badges = meta
    ? '<div class="badge-row">'
      + '<span class="pill">' + escapeHtml(row.digestDate || "N/A") + '</span>'
      + '<span class="pill source-badge ' + escapeHtml(meta.sourceClass) + '"><span class="source-badge-mark">' + escapeHtml(meta.sourceShort) + '</span><span>' + escapeHtml(meta.sourceLabel) + '</span></span>'
      + '<span class="pill">' + escapeHtml(meta.topicLabel) + '</span>'
      + '<span class="pill">' + escapeHtml(meta.importanceLabel) + '</span>'
      + '</div>'
    : '<div class="badge-row"><span class="pill">' + escapeHtml(row.digestDate || "N/A") + '</span></div>';
  return '<article class="update-card search-result-card">'
    + badges
    + '<h3><a href="' + escapeHtml(meta ? basePath + meta.archivePath : row.url) + '">' + escapeHtml(row.title) + '</a></h3>'
    + excerpt
    + (meta ? meta.resourcesHtml : '<div class="search-result-links"><a href="' + escapeHtml(row.url) + '">' + escapeHtml(strings.openDigest) + '</a></div>')
    + '</article>';
}

function setIdle() {
  countNode.textContent = strings.prompt;
  emptyNode.textContent = "";
  emptyNode.classList.add("is-hidden");
  resultsNode.innerHTML = "";
}

function setLoading() {
  countNode.textContent = strings.loading;
  emptyNode.textContent = "";
  emptyNode.classList.add("is-hidden");
  resultsNode.innerHTML = "";
}

function updateUrl(query) {
  const url = new URL(window.location.href);
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }
  if (facetState.source.size > 0) url.searchParams.set("sources", Array.from(facetState.source).join(","));
  else url.searchParams.delete("sources");
  if (facetState.topic.size > 0) url.searchParams.set("topics", Array.from(facetState.topic).join(","));
  else url.searchParams.delete("topics");
  window.history.replaceState({}, "", url);
}

function applyResults(rows, rawQuery) {
  if (!rawQuery) {
    setIdle();
    return;
  }
  countNode.textContent = resultLabel(rows.length);
  if (!rows.length) {
    emptyNode.textContent = strings.empty;
    emptyNode.classList.remove("is-hidden");
    resultsNode.innerHTML = "";
    return;
  }
  emptyNode.classList.add("is-hidden");
  resultsNode.innerHTML = rows.slice(0, ${home ? 6 : 200}).map(renderRow).join("");
  resultsNode.querySelectorAll("[data-archive-path]").forEach((link) => { link.href = basePath + link.dataset.archivePath; });
}

function dedupeRows(rows) {
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const key = lookupMeta(row)?.archivePath || (row.url || "") + "\t" + (row.title || "");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

function normalizeSearchQuery(query) {
  const raw = String(query ?? "").trim();
  const lower = raw.toLowerCase();
  const additions = [];
  if (/\bgh\s*copilot\b|githubcopilot|copilot/.test(lower) && !/github copilot/.test(lower)) {
    additions.push("GitHub Copilot");
  }
  if (/\bvscode\b|vs code|visual studio code/.test(lower) && !/vs code/.test(lower)) {
    additions.push("VS Code");
  }
  if (/\bcli\b/.test(lower) && !/copilot cli/.test(lower)) {
    additions.push("Copilot CLI");
  }
  return [raw, ...additions].filter(Boolean).join(" ");
}

async function runSearch() {
  const rawQuery = String(input.value ?? "").trim();
  const searchQuery = normalizeSearchQuery(rawQuery);
  updateUrl(rawQuery);
  if (!rawQuery) {
    setIdle();
    return;
  }

  setLoading();
  const search = await pagefind.search(searchQuery);
  const loaded = await Promise.all(
    search.results.slice(0, 24).map((result, index) =>
      result.data().then((data) => ({ data, rank: index })),
    ),
  );

  const sortedRows = loaded
    .flatMap(({ data, rank }) => {
      const digestDate = extractDigestDate(
        data.meta?.title || data.raw_url || data.url || data.content,
      );
      const base = {
        digestDate,
        dayUrl: data.raw_url || data.url,
        rank,
      };

      if (Array.isArray(data.sub_results) && data.sub_results.length > 0) {
        return data.sub_results.map((sub, subIndex) => ({
          ...base,
          title: sub.title || data.meta?.title || digestDate,
          url: sub.url || data.url,
          excerpt: sub.excerpt || data.excerpt || "",
          subIndex,
        }));
      }

      return [{
        ...base,
        title: data.meta?.title || digestDate || data.url,
        url: data.url,
        excerpt: data.excerpt || "",
        subIndex: 0,
      }];
    })
    .filter(rowMatchesFacets)
    .sort((left, right) =>
      right.digestDate.localeCompare(left.digestDate) ||
      left.rank - right.rank ||
      left.subIndex - right.subIndex,
    );
  const rows = dedupeRows(sortedRows).slice(0, 40);

  applyResults(rows, rawQuery);
}

let timer = null;
function scheduleSearch() {
  window.clearTimeout(timer);
  const nextValue = String(input.value ?? "").trim();
  if (nextValue) {
    pagefind.preload(normalizeSearchQuery(nextValue));
  }
  timer = window.setTimeout(runSearch, 180);
}

input.addEventListener("input", scheduleSearch);
input.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    input.value = "";
    runSearch();
  }
});
clearButton.addEventListener("click", () => {
  input.value = "";
  input.focus();
  runSearch();
});
if (filtersRoot) {
  filtersRoot.querySelectorAll("[data-filter-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.getAttribute("data-filter-kind");
      const value = button.getAttribute("data-filter-value");
      if (facetState[kind].has(value)) facetState[kind].delete(value);
      else facetState[kind].add(value);
      syncFacetButtons();
      runSearch();
    });
  });
}
if (filterReset) {
  filterReset.addEventListener("click", () => {
    facetState.source.clear();
    facetState.topic.clear();
    syncFacetButtons();
    runSearch();
  });
}

const initial = new URLSearchParams(window.location.search).get("q") || "";
syncFacetStateFromUrl();
syncFacetButtons();
input.value = initial;
if (initial) {
  await runSearch();
} else {
  setIdle();
}
`;
}

function renderSearchPage(
  searchEntries,
  latestDigestDate,
  locale,
  text,
  lastUpdatedAt,
  relativePrefix,
  links,
) {
  const sourceCount = new Set(searchEntries.map((event) => sourceGroup(event)))
    .size;
  const topicCount = new Set(searchEntries.map((event) => classifyEvent(event)))
    .size;
  const searchText = { ...text, searchEntries };
  const body = `
    <section class="hero hero-day">
      <div>
        <p class="eyebrow">${escapeHtml(text.searchPageEyebrow)}</p>
        <h1>${escapeHtml(text.searchPageTitle)}</h1>
        <p class="hero-copy">${escapeHtml(text.searchPageCopy)}</p>
      </div>
      <div class="metrics-grid">
        ${renderMetric(text.searchItemsMetric, locale === "ja" ? `${searchEntries.length}${escapeHtml(text.itemSuffix)}` : formatCount(searchEntries.length, locale, "item", "items"), text.searchItemsMetricDetail)}
        ${renderMetric(text.searchSourcesMetric, locale === "ja" ? `${sourceCount}${escapeHtml(text.itemSuffix)}` : formatCount(sourceCount, locale, "source", "sources"), text.searchSourcesMetricDetail)}
        ${renderMetric(text.searchTopicsMetric, locale === "ja" ? `${topicCount}${escapeHtml(text.itemSuffix)}` : formatCount(topicCount, locale, "topic", "topics"), text.searchTopicsMetricDetail)}
        ${renderMetric(text.latestDate, latestDigestDate || "N/A", text.latestDateDetail)}
      </div>
    </section>

    ${renderSearchFacetBar(text, searchEntries)}

    <section class="section-block">
      <div class="section-heading"><h2>${escapeHtml(text.searchTitle)}</h2><span>${escapeHtml(text.searchHelp)}</span></div>
      <div class="content-card search-panel" data-search-root>
        <div class="search-input-row">
          <input class="search-input" type="search" value="" placeholder="${escapeHtml(text.searchPlaceholder)}" aria-label="${escapeHtml(text.searchInputLabel)}" autocomplete="off" spellcheck="false" data-search-input />
          <button type="button" class="filter-reset" data-search-clear>${escapeHtml(text.filterReset)}</button>
        </div>
        <p class="search-status" role="status" aria-live="polite" aria-atomic="true" data-search-count>${escapeHtml(text.searchPrompt)}</p>
        <p class="search-empty" data-search-empty></p>
        <div class="search-results-grid" data-search-results></div>
      </div>
    </section>
  `;

  return renderLayout({
    locale,
    text,
    title: `${text.searchNav} | vscode-copilot-digest`,
    description: text.searchPageCopy,
    body,
    lastUpdatedAt,
    relativePrefix,
    homeHref: links.home,
    weeklyHref: links.weekly,
    langSwitchHref: links.langSwitch,
    extraScript: renderSearchPageScript(searchText, locale),
    extraScriptType: "module",
  });
}

function renderLayout({
  locale,
  text,
  title,
  description,
  body,
  lastUpdatedAt,
  relativePrefix,
  homeHref,
  weeklyHref,
  langSwitchHref,
  pagefindUi = false,
  extraScript = "",
  extraScriptType = "text/javascript",
}) {
  const assetHref =
    relativePrefix === "."
      ? `./assets/styles.css?v=${searchVersion}`
      : `${relativePrefix}/assets/styles.css?v=${searchVersion}`;
  const downloadsSrc = `${relativePrefix}/assets/downloads.js?v=${searchVersion}`;
  const searchHref = homeHref.replace(/index\.html$/, "search.html");
  const pagefindCssHref =
    relativePrefix === "."
      ? "./pagefind/pagefind-component-ui.css"
      : `${relativePrefix}/pagefind/pagefind-component-ui.css`;
  return `<!doctype html>
<html lang="${escapeHtml(text.htmlLang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="digest-search-version" content="${searchVersion}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="icon" type="image/svg+xml" href="${relativePrefix === "." ? "./assets/favicon.svg" : `${relativePrefix}/assets/favicon.svg`}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${assetHref}?v=${searchVersion}" />
    ${pagefindUi ? `<link rel="stylesheet" href="${pagefindCssHref}" />` : ""}
  </head>
  <body>
    <a class="skip-link" href="#main-content">${escapeHtml(locale === "ja" ? "本文へ移動" : "Skip to content")}</a>
    <div class="page-shell">
      <header class="site-header">
        <div>
          <div class="site-brand-row">
            <a class="site-brand" href="${escapeHtml(homeHref)}">vscode-copilot-digest</a>
            ${lastUpdatedAt ? `<span class="site-updated-inline">${escapeHtml(text.lastUpdatedLabel)}: ${escapeHtml(formatDateTime(lastUpdatedAt, locale))}</span>` : ""}
          </div>
          <p class="site-lead">${escapeHtml(text.siteLead)}</p>
        </div>
        <div class="site-navigation">
          <nav class="site-nav" aria-label="${escapeHtml(locale === "ja" ? "主要ナビゲーション" : "Primary navigation")}">
            <a href="${escapeHtml(homeHref)}">${escapeHtml(text.dailyNav)}</a>
            <a href="${escapeHtml(weeklyHref)}">${escapeHtml(text.weeklyNav)}</a>
            <a href="${escapeHtml(homeHref.replace(/index\.html$/, "retirements.html"))}">${escapeHtml(locale === "ja" ? "提供終了・廃止" : "Retirements")}</a>
            <a href="${escapeHtml(searchHref)}">${escapeHtml(text.searchNav)}</a>
            <a href="https://github.com/aktsmm/vscode-copilot-digest">${escapeHtml(text.repositoryNav)}</a>
            <button class="lang-toggle" type="button" data-href="${escapeHtml(langSwitchHref)}" aria-label="${escapeHtml(locale === "ja" ? "Switch to English" : "日本語に切り替え")}" aria-pressed="${locale === "en" ? "true" : "false"}">
              <span class="lang-toggle-track">
                <span class="lang-toggle-option${locale === "ja" ? " active" : ""}">JA</span>
                <span class="lang-toggle-option${locale === "en" ? " active" : ""}">EN</span>
              </span>
            </button>
          </nav>
          <nav class="demo-nav" aria-label="${escapeHtml(locale === "ja" ? "関連デモ" : "Related demos")}">
            <details>
              <summary><span class="demo-nav-label">${escapeHtml(locale === "ja" ? "関連デモ" : "Related demos")}</span></summary>
              <div class="demo-links">
                <a href="https://aktsmm.github.io/azure-ops-pulse-demo/#/overview">Azure Ops Pulse</a>
                <a href="https://aktsmm.github.io/azure-update-digest/">Azure Update Digest</a>
                <a href="https://aktsmm.github.io/m365-message-center-dashboard/">M365 Message Center Dashboard</a>
                <a href="https://aktsmm.github.io/m365-copilot-update-digest/">M365 Copilot Update Digest</a>
                <a href="https://aktsmm.github.io/daily-dev-byte/">Daily Dev Byte</a>
                <span class="demo-nav-current" aria-current="page">VS Code Copilot Digest</span>
              </div>
            </details>
          </nav>
        </div>
      </header>
      <main id="main-content">${body}</main>
      <button class="back-to-top" aria-label="${escapeHtml(locale === "ja" ? "ページ上部へ" : "Back to top")}" title="${escapeHtml(locale === "ja" ? "ページ上部へ" : "Back to top")}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <footer class="site-footer">
        <p>${escapeHtml(text.footerLabel)} <a href="https://github.com/aktsmm" rel="author noopener" target="_blank">aktsmm</a></p>
        <div class="share-links">
          <span class="share-label">${escapeHtml(locale === "ja" ? "共有" : "Share")}:</span>
          <a class="share-btn share-x" data-share="x" href="#" aria-label="Share on X" title="X (Twitter)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a class="share-btn share-linkedin" data-share="linkedin" href="#" aria-label="Share on LinkedIn" title="LinkedIn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <a class="share-btn share-hatena" data-share="hatena" href="#" aria-label="${escapeHtml(locale === "ja" ? "はてなブックマーク" : "Hatena Bookmark")}" title="${escapeHtml(locale === "ja" ? "はてなブックマーク" : "Hatena")}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.47 0C22.42 0 24 1.58 24 3.53v16.94c0 1.95-1.58 3.53-3.53 3.53H3.53C1.58 24 0 22.42 0 20.47V3.53C0 1.58 1.58 0 3.53 0h16.94zM8.8 17.57c0-.8-.65-1.44-1.44-1.44-.8 0-1.44.65-1.44 1.44 0 .8.65 1.44 1.44 1.44.8 0 1.44-.65 1.44-1.44zM8.55 5H6.12v8.14h2.26c1.57 0 2.39-.22 3.07-.84.67-.6 1.02-1.49 1.02-2.58 0-1.14-.37-2.02-1.1-2.63-.72-.6-1.56-.87-2.82-.87zm8.3 4.4c-1.64 0-2.98 1.34-2.98 2.98s1.34 2.98 2.98 2.98 2.98-1.34 2.98-2.98-1.34-2.98-2.98-2.98z"/></svg>
          </a>
          <button class="share-btn share-copy" type="button" data-share="copy" aria-label="${escapeHtml(locale === "ja" ? "リンクをコピー" : "Copy link")}" title="${escapeHtml(locale === "ja" ? "リンクをコピー" : "Copy link")}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
        <span class="sr-only" role="status" aria-live="polite" aria-atomic="true" data-share-feedback></span>
      </footer>
    </div>
    ${body.includes("data-dl-panel") ? `<script src="${downloadsSrc}" defer></script>` : ""}
    <script>
    (function(){
      var archiveBase=new URL('${homeHref}',window.location.href).pathname.replace(/(?:en\\/)?index\\.html$/,'');
      document.querySelectorAll('[data-archive-path]').forEach(function(link){link.href=archiveBase+link.dataset.archivePath;});
      var toggle=document.querySelector('.lang-toggle');
      if(toggle){
        var pref=localStorage.getItem('vcd-lang');
        toggle.addEventListener('click',function(){
          var dest=toggle.getAttribute('data-href');
          if(dest&&window.location.search){dest+=window.location.search;}
          if(dest&&window.location.hash){dest+=window.location.hash;}
          localStorage.setItem('vcd-lang','${locale === "ja" ? "en" : "ja"}');
          window.location.href=dest;
        });
        if(pref&&pref!=='${locale}'){
          var dest=toggle.getAttribute('data-href');
          if(dest&&window.location.search){dest+=window.location.search;}
          if(dest&&window.location.hash){dest+=window.location.hash;}
          if(dest)window.location.replace(dest);
        }
      }
      var shareFeedback=document.querySelector('[data-share-feedback]');
      function announceShareFeedback(message){
        if(!shareFeedback)return;
        shareFeedback.textContent='';
        setTimeout(function(){shareFeedback.textContent=message;},10);
      }
      document.querySelectorAll('[data-share]').forEach(function(btn){
        btn.addEventListener('click',function(e){
          e.preventDefault();
          var url=encodeURIComponent(window.location.href);
          var title=encodeURIComponent(document.title);
          var taggedTitle=encodeURIComponent(document.title+'\\n#AI #AIAgent #GitHubCopilot #ClaudeCode #VSCODE');
          var kind=btn.getAttribute('data-share');
          if(kind==='x')window.open('https://x.com/intent/tweet?url='+url+'&text='+taggedTitle,'_blank','noopener');
          else if(kind==='linkedin')window.open('https://www.linkedin.com/sharing/share-offsite/?url='+url,'_blank','noopener');
          else if(kind==='hatena')window.open('https://b.hatena.ne.jp/entry/s/'+window.location.href.replace(/^https?:\\/\\//,''),'_blank','noopener');
          else if(kind==='copy'){
            navigator.clipboard.writeText(window.location.href).then(function(){
              btn.classList.add('copied');
              announceShareFeedback('${escapeHtml(text.shareCopied)}');
              setTimeout(function(){btn.classList.remove('copied');},1500);
            }).catch(function(){
              announceShareFeedback('${escapeHtml(text.shareCopyFailed)}');
            });
          }
        });
      });
    })();
    (function(){
      var root=document.querySelector('[data-filter-root]');
      if(!root)return;
      var cards=[].slice.call(document.querySelectorAll('[data-filter-card]'));
      var reset=root.querySelector('[data-filter-reset]');
      var status=root.querySelector('[data-filter-status]');
      var latestRoot=document.querySelector('[data-latest-highlights]');
      var latestDefault=latestRoot?latestRoot.querySelector('[data-highlight-group="all"]'):null;
      var latestPanels=latestRoot?[].slice.call(latestRoot.querySelectorAll('[data-highlight-source-section]')):[];
      var latestCount=latestRoot?latestRoot.querySelector('[data-latest-count]'):null;
      var latestEmpty=latestRoot?latestRoot.querySelector('[data-latest-empty]'):null;
      var state={source:new Set(),topic:new Set(),importance:new Set(),sort:'default'};
      function readList(value){
        if(!value)return [];
        return value.split(',').map(function(item){return decodeURIComponent(item).trim();}).filter(Boolean);
      }
      function syncStateFromUrl(){
        var params=new URLSearchParams(window.location.search);
        state.source=new Set(readList(params.get('sources')));
        state.topic=new Set(readList(params.get('topics')));
        state.importance=new Set(readList(params.get('importance')));
        state.sort=params.get('sort')||'default';
      }
      function syncButtons(){
        root.querySelectorAll('[data-filter-kind]').forEach(function(btn){
          var kind=btn.getAttribute('data-filter-kind');
          var value=btn.getAttribute('data-filter-value');
          var active=kind==='sort'?state.sort===value:state[kind].has(value);
          btn.classList.toggle('active',active);
          btn.setAttribute('aria-pressed',active?'true':'false');
        });
        if(reset){
          reset.disabled=state.source.size===0&&state.topic.size===0&&state.importance.size===0&&state.sort==='default';
        }
      }
      function applyFilters(){
        cards.forEach(function(card){
          var sourceValue=card.getAttribute('data-source-group');
          var topicValue=card.getAttribute('data-topic');
          var importanceValue=card.getAttribute('data-importance');
          var sourceMatch=state.source.size===0||state.source.has(sourceValue);
          var topicMatch=state.topic.size===0||state.topic.has(topicValue);
          var importanceMatch=state.importance.size===0||state.importance.has(importanceValue);
          card.classList.toggle('is-hidden',!(sourceMatch&&topicMatch&&importanceMatch));
        });
      }
      function sortLists(){
        document.querySelectorAll('[data-sort-list]').forEach(function(list){
          var items=[].slice.call(list.querySelectorAll('[data-filter-card]'));
          if(state.sort==='default'){
            items.sort(function(left,right){return Number(left.getAttribute('data-original-index')||0)-Number(right.getAttribute('data-original-index')||0);});
          }else if(state.sort==='newest'){
            items.sort(function(left,right){return Number(right.getAttribute('data-sort-date')||0)-Number(left.getAttribute('data-sort-date')||0);});
          }else if(state.sort==='oldest'){
            items.sort(function(left,right){return Number(left.getAttribute('data-sort-date')||0)-Number(right.getAttribute('data-sort-date')||0);});
          }else if(state.sort==='importance'){
            items.sort(function(left,right){return Number(right.getAttribute('data-sort-score')||0)-Number(left.getAttribute('data-sort-score')||0);});
          }
          items.forEach(function(item){list.appendChild(item);});
        });
      }
      function visibleCardCount(){
        return cards.filter(function(card){return !card.classList.contains('is-hidden');}).length;
      }
      function syncFilterStatus(){
        if(!status)return;
        var count=visibleCardCount();
        status.textContent='${locale === "ja" ? "フィルターを更新しました。表示中: " : "Filters updated. Showing "}'+count+'${locale === "ja" ? "件。" : " items."}';
      }
      function syncLatestHighlights(){
        if(!latestRoot)return;
        var visibleContainers=[];
        if(state.source.size===0){
          if(latestDefault)latestDefault.classList.remove('is-hidden');
          latestPanels.forEach(function(panel){panel.classList.add('is-hidden');});
          if(latestEmpty)latestEmpty.classList.add('is-hidden');
          if(latestDefault)visibleContainers=[latestDefault];
        }else{
          if(latestDefault)latestDefault.classList.add('is-hidden');
          var visiblePanels=0;
          latestPanels.forEach(function(panel){
            var visible=state.source.has(panel.getAttribute('data-highlight-source-section'));
            panel.classList.toggle('is-hidden',!visible);
            if(visible){
              visiblePanels+=1;
              visibleContainers.push(panel);
            }
          });
          if(latestEmpty)latestEmpty.classList.toggle('is-hidden',visiblePanels!==0);
        }
        if(latestCount){
          var countSuffix=latestRoot.getAttribute('data-count-suffix')||'';
          var visibleCards=0;
          visibleContainers.forEach(function(container){
            visibleCards+=container.querySelectorAll('.mini-highlight').length;
          });
          latestCount.textContent=String(visibleCards)+countSuffix;
        }
      }
      function syncUrl(){
        var url=new URL(window.location.href);
        if(state.source.size>0)url.searchParams.set('sources',Array.from(state.source).join(','));
        else url.searchParams.delete('sources');
        if(state.topic.size>0)url.searchParams.set('topics',Array.from(state.topic).join(','));
        else url.searchParams.delete('topics');
        if(state.importance.size>0)url.searchParams.set('importance',Array.from(state.importance).join(','));
        else url.searchParams.delete('importance');
        if(state.sort&&state.sort!=='default')url.searchParams.set('sort',state.sort);
        else url.searchParams.delete('sort');
        window.history.replaceState({},'',url);
      }
      function refresh(){
        syncButtons();
        syncLatestHighlights();
        applyFilters();
        sortLists();
        syncLatestHighlights();
        syncFilterStatus();
        syncUrl();
      }
      root.querySelectorAll('[data-filter-kind]').forEach(function(btn){
        btn.addEventListener('click',function(){
          var kind=btn.getAttribute('data-filter-kind');
          var value=btn.getAttribute('data-filter-value');
          if(kind==='sort')state.sort=value;
          else if(state[kind].has(value))state[kind].delete(value);
          else state[kind].add(value);
          refresh();
        });
      });
      if(reset){
        reset.addEventListener('click',function(){
          state.source.clear();
          state.topic.clear();
          state.importance.clear();
          state.sort='default';
          refresh();
          if(status)status.textContent='${escapeHtml(text.filterClearedStatus)}';
        });
      }
      document.querySelectorAll('[data-sort-list]').forEach(function(list){
        [].slice.call(list.querySelectorAll('[data-filter-card]')).forEach(function(item,index){
          item.setAttribute('data-original-index',String(index));
        });
      });
      syncStateFromUrl();
      syncButtons();
      syncLatestHighlights();
      applyFilters();
      sortLists();
      syncLatestHighlights();
      syncFilterStatus();
    })();
    (function(){
      var btn=document.querySelector('.back-to-top');
      if(!btn)return;
      window.addEventListener('scroll',function(){
        btn.classList.toggle('visible',window.scrollY>600);
      },{passive:true});
      btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
    })();
    (function(){
      document.querySelectorAll('.topic-list a, .digest-card a').forEach(function(a){
        if(a.hostname&&a.hostname!==location.hostname){
          a.setAttribute('target','_blank');
          a.setAttribute('rel','noopener');
        }
      });
    })();
    </script>
    ${extraScript ? `<script type="${extraScriptType}">${extraScript}</script>` : ""}
  </body>
</html>`;
}

function stylesCss() {
  return `:root {
  --bg: #f6efe4;
  --panel: rgba(255, 252, 246, 0.9);
  --line: rgba(38, 33, 28, 0.12);
  --text: #1f1a17;
  --muted: #65594f;
  --accent: #0f766e;
  --accent-soft: rgba(15, 118, 110, 0.1);
  --source-github: #8b5cf6;
  --source-github-soft: rgba(139, 92, 246, 0.14);
  --source-vscode: #0078d4;
  --source-vscode-soft: rgba(0, 120, 212, 0.14);
  --source-platform: #ea580c;
  --source-platform-soft: rgba(234, 88, 12, 0.14);
  --source-other: #4b5563;
  --source-other-soft: rgba(75, 85, 99, 0.14);
  --shadow: 0 20px 60px rgba(31, 26, 23, 0.08);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--text);
  font-family: "IBM Plex Sans JP", "Noto Sans JP", sans-serif;
  background:
    radial-gradient(circle at top left, rgba(15, 118, 110, 0.14), transparent 30%),
    radial-gradient(circle at top right, rgba(194, 65, 12, 0.12), transparent 32%),
    linear-gradient(180deg, #f8f1e7 0%, #efe4d4 100%);
}
a { color: inherit; }
.resource-links { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 12px; font-size: 0.88rem; overflow-wrap: anywhere; }
.resource-links > div { display: flex; flex-wrap: wrap; gap: 8px 18px; color: var(--accent); }
.resource-links ul { padding-left: 20px; margin: 6px 0; }
.resource-links li { margin: 5px 0; }
.resource-label { font-weight: 700; margin: 10px 0 4px; }
.snapshot-changes ul { margin: 0 0 8px; padding-left: 1.2em; }
.snapshot-changes li { margin: 2px 0; }
.resource-status { color: var(--muted); margin: 6px 0; }
[id^="event-"] { scroll-margin-top: 24px; }
[id^="event-"]:target { outline: 2px solid var(--accent); outline-offset: 5px; }
a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.skip-link {
  position: fixed;
  left: 16px;
  top: 16px;
  z-index: 1000;
  transform: translateY(-160%);
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--text);
  color: #fff;
  text-decoration: none;
  font-weight: 700;
  box-shadow: var(--shadow);
}
.skip-link:focus-visible { transform: translateY(0); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.page-shell { max-width: 1240px; margin: 0 auto; padding: 24px; }
.site-header, .site-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.site-header {
  margin-bottom: 18px;
  padding: 14px 18px;
  background: rgba(255, 250, 242, 0.78);
  border: 1px solid var(--line);
  border-radius: 24px;
  backdrop-filter: blur(14px);
}
.site-brand-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.site-brand, h1, h2, h3 { font-family: "Space Grotesk", "IBM Plex Sans JP", sans-serif; }
.site-brand { text-decoration: none; font-weight: 700; letter-spacing: 0.02em; }
.site-lead { margin: 4px 0 0; color: var(--muted); font-size: 0.9rem; }
.site-updated-inline { color: var(--muted); font-size: 0.8rem; }
.site-updated { margin: 8px 0 0; color: var(--muted); font-size: 0.85rem; }
.site-navigation { display: grid; gap: 10px; justify-items: end; }
.site-nav { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.site-nav a, .data-links a { text-decoration: none; color: var(--muted); }
.demo-nav {
  display: flex; gap: 8px 12px; flex-wrap: wrap; justify-content: flex-end; align-items: center;
  padding-top: 10px; border-top: 1px solid var(--line); font-size: 0.78rem;
}
.demo-nav-label { color: var(--muted); font-weight: 700; }
.demo-nav a { color: var(--muted); text-decoration: none; }
.demo-nav a:hover { color: var(--accent); text-decoration: underline; }
.demo-nav-current { color: var(--accent); font-weight: 700; }
.hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 24px;
  padding: 36px;
  background: linear-gradient(135deg, rgba(255, 252, 246, 0.92), rgba(248, 236, 217, 0.94));
  border: 1px solid var(--line);
  border-radius: 32px;
  box-shadow: var(--shadow);
}
.hero > div { min-width: 0; }
.hero-home {
  grid-template-columns: minmax(0, 1.72fr) minmax(300px, 0.78fr);
  gap: 14px;
  padding: 22px 24px;
  align-items: start;
}
.hero-day { margin-bottom: 24px; }
.hero-home h1 {
  font-size: clamp(1.5rem, 2.4vw, 2.2rem);
  line-height: 1.1;
  max-width: none;
  white-space: normal;
  overflow-wrap: anywhere;
  text-wrap: balance;
  margin-bottom: 8px;
}
.hero-home .hero-copy {
  max-width: 72ch;
  font-size: 0.93rem;
  line-height: 1.62;
}
.hero-search {
  margin-top: 22px;
  display: grid;
  gap: 10px;
}
.hero-home .hero-search {
  margin-top: 10px;
  gap: 6px;
}
.hero-search-label {
  margin: 0;
  color: var(--text);
  font-weight: 700;
}
.hero-search-help {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
}
.hero-search-link {
  color: var(--accent);
  text-decoration: none;
  font-weight: 700;
}
.hero-search-link:hover {
  text-decoration: underline;
}
.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
}
h1 { margin: 0 0 16px; font-size: clamp(1.5rem, 2.4vw, 2.2rem); line-height: 1.1; }
.hero-copy, .content-card p, .update-card p, .mini-highlight p { color: var(--muted); line-height: 1.75; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.metrics-grid--compact {
  gap: 12px;
}
.metric-card, .content-card, .side-panel, .digest-card, .update-card, .mini-highlight, .topic-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow);
}
.metric-card { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.metrics-grid--compact .metric-card {
  padding: 14px;
  gap: 4px;
}
.hero-home .metrics-grid {
  align-content: start;
}
.metric-label, .metric-detail, .meta-row, .digest-card-head { color: var(--muted); font-size: 0.9rem; }
.metric-value { font-size: 1.9rem; }
.metrics-grid--compact .metric-label { font-size: 0.84rem; }
.metrics-grid--compact .metric-detail { font-size: 0.82rem; }
.metrics-grid--compact .metric-value { font-size: 1.52rem; }
.section-block { margin-top: 28px; }
.hero-home + .section-block { margin-top: 16px; }
.notice-block {
  padding: 18px 20px;
  background: rgba(15, 118, 110, 0.08);
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 20px;
}
.notice-list { display: grid; gap: 10px; }
.notice-list p { margin: 0; color: var(--text); line-height: 1.7; }
.future-note { margin: 0 0 18px; color: var(--text); line-height: 1.7; }
.pill-warning { background: rgba(15, 118, 110, 0.12); color: var(--accent-strong); }
.filter-block {
  padding: 18px 20px;
  background: rgba(255, 252, 246, 0.72);
  border: 1px solid var(--line);
  border-radius: 20px;
}
.filter-stack { display: grid; gap: 12px; }
.filter-row { display: grid; gap: 10px; }
.filter-row {
  border: 0;
  padding: 0;
  margin: 0;
  min-inline-size: 0;
}
.filter-label { color: var(--muted); font-size: 0.9rem; font-weight: 700; }
.filter-block--home .filter-label:not(.sr-only),
.filter-block--compact .filter-label:not(.sr-only) { display: none; }
.filter-chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
.filter-chip-row { max-width: 100%; }
.search-panel { padding: 24px; }
.pagefind-shell {
  --pf-text: var(--text);
  --pf-text-secondary: var(--muted);
  --pf-text-muted: var(--muted);
  --pf-background: rgba(255, 252, 246, 0.92);
  --pf-border: rgba(38, 33, 28, 0.14);
  --pf-border-focus: var(--accent);
  --pf-hover: rgba(15, 118, 110, 0.08);
  --pf-mark: var(--accent);
  --pf-outline-focus: rgba(15, 118, 110, 0.35);
  --pf-font: "IBM Plex Sans JP", "Noto Sans JP", sans-serif;
  --pf-border-radius: 18px;
  --pf-input-height: 48px;
  --pf-input-font-size: 16px;
  --pf-result-title-font-size: 0.98rem;
  --pf-result-excerpt-font-size: 0.92rem;
  --pf-results-gap: 14px;
  --pf-shadow-sm: none;
  --pf-shadow-md: none;
}
.pagefind-shell--compact {
  --pf-searchbox-max-width: 100%;
}
.pagefind-shell pagefind-input,
.pagefind-shell pagefind-searchbox,
.pagefind-shell pagefind-summary,
.pagefind-shell pagefind-results {
  display: block;
}
.pagefind-shell pagefind-summary {
  margin: 12px 0 16px;
}
.pagefind-shell input::placeholder,
.pagefind-shell pagefind-searchbox::part(input)::placeholder {
  color: #3f342d;
  opacity: 0.78;
}
.search-input-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.search-input {
  flex: 1;
  min-width: 240px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--text);
  font: inherit;
}
.search-input:focus {
  outline: 2px solid rgba(15, 118, 110, 0.18);
  outline-offset: 2px;
  border-color: var(--accent);
}
.search-status,
.search-empty {
  margin: 12px 0 0;
  color: var(--muted);
}
.search-results-grid {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}
.search-result-excerpt {
  color: var(--muted);
}
.search-result-excerpt mark {
  background: var(--accent-soft);
  color: inherit;
  padding: 0 0.15em;
  border-radius: 0.2em;
}
.search-result-links {
  margin-top: 12px;
}
.search-result-card .badge-row {
  margin-bottom: 10px;
}
.search-result-links a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 700;
}
.search-result-links a:hover {
  text-decoration: underline;
}
.filter-chip,
    .filter-reset {
  appearance: none;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.66);
  color: var(--text);
  border-radius: 999px;
  padding: 7px 12px;
  font: inherit;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  min-width: 0;
}
.filter-chip.active {
  border-color: currentColor;
  box-shadow: inset 0 0 0 2px currentColor;
  transform: translateY(-1px);
  background: rgba(15, 118, 110, 0.12);
}
.filter-reset:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.36);
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.section-heading-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--muted);
  font-size: 0.92rem;
}
.section-heading h2 { margin: 0; font-size: 1.55rem; }
.section-heading--sub h3 { margin: 0; font-size: 1.1rem; }
.section-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.7);
  color: var(--accent);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}
.section-action:hover {
  background: var(--accent-soft);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}
.pager-summary {
  color: var(--muted);
  font-size: 0.92rem;
}
.pager-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.pager-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.7);
  color: var(--text);
  text-decoration: none;
  font-weight: 700;
}
.pager-link:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.pager-link.is-current {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.pager-link--edge {
  color: var(--accent);
}
.overview-grid, .highlight-grid, .digest-grid, .update-list { display: grid; gap: 16px; }
.overview-grid { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.highlight-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.latest-highlights-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.digest-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.update-list { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.stream-list,
.archive-stream {
  display: grid;
  gap: 14px;
}
.stream-item,
.archive-stream-item {
  display: grid;
  gap: 14px;
  padding: 18px 20px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: var(--shadow);
}
.stream-item h3,
.archive-stream-item h3 {
  margin: 0;
  font-size: 1.08rem;
}
.stream-item p,
.archive-stream-item p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}
.stream-item-head {
  display: grid;
  gap: 10px;
}
.stream-item-meta {
  display: grid;
  gap: 8px;
}
.stream-item-body {
  display: grid;
  gap: 10px;
}
.archive-stream-item {
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr) auto;
  align-items: start;
}
.archive-stream-side {
  display: grid;
  gap: 8px;
}
.archive-stream-range {
  font-weight: 700;
  color: var(--text) !important;
}
.archive-stream-count {
  color: var(--muted);
  font-size: 0.9rem;
}
.archive-stream-body {
  display: grid;
  gap: 10px;
}
.archive-stream-body ul {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  display: grid;
  gap: 6px;
}
.archive-stream-link {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}
.page-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 20px;
}
.update-card, .content-card, .side-panel, .topic-section, .mini-highlight, .digest-card { padding: 20px; }
.update-card h3, .mini-highlight h3, .digest-card h3 { margin: 12px 0 10px; font-size: 1.08rem; }
.mini-why {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px dashed rgba(38, 33, 28, 0.1);
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.6;
}
.badge-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
}
.source-badge { gap: 8px; }
.source-badge-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.8rem;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.source-badge--github {
  background: var(--source-github-soft);
  color: var(--source-github);
}
.source-badge--vscode {
  background: var(--source-vscode-soft);
  color: var(--source-vscode);
}
.source-badge--platform {
  background: var(--source-platform-soft);
  color: var(--source-platform);
}
.source-badge--other {
  background: var(--source-other-soft);
  color: var(--source-other);
}
.why-it-matters { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); }
.original-title { margin: 0; color: var(--muted); font-size: 0.86rem; }
.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin: 6px 0;
}
.source-meta { align-items: center; }
.source-meta-value {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.source-name-list { color: var(--muted); }
.source-breakdown, .topic-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.source-breakdown li, .topic-list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(38, 33, 28, 0.08);
}
.topic-list li a { flex: 1; text-decoration: none; }
.data-links { display: flex; gap: 14px; margin-top: 18px; flex-wrap: wrap; }
.digest-card {
  display: flex;
  flex-direction: column;
  min-height: 192px;
}
.digest-card-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.digest-card-focus-label {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
}
.digest-card-focus {
  margin: 5px 0 0;
  color: var(--text);
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.digest-card-summary {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.archive-stream-focus {
  color: var(--text) !important;
  font-weight: 700;
}
.empty-state, .empty-card p { color: var(--muted); }
.source-highlight-panel + .source-highlight-panel { margin-top: 18px; }
.latest-highlights-empty { margin: 12px 0 0; color: var(--muted); }
.site-footer { margin-top: 32px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--muted); }
.site-footer a { color: inherit; }
.site-footer a:hover { color: var(--accent); }
.share-links { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.share-label { font-size: 0.85rem; font-weight: 500; }
.share-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--line); background: var(--panel);
  color: var(--muted); text-decoration: none; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.share-btn:hover { background: var(--accent-soft); color: var(--accent); }
.share-btn.copied { background: var(--accent); color: #fff; }
.is-hidden { display: none !important; }
.lang-toggle {
  display: inline-flex; align-items: center; cursor: pointer;
  padding: 0; border: 1px solid var(--line);
  border-radius: 999px; background: rgba(255,255,255,0.45);
  overflow: hidden; font-size: 0.82rem; font-weight: 700;
}
.lang-toggle-track { display: flex; }
.lang-toggle-option {
  padding: 7px 12px; color: var(--muted);
  transition: background 0.15s, color 0.15s;
}
.lang-toggle-option.active {
  background: var(--accent); color: #fff; border-radius: 999px;
}
.back-to-top {
  position: fixed; bottom: 24px; right: 24px;
  width: 44px; height: 44px; border-radius: 50%;
  border: 1px solid var(--line); background: var(--panel);
  color: var(--muted); cursor: pointer; display: none;
  align-items: center; justify-content: center;
  box-shadow: var(--shadow); z-index: 100;
  transition: opacity 0.2s;
}
.back-to-top.visible { display: flex; }
.back-to-top:hover { background: var(--accent-soft); color: var(--accent); }
.ext-icon { font-size: 0.8em; opacity: 0.5; margin-left: 2px; }
/* ---- v2: flat GitHub-style layout, one-column update feed, compact header ---- */
:root { --bg: #f6f8fa; --panel: #ffffff; --line: #d0d7de; --text: #1f2328; --muted: #59636e; --accent: #8534f3; --accent-strong: #6a1fd1; --accent-soft: rgba(133, 52, 243, 0.1); --shadow: 0 1px 2px rgba(31, 35, 40, 0.06); }
body { background: var(--bg); font-size: 15.5px; line-height: 1.6; }
.page-shell { max-width: 1040px; padding: 0 20px 40px; }
.site-header { position: sticky; top: 0; z-index: 20; margin: 0 -20px 20px; padding: 10px 20px; background: rgba(255, 255, 255, 0.94); border: 0; border-bottom: 1px solid var(--line); border-radius: 0; backdrop-filter: blur(8px); align-items: center; }
.site-lead, .site-updated-inline { display: none; }
.site-brand { font-size: 1.05rem; color: var(--text); }
.site-navigation { display: flex; align-items: center; gap: 14px; justify-items: initial; }
.site-nav { gap: 16px; font-size: 0.93rem; }
.site-nav a:hover { color: var(--accent); }
.demo-nav { display: block; padding: 0; border: 0; position: relative; font-size: 0.85rem; }
.demo-nav details > summary { cursor: pointer; color: var(--muted); list-style: none; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; background: #fff; }
.demo-nav details > summary::-webkit-details-marker { display: none; }
.demo-nav details[open] > summary { border-color: var(--accent); color: var(--accent-strong); }
.demo-nav .demo-links { position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; display: grid; gap: 2px; min-width: 250px; padding: 8px; background: #fff; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 24px rgba(31, 35, 40, 0.14); }
.demo-nav .demo-links a, .demo-nav .demo-links .demo-nav-current { padding: 6px 10px; border-radius: 6px; }
.demo-nav .demo-links a:hover { background: var(--accent-soft); text-decoration: none; }
.metric-card, .content-card, .side-panel, .digest-card, .update-card, .mini-highlight, .topic-section { border-radius: 12px; box-shadow: var(--shadow); background: var(--panel); }
.hero.hero-home { display: block; padding: 4px 0 6px; background: none; border: 0; box-shadow: none; }
.hero-home .eyebrow, .hero-home .hero-search-label { display: none; }
.hero-home h1 { font-size: 1.7rem; margin: 0 0 6px; }
.hero-home .hero-copy { margin: 0 0 14px; color: var(--muted); max-width: none; font-size: 0.97rem; line-height: 1.6; }
.hero-home .hero-search { margin-top: 0; }
.hero-home .hero-search-help { font-size: 0.85rem; }
.hero-home .metrics-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.hero-home .metric-card { flex-direction: row; align-items: baseline; gap: 8px; padding: 6px 12px; border-radius: 999px; box-shadow: none; }
.hero-home .metric-detail { display: none; }
.hero-home .metric-label { font-size: 0.82rem; }
.hero-home .metric-value { font-size: 1.05rem; font-weight: 700; }
.search-input { border-radius: 10px; background: #fff; padding: 11px 14px; }
.filter-block, .dl-panel { background: #fff; border-radius: 12px; padding: 12px 16px; box-shadow: var(--shadow); }
.filter-chip-row { gap: 8px; }
.section-block { margin-top: 26px; }
.section-heading h2 { font-size: 1.25rem; }
/* one update per row instead of three narrow columns */
.latest-highlights-grid, .highlight-grid.latest-highlights-grid { grid-template-columns: 1fr; gap: 10px; }
.mini-highlight { padding: 14px 18px; display: grid; gap: 6px; }
.mini-highlight .badge-row { gap: 6px; }
.mini-highlight h3 { font-size: 1.08rem; line-height: 1.4; margin: 0; }
.mini-highlight .meta-row { display: flex; gap: 8px 14px; flex-wrap: wrap; font-size: 0.82rem; }
.mini-highlight .original-title { margin: 0; font-size: 0.82rem; }
.mini-highlight { content-visibility: auto; contain-intrinsic-size: auto 280px; }
.mini-highlight .mini-summary { margin: 0; color: var(--text); line-height: 1.7; }
.mini-highlight .mini-why { margin: 0; padding: 8px 12px; background: var(--accent-soft); border-radius: 8px; color: var(--text); font-size: 0.92rem; }
.mini-highlight .resource-links { margin-top: 4px; padding-top: 8px; font-size: 0.85rem; }
.mini-highlight .resource-links ul { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0; margin: 4px 0 0; list-style: none; }
.mini-highlight .resource-links .resource-label { display: inline; margin: 0 8px 0 0; }
.pill { font-size: 0.78rem; padding: 2px 10px; }
.digest-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.digest-card { padding: 12px 14px; }
.digest-card-summary { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.88rem; }
.dl-panel .dl-actions { order: -1; }
.hero-home .search-status { margin: 4px 0 0; font-size: 0.82rem; }
.hero-home .hero-search-help { display: none; }
.filter-block--compact .section-heading h2, .filter-block--compact .filter-title { display: none; }
.filter-block--compact { padding: 10px 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.filter-block--compact .section-heading { order: 2; margin: 0 0 0 auto; }
.filter-block--compact .filter-stack { order: 1; flex: 1; min-width: 0; }
.mini-highlight .resource-links > p.resource-label { display: inline-block; margin: 6px 8px 0 0; }
.mini-highlight .resource-links ul { display: inline-flex; }
.mini-highlight .snapshot-changes ul { display: flex; flex-wrap: wrap; gap: 2px 18px; list-style: none; padding: 0; margin: 2px 0 0; }
.mini-highlight .snapshot-changes .resource-label { margin: 6px 0 0; }
.hero:not(.hero-home) { display: block; padding: 4px 0 8px; background: none; border: 0; box-shadow: none; }
.hero:not(.hero-home) h1 { font-size: 1.6rem; margin: 0 0 6px; }
.hero:not(.hero-home) .eyebrow { margin: 0 0 4px; }
.hero:not(.hero-home) .hero-copy { margin: 0 0 12px; max-width: none; }
.hero:not(.hero-home) .metrics-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.hero:not(.hero-home) .metric-card { flex-direction: row; align-items: baseline; gap: 8px; padding: 6px 12px; border-radius: 999px; box-shadow: none; }
.hero:not(.hero-home) .metric-detail { display: none; }
.hero:not(.hero-home) .metric-label { font-size: 0.82rem; }
.hero:not(.hero-home) .metric-value { font-size: 1.05rem; font-weight: 700; }
.highlight-grid, .update-list { grid-template-columns: 1fr; gap: 10px; }
.update-card { padding: 14px 18px; }
.update-card h3 { font-size: 1.08rem; line-height: 1.4; margin: 6px 0; }
.update-card .source-meta { display: none; }
.update-card .meta-row { display: flex; gap: 4px 16px; flex-wrap: wrap; font-size: 0.82rem; }
.update-card .resource-links ul { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 0; margin: 4px 0 0; list-style: none; }
.card-pick { display: inline-flex; align-items: center; gap: 6px; justify-self: start; font-size: 0.82rem; color: var(--accent-strong); background: var(--accent-soft); border-radius: 999px; padding: 2px 10px; cursor: pointer; }
.mini-highlight.dl-out { display: none; }
.mini-highlight.dl-unpicked { opacity: 0.55; }
/* item numbers: hidden cards do not count, so filtering renumbers the list */
.highlight-grid, .update-list, .stream-list { counter-reset: card-no; }
.mini-highlight, .update-card, .stream-item { counter-increment: card-no; }
.mini-highlight h3::before, .update-card h3::before, .stream-item h3::before { content: counter(card-no) "."; display: inline-block; min-width: 1.9em; margin-right: 4px; color: var(--accent-strong); font-weight: 700; font-variant-numeric: tabular-nums; }
.card-points { margin: 2px 0 4px; padding-left: 1.25em; color: var(--text); font-size: 0.92rem; line-height: 1.65; }
.card-points li { margin: 1px 0; }
.date-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.date-chip { display: inline-flex; gap: 8px; align-items: center; padding: 5px 12px; border: 1px solid var(--line); border-radius: 999px; background: #fff; text-decoration: none; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
.date-chip span { color: var(--muted); font-size: 0.8rem; }
.date-chip:hover { border-color: var(--accent); color: var(--accent-strong); }
.digest-card-head { justify-content: flex-end; }
.digest-card-head p, .digest-card-focus-label { display: none; }
.digest-card h3 { font-size: 1rem; margin: 0 0 6px; }
.demo-nav summary { white-space: nowrap; }
.site-navigation { flex-wrap: wrap; justify-content: flex-end; }
@media (max-width: 720px) { .site-header { position: static; margin-bottom: 12px; } .site-navigation { justify-content: flex-start; } .page-shell { padding: 0 14px 32px; } .site-header { margin: 0 -14px 12px; padding: 10px 14px; } .demo-nav .demo-links { left: 0; right: auto; } }
.dl-collapse > summary { cursor: pointer; font-weight: 700; font-size: 0.92rem; color: var(--text); padding: 2px 0; }
.dl-collapse[open] > summary { margin-bottom: 10px; }
.dl-collapse > .dl-row, .dl-collapse > .dl-chips, .dl-collapse > .dl-items { margin-top: 8px; }@media (max-width: 960px) {
  .hero, .page-grid { grid-template-columns: 1fr; }
  .archive-stream-item { grid-template-columns: 1fr; }
  .archive-stream-link { justify-content: flex-start; }
  .latest-highlights-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .page-shell { padding: 16px; }
  .site-header { padding: 14px 16px; align-items: flex-start; flex-direction: column; }
  .site-navigation { width: 100%; justify-items: start; }
  .demo-nav { justify-content: flex-start; }
  .site-brand-row { align-items: flex-start; gap: 6px 10px; }
  .hero { padding: 24px; }
  .hero-home h1 { max-width: none; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .metrics-grid, .update-list, .highlight-grid, .digest-grid, .overview-grid { grid-template-columns: 1fr; }
  .section-heading { align-items: flex-start; }
  .section-heading-tools { justify-content: flex-start; }
  .pager { align-items: flex-start; }
}
`;
}

function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="vscode-copilot-digest favicon">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8f1e7"/>
      <stop offset="100%" stop-color="#efe4d4"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#bg)"/>
  <rect x="11" y="11" width="42" height="42" rx="13" fill="#fffaf2" stroke="#d8c7b2" stroke-width="2"/>
  <path d="M20 32c0-8 5-13 12-13 4 0 8 1.6 10.8 4.6l-4.1 4.1c-1.8-1.9-4.2-2.8-6.7-2.8-4.8 0-7.9 3-7.9 7.1s3.1 7.1 7.9 7.1c2.5 0 4.9-.9 6.7-2.8l4.1 4.1C40 43.4 36 45 32 45c-7 0-12-5-12-13z" fill="#0f766e"/>
  <circle cx="46" cy="20" r="5" fill="#ea580c"/>
</svg>`;
}

async function readDailyLogs() {
  const entries = await fs.readdir(eventsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
  const logs = [];

  for (const fileName of files) {
    const raw = await fs.readFile(path.join(eventsDir, fileName), "utf8");
    if (raw.trim() === "") {
      console.warn(`Skipping empty event log: ${fileName}`);
      continue;
    }

    logs.push(JSON.parse(raw));
  }

  return logs.sort((left, right) => safeDate(right.date) - safeDate(left.date));
}

async function copyRawFiles(date) {
  const eventSource = path.join(eventsDir, `${date}.json`);
  const summarySource = path.join(summariesDir, `${date}.md`);
  const rawEvent = JSON.parse(await fs.readFile(eventSource, "utf8"));
  delete rawEvent.editorialNote;
  await Promise.all([
    fs.writeFile(
      path.join(siteDir, "raw", "events", `${date}.json`),
      JSON.stringify(rawEvent, null, 2),
      "utf8",
    ),
    fs
      .copyFile(
        summarySource,
        path.join(siteDir, "raw", "summaries", `${date}.md`),
      )
      .catch(async (error) => {
        if (error.code === "ENOENT") {
          await fs.writeFile(
            path.join(siteDir, "raw", "summaries", `${date}.md`),
            "# Summary not found\n",
            "utf8",
          );
          return;
        }

        throw error;
      }),
  ]);
}

function shouldPublishDailyDigest(digest) {
  return (digest?.readerEventCount ?? digest?.uniqueEventCount ?? 0) > 0;
}

async function main() {
  await loadSlideSummaries(workspaceRoot);
  const logs = await readDailyLogs();
  let ledger;
  try {
    ledger = JSON.parse(await fs.readFile(path.join(workspaceRoot, "data", "resources.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    ledger = { entries: {} };
    console.warn("Resource ledger missing; updates will be marked unresearched.");
  }
  const searchHash = createHash("sha256").update(JSON.stringify(logs)).update(JSON.stringify(ledger))
    .update((await fs.readFile(new URL(import.meta.url), "utf8")).replace(/\r\n/g, "\n"));
  const searchInputFiles = [
    ...(await fs.readdir(path.join(workspaceRoot, "scripts", "lib"))).filter((name) => name.endsWith(".mjs"))
      .map((name) => path.join("scripts", "lib", name)),
    ...(await fs.readdir(summariesDir)).filter((name) => name.endsWith(".md"))
      .map((name) => path.join("summaries", "daily", name)),
  ].sort();
  const searchInputs = await Promise.all(searchInputFiles.map(async (file) =>
    [file.split(path.sep).join("/"), (await fs.readFile(path.join(workspaceRoot, file), "utf8")).replace(/\r\n/g, "\n")]));
  for (const [file, content] of searchInputs) searchHash.update(file).update(content);
  searchVersion = searchHash.digest("hex").slice(0, 16);
  for (const log of logs) log.events = (log.events ?? []).map((event) => ({
    ...attachResources(event, ledger), archiveDate: log.date,
  }));
  const digestEntries = logs.map((log) => ({
    log,
    digest: buildDailyDigest(log),
  }));
  const dailyDigests = digestEntries
    .map((entry) => entry.digest)
    .filter(shouldPublishDailyDigest);
  const weeklyDigests = buildWeeklyDigests(
    digestEntries
      .filter((entry) => shouldPublishDailyDigest(entry.digest))
      .map((entry) => entry.log),
  );
  const searchableEvents = buildPublishedEventEntries(dailyDigests, {
    includeFuture: false,
  });
  const allHighlights = searchableEvents;
  archiveDates = new Map(searchableEvents.map((event) => [eventKey(event), event.digestDate]));
  publishedAnchors = new Set(dailyDigests.flatMap((digest) => [...(digest.readerEvents ?? digest.uniqueEvents ?? []), ...(digest.futureEvents ?? []).filter(isReaderEvent)]
    .map((event) => `${digest.date}#${eventAnchorId(event)}`)));
  const highlightPageCount = Math.max(
    1,
    Math.ceil(allHighlights.length / HIGHLIGHTS_PAGE_SIZE),
  );
  const lastUpdatedAt = new Date();

  await fs.rm(siteDir, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(path.join(siteDir, "days"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "weeks"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "en", "days"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "en", "weeks"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "raw", "events"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "raw", "summaries"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "assets"), { recursive: true }),
  ]);

  await Promise.all(
    digestEntries.map(({ digest }) => copyRawFiles(digest.date)),
  );

  await fs.writeFile(
    path.join(siteDir, "assets", "styles.css"),
    stylesCss() + downloadsCss(),
    "utf8",
  );
  await fs.writeFile(
    path.join(siteDir, "assets", "favicon.svg"),
    faviconSvg(),
    "utf8",
  );
  await fs.writeFile(path.join(siteDir, ".nojekyll"), "", "utf8");
  await fs.mkdir(path.join(siteDir, "assets", "vendor"), { recursive: true });
  await fs.writeFile(path.join(siteDir, "assets", "downloads.js"), downloadsJs(), "utf8");
  for (const [from, to] of [["pdf-lib/dist/pdf-lib.min.js", "pdf-lib.min.js"], ["pptxgenjs/dist/pptxgen.bundle.js", "pptxgen.bundle.js"]]) {
    await fs.copyFile(path.join(workspaceRoot, "node_modules", ...from.split("/")), path.join(siteDir, "assets", "vendor", to));
  }
  await fs.writeFile(path.join(siteDir, "assets", "search-version.json"), JSON.stringify({ version: searchVersion }));
  await fs.writeFile(path.join(siteDir, "assets", "resource-audit.json"), JSON.stringify(resourceStats(logs.flatMap((log) => log.events), ledger), null, 2));

  const apiSlides = [];
  const slideDir = path.join(workspaceRoot, "data", "slides");
  for (const name of (await fs.readdir(slideDir).catch(() => [])).filter((n) => n.endsWith(".json"))) {
    try { apiSlides.push(JSON.parse(await fs.readFile(path.join(slideDir, name), "utf8"))); } catch { /* validate:slides reports it */ }
  }
  for (const file of buildApiFiles({ logs, events: searchableEvents, slides: apiSlides })) {
    const target = path.join(siteDir, ...file.path.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content, "utf8");
  }

  const jaText = buildText("ja");
  const enText = buildText("en");

  await Promise.all([
    fs.writeFile(
      path.join(siteDir, "index.html"),
      renderIndexPage(
        {
          dailyDigests,
          weeklyDigests,
          latestCollectDigest: digestEntries[0]?.digest ?? null,
        },
        "ja",
        jaText,
        lastUpdatedAt,
        ".",
        {
          home: "./index.html",
          langSwitch: "./en/index.html",
          highlights: "./highlights.html",
          dailyArchive: "./days/index.html",
          weeklyArchive: "./weeks/index.html",
          dayHref: (date) => `./days/${date}.html`,
          weekHref: (key) => `./weeks/${key}.html`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "search.html"),
      renderSearchPage(
        searchableEvents,
        dailyDigests[0]?.date ?? "N/A",
        "ja",
        jaText,
        lastUpdatedAt,
        ".",
        {
          home: "./index.html",
          weekly: "./weeks/index.html",
          langSwitch: "./en/search.html",
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "index.html"),
      renderIndexPage(
        {
          dailyDigests,
          weeklyDigests,
          latestCollectDigest: digestEntries[0]?.digest ?? null,
        },
        "en",
        enText,
        lastUpdatedAt,
        "..",
        {
          home: "./index.html",
          langSwitch: "../index.html",
          highlights: "./highlights.html",
          dailyArchive: "./days/index.html",
          weeklyArchive: "./weeks/index.html",
          dayHref: (date) => `./days/${date}.html`,
          weekHref: (key) => `./weeks/${key}.html`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "search.html"),
      renderSearchPage(
        searchableEvents,
        dailyDigests[0]?.date ?? "N/A",
        "en",
        enText,
        lastUpdatedAt,
        "..",
        {
          home: "./index.html",
          weekly: "./weeks/index.html",
          langSwitch: "../search.html",
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "highlights.html"),
      renderHighlightsArchivePage(
        allHighlights,
        "ja",
        jaText,
        lastUpdatedAt,
        ".",
        {
          home: "./index.html",
          weekly: "./weeks/index.html",
          langSwitch: "./en/highlights.html",
          pageHref: (page) => `./${highlightArchiveFileName(page)}`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "retirements.html"),
      renderHighlightsArchivePage(allHighlights.filter(isRetirementEvent), "ja", jaText, lastUpdatedAt, ".", { home: "./index.html", weekly: "./weeks/index.html", langSwitch: "./en/retirements.html", pageHref: () => "./retirements.html" }, { retirements: true }),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "retirements.html"),
      renderHighlightsArchivePage(allHighlights.filter(isRetirementEvent), "en", enText, lastUpdatedAt, "..", { home: "./index.html", weekly: "./weeks/index.html", langSwitch: "../retirements.html", pageHref: () => "./retirements.html" }, { retirements: true }),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "highlights.html"),
      renderHighlightsArchivePage(
        allHighlights,
        "en",
        enText,
        lastUpdatedAt,
        "..",
        {
          home: "./index.html",
          weekly: "./weeks/index.html",
          langSwitch: "../highlights.html",
          pageHref: (page) => `./${highlightArchiveFileName(page)}`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "days", "index.html"),
      renderDigestArchivePage(
        dailyDigests,
        "day",
        "ja",
        jaText,
        lastUpdatedAt,
        "..",
        {
          home: "../index.html",
          weekly: "../weeks/index.html",
          langSwitch: "../en/days/index.html",
          dayHref: (date) => `./${date}.html`,
          weekHref: (key) => `../weeks/${key}.html`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "days", "index.html"),
      renderDigestArchivePage(
        dailyDigests,
        "day",
        "en",
        enText,
        lastUpdatedAt,
        "../..",
        {
          home: "../index.html",
          weekly: "../weeks/index.html",
          langSwitch: "../../days/index.html",
          dayHref: (date) => `./${date}.html`,
          weekHref: (key) => `../weeks/${key}.html`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "weeks", "index.html"),
      renderDigestArchivePage(
        weeklyDigests,
        "week",
        "ja",
        jaText,
        lastUpdatedAt,
        "..",
        {
          home: "../index.html",
          weekly: "./index.html",
          langSwitch: "../en/weeks/index.html",
          dayHref: (date) => `../days/${date}.html`,
          weekHref: (key) => `./${key}.html`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "weeks", "index.html"),
      renderDigestArchivePage(
        weeklyDigests,
        "week",
        "en",
        enText,
        lastUpdatedAt,
        "../..",
        {
          home: "../index.html",
          weekly: "./index.html",
          langSwitch: "../../weeks/index.html",
          dayHref: (date) => `../days/${date}.html`,
          weekHref: (key) => `./${key}.html`,
        },
      ),
      "utf8",
    ),
  ]);

  for (let pageNumber = 2; pageNumber <= highlightPageCount; pageNumber += 1) {
    await Promise.all([
      fs.writeFile(
        path.join(siteDir, highlightArchiveFileName(pageNumber)),
        renderHighlightsArchivePage(
          allHighlights,
          "ja",
          jaText,
          lastUpdatedAt,
          ".",
          {
            home: "./index.html",
            weekly: "./weeks/index.html",
            langSwitch: `./en/${highlightArchiveFileName(pageNumber)}`,
            pageHref: (page) => `./${highlightArchiveFileName(page)}`,
          },
          {
            pageNumber,
          },
        ),
        "utf8",
      ),
      fs.writeFile(
        path.join(siteDir, "en", highlightArchiveFileName(pageNumber)),
        renderHighlightsArchivePage(
          allHighlights,
          "en",
          enText,
          lastUpdatedAt,
          "..",
          {
            home: "./index.html",
            weekly: "./weeks/index.html",
            langSwitch: `../${highlightArchiveFileName(pageNumber)}`,
            pageHref: (page) => `./${highlightArchiveFileName(page)}`,
          },
          {
            pageNumber,
          },
        ),
        "utf8",
      ),
    ]);
  }

  for (const digest of dailyDigests) {
    await Promise.all([
      fs.writeFile(
        path.join(siteDir, "days", `${digest.date}.html`),
        renderRangePage(digest, "ja", jaText, {
          kind: "day",
          pageTitle: `${digest.date} Daily Digest | vscode-copilot-digest`,
          description: `${digest.date} の GitHub Copilot / VS Code 更新ダイジェスト`,
          lastUpdatedAt,
          relativePrefix: "..",
          homeHref: "../index.html",
          weeklyHref: "../weeks/index.html",
          langSwitchHref: `../en/days/${digest.date}.html`,
          rawJsonPath: `../raw/events/${digest.date}.json`,
          rawSummaryPath: `../raw/summaries/${digest.date}.md`,
        }),
        "utf8",
      ),
      fs.writeFile(
        path.join(siteDir, "en", "days", `${digest.date}.html`),
        renderRangePage(digest, "en", enText, {
          kind: "day",
          pageTitle: `${digest.date} Daily Digest | vscode-copilot-digest`,
          description: `${digest.date} GitHub Copilot / VS Code daily digest`,
          lastUpdatedAt,
          relativePrefix: "../..",
          homeHref: "../index.html",
          weeklyHref: "../weeks/index.html",
          langSwitchHref: `../../days/${digest.date}.html`,
          rawJsonPath: `../../raw/events/${digest.date}.json`,
          rawSummaryPath: `../../raw/summaries/${digest.date}.md`,
        }),
        "utf8",
      ),
    ]);
  }

  for (const digest of weeklyDigests) {
    await Promise.all([
      fs.writeFile(
        path.join(siteDir, "weeks", `${digest.key}.html`),
        renderRangePage(digest, "ja", jaText, {
          kind: "week",
          pageTitle: `${digest.startDate}〜${digest.endDate} Weekly Digest | vscode-copilot-digest`,
          description: `${digest.startDate}〜${digest.endDate} の GitHub Copilot / VS Code 週間ダイジェスト`,
          lastUpdatedAt,
          relativePrefix: "..",
          homeHref: "../index.html",
          weeklyHref: "./index.html",
          langSwitchHref: `../en/weeks/${digest.key}.html`,
        }),
        "utf8",
      ),
      fs.writeFile(
        path.join(siteDir, "en", "weeks", `${digest.key}.html`),
        renderRangePage(digest, "en", enText, {
          kind: "week",
          pageTitle: `${digest.startDate} - ${digest.endDate} Weekly Digest | vscode-copilot-digest`,
          description: `${digest.startDate} - ${digest.endDate} GitHub Copilot / VS Code weekly digest`,
          lastUpdatedAt,
          relativePrefix: "../..",
          homeHref: "../index.html",
          weeklyHref: "./index.html",
          langSwitchHref: `../../weeks/${digest.key}.html`,
        }),
        "utf8",
      ),
    ]);
  }

  await assertNoGenericFallbacksInPublishedOutput();
  await assertGeneratedA11yBasics();

  console.log(
    `Built GitHub Pages site with ${dailyDigests.length} daily page(s) and ${weeklyDigests.length} weekly page(s).`,
  );
}

await main();
