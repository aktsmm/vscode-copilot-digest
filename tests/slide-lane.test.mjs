import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { selectPending } from "../scripts/pending-slides.mjs";
import { jaCardTitleFor, cardPointsFor, editorialQuality, excerptToSentences, isGenericImportanceReason, importanceReason, localizedSummary, registerSlideSummaries, eventKey } from "../scripts/lib/reporting.mjs";
import { createHash } from "node:crypto";
import { findMissing, normalizeUrl, parseFeed } from "../scripts/coverage-report.mjs";

const workflows = path.join(process.cwd(), ".github", "workflows");
const read = (name) => fs.readFile(path.join(workflows, name), "utf8");

// Pending selection: newest first, skips existing slides, honors window and limit.
const item = (id, digestDate, score = 1) => ({ id, digestDate, importance: { score } });
const items = [item("a", "2026-10-10"), item("b", "2026-10-12"), item("c", "2025-01-01"), item("d", "2026-10-12", 5)];
const pending = selectPending(items, new Set(["a"]), { months: 3, limit: 5, today: new Date("2026-10-15") });
assert.deepEqual(pending.map((i) => i.id), ["d", "b"]);
assert.equal(selectPending(items, new Set(), { limit: 1, today: new Date("2026-10-15") }).length, 1);

// Page-change items are slide candidates only when they carry the added lines.
const snap = (id, changes) => ({ ...item(id, "2026-10-12"), sourceKind: "html_snapshot_change", ...(changes ? { changes } : {}) });
assert.deepEqual(selectPending([snap("s1", ["New agent setting"]), snap("s2")], new Set(), { today: new Date("2026-10-15") }).map((i) => i.id), ["s1"]);

// Date-only headings ("Oct.13 Release") carry no content, so they stay out of reader cards and slides.
const dated = (additions) => ({ kind: "html_snapshot_change", sourceId: "copilot-whats-new", title: "x", diffSummary: { additions, headings: additions } });
assert.equal(editorialQuality(dated(["Oct.13 Release", "Oct.13 Improvement"])), "audit-only");
assert.notEqual(editorialQuality(dated(["Downloads for 1.141.2", "Update 1.141.2: The update addresses these issues."])), "audit-only");

// Excerpts end on a sentence; boilerplate "why" lines are recognised so cards can leave them out.
assert.equal(excerptToSentences("First point. Second point is here. Third one cut off in the mid…", 40), "First point. Second point is here.");
assert.ok(excerptToSentences("x".repeat(30) + " " + "y".repeat(400)).endsWith("…"));
assert.ok(isGenericImportanceReason("「A」の公開内容を追跡し、Copilot / VS Code 周辺の運用・説明材料として影響を確認したい更新です。"));
assert.ok(!isGenericImportanceReason("管理者向けの新しい制御が追加され、組織の方針を一括で設定できます。"));

// The card shows a slide's concrete panel items, and drops a vague "…を確認できる" line when it has them.
registerSlideSummaries([{ id: "1111111111111111", title: { subtitleJa: "独自のAPIキーで外部プロバイダーを設定する" }, audience: { change: "CLIとアプリで、独自のAPIキーを使うモデルの追加・利用方法を確認できる" }, panels: [{ priority: "core", items: ["OpenAI互換とAzure OpenAIを環境変数で構成する。", "ツール呼び出しに対応したモデルが必要"] }, { priority: "detail", items: ["注意点は使わない"] }] }]);
const pointEvent = { kind: "feed_entry", title: "p", url: "https://example.test/p-none", summary: "x", categories: [] };
const pointId = createHash("sha256").update(eventKey(pointEvent)).digest("hex").slice(0, 16);
registerSlideSummaries([{ id: pointId, title: { subtitleJa: "独自のAPIキーで外部プロバイダーを設定する" }, audience: { change: "CLIとアプリで、独自のAPIキーを使うモデルの追加・利用方法を確認できる" }, panels: [{ priority: "core", items: ["OpenAI互換とAzure OpenAIを環境変数で構成する。", "ツール呼び出しに対応したモデルが必要"] }, { priority: "detail", items: ["注意点は使わない"] }] }]);
assert.deepEqual(cardPointsFor(pointEvent), ["OpenAI互換とAzure OpenAIを環境変数で構成する", "ツール呼び出しに対応したモデルが必要"]);
assert.equal(localizedSummary(pointEvent), "独自のAPIキーで外部プロバイダーを設定する。");
registerSlideSummaries([]);

