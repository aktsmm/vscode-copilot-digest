import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { validateSummaries } from "../scripts/lib/summaries.mjs";
import { selectNeedingSummary } from "../scripts/pending-summaries.mjs";
import { registerWrittenSummaries, localizedSummary, importanceReason, registerSlideSummaries, eventKey } from "../scripts/lib/reporting.mjs";
import { createHash } from "node:crypto";

const workflows = path.join(process.cwd(), ".github", "workflows");
const read = (name) => fs.readFile(path.join(workflows, name), "utf8");

// The data file the lane writes is always valid.
assert.deepEqual(validateSummaries(JSON.parse(await fs.readFile("data/summaries-ja.json", "utf8"))), []);

// Validator: good entry passes; boilerplate, URLs, English and bad keys are rejected.
const good = { "0123456789abcdef": { summary: "Copilot CLI で、自前のモデルプロバイダーやローカルのモデルを接続できるようになった。", why: "CLI の利用者は、必要に応じてモデルを選び直せる。" } };
assert.deepEqual(validateSummaries(good), []);
assert.ok(validateSummaries({ bad: good["0123456789abcdef"] }).length > 0);
assert.ok(validateSummaries({ "0123456789abcdef": { summary: "（原文の抜粋）Copilot CLI で、自前のモデルプロバイダーやローカルのモデルを接続できるようになった。" } }).length > 0);
assert.ok(validateSummaries({ "0123456789abcdef": { summary: "This is an English sentence that is long enough to pass the length check only." } }).length > 0);
assert.ok(validateSummaries({ "0123456789abcdef": { summary: "詳細は https://example.com を参照。ローカルのモデルを接続できるようになった更新です。" } }).length > 0);
assert.ok(validateSummaries({ "0123456789abcdef": { ...good["0123456789abcdef"], extra: 1 } }).length > 0);

// Selection: items covered by a slide (id or source URL) or already written are skipped.
const item = (id, url, extra = {}) => ({ id, digestDate: "2026-10-12", importance: { score: 1 }, title: { original: id, en: id }, resources: { source: { url } }, ...extra });
const picked = selectNeedingSummary(
  [item("a", "https://x.test/a"), item("b", "https://x.test/b"), item("c", "https://x.test/c"), item("d", "https://x.test/d"), item("e", "https://x.test/e", { sourceKind: "html_snapshot_change" })],
  { slideIds: new Set(["a"]), slideUrls: new Set(["https://x.test/b"]), written: new Set(["c"]), today: new Date("2026-10-15") },
);
assert.deepEqual(picked.map((i) => i.id), ["d"]);

// A written summary replaces the excerpt on the card; a slide still wins.
const event = { kind: "feed_entry", title: "Written one", url: "https://x.test/w", summary: "An English excerpt that is long enough to count here.", categories: [] };
const id = createHash("sha256").update(eventKey(event)).digest("hex").slice(0, 16);
registerWrittenSummaries({ [id]: good["0123456789abcdef"] });
assert.equal(localizedSummary(event), good["0123456789abcdef"].summary);
assert.equal(importanceReason(event), good["0123456789abcdef"].why);
registerSlideSummaries([{ id, title: { subtitleJa: "スライドの要点" }, audience: { change: "確認できる" } }]);
assert.equal(localizedSummary(event), "スライドの要点。確認できる。");
registerSlideSummaries([]);
registerWrittenSummaries({});

// The lane is recognised even when Copilot picks its own branch name and title.
for (const name of ["validate-summary-pr.yml", "request-copilot-review.yml", "redeploy-pages-after-generated-pr-merge.yml"]) {
  assert.ok((await read(name)).includes("contains(github.event.pull_request.head.ref, 'summaries')"), `${name} must detect summary PRs by branch name`);
}
// Hosts the agent can open (allowlisted) are handed to it; AGENT_UNREACHABLE can exclude a host again if one gets blocked.
const unreachable = selectNeedingSummary([item("v", "https://code.visualstudio.com/updates/v1_142"), item("g", "https://github.blog/changelog/x")], { slideIds: new Set(), slideUrls: new Set(), written: new Set(), today: new Date("2026-10-15") });
assert.deepEqual(unreachable.map((i) => i.id).sort(), ["g", "v"]);
assert.ok((await read("author-slide-pr.yml")).includes("全体を止めないでください") && (await read("author-summary-pr.yml")).includes("全体を止めないでください"));

// The lane is narrow and never collides with the other lanes.
const validate = await read("validate-summary-pr.yml");
assert.ok(validate.includes("^data/summaries-ja\\.json$") && validate.includes("may not delete") && validate.includes("validate:summaries"));
const merge = await read("auto-merge-summary-pr.yml");
assert.ok(merge.includes("summaries-ja") && merge.includes("status === 'removed'") && merge.includes("copilot/summar"));
const author = await read("author-summary-pr.yml");
assert.ok(author.includes("summary-authoring-request") && author.includes("pending-summaries.mjs") && author.includes("COPILOT_ASSIGN_TOKEN"));
for (const name of ["validate-generated-pr.yml", "auto-merge-generated-pr.yml", "request-copilot-review.yml", "redeploy-pages-after-generated-pr-merge.yml"]) {
  assert.ok((await read(name)).includes("summary-authoring-request"), `${name} must skip summary PRs`);
}
console.log("summary-lane tests passed");
