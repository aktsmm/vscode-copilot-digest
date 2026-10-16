// Safety rails for the weekly maintenance agent. It may fix scripts, tests, docs, config, workflows and
// dependencies on its own, but it may not touch the files that control the maintenance lane itself, the
// deployment that holds the PDF password, or the guard below. The validate workflow runs the copy of this file
// from the base branch, so a PR cannot weaken its own check.
export const CONTROL_FILES = [
  ".github/workflows/auto-merge-agent-prs.yml",
  ".github/workflows/watchdog.yml",
  ".github/workflows/deploy-pages.yml",
  "scripts/merge-agent-prs.mjs",
  "scripts/lib/maintenance-guard.mjs",
];

// The agentic workflow sources (*.md) and their compiled *.lock.yml are made by `gh aw compile`, never by hand.
export const ALLOWED = /^(scripts\/|tests\/|docs\/|config\/|data\/slides\/[0-9a-f]{16}\.json$|data\/summaries-ja\.json$|\.github\/workflows\/(?![^/]*\.lock\.yml$)[^/]+\.ya?ml$|\.github\/instructions\/|\.github\/copilot-instructions\.md$|package(-lock)?\.json$|README\.md$|AGENTS\.md$)/;

const KNOWN_SECRETS = /^(COPILOT_GITHUB_TOKEN|COPILOT_ASSIGN_TOKEN|GITHUB_TOKEN)$/;

// files: [{ filename, status, patch }] as returned by the pull request files API.
export function checkMaintenanceChange(files) {
  const errors = [];
  for (const file of files) {
    const name = file.filename;
    if (CONTROL_FILES.includes(name)) errors.push(`${name}: this file controls the maintenance lane and needs a person`);
    else if (!ALLOWED.test(name) || /(^|\/)\.env/.test(name)) errors.push(`${name}: outside the paths maintenance may change`);
    if (file.status === "removed" && name.startsWith(".github/workflows/")) errors.push(`${name}: maintenance may not delete a workflow`);
    const added = String(file.patch ?? "").split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++")).join("\n");
    if (name.startsWith(".github/workflows/")) {
      for (const match of added.matchAll(/secrets\.([A-Za-z0-9_]+)/g)) {
        if (!KNOWN_SECRETS.test(match[1])) errors.push(`${name}: references a new secret (${match[1]})`);
      }
      if (/write-all/.test(added)) errors.push(`${name}: write-all permissions are not allowed`);
      if (/pull_request_target/.test(added)) errors.push(`${name}: pull_request_target may not be added`);
      if (/(curl|wget)[^\n]*\|\s*(ba)?sh\b/.test(added)) errors.push(`${name}: piping a download into a shell is not allowed`);
    }
    if (name === "package.json" && /"(pre|post)?install"\s*:/.test(added)) errors.push("package.json: install scripts may not be added");
  }
  return errors;
}
