// Security guard for the plain workflows (the gh-aw lock files are generated and checked by workflow-lock.test.mjs):
//  - untrusted values (event payload fields, workflow inputs, head refs) must reach scripts through `env:`, never be
//    written into a `run:` script as ${{ ... }} (expression injection);
//  - only first-party actions (actions/*, github/*) are used, so no third-party code runs with the repository token.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const dir = ".github/workflows";
const UNTRUSTED = /\$\{\{[^}]*\b(?:github\.event\.|github\.head_ref|inputs\.|github\.event_name\s*==\s*'workflow_dispatch'\s*&&\s*inputs)[^}]*\}\}/;
const problems = [];

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".yml") && !name.endsWith(".lock.yml"))) {
  const lines = fs.readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n").split("\n");
  let runIndent = -1;
  lines.forEach((line, index) => {
    const indent = line.length - line.trimStart().length;
    if (runIndent >= 0 && line.trim() !== "" && indent <= runIndent) runIndent = -1;
    const runStart = line.match(/^(\s*)(?:-\s+)?run:\s*(.*)$/);
    if (runStart) {
      runIndent = runStart[1].length + (line.trimStart().startsWith("- ") ? 2 : 0);
      if (UNTRUSTED.test(runStart[2])) problems.push(`${file}:${index + 1} puts an untrusted value into a run: line; pass it through env:`);
      return;
    }
    if (runIndent >= 0 && UNTRUSTED.test(line)) problems.push(`${file}:${index + 1} puts an untrusted value into a run: script; pass it through env:`);
    const uses = line.match(/^\s*(?:-\s+)?uses:\s*([^\s#]+)/);
    if (uses && !/^\.\//.test(uses[1]) && !/^(?:actions|github)\//.test(uses[1])) problems.push(`${file}:${index + 1} uses a third-party action (${uses[1]})`);
  });
}

assert.deepEqual(problems, [], problems.join("\n"));

// The guard must actually catch the patterns it exists for.
const sample = ["steps:", "  - run: |", "      echo \"${{ github.event.issue.title }}\"", "  - uses: someone/action@v1"].join("\n");
const found = [];
{
  let inRun = false;
  for (const line of sample.split("\n")) {
    if (/run:/.test(line)) { inRun = true; continue; }
    if (inRun && UNTRUSTED.test(line)) found.push("injection");
    if (/uses:\s*(?!actions\/|github\/)/.test(line)) found.push("third-party");
  }
}
assert.deepEqual(found, ["injection", "third-party"], "the guard patterns must detect both risks");

console.log("workflow-security tests passed");