// A slide's Japanese title replaces the English page title on the card.
const titledEvent = { kind: "html_snapshot_change", title: "GitHub Docs / Copilot how-tos changed", url: "https://example.test/h", summary: "x", categories: [], diffSummary: { additions: ["Adding LLM models"] } };
const titledId = createHash("sha256").update(eventKey(titledEvent)).digest("hex").slice(0, 16);
registerSlideSummaries([{ id: titledId, title: { ja: "Copilot CLIとアプリで外部モデルを使う方法", subtitleJa: "独自のAPIキーで外部プロバイダーを設定する" }, audience: {}, panels: [] }]);
assert.equal(jaCardTitleFor(titledEvent), "Copilot CLIとアプリで外部モデルを使う方法");
registerSlideSummaries([]);

// A written slide supplies the card wording in place of the excerpt and the generic reason.
const slideEvent = { kind: "feed_entry", title: "Local models", url: "https://example.test/local", summary: "Use local models from the CLI whenever you like to.", categories: [] };
const slideId = createHash("sha256").update(eventKey(slideEvent)).digest("hex").slice(0, 16);
assert.match(localizedSummary(slideEvent), /^（原文の抜粋）/);
registerSlideSummaries([{ id: slideId, title: { ja: "ローカルモデル" }, audience: { who: "CLI の利用者", change: "手元のモデルを選べる" }, action: { summary: "必要なら設定する" } }].map((s) => ({ ...s, title: { ...s.title, subtitleJa: "CLI でローカルモデルを使える" } })));
assert.equal(localizedSummary(slideEvent), "CLI でローカルモデルを使える。手元のモデルを選べる。");
assert.equal(importanceReason(slideEvent), "CLI の利用者向け。必要なら設定する。");
registerSlideSummaries([]);

// Coverage: a feed article that is not in the events is reported; trailing slashes do not matter.
const feedXml = `<rss><channel><item><title><![CDATA[Gemini 4]]></title><link>https://example.test/a/</link><pubDate>Tue, 13 Oct 2026 18:39:56 +0000</pubDate></item><item><title>Old</title><link>https://example.test/b</link><pubDate>Tue, 01 Jan 2019 00:00:00 +0000</pubDate></item></channel></rss>`;
const feedEntries = parseFeed(feedXml);
assert.deepEqual(feedEntries.map((e) => e.url), ["https://example.test/a", "https://example.test/b"]);
const window = { since: Date.parse("2026-10-01"), until: Date.parse("2026-10-15") };
assert.deepEqual(findMissing(feedEntries, new Set(), window).map((e) => e.title), ["Gemini 4"]);
assert.equal(findMissing(feedEntries, new Set([normalizeUrl("https://example.test/a/")]), window).length, 0);
const collectWorkflow = await read("collect-updates.yml");
assert.ok(collectWorkflow.includes("git pull --rebase origin main"), "collect retries a rejected push after a rebase");
assert.ok(collectWorkflow.includes("backfill-skipped.mjs --coverage") && collectWorkflow.includes("coverage-report.mjs --strict"), "collect restores and reports coverage gaps");

// An article already covered by a slide (written from a page-change item) is not authored twice.
const withUrl = (id, url) => ({ ...item(id, "2026-10-12"), resources: { source: { url } } });
// The same article arriving twice in one batch gets one slide (the earliest item).
const dup = [withUrl("early", "https://example.test/same"), { ...withUrl("late", "https://example.test/same/"), digestDate: "2026-10-13" }];
dup[0].digestDate = "2026-10-12";
assert.deepEqual(selectPending(dup, new Set(), { today: new Date("2026-10-15") }).map((i) => i.id), ["early"]);

