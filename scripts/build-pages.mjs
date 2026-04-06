import fs from "node:fs/promises";
import path from "node:path";

import {
  applyEditorialPolicy,
  buildDailyDigest,
  buildHighlightTags,
  classifyEvent,
  dedupeEvents,
  importanceReason,
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  originalTitle,
  rankEvent,
  safeDate,
} from "./lib/reporting.mjs";

const workspaceRoot = process.cwd();
const eventsDir = path.join(workspaceRoot, "data", "events");
const summariesDir = path.join(workspaceRoot, "summaries", "daily");
const siteDir = path.join(workspaceRoot, "site");

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
function formatCount(count, locale, singular, plural) {
  if (locale === "ja") {
    return `${count}`;
  }

  return `${count} ${count === 1 ? singular : plural}`;
}

function buildText(locale) {
  if (locale === "en") {
    return {
      htmlLang: "en",
      siteLead: "An unofficial daily digest of GitHub Copilot and VS Code updates.",
      footer: "An unofficial daily digest of GitHub Copilot and VS Code updates.",
      dailyNav: "Daily",
      weeklyNav: "Weekly",
      repositoryNav: "Repository",
      langSwitchLabel: "日本語",
      heroEyebrow: "GitHub Pages",
      heroTitle: "Track GitHub Copilot and VS Code updates in a format you can actually read.",
      heroCopy: "We collect GitHub Changelog, VS Code updates, and complementary sources every day, then publish deduplicated highlights together with raw Markdown and JSON.",
      publishedCount: "Published daily digests",
      publishedCountDetail: "Number of daily digests on Pages",
      overallCount: "Tracked updates",
      overallCountDetail: "Deduplicated running total",
      latestDate: "Latest date",
      latestDateDetail: "Most recent generated digest",
      latestRunCount: "Latest run new items",
      latestRunCountDetail: "Detected in the most recent collect run",
      howToReadTitle: "How to read this site",
      howToReadBody1: "Start with the highlight cards to see the changes most likely to matter. Drop into topic sections or the full update list only when you need more detail.",
      howToReadBody2: "Raw Markdown and JSON are published alongside the rendered pages so you can verify the source material or reuse it in your own workflow.",
      policyTitle: "Coverage policy",
      policyBody1: "Official GitHub and VS Code sources are prioritized, future-dated feed items are excluded until their publish date, and surrounding news is capped to reduce noise.",
      policyBody2: "The site is bilingual. Japanese is the default and matching English pages are generated under /en/.",
      latestHighlightsTitle: "Latest highlights",
      latestHighlightsLabel: "Cross-day view",
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
      updatedLabel: "Document updated",
      detectedLabel: "Seen on this site",
      sourceLabel: "Sources",
      whyLabel: "Why it matters",
      originalTitleLabel: "Original",
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
      itemSuffix: " items",
      topicNames: {
        "GitHub Copilot": "GitHub Copilot",
        "VS Code": "VS Code",
        "GitHub Platform": "GitHub Platform",
        "周辺ニュース": "Ecosystem",
      },
    };
  }

  return {
    htmlLang: "ja",
    siteLead: "GitHub Copilot と VS Code の更新を日次で集約した非公式ダイジェストです。",
    footer: "GitHub Copilot / VS Code 周辺の更新を日次で集約した非公式ダイジェストです。",
    dailyNav: "日次ダイジェスト",
    weeklyNav: "週間ダイジェスト",
    repositoryNav: "Repository",
    langSwitchLabel: "EN",
    heroEyebrow: "GitHub Pages",
    heroTitle: "GitHub Copilot と VS Code の更新を、毎日読める形で残す。",
    heroCopy: "GitHub Changelog、VS Code Updates、補完ソースを毎日収集し、重複を除いたハイライトと元データをまとめて公開します。",
    publishedCount: "公開済み日次",
    publishedCountDetail: "Pages に載っている日次ダイジェスト数",
    overallCount: "累計更新件数",
    overallCountDetail: "重複除去後の累計",
    latestDate: "最新日付",
    latestDateDetail: "最後に生成された日次",
    latestRunCount: "直近新規件数",
    latestRunCountDetail: "最新 collect 実行の検知件数",
    howToReadTitle: "このサイトの見方",
    howToReadBody1: "まずはハイライトで重要な更新だけを把握し、必要ならテーマ別まとめと全件リストへ降りていく構成です。",
    howToReadBody2: "Markdown と JSON の生データも毎日併設しているので、要約の元ネタ確認や二次利用もしやすくしています。",
    policyTitle: "公開方針",
    policyBody1: "GitHub / VS Code の公式ソースを優先し、未来日付の feed 項目は公開日まで除外し、周辺ニュースは量を絞ってノイズを抑えています。",
    policyBody2: "サイトは日本語を既定にしつつ、同じ内容の英語ページを /en/ 配下にも生成します。",
    latestHighlightsTitle: "最新ハイライト",
    latestHighlightsLabel: "横断表示",
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
    updatedLabel: "文書更新日",
    detectedLabel: "このサイトに載った日",
    sourceLabel: "ソース",
    whyLabel: "なぜ重要か",
    originalTitleLabel: "原題",
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
    itemSuffix: "件",
    topicNames: {
      "GitHub Copilot": "GitHub Copilot",
      "VS Code": "VS Code",
      "GitHub Platform": "GitHub Platform",
      "周辺ニュース": "周辺ニュース",
    },
  };
}

