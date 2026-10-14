import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { selectPending } from "../scripts/pending-slides.mjs";

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
assert.ok(maintenance.includes("isoWeek % 2") && maintenance.includes("workflow_dispatch"), "biweekly via ISO week parity");
assert.ok(!/model\s*:/i.test(maintenance.replace(/#.*$/gm, "")), "no model is pinned (Auto)");
assert.ok(maintenance.includes("pipeline-maintenance-request"));
assert.ok((await read("auto-merge-maintenance-pr.yml")).includes("needs-human-review"), "workflow and dependency changes wait for a person");
for (const name of ["validate-generated-pr.yml", "auto-merge-generated-pr.yml", "request-copilot-review.yml", "redeploy-pages-after-generated-pr-merge.yml"]) {
  assert.ok((await read(name)).includes("pipeline-maintenance-request"), `${name} must skip maintenance PRs`);
}
const skipped = selectPending([item("x", "2026-10-12"), item("y", "2026-10-12")], new Set(), { skip: ["x"], today: new Date("2026-10-15") });
assert.deepEqual(skipped.map((i) => i.id), ["y"]);
// The fallback needs no personal token and writes only data/slides.
const fallback = await read("author-slide-fallback.yml");
assert.ok(fallback.includes("models: read") && fallback.includes("github.token") && !fallback.includes("COPILOT_ASSIGN_TOKEN"), "fallback uses the built-in token only");
assert.ok(fallback.includes("Unexpected changes outside data/slides") && fallback.includes("validate:slides"));
assert.ok(watchdog.includes("token-health") && watchdog.includes("github-authentication-token-expiration"), "the watchdog warns before the token expires");
console.log("slide-lane tests passed");
