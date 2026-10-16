// Merges the pull requests the agentic workflows open (slides: / summaries: / maint:) once they are provably safe.
// It runs on the default branch, so the validation code is trusted; each PR is merged into a scratch branch and
// checked there. Needs GH_TOKEN and GITHUB_REPOSITORY. Prints `merged=true|false` to GITHUB_OUTPUT.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { checkMaintenanceChange } from "./lib/maintenance-guard.mjs";

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const base = process.env.BASE_BRANCH || "main";
const dryRun = process.env.DRY_RUN === "true";
const MAX_MERGES = 12;

const call = async (method, path, body) => {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(`${method} ${path}: ${response.status} ${text.slice(0, 200)}`), { status: response.status });
  return text ? JSON.parse(text) : null;
};
const list = async (path) => {
  const out = [];
  for (let page = 1; page <= 10; page += 1) {
    const rows = await call("GET", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
};
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
const git = (...args) => run("git", args);
const npm = (...args) => run(process.platform === "win32" ? "npm.cmd" : "npm", args, { maxBuffer: 64 * 1024 * 1024 });

export const LANES = {
  slides: {
    allowed: (files) => files.length === 1 && /^data\/slides\/[0-9a-f]{16}\.json$/.test(files[0].filename) && files[0].status !== "removed",
    checks: () => { npm("run", "validate:slides"); npm("run", "test:data"); },
  },
  summaries: {
    allowed: (files) => files.length === 1 && files[0].filename === "data/summaries-ja.json" && files[0].status !== "removed",
    checks: () => { npm("run", "validate:summaries"); npm("run", "build:pages"); npm("run", "test:pages"); },
  },
  maint: {
    allowed: (files) => files.length > 0 && files.length <= 40 && checkMaintenanceChange(files).length === 0,
    checks: () => { npm("run", "validate:slides"); npm("run", "validate:summaries"); npm("run", "test:data"); npm("run", "build:pages"); npm("run", "test:pages"); },
  },
};

const laneOf = (pr) => (pr.title.match(/^(slides|summaries|maint):/) ?? [])[1] ?? null;

async function reject(pr, reason) {
  console.log(`PR #${pr.number}: ${reason}`);
  if (dryRun) return;
  await call("POST", `/issues/${pr.number}/labels`, { labels: ["needs-human-review"] }).catch(() => {});
  await call("POST", `/issues/${pr.number}/comments`, { body: `Auto-merge stopped: ${reason}` }).catch(() => {});
}

async function main() {
  git("config", "user.name", "github-actions[bot]");
  git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
  const prs = (await list(`/pulls?state=open&base=${base}`)).filter((pr) => laneOf(pr) && pr.labels.some((l) => l.name === "automation"));
  let merged = 0;
  for (const pr of prs) {
    if (merged >= MAX_MERGES) break;
    const lane = LANES[laneOf(pr)];
    if (pr.draft) { console.log(`PR #${pr.number}: draft, skipped`); continue; }
    if (pr.labels.some((l) => l.name === "needs-human-review")) { console.log(`PR #${pr.number}: needs a person`); continue; }
    const files = await list(`/pulls/${pr.number}/files`);
    if (!lane.allowed(files)) { await reject(pr, `changes outside what the ${laneOf(pr)} lane may touch: ${files.map((f) => f.filename).slice(0, 8).join(", ")}`); continue; }
    try {
      git("fetch", "-q", "origin", base, `pull/${pr.number}/head`);
      const head = git("rev-parse", "FETCH_HEAD").trim();
      if (head !== pr.head.sha) { console.log(`PR #${pr.number}: head moved, will retry later`); continue; }
      git("checkout", "-q", "-B", "merge-check", `origin/${base}`);
      try {
        git("merge", "--no-edit", "-q", head);
      } catch {
        git("merge", "--abort");
        console.log(`PR #${pr.number}: conflicts with ${base}; leaving it for the maintenance run`);
        continue;
      }
      npm("ci");
      lane.checks();
    } catch (error) {
      const detail = String(error.stdout || error.stderr || error.message).split("\n").slice(-12).join("\n");
      await reject(pr, `checks failed on the merged result.\n\n\`\`\`\n${detail}\n\`\`\``);
      git("checkout", "-q", "--force", `origin/${base}`);
      continue;
    } finally {
      try { git("reset", "-q", "--hard"); git("clean", "-fdq", "-e", "node_modules", "-e", "site"); } catch { /* best effort */ }
    }
    if (dryRun) { console.log(`PR #${pr.number}: would merge`); continue; }
    try {
      await call("PUT", `/pulls/${pr.number}/merge`, { merge_method: "squash", sha: pr.head.sha });
      merged += 1;
      console.log(`Merged PR #${pr.number}`);
    } catch (error) {
      console.log(`PR #${pr.number}: merge failed (${error.message})`);
    }
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `merged=${merged > 0}\n`);
  console.log(`merged ${merged} PR(s)`);
}

if (process.argv[1]?.endsWith("merge-agent-prs.mjs")) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