function renderMetric(label, value, detail) {
  return `<article class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><strong class="metric-value">${escapeHtml(value)}</strong><span class="metric-detail">${escapeHtml(detail)}</span></article>`;
}

function renderBadges(event, locale) {
  return `<div class="badge-row">${buildHighlightTags(event, locale)
    .map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`)
    .join("")}</div>`;
}

function renderDateMeta(event, locale, text) {
  return `<div class="meta-row"><span>${escapeHtml(text.updatedLabel)}: ${escapeHtml(formatDate(event.publishedAt, locale))}</span><span>${escapeHtml(text.detectedLabel)}: ${escapeHtml(formatDate(event.detectedAt ?? event.publishedAt, locale))}</span></div>`;
}

function renderSourceMeta(event, text) {
  return `<div class="meta-row"><span>${escapeHtml(text.sourceLabel)}: ${escapeHtml((event.sourceNames ?? [event.sourceName]).join(" / "))}</span></div>`;
}

function renderEventCard(event, locale, text, options = {}) {
  const rawTitle = locale === "ja" ? originalTitle(event) : null;
  const summaryMaxLength = options.compact ? 170 : 260;
  const why = options.includeWhy
    ? `<p class="why-it-matters"><strong>${escapeHtml(text.whyLabel)}:</strong> ${escapeHtml(importanceReason(event, locale))}</p>`
    : "";
  const cardClass = options.compact ? "mini-highlight" : "update-card";

  return `<article class="${cardClass}">
    ${renderBadges(event, locale)}
    <h3><a href="${escapeHtml(event.url)}">${escapeHtml(localizedTitle(event, locale))}</a></h3>
    ${rawTitle ? `<p class="original-title">${escapeHtml(text.originalTitleLabel)}: ${escapeHtml(rawTitle)}</p>` : ""}
    ${renderDateMeta(event, locale, text)}
    ${renderSourceMeta(event, text)}
    <p>${escapeHtml(trimText(localizedSummary(event, locale), summaryMaxLength))}</p>
    ${why}
  </article>`;
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

  const uniqueEvents = dedupeEvents(rawEvents).sort(
    (left, right) =>
      safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
      rankEvent(right) - rankEvent(left),
  );

  const sourceBreakdown = new Map();
  for (const event of rawEvents) {
    const sourceName = event.sourceName ?? "Unknown";
    if (!sourceBreakdown.has(sourceName)) {
      sourceBreakdown.set(sourceName, new Set());
    }

    sourceBreakdown.get(sourceName).add(event.url || event.title || event.eventId);
  }

  const topicOrder = [
    "GitHub Copilot",
    "VS Code",
    "GitHub Platform",
    "周辺ニュース",
  ];
  const topicMap = new Map(topicOrder.map((topic) => [topic, []]));
  for (const event of uniqueEvents) {
    topicMap.get(classifyEvent(event)).push(event);
  }

  const editorialNotes = [...new Set(
    logs
      .filter((log) => safeDate(log.date) >= startDate && safeDate(log.date) <= endDate)
      .map((log) => log.editorialNote)
      .filter(Boolean),
  )];

  return {
    kind: range.kind,
    key: range.key,
    startDate: toDateOnly(startDate),
    endDate: toDateOnly(endDate),
    editorialNotes,
    uniqueEventCount: uniqueEvents.length,
    sourceBreakdown: [...sourceBreakdown.entries()]
      .map(([name, keys]) => ({ name, count: keys.size }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ja")),
    highlights: uniqueEvents.slice(0, 6),
    uniqueEvents,
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
  const rangeLabel = kind === "week" ? `${digest.startDate} - ${digest.endDate}` : digest.date;
  const title = kind === "week" ? `${digest.startDate} - ${digest.endDate}` : `${digest.date}`;
  const topItems = digest.highlights.slice(0, 3);
  const itemCount = locale === "ja"
    ? `${digest.uniqueEventCount}${escapeHtml(text.itemSuffix)}`
    : formatCount(digest.uniqueEventCount, locale, "item", "items");

  return `<article class="digest-card">
    <div class="digest-card-head"><p>${escapeHtml(rangeLabel)}</p><span>${itemCount}</span></div>
    <h3><a href="${escapeHtml(href)}">${escapeHtml(title)}</a></h3>
    <p>${escapeHtml(trimText(localizedSummary(topItems[0] ?? { summary: locale === "ja" ? "更新はありませんでした。" : "No updates were found." }, locale), 150))}</p>
    <ul>${topItems.map((event) => `<li>${escapeHtml(trimText(localizedTitle(event, locale), 84))}</li>`).join("")}</ul>
  </article>`;
}

function renderRangePage(digest, locale, text, options) {
  const itemCount = (count) =>
    locale === "ja"
      ? `${count}${text.itemSuffix}`
      : formatCount(count, locale, "item", "items");
  const metrics = options.kind === "day"
    ? [
        renderMetric(text.trackedUpdates, itemCount(digest.uniqueEventCount), text.trackedUpdatesDetail),
        renderMetric(text.latestRunMetric, itemCount(digest.latestRun.newEventsCount), text.latestRunMetricDetail),
        renderMetric(text.trackedSources, itemCount(digest.sourceBreakdown.length), text.trackedSourcesDetail),
        renderMetric(text.errorMetric, itemCount(digest.errorCount), text.errorMetricDetail),
      ]
    : [
        renderMetric(text.rangeLabel, `${digest.startDate} - ${digest.endDate}`, text.rangeDetail),
        renderMetric(text.trackedUpdates, itemCount(digest.uniqueEventCount), text.trackedUpdatesDetail),
        renderMetric(text.trackedSources, itemCount(digest.sourceBreakdown.length), text.trackedSourcesDetail),
        renderMetric(text.noteCount, itemCount(digest.editorialNotes.length), text.noteCountDetail),
      ];

  const editorialNotes = options.kind === "day"
    ? (digest.editorialNote ? [digest.editorialNote] : [])
    : digest.editorialNotes;

  const body = `
    <section class="hero hero-day">
      <div>
        <p class="eyebrow">${escapeHtml(options.kind === "day" ? text.dayPageEyebrow : text.weekPageEyebrow)}</p>
        <h1>${escapeHtml(options.kind === "day" ? digest.date : `${digest.startDate} - ${digest.endDate}`)}</h1>
        <p class="hero-copy">${escapeHtml(options.kind === "day" ? (locale === "ja" ? "当日の監視結果を、重複を除いた読みやすい形に再構成しています。" : "This page reorganizes one day's collected updates into a deduplicated, readable digest.") : (locale === "ja" ? "直近 7 日の更新をまとめて追えるように、ハイライトと全件を週単位で再構成しています。" : "This page groups the last seven days of updates into a weekly digest with highlights and a full update list."))}</p>
      </div>
      <div class="metrics-grid">${metrics.join("")}</div>
    </section>

    ${renderEditorialNotes(editorialNotes, text)}

    <section class="section-block">
      <div class="section-heading"><h2>${escapeHtml(text.highlightsTitle)}</h2><span>${escapeHtml(itemCount(digest.highlights.length))}</span></div>
      <div class="highlight-grid">${digest.highlights.map((event) => renderEventCard(event, locale, text, { includeWhy: true })).join("")}</div>
    </section>

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

    <section class="section-block">
      <div class="section-heading"><h2>${escapeHtml(text.fullListTitle)}</h2><span>${escapeHtml(itemCount(digest.uniqueEventCount))}</span></div>
      <div class="update-list">${digest.uniqueEvents.map((event) => renderEventCard(event, locale, text, { includeWhy: true })).join("")}</div>
    </section>
  `;

  return renderLayout({
    locale,
    text,
    title: options.pageTitle,
    description: options.description,
    body,
    relativePrefix: options.relativePrefix,
    homeHref: options.homeHref,
    weeklyHref: options.weeklyHref,
    langSwitchHref: options.langSwitchHref,
  });
}

function renderIndexPage({ dailyDigests, weeklyDigests }, locale, text, relativePrefix, links) {
  const latestDigest = dailyDigests[0];
  const overallUnique = dailyDigests.reduce((total, digest) => total + digest.uniqueEventCount, 0);
  const latestHighlights = dailyDigests
    .flatMap((digest) => digest.highlights.map((event) => ({ ...event, digestDate: digest.date })))
    .sort(
      (left, right) =>
        safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
        rankEvent(right) - rankEvent(left),
    )
    .slice(0, 6);

  const weeklyMarkup = weeklyDigests.length === 0
    ? `<div class="content-card empty-card"><p>${escapeHtml(text.weeklyEmpty)}</p></div>`
    : `<div class="digest-grid">${weeklyDigests.map((digest) => renderArchiveCard(digest, locale, text, links.weekHref(digest.key), "week")).join("")}</div>`;

  const body = `
    <section class="hero">
      <div>
        <p class="eyebrow">${escapeHtml(text.heroEyebrow)}</p>
        <h1>${escapeHtml(text.heroTitle)}</h1>
        <p class="hero-copy">${escapeHtml(text.heroCopy)}</p>
      </div>
      <div class="metrics-grid">
        ${renderMetric(text.publishedCount, locale === "ja" ? `${dailyDigests.length}${escapeHtml(text.dayCountSuffix)}` : formatCount(dailyDigests.length, locale, "day", "days"), text.publishedCountDetail)}
        ${renderMetric(text.overallCount, locale === "ja" ? `${overallUnique}${escapeHtml(text.itemSuffix)}` : formatCount(overallUnique, locale, "item", "items"), text.overallCountDetail)}
        ${renderMetric(text.latestDate, latestDigest ? latestDigest.date : "N/A", text.latestDateDetail)}
        ${renderMetric(text.latestRunCount, locale === "ja" ? (latestDigest ? `${latestDigest.latestRun.newEventsCount}${escapeHtml(text.itemSuffix)}` : `0${escapeHtml(text.itemSuffix)}`) : formatCount(latestDigest?.latestRun?.newEventsCount ?? 0, locale, "item", "items"), text.latestRunCountDetail)}
      </div>
    </section>

    <section class="section-block overview-grid">
      <article class="content-card">
        <div class="section-heading"><h2>${escapeHtml(text.howToReadTitle)}</h2><span>${escapeHtml(locale === "ja" ? "導線" : "Flow")}</span></div>
        <p>${escapeHtml(text.howToReadBody1)}</p>
        <p>${escapeHtml(text.howToReadBody2)}</p>
      </article>
      <article class="content-card">
        <div class="section-heading"><h2>${escapeHtml(text.policyTitle)}</h2><span>${escapeHtml(locale === "ja" ? "公開方針" : "Policy")}</span></div>
        <p>${escapeHtml(text.policyBody1)}</p>
        <p>${escapeHtml(text.policyBody2)}</p>
      </article>
    </section>

    <section class="section-block">
      <div class="section-heading"><h2>${escapeHtml(text.latestHighlightsTitle)}</h2><span>${escapeHtml(text.latestHighlightsLabel)}</span></div>
      <div class="highlight-grid">${latestHighlights.map((event) => renderEventCard(event, locale, text, { compact: true, includeWhy: false })).join("")}</div>
    </section>

    <section class="section-block" id="weekly-archive">
      <div class="section-heading"><h2>${escapeHtml(text.weeklyArchiveTitle)}</h2><span>${escapeHtml(text.weeklyArchiveLabel)}</span></div>
      ${weeklyMarkup}
    </section>

    <section class="section-block">
      <div class="section-heading"><h2>${escapeHtml(text.dailyArchiveTitle)}</h2><span>${locale === "ja" ? `${dailyDigests.length}${escapeHtml(text.dayCountSuffix)}` : formatCount(dailyDigests.length, locale, "day", "days")}</span></div>
      <div class="digest-grid">${dailyDigests.map((digest) => renderArchiveCard(digest, locale, text, links.dayHref(digest.date), "day")).join("")}</div>
    </section>
  `;

  return renderLayout({
    locale,
    text,
    title: "vscode-copilot-digest",
    description: text.siteLead,
    body,
    relativePrefix,
    homeHref: links.home,
    weeklyHref: `${links.home}#weekly-archive`,
    langSwitchHref: links.langSwitch,
  });
}

