// Writes .work/health.json for the weekly maintenance agent: what failed, what is waiting, what backlog is left.
// Facts only; the agent decides what to do. Needs GH_TOKEN and GITHUB_REPOSITORY, and `build:pages` run first.
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
if (!repo || !token) throw new Error("GITHUB_REPOSITORY and GH_TOKEN are required");

const api = async (path) => {
  const out = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `https://api.github.com/repos/${repo}${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`;
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    const body = await response.json();
    const rows = Array.isArray(body) ? body : (body.workflow_runs ?? []);
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
};

const since = new Date(Date.now() - 14 * 86400000).toISOString();
const short = (value) => String(value ?? "").slice(0, 16);
const count = (script, args) => {
  try {
    return JSON.parse(execFileSync(process.execPath, [script, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })).length;
  } catch {
    return null;
  }
};

const runs = await api(`/actions/runs?status=failure&created=%3E%3D${since}`);
const open = await api("/pulls?state=open");
const closed = await api("/pulls?state=closed&sort=updated&direction=desc");
const issues = (await api("/issues?state=open")).filter((i) => !i.pull_request);

// Runs of workflows that no longer exist (removed lanes) are history, not a problem.
const failures = runs.filter((r) => fs.existsSync(String(r.path ?? ""))).slice(0, 40).map((r) => ({ workflow: r.name, branch: r.head_branch, at: short(r.created_at), url: r.html_url }));
const waiting = open.map((p) => ({ number: p.number, title: p.title, labels: p.labels.map((l) => l.name), updated: short(p.updated_at) }));
const closedUnmerged = closed
  .filter((p) => !p.merged_at && p.closed_at >= since && /^(slides|summaries|maint):/.test(p.title))
  .map((p) => ({ number: p.number, title: p.title, closed: short(p.closed_at) }));
const needsHuman = issues.filter((i) => i.labels.some((l) => l.name === "needs-human-review")).map((i) => ({ number: i.number, title: i.title }));
const slideSkips = (await api("/issues?state=all&labels=slide-skip")).map((i) => i.title);
const staleAutomationPrs = waiting.filter((p) => /^(slides|summaries|maint):/.test(p.title) && Date.now() - Date.parse(p.updated) > 3 * 86400000);

const backlog = {
  slidesWithoutSlide: count("scripts/pending-slides.mjs", ["--months", "3", "--limit", "1000", "--skip", slideSkips.map((t) => (t.match(/[0-9a-f]{16}/) || [])[0]).filter(Boolean).join(",")]),
  summariesPending: count("scripts/pending-summaries.mjs", ["--months", "3", "--limit", "1000"]),
};

const probe = async (url) => {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return response.status;
  } catch {
    return 0;
  }
};
const siteBase = `https://${repo.split("/")[0]}.github.io/${repo.split("/")[1]}`;
const site = { index: await probe(`${siteBase}/`), apiLatest: await probe(`${siteBase}/api/v1/latest.json`), enIndex: await probe(`${siteBase}/en/index.html`) };
const lastDeploy = (await api("/actions/workflows/deploy-pages.yml/runs?status=success")).at(0)?.updated_at ?? null;
const newestEvent = fs.readdirSync("data/events").filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().at(-1)?.slice(0, 10) ?? null;
const eventAgeDays = newestEvent ? Math.floor((Date.now() - Date.parse(newestEvent)) / 86400000) : null;
const failureIssues = issues.filter((i) => i.labels.some((l) => l.name === "agentic-workflows")).map((i) => ({ number: i.number, title: i.title, opened: short(i.created_at) }));
const slidesPublished = fs.readdirSync("data/slides").filter((n) => n.endsWith(".json")).length;

const flags = [];
for (const [name, status] of Object.entries(site)) if (status !== 200) flags.push(`the live site check "${name}" returned ${status}`);
if (!lastDeploy || Date.now() - Date.parse(lastDeploy) > 3 * 86400000) flags.push("no successful Pages deploy in the last 3 days");
if (eventAgeDays !== null && eventAgeDays > 2) flags.push(`the newest event file is ${eventAgeDays} days old (collection may be stuck)`);
if (failureIssues.length) flags.push(`${failureIssues.length} open agentic workflow failure issue(s)`);
if (failures.length) flags.push(`${failures.length} failed workflow run(s) in the last 14 days`);
if (closedUnmerged.length) flags.push(`${closedUnmerged.length} automation PR(s) were closed without merging`);
if (staleAutomationPrs.length) flags.push(`${staleAutomationPrs.length} automation PR(s) have been open for more than 3 days`);
if (needsHuman.length) flags.push(`${needsHuman.length} open issue(s) labelled needs-human-review`);

fs.mkdirSync(".work", { recursive: true });
fs.writeFileSync(".work/health.json", JSON.stringify({ generatedAt: new Date().toISOString(), flags, site, lastDeploy, newestEvent, slidesPublished, failureIssues, failures, closedUnmerged, waiting, staleAutomationPrs, needsHuman, slideSkips, backlog }, null, 2));
console.log(`health: ${flags.length} flag(s)`);
