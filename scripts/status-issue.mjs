// Renders .work/health.json (made by scripts/health-report.mjs) as the body of the "Pipeline status" issue.
import fs from "node:fs";

const h = JSON.parse(fs.readFileSync(".work/health.json", "utf8"));
const withQa = fs.readdirSync("data/slides").filter((n) => n.endsWith(".json")).filter((n) => JSON.parse(fs.readFileSync(`data/slides/${n}`, "utf8")).qa).length;
const summaries = Object.keys(JSON.parse(fs.readFileSync("data/summaries-ja.json", "utf8"))).length;
const mark = (ok) => (ok ? "OK" : "要確認");
const rows = [
  ["サイト（トップ / API / 英語版）", `${h.site.index} / ${h.site.apiLatest} / ${h.site.enIndex}`, mark(h.site.index === 200 && h.site.apiLatest === 200 && h.site.enIndex === 200)],
  ["最新の更新データ", h.newestEvent ?? "-", mark(!h.flags.some((f) => f.includes("newest event")))],
  ["直近の Pages デプロイ", h.lastDeploy ?? "-", mark(!h.flags.some((f) => f.includes("deploy")))],
  ["公開中のスライド（うち想定問答あり）", `${h.slidesPublished}（${withQa}）`, ""],
  ["書かれた要約", String(summaries), ""],
  ["スライド未作成", String(h.backlog.slidesWithoutSlide ?? "?"), ""],
  ["要約待ち", String(h.backlog.summariesPending ?? "?"), ""],
  ["開いている失敗 Issue（agentic workflow）", String(h.failureIssues.length), mark(h.failureIssues.length === 0)],
  ["needs-human-review", String(h.needsHuman.length), mark(h.needsHuman.length === 0)],
];
const table = ["| 項目 | 値 | 状態 |", "| --- | --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const flags = h.flags.length ? h.flags.map((f) => `- ${f}`).join("\n") : "- なし";
const failures = h.failures.slice(0, 8).map((f) => `- ${f.workflow}（${f.at}） ${f.url}`).join("\n") || "- なし";

fs.writeFileSync(".work/status.md", `<!-- pipeline-status -->
最終更新: ${h.generatedAt}（毎日自動更新。このコメントや Issue は閉じないでください）

${table}

## 検知した問題
${flags}

## 直近の失敗した run
${failures}
`);
console.log("status written");