function renderLayout({ locale, text, title, description, body, relativePrefix, homeHref, weeklyHref, langSwitchHref }) {
  const assetHref = relativePrefix === "." ? "./assets/styles.css" : `${relativePrefix}/assets/styles.css`;
  return `<!doctype html>
<html lang="${escapeHtml(text.htmlLang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${assetHref}" />
  </head>
  <body>
    <div class="page-shell">
      <header class="site-header">
        <div>
          <a class="site-brand" href="${escapeHtml(homeHref)}">vscode-copilot-digest</a>
          <p class="site-lead">${escapeHtml(text.siteLead)}</p>
        </div>
        <nav class="site-nav">
          <a href="${escapeHtml(homeHref)}">${escapeHtml(text.dailyNav)}</a>
          <a href="${escapeHtml(weeklyHref)}">${escapeHtml(text.weeklyNav)}</a>
          <a href="https://github.com/aktsmm/vscode-copilot-digest">${escapeHtml(text.repositoryNav)}</a>
          <a class="lang-switch" href="${escapeHtml(langSwitchHref)}">${escapeHtml(text.langSwitchLabel)}</a>
        </nav>
      </header>
      <main>${body}</main>
      <footer class="site-footer"><p>${escapeHtml(text.footer)}</p></footer>
    </div>
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
.page-shell { max-width: 1240px; margin: 0 auto; padding: 24px; }
.site-header, .site-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.site-header {
  margin-bottom: 24px;
  padding: 18px 20px;
  background: rgba(255, 250, 242, 0.78);
  border: 1px solid var(--line);
  border-radius: 24px;
  backdrop-filter: blur(14px);
}
.site-brand, h1, h2, h3 { font-family: "Space Grotesk", "IBM Plex Sans JP", sans-serif; }
.site-brand { text-decoration: none; font-weight: 700; letter-spacing: 0.02em; }
.site-lead { margin: 6px 0 0; color: var(--muted); font-size: 0.92rem; }
.site-nav { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.site-nav a, .data-links a { text-decoration: none; color: var(--muted); }
.lang-switch {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.45);
}
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
.hero-day { margin-bottom: 24px; }
.eyebrow {
  margin: 0 0 12px;
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
}
h1 { margin: 0 0 16px; font-size: clamp(2.3rem, 4vw, 4.2rem); line-height: 1.04; }
.hero-copy, .content-card p, .update-card p, .mini-highlight p { color: var(--muted); line-height: 1.75; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.metric-card, .content-card, .side-panel, .digest-card, .update-card, .mini-highlight, .topic-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow);
}
.metric-card { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.metric-label, .metric-detail, .meta-row, .digest-card-head { color: var(--muted); font-size: 0.9rem; }
.metric-value { font-size: 1.9rem; }
.section-block { margin-top: 28px; }
.notice-block {
  padding: 18px 20px;
  background: rgba(15, 118, 110, 0.08);
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 20px;
}
.notice-list { display: grid; gap: 10px; }
.notice-list p { margin: 0; color: var(--text); line-height: 1.7; }
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.section-heading h2 { margin: 0; font-size: 1.55rem; }
.overview-grid, .highlight-grid, .digest-grid, .update-list { display: grid; gap: 16px; }
.overview-grid { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.highlight-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.digest-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.update-list { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.page-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.9fr);
  gap: 20px;
}
.update-card, .content-card, .side-panel, .topic-section, .mini-highlight, .digest-card { padding: 20px; }
.update-card h3, .mini-highlight h3, .digest-card h3 { margin: 12px 0 10px; font-size: 1.08rem; }
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
.why-it-matters { margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); }
.original-title { margin: 0; color: var(--muted); font-size: 0.86rem; }
.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin: 6px 0;
}
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
.digest-card ul { margin: 14px 0 0; padding-left: 18px; color: var(--muted); }
.digest-card-head { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.empty-state, .empty-card p { color: var(--muted); }
.site-footer { margin-top: 32px; padding: 20px; justify-content: center; color: var(--muted); }
@media (max-width: 960px) {
  .hero, .page-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .page-shell { padding: 16px; }
  .site-header { padding: 14px 16px; align-items: flex-start; flex-direction: column; }
  .hero { padding: 24px; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .metrics-grid, .update-list, .highlight-grid, .digest-grid, .overview-grid { grid-template-columns: 1fr; }
}
`;
}