assert.deepEqual(selectPending([withUrl("u1", "https://example.test/post/"), withUrl("u2", "https://example.test/other")], new Set(), { existingUrls: new Set(["https://example.test/post"]), today: new Date("2026-10-15") }).map((i) => i.id), ["u2"]);

// Sections of one page (different #fragments) are different updates, not duplicates of each other.
const sec = [withUrl("s1", "https://example.test/notes#a"), withUrl("s2", "https://example.test/notes#b")];
assert.deepEqual(selectPending(sec, new Set(), { today: new Date("2026-10-15") }).map((i) => i.id).sort(), ["s1", "s2"]);
// ...and its wording reaches the article card by source URL.
const urlEvent = { kind: "feed_entry", title: "Same article", url: "https://example.test/post/", summary: "An English excerpt that is long enough to count.", categories: [] };
registerSlideSummaries([{ id: "0000000000000000", title: { subtitleJa: "同じ記事の要点" }, audience: { change: "確認できる" }, references: { source: { url: "https://example.test/post" } } }]);
assert.equal(localizedSummary(urlEvent), "同じ記事の要点。確認できる。");
registerSlideSummaries([]);

// The slide lane is an agentic workflow (gh-aw): the source compiles to a lock file, the model is pinned,
// and one run writes one slide. The dispatcher starts the runs; a script merges the finished PRs.
const slideSource = await read("slide.md");
assert.ok(slideSource.includes("claude-sonnet-5.5") && slideSource.includes('title-prefix: "slides: "') && slideSource.includes("npm run validate:slides"));
assert.ok(slideSource.includes("Slide skip: ") && slideSource.includes("slide-skip"), "unreadable updates are recorded as skips");
for (const name of ["slide", "summarize", "maintain"]) {
  const source = await read(`${name}.md`);
  assert.ok(source.includes("claude-sonnet-5.5") && source.includes("create-pull-request"), `${name}.md pins the model and opens a PR`);
  assert.ok((await read(`${name}.lock.yml`)).includes("COPILOT_GITHUB_TOKEN"), `${name}.lock.yml is compiled`);
}
const dispatcher = await read("slide-dispatch.yml");
assert.ok(dispatcher.includes("slide.lock.yml") && dispatcher.includes("pending-slides.mjs") && dispatcher.includes("slide-skip") && dispatcher.includes("open PR"));
const merger = await read("auto-merge-agent-prs.yml");
assert.ok(merger.includes("scripts/merge-agent-prs.mjs") && merger.includes("deploy-pages.yml") && merger.includes("schedule"));

// The merger only accepts what each lane may change.
const { LANES } = await import("../scripts/merge-agent-prs.mjs");
const file = (filename, status = "added") => ({ filename, status });
assert.ok(LANES.slides.allowed([file("data/slides/0123456789abcdef.json")]));
assert.ok(!LANES.slides.allowed([file("data/slides/0123456789abcdef.json"), file("data/slides/fedcba9876543210.json")]), "one slide per PR");
assert.ok(!LANES.slides.allowed([file("scripts/a.mjs")]));
assert.ok(!LANES.slides.allowed([file("data/slides/0123456789abcdef.json", "removed")]), "no deletions");
assert.ok(LANES.summaries.allowed([file("data/summaries-ja.json", "modified")]));
assert.ok(!LANES.summaries.allowed([file("data/summaries-ja.json", "modified"), file("scripts/a.mjs")]));
assert.ok(LANES.maint.allowed([file("scripts/a.mjs", "modified")]));
assert.ok(!LANES.maint.allowed([file(".github/workflows/auto-merge-agent-prs.yml", "modified")]), "lane-control files wait for a person");
assert.ok(!LANES.maint.allowed([file(".github/workflows/slide.lock.yml", "modified")]), "compiled workflows are never hand-edited");


