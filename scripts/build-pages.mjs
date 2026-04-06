import fs from "node:fs/promises";
import path from "node:path";

import {
  buildDailyDigest,
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

function formatDate(value) {
  return safeDate(value).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function renderLayout({ title, description, body, activePath = "/" }) {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@400;500;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${activePath === "/" ? "./assets/styles.css" : "../assets/styles.css"}" />
  </head>
  <body>
    <div class="page-shell">
      <header class="site-header">
        <a class="site-brand" href="${activePath === "/" ? "./index.html" : "../index.html"}">vscode-copilot-digest</a>
        <nav class="site-nav">
          <a href="${activePath === "/" ? "./index.html" : "../index.html"}">日次ダイジェスト</a>
          <a href="https://github.com/aktsmm/vscode-copilot-digest">Repository</a>
        </nav>
      </header>
      <main>${body}</main>
      <footer class="site-footer">
        <p>GitHub Copilot / VS Code 周辺の更新を日次で集約した非公式ダイジェストです。</p>
      </footer>
    </div>
  </body>
</html>`;
}

function renderMetric(label, value, detail) {
  return `<article class="metric-card"><span class="metric-label">${escapeHtml(label)}</span><strong class="metric-value">${escapeHtml(value)}</strong><span class="metric-detail">${escapeHtml(detail)}</span></article>`;
}

function renderHighlightItem(event) {
  const rawTitle = originalTitle(event);
  return `<article class="highlight-card">
    <div class="highlight-meta">
      <span class="pill">${escapeHtml(localizedImportanceLabel(event))}</span>
      <span>${escapeHtml((event.sourceNames ?? [event.sourceName]).join(" / "))}</span>
    </div>
    <h3><a href="${escapeHtml(event.url)}">${escapeHtml(localizedTitle(event))}</a></h3>
    ${rawTitle ? `<p class="original-title">Original: ${escapeHtml(rawTitle)}</p>` : ""}
    <p>${escapeHtml(trimText(localizedSummary(event), 200))}</p>
    <p class="why-it-matters">${escapeHtml(importanceReason(event))}</p>
  </article>`;
}

function renderTopicSection(topic) {
  if (topic.count === 0) {
    return `<section class="topic-section"><div class="section-heading"><h2>${escapeHtml(topic.name)}</h2><span>0件</span></div><p class="empty-state">このカテゴリの更新はありませんでした。</p></section>`;
  }

  const items = topic.events
    .slice(0, 8)
    .map(
      (event) =>
        `<li><a href="${escapeHtml(event.url)}">${escapeHtml(localizedTitle(event))}</a><span>${escapeHtml(localizedImportanceLabel(event))}</span></li>`,
    )
    .join("");
  return `<section class="topic-section"><div class="section-heading"><h2>${escapeHtml(topic.name)}</h2><span>${topic.count}件</span></div><ul class="topic-list">${items}</ul></section>`;
}

function renderDayPage(digest) {
  const rawJsonPath = `../raw/events/${digest.date}.json`;
  const rawSummaryPath = `../raw/summaries/${digest.date}.md`;
  const editorialNoteMarkup = digest.editorialNote
    ? `<section class="section-block notice-block"><p>${escapeHtml(digest.editorialNote)}</p></section>`
    : "";

  const body = `
    <section class="hero hero-day">
      <div>
        <p class="eyebrow">日次ダイジェスト</p>
        <h1>${escapeHtml(digest.date)}</h1>
        <p class="hero-copy">当日の監視結果を、重複を除いた読みやすい形に再構成しています。元データの Markdown と JSON もそのまま参照できます。</p>
      </div>
      <div class="metrics-grid">
        ${renderMetric("重複除去後の更新", `${digest.uniqueEventCount}件`, "Pages 上で表示する基準件数")}
        ${renderMetric("直近 run の新規", `${digest.latestRun.newEventsCount}件`, "最後の collect 実行で検知した件数")}
        ${renderMetric("監視ソース", `${digest.sourceBreakdown.length}件`, "その日に更新を拾ったソース数")}
        ${renderMetric("エラー", `${digest.errorCount}件`, "取得失敗の件数")}
      </div>
    </section>

    ${editorialNoteMarkup}

    <section class="section-block">
      <div class="section-heading">
        <h2>今日のハイライト</h2>
        <span>${digest.highlights.length}件</span>
      </div>
      <div class="highlight-grid">${digest.highlights.map(renderHighlightItem).join("")}</div>
    </section>

    <section class="section-block two-column">
      <div>
        <div class="section-heading"><h2>テーマ別まとめ</h2><span>分類済み</span></div>
        ${digest.topics.map(renderTopicSection).join("")}
      </div>
      <aside class="side-panel">
        <div class="section-heading"><h2>ソース内訳</h2><span>重複除去前</span></div>
        <ul class="source-breakdown">${digest.sourceBreakdown.map((source) => `<li><span>${escapeHtml(source.name)}</span><strong>${source.count}</strong></li>`).join("")}</ul>
        <div class="data-links">
          <a href="${rawSummaryPath}">Markdown を開く</a>
          <a href="${rawJsonPath}">JSON を開く</a>
        </div>
      </aside>
    </section>

    <section class="section-block">
      <div class="section-heading"><h2>全件リスト</h2><span>${digest.uniqueEventCount}件</span></div>
      <div class="update-list">${digest.uniqueEvents.map((event) => `<article class="update-card"><div class="highlight-meta"><span class="pill">${escapeHtml(localizedImportanceLabel(event))}</span><span>${escapeHtml((event.sourceNames ?? [event.sourceName]).join(" / "))}</span></div><h3><a href="${escapeHtml(event.url)}">${escapeHtml(localizedTitle(event))}</a></h3>${originalTitle(event) ? `<p class="original-title">Original: ${escapeHtml(originalTitle(event))}</p>` : ""}<p>${escapeHtml(trimText(localizedSummary(event), 280))}</p><div class="update-foot"><span>${escapeHtml(formatDate(event.publishedAt))}</span><span>${escapeHtml((event.categories ?? []).join(", "))}</span></div></article>`).join("")}</div>
    </section>
  `;

  return renderLayout({
    title: `${digest.date} Daily Digest | vscode-copilot-digest`,
    description: `${digest.date} の GitHub Copilot / VS Code 更新ダイジェスト`,
    body,
    activePath: "/days",
  });
}

function renderIndexPage(digests) {
  const latestDigest = digests[0];
  const overallUnique = digests.reduce(
    (total, digest) => total + digest.uniqueEventCount,
    0,
  );
  const latestHighlights = digests
    .flatMap((digest) =>
      digest.highlights.map((event) => ({ ...event, date: digest.date })),
    )
    .sort(
      (left, right) =>
        safeDate(right.publishedAt) - safeDate(left.publishedAt) ||
        rankEvent(right) - rankEvent(left),
    )
    .slice(0, 8);

  const digestCards = digests
    .map(
      (digest) =>
        `<article class="digest-card"><div class="digest-card-head"><p>${escapeHtml(digest.date)}</p><span>${digest.uniqueEventCount}件</span></div><h3><a href="./days/${digest.date}.html">${escapeHtml(digest.date)} の日次ダイジェスト</a></h3><p>${escapeHtml(localizedTitle(digest.highlights[0] ?? { title: "更新はありませんでした。", summary: "", sourceName: "", categories: [] }))}</p><ul>${digest.highlights
          .slice(0, 3)
          .map(
            (event) =>
              `<li>${escapeHtml(trimText(localizedTitle(event), 72))}</li>`,
          )
          .join("")}</ul></article>`,
    )
    .join("");
  const latestHighlightsMarkup = latestHighlights
    .map(
      (event) =>
        `<article class="mini-highlight"><span class="pill">${escapeHtml(event.date)}</span><h3><a href="${escapeHtml(event.url)}">${escapeHtml(localizedTitle(event))}</a></h3><p>${escapeHtml(trimText(localizedSummary(event), 140))}</p></article>`,
    )
    .join("");

  const body = `
    <section class="hero">
      <div>
        <p class="eyebrow">GitHub Pages</p>
        <h1>GitHub Copilot と VS Code の更新を、毎日読める形で残す。</h1>
        <p class="hero-copy">GitHub Changelog、VS Code Updates、補完ソースを毎日収集し、重複を除いたハイライトと元データをまとめて公開します。</p>
      </div>
      <div class="metrics-grid">
        ${renderMetric("公開済み日次", `${digests.length}日`, "Pages に載っている日次ダイジェスト数")}
        ${renderMetric("累計更新件数", `${overallUnique}件`, "重複除去後の累計")}
        ${renderMetric("最新日付", latestDigest ? latestDigest.date : "N/A", "最後に生成された日次")}
        ${renderMetric("直近新規件数", latestDigest ? `${latestDigest.latestRun.newEventsCount}件` : "0件", "最新 collect 実行の検知件数")}
      </div>
    </section>

    <section class="section-block two-column">
      <div>
        <div class="section-heading"><h2>このサイトの見方</h2><span>公開方針</span></div>
        <div class="content-card">
          <p>まずは各日の「今日のハイライト」で重要な更新だけを把握し、必要ならテーマ別まとめと全件リストへ降りていく構成です。</p>
          <p>判断材料を残すため、Markdown と JSON の生データも毎日併設しています。自分で二次利用したいときや、要約の元ネタを確認したいときに使えます。</p>
        </div>
      </div>
      <aside class="side-panel">
        <div class="section-heading"><h2>最新ハイライト</h2><span>横断表示</span></div>
        <div class="mini-highlight-list">${latestHighlightsMarkup}</div>
      </aside>
    </section>

    <section class="section-block">
      <div class="section-heading"><h2>日次アーカイブ</h2><span>${digests.length}日分</span></div>
      <div class="digest-grid">${digestCards}</div>
    </section>
  `;

  return renderLayout({
    title: "vscode-copilot-digest",
    description:
      "GitHub Copilot と VS Code の更新を日次で公開する静的ダイジェスト",
    body,
    activePath: "/",
  });
}

function stylesCss() {
  return `:root {
  --bg: #f6efe4;
  --panel: rgba(255, 252, 246, 0.88);
  --panel-strong: #fffaf2;
  --line: rgba(38, 33, 28, 0.12);
  --text: #1f1a17;
  --muted: #65594f;
  --accent: #0f766e;
  --accent-2: #c2410c;
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
.page-shell {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px;
}
.site-header, .site-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.site-header {
  margin-bottom: 24px;
  padding: 16px 20px;
  background: rgba(255, 250, 242, 0.74);
  border: 1px solid var(--line);
  border-radius: 24px;
  backdrop-filter: blur(14px);
}
.site-brand, h1, h2, h3 {
  font-family: "Space Grotesk", "IBM Plex Sans JP", sans-serif;
}
.site-brand {
  text-decoration: none;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.site-nav {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.site-nav a, .data-links a {
  text-decoration: none;
  color: var(--muted);
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
h1 {
  margin: 0 0 16px;
  font-size: clamp(2.3rem, 4vw, 4.2rem);
  line-height: 1.04;
}
.hero-copy, .content-card p, .highlight-card p, .update-card p, .mini-highlight p {
  color: var(--muted);
  line-height: 1.75;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.metric-card, .content-card, .side-panel, .digest-card, .highlight-card, .update-card, .mini-highlight, .topic-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow);
}
.metric-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.metric-label, .metric-detail, .update-foot, .highlight-meta, .digest-card-head {
  color: var(--muted);
  font-size: 0.9rem;
}
.metric-value { font-size: 1.9rem; }
.section-block { margin-top: 28px; }
.notice-block {
  padding: 16px 20px;
  background: rgba(15, 118, 110, 0.08);
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 20px;
}
.notice-block p {
  margin: 0;
  color: var(--text);
  line-height: 1.7;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}
.section-heading h2 { margin: 0; font-size: 1.55rem; }
.highlight-grid, .digest-grid, .update-list {
  display: grid;
  gap: 16px;
}
.highlight-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.digest-grid { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.update-list { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.highlight-card, .digest-card, .update-card, .content-card, .side-panel, .topic-section, .mini-highlight {
  padding: 20px;
}
.highlight-card h3, .digest-card h3, .update-card h3, .mini-highlight h3 { margin: 10px 0; font-size: 1.08rem; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
  color: var(--accent);
  font-size: 0.82rem;
  font-weight: 700;
}
.why-it-matters {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}
.original-title {
  margin: 0;
  color: var(--muted);
  font-size: 0.86rem;
}
.two-column {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
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
.topic-list li a {
  flex: 1;
  text-decoration: none;
}
.data-links {
  display: flex;
  gap: 14px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.digest-card ul {
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--muted);
}
.digest-card-head, .highlight-meta, .update-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.mini-highlight-list {
  display: grid;
  gap: 14px;
}
.empty-state { color: var(--muted); }
.site-footer {
  margin-top: 32px;
  padding: 20px;
  justify-content: center;
  color: var(--muted);
}
@media (max-width: 900px) {
  .hero, .two-column { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .page-shell { padding: 16px; }
  .site-header { padding: 14px 16px; }
  .hero { padding: 24px; }
  .metrics-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) {
  .metrics-grid, .update-list, .highlight-grid, .digest-grid { grid-template-columns: 1fr; }
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
    fs.copyFile(
      eventSource,
      path.join(siteDir, "raw", "events", `${date}.json`),
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

async function main() {
  const logs = await readDailyLogs();
  const digests = logs.map((log) => buildDailyDigest(log));

  await fs.rm(siteDir, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(path.join(siteDir, "days"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "raw", "events"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "raw", "summaries"), { recursive: true }),
    fs.mkdir(path.join(siteDir, "assets"), { recursive: true }),
  ]);

  await fs.writeFile(
    path.join(siteDir, "assets", "styles.css"),
    stylesCss(),
    "utf8",
  );
  await fs.writeFile(path.join(siteDir, ".nojekyll"), "", "utf8");
  await fs.writeFile(
    path.join(siteDir, "index.html"),
    renderIndexPage(digests),
    "utf8",
  );

  for (const digest of digests) {
    await Promise.all([
      fs.writeFile(
        path.join(siteDir, "days", `${digest.date}.html`),
        renderDayPage(digest),
        "utf8",
      ),
      copyRawFiles(digest.date),
    ]);
  }

  console.log(
    `Built GitHub Pages site with ${digests.length} daily digest page(s).`,
  );
}

await main();