async function readDailyLogs() {
  const entries = await fs.readdir(eventsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
  const logs = [];

  for (const fileName of files) {
    const raw = await fs.readFile(path.join(eventsDir, fileName), "utf8");
    logs.push(JSON.parse(raw));
  }

  return logs.sort((left, right) => safeDate(right.date) - safeDate(left.date));
}

async function copyRawFiles(date) {
  const eventSource = path.join(eventsDir, `${date}.json`);
  const summarySource = path.join(summariesDir, `${date}.md`);
  await Promise.all([
    fs.copyFile(eventSource, path.join(siteDir, "raw", "events", `${date}.json`)),
    fs.copyFile(summarySource, path.join(siteDir, "raw", "summaries", `${date}.md`)).catch(async (error) => {
      if (error.code === "ENOENT") {
        await fs.writeFile(path.join(siteDir, "raw", "summaries", `${date}.md`), "# Summary not found\n", "utf8");
        return;
      }

      throw error;
    }),
  ]);
}

async function main() {
  const logs = await readDailyLogs();
  const dailyDigests = logs.map((log) => buildDailyDigest(log));
  const weeklyDigests = buildWeeklyDigests(logs);

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

  await fs.writeFile(path.join(siteDir, "assets", "styles.css"), stylesCss(), "utf8");
  await fs.writeFile(path.join(siteDir, ".nojekyll"), "", "utf8");

  const jaText = buildText("ja");
  const enText = buildText("en");

  await Promise.all([
    fs.writeFile(
      path.join(siteDir, "index.html"),
      renderIndexPage(
        { dailyDigests, weeklyDigests },
        "ja",
        jaText,
        ".",
        {
          home: "./index.html",
          langSwitch: "./en/index.html",
          dayHref: (date) => `./days/${date}.html`,
          weekHref: (key) => `./weeks/${key}.html`,
        },
      ),
      "utf8",
    ),
    fs.writeFile(
      path.join(siteDir, "en", "index.html"),
      renderIndexPage(
        { dailyDigests, weeklyDigests },
        "en",
        enText,
        "..",
        {
          home: "./index.html",
          langSwitch: "../index.html",
          dayHref: (date) => `./days/${date}.html`,
          weekHref: (key) => `./weeks/${key}.html`,
        },
      ),
      "utf8",
    ),
  ]);

  for (const digest of dailyDigests) {
    await Promise.all([
      fs.writeFile(
        path.join(siteDir, "days", `${digest.date}.html`),
        renderRangePage(digest, "ja", jaText, {
          kind: "day",
          pageTitle: `${digest.date} Daily Digest | vscode-copilot-digest`,
          description: `${digest.date} の GitHub Copilot / VS Code 更新ダイジェスト`,
          relativePrefix: "..",
          homeHref: "../index.html",
          weeklyHref: "../index.html#weekly-archive",
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
          relativePrefix: "../..",
          homeHref: "../index.html",
          weeklyHref: "../index.html#weekly-archive",
          langSwitchHref: `../../days/${digest.date}.html`,
          rawJsonPath: `../../raw/events/${digest.date}.json`,
          rawSummaryPath: `../../raw/summaries/${digest.date}.md`,
        }),
        "utf8",
      ),
      copyRawFiles(digest.date),
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
          relativePrefix: "..",
          homeHref: "../index.html",
          weeklyHref: "../index.html#weekly-archive",
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
          relativePrefix: "../..",
          homeHref: "../index.html",
          weeklyHref: "../index.html#weekly-archive",
          langSwitchHref: `../../weeks/${digest.key}.html`,
        }),
        "utf8",
      ),
    ]);
  }

  console.log(`Built GitHub Pages site with ${dailyDigests.length} daily page(s) and ${weeklyDigests.length} weekly page(s).`);
}

await main();