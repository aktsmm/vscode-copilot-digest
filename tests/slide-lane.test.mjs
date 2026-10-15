import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { selectPending } from "../scripts/pending-slides.mjs";
import { editorialQuality, excerptToSentences, isGenericImportanceReason, importanceReason, localizedSummary, registerSlideSummaries, eventKey } from "../scripts/lib/reporting.mjs";
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
// ...and its wording reaches the article card by source URL.
const urlEvent = { kind: "feed_entry", title: "Same article", url: "https://example.test/post/", summary: "An English excerpt that is long enough to count.", categories: [] };
registerSlideSummaries([{ id: "0000000000000000", title: { subtitleJa: "同じ記事の要点" }, audience: { change: "確認できる" }, references: { source: { url: "https://example.test/post" } } }]);
assert.equal(localizedSummary(urlEvent), "同じ記事の要点。確認できる。");
registerSlideSummaries([]);

// The slide lane stays narrow: only data/slides/{id}.json, no deletions.
for (const name of ["validate-slide-pr.yml", "auto-merge-slide-pr.yml"]) {
  assert.ok((await read(name)).includes("data/slides/") || (await read(name)).includes("data\\/slides\\/"), `${name} must pin data/slides`);
}
assert.ok((await read("validate-slide-pr.yml")).includes("may not delete"));
assert.ok((await read("auto-merge-slide-pr.yml")).includes("status === 'removed'"));

// Digest lanes must not process slide PRs.
assert.ok((await read("validate-generated-pr.yml")).includes("isSlidePr"));
assert.ok((await read("auto-merge-generated-pr.yml")).includes("slide-authoring-request"));
assert.ok((await read("request-copilot-review.yml")).includes("slide-authoring-request"));
// The duplicate-closing step must not treat slide or maintenance PRs as duplicate digest PRs.
assert.ok((await read("request-copilot-review.yml")).includes("if (inOtherLane(candidate)) return false;"));
// New events alone no longer open a digest request (they produced only unmerged PRs).
assert.ok(!(await read("author-digest-pr.yml")).includes("newEventsCount > 0 ||"));
assert.ok((await read("redeploy-pages-after-generated-pr-merge.yml")).includes("slide-authoring-request"));

// Copilot titles its PR itself, so the lane is detected by the issue marker and branch prefix too.
for (const name of ["validate-generated-pr.yml", "auto-merge-generated-pr.yml", "request-copilot-review.yml", "redeploy-pages-after-generated-pr-merge.yml", "validate-slide-pr.yml", "auto-merge-slide-pr.yml", "author-slide-pr.yml"]) {
  const text = await read(name);
  assert.ok(text.includes("slide-authoring-request") && text.includes("copilot/slide-"), `${name} must detect slide PRs by marker and branch`);
}

// The PDF secret is only available to the protected deploy workflow.
for (const name of await fs.readdir(workflows)) {
  if (name === "deploy-pages.yml") continue;
  assert.ok(!(await read(name)).includes("PDF_PASSWORD"), `${name} must not use PDF_PASSWORD`);
}
const deploy = await read("deploy-pages.yml");
assert.ok(!/pull_request/.test(deploy) && deploy.includes("PDF_PASSWORD"));
// The watchdog and the biweekly maintenance lane exist, stay in their lanes and pin no model.
const watchdog = await read("slide-watchdog.yml");
assert.ok(watchdog.includes("slide-skip") && watchdog.includes("author-slide-pr.yml") && watchdog.includes("deploy-pages.yml"));
const maintenance = await read("pipeline-maintenance.yml");
assert.ok(!maintenance.includes("isoWeek") && maintenance.includes("workflow_dispatch") && maintenance.includes("0 19 * * 0"), "runs every week");
assert.ok(maintenance.includes("COPILOT_AGENT_FIREWALL_ALLOW_LIST_ADDITIONS") && maintenance.includes("merge されずに閉じた"), "blocked work and firewall hosts are handled");
assert.ok(!/model\s*:/i.test(maintenance.replace(/#.*$/gm, "")), "no model is pinned (Auto)");
assert.ok(maintenance.includes("pipeline-maintenance-request"));
assert.ok((await read("auto-merge-maintenance-pr.yml")).includes("needs-human-review"), "lane-control files wait for a person");
for (const name of ["validate-generated-pr.yml", "auto-merge-generated-pr.yml", "request-copilot-review.yml", "redeploy-pages-after-generated-pr-merge.yml"]) {
  assert.ok((await read(name)).includes("pipeline-maintenance-request"), `${name} must skip maintenance PRs`);
}
const skipped = selectPending([item("x", "2026-10-12"), item("y", "2026-10-12")], new Set(), { skip: ["x"], today: new Date("2026-10-15") });
assert.deepEqual(skipped.map((i) => i.id), ["y"]);
assert.ok(watchdog.includes("token-health") && watchdog.includes("github-authentication-token-expiration"), "the watchdog warns before the token expires");
console.log("slide-lane tests passed");
