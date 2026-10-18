// Body of the "About" page: what the site is, how it is made, and the live state of the data.
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const REPO = "https://github.com/aktsmm/vscode-copilot-digest";

const COPY = {
  ja: {
    eyebrow: "このサイトについて",
    title: "公式の更新を、毎日、日本語で。",
    lead: "GitHub Copilot と VS Code の公式更新を毎日集め、日本語の要点とスライドにまとめる非公式のダイジェストです。人手の更新作業なしで、GitHub Actions と AI エージェントが回しています。",
    statsTitle: "データの状態",
    statLabels: { tracked: "追跡中の更新", days: "公開した日数", slides: "スライド", qa: "想定問答つき", summaries: "日本語要約（スライドなし）", sources: "監視ソース" },
    statDetails: { tracked: "公開済みの更新（重複除去後）", days: "日次ページの数", slides: "1 更新 1 枚", qa: "PPTX のスピーカーノート用", summaries: "カードに表示", sources: "フィード・公式ページ・ドキュメント" },
    freshness: (date, checked) => `最新の更新日: ${date} ／ 最終確認: ${checked}`,
    coverage: (from, through, partial) => `収集期間: ${from} 〜 ${through}${partial > 0 ? `（収集が欠けた月が ${partial} か月あり、その月は件数が少ない場合があります）` : ""}`,
    sourcesTitle: "収集元",
    sourcesLead: "公式の情報を優先します。周辺ニュースは補助で、件数を絞っています。",
    howTitle: "つくり方",
    steps: [
      ["収集", "1 日 3 回、公式のフィード・リリースノート・ドキュメントを取得し、新着と変更だけを記録します。"],
      ["要約とスライド", "AI エージェント（GitHub Agentic Workflows）が、原文と公式資料を読んで日本語の要約と 1 更新 1 枚のスライドを書きます。"],
      ["事実の照合", "スライドに書いた識別子・数値・日付が、引用したページに実際にあるかをスクリプトで照合します。見つからなければ公開しません。"],
      ["検証と公開", "スキーマ・描画・テストに通ったものだけを自動でマージし、GitHub Pages に公開します。"],
      ["自己修復", "実行の失敗や停滞は自動で検知し、保守エージェントが原因を調べて直します。人の判断が要るものだけ Issue になります。"],
    ],
    noteTitle: "ご利用にあたって",
    notes: [
      "非公式のサイトです。GitHub・Microsoft とは関係ありません。",
      "要約は AI が書いています。仕様・提供時期・料金など判断に使う内容は、各カードの原文と公式資料で確認してください。",
      "公式の記載が更新された場合、反映まで時間がかかることがあります。",
    ],
    linksTitle: "リンク",
    links: [
      ["Repository", REPO],
      ["静的 JSON API（api/v1/index.json）", "api/v1/index.json"],
      ["パイプラインの状態（Issue）", `${REPO}/issues/532`],
    ],
    title_: "このサイトについて | GitHub Copilot Daily",
    description: "GitHub Copilot Daily の収集元、つくり方、データの状態、ご利用にあたっての注意",
  },
  en: {
    eyebrow: "About this site",
    title: "Official updates, every day, in Japanese.",
    lead: "An unofficial digest that collects the official GitHub Copilot and VS Code updates every day and turns them into Japanese summaries and one slide per update. GitHub Actions and AI agents run it with no manual editing.",
    statsTitle: "State of the data",
    statLabels: { tracked: "Tracked updates", days: "Published days", slides: "Slides", qa: "With speaker Q&A", summaries: "Japanese summaries (no slide)", sources: "Watched sources" },
    statDetails: { tracked: "Published updates, de-duplicated", days: "Daily pages", slides: "One per update", qa: "For the PPTX speaker notes", summaries: "Shown on the cards", sources: "Feeds, official pages and docs" },
    freshness: (date, checked) => `Latest update: ${date} / Last checked: ${checked}`,
    coverage: (from, through, partial) => `Covered: ${from} to ${through}${partial > 0 ? ` (${partial} month(s) had collection gaps and may list fewer updates)` : ""}`,
    sourcesTitle: "Sources",
    sourcesLead: "Official sources come first. Surrounding news is supplementary and capped.",
    howTitle: "How it is made",
    steps: [
      ["Collect", "Three times a day it fetches the official feeds, release notes and docs and records only what is new or changed."],
      ["Summarise and slide", "AI agents (GitHub Agentic Workflows) read the original and the official documents and write a Japanese summary and one slide per update."],
      ["Check the facts", "A script checks that every identifier, number and date on a slide appears in the pages it cites. Anything it cannot find is not published."],
      ["Validate and publish", "Only what passes the schema, rendering and tests is merged automatically and published on GitHub Pages."],
      ["Self-healing", "Failed or stalled runs are detected automatically and a maintenance agent diagnoses and fixes them. Only what needs a human becomes an issue."],
    ],
    noteTitle: "Before you rely on it",
    notes: [
      "This is an unofficial site and is not affiliated with GitHub or Microsoft.",
      "Summaries are written by AI. For specifications, availability and pricing, check the original and the official documents linked on each card.",
      "Changes to the official pages can take a while to appear here.",
    ],
    linksTitle: "Links",
    links: [
      ["Repository", REPO],
      ["Static JSON API (api/v1/index.json)", "api/v1/index.json"],
      ["Pipeline status (issue)", `${REPO}/issues/532`],
    ],
    title_: "About | GitHub Copilot Daily",
    description: "Sources, how GitHub Copilot Daily is made, the state of its data, and what to keep in mind",
  },
};