// The PDF secret is only available to the protected deploy workflow.
for (const name of await fs.readdir(workflows)) {
  if (name === "deploy-pages.yml") continue;
  assert.ok(!(await read(name)).includes("PDF_PASSWORD"), `${name} must not use PDF_PASSWORD`);
}
const deploy = await read("deploy-pages.yml");
assert.ok(!/pull_request/.test(deploy) && deploy.includes("PDF_PASSWORD"));
const watchdog = await read("watchdog.yml");
const heal = await read("heal-on-failure.yml");
assert.ok(heal.includes("maintain.lock.yml") && heal.includes("21600") && heal.includes("workflow_run"), "a failure starts maintenance at most every 6 hours");
assert.ok(watchdog.includes("agentic-workflows"), "the watchdog closes failure issues of workflows that recovered");
assert.ok((await read("collect-updates.yml")).includes("group: data-write") && merger.includes("group: data-write"), "collect and the merger share a write lock");
assert.ok((await import("node:fs")).readFileSync("scripts/merge-agent-prs.mjs", "utf8").includes("render-pdf.mjs"), "slides are render-checked before merge");
assert.ok((await import("node:fs")).readFileSync("scripts/merge-agent-prs.mjs", "utf8").includes("pptx-fit.test.mjs"), "slides are PowerPoint-fit-checked before merge");
assert.ok(slideSource.includes("examples/slides/"), "the slide agent reads real sample slides");
// Anticipated Q&A (speaker notes) is optional, 3-5 Japanese pairs, and goes into the PPTX notes.
const { validateSlide } = await import("../scripts/lib/slides.mjs");
const sampleSlide = JSON.parse(await fs.readFile("examples/slides/ga.json", "utf8"));
assert.deepEqual(validateSlide(sampleSlide), [], "the real sample slide is valid");
const qa = [1, 2, 3].map((n) => ({ q: `対象のプランはどれですか（${n}）`, a: "記事では Copilot Pro と Business が対象とされています。" }));
assert.deepEqual(validateSlide({ ...sampleSlide, qa }), []);
assert.ok(validateSlide({ ...sampleSlide, qa: qa.slice(0, 2) }).some((m) => m.includes("qa must be")), "fewer than 3 pairs is rejected");
assert.ok(validateSlide({ ...sampleSlide, qa: [...qa.slice(0, 2), { q: "english only question", a: "answer" }] }).some((m) => m.includes("qa must be")), "Japanese is required");
assert.ok(validateSlide({ ...sampleSlide, qa: [...qa.slice(0, 2), { ...qa[0] }] }).some((m) => m.includes("duplicate")), "duplicate questions are rejected");
assert.ok((await fs.readFile("scripts/lib/downloads.mjs", "utf8")).includes("【想定問答】"), "the PPTX notes carry the Q&A");
// Month names in English titles become natural Japanese, not "mid-11月".
const { localizedTitle } = await import("../scripts/lib/reporting.mjs");
const titleOf = (title) => localizedTitle({ title, kind: "feed_entry", url: "https://example.test/x", summary: "", categories: [] });
assert.ok(!/mid-11月/.test(titleOf("Upcoming deprecation of selected GitHub Copilot models in mid-November deprecated")), "no mid-11月");
assert.ok(titleOf("Models deprecated on November 16th, 2026").includes("11月16日"));
assert.ok(titleOf("Support ends in early October 2026 deprecated").includes("2026年10月上旬"));
assert.ok(watchdog.includes("slide.lock.yml") && watchdog.includes("deploy-pages.yml"));
const maintenance = await read("maintain.md");
assert.ok(maintenance.includes("workflow_dispatch") && maintenance.includes("0 19 * * 0"), "runs every week");
assert.ok(maintenance.includes("health-report.mjs") && maintenance.includes("protected-files: allowed"));
const skipped = selectPending([item("x", "2026-10-12"), item("y", "2026-10-12")], new Set(), { skip: ["x"], today: new Date("2026-10-15") });
assert.deepEqual(skipped.map((i) => i.id), ["y"]);
assert.ok(watchdog.includes("token-health") && watchdog.includes("github-authentication-token-expiration"), "the watchdog warns before the token expires");
console.log("slide-lane tests passed");