export function aboutCopy(locale) {
  const c = COPY[locale];
  return { title: c.title_, description: c.description };
}

export function renderAboutBody(locale, { stats, sources, latestDate, checkedAt, coverage, assetPrefix }) {
  const c = COPY[locale];
  const number = new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US");
  const tiles = ["tracked", "days", "slides", "qa", "summaries", "sources"].map((key) => `<article class="metric-card"><span class="metric-label">${esc(c.statLabels[key])}</span><strong class="metric-value">${esc(number.format(stats[key] ?? 0))}</strong><span class="metric-detail">${esc(c.statDetails[key])}</span></article>`).join("");
  const sourceItems = sources.map((name) => `<li>${esc(name)}</li>`).join("");
  const steps = c.steps.map(([head, body], index) => `<li><strong>${index + 1}. ${esc(head)}</strong><span>${esc(body)}</span></li>`).join("");
  const notes = c.notes.map((note) => `<li>${esc(note)}</li>`).join("");
  const links = c.links.map(([label, href]) => `<li><a href="${esc(/^https?:/.test(href) ? href : `${assetPrefix}${href}`)}">${esc(label)}</a></li>`).join("");
  return `
    <section class="hero hero-about">
      <div>
        <p class="eyebrow">${esc(c.eyebrow)}</p>
        <h1>${esc(c.title)}</h1>
        <p class="hero-copy">${esc(c.lead)}</p>
      </div>
    </section>
    <section class="section-block">
      <div class="section-heading"><h2>${esc(c.statsTitle)}</h2></div>
      <div class="metrics-grid about-stats">${tiles}</div>
      <p class="about-fresh">${esc(c.freshness(latestDate, checkedAt))}</p>
      ${coverage ? `<p class="about-fresh">${esc(c.coverage(coverage.coveredFrom, coverage.coveredThrough, (coverage.months ?? []).filter((m) => m.coverage !== "complete").length))}</p>` : ""}
    </section>
    <section class="section-block about-columns">
      <div class="content-card">
        <div class="section-heading"><h2>${esc(c.howTitle)}</h2></div>
        <ol class="about-steps">${steps}</ol>
      </div>
      <div class="content-card">
        <div class="section-heading"><h2>${esc(c.sourcesTitle)}</h2></div>
        <p>${esc(c.sourcesLead)}</p>
        <ul class="about-list">${sourceItems}</ul>
      </div>
    </section>
    <section class="section-block about-columns">
      <div class="content-card">
        <div class="section-heading"><h2>${esc(c.noteTitle)}</h2></div>
        <ul class="about-list">${notes}</ul>
      </div>
      <div class="content-card">
        <div class="section-heading"><h2>${esc(c.linksTitle)}</h2></div>
        <ul class="about-list">${links}</ul>
      </div>
    </section>`;
}

export const ABOUT_CSS = `
.about-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.about-fresh { color: var(--muted); font-size: 0.88rem; margin: 10px 2px 0; }
.about-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.about-steps, .about-list { margin: 0; padding-left: 1.2em; display: grid; gap: 10px; }
.about-steps { list-style: none; padding-left: 0; }
.about-steps li { display: grid; gap: 2px; }
.about-steps li span { color: var(--muted); font-size: 0.92rem; }
@media (max-width: 760px) { .about-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .about-columns { grid-template-columns: 1fr; } }
`;
