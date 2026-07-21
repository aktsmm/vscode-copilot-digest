import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const draftsDir = path.join(workspaceRoot, "drafts");
const draftPattern = /^(weekly|biweekly)-(\d{8})-(\d{8})\.md$/;

const reflectionSections = {
  weekly: {
    heading: "## 今週の所感",
    placeholder:
      "ここは手動で追記する前提です。今週すぐ触るべきもの、翌週まで様子見でよいもの、継続監視したい流れを書き足してください。",
  },
  biweekly: {
    heading: "## ひとこと",
    placeholder:
      "ここは手動で追記する前提です。今回の更新を通して見えたテーマ、すぐ触るべきもの、様子見でよいものを自分の言葉で追加してください。",
  },
};

function toDateKey(compactDate) {
  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
}

function reflectionIsCustomized(content, kind) {
  const section = reflectionSections[kind];
  const start = content.indexOf(section.heading);
  if (start < 0) {
    return false;
  }

  const bodyStart = start + section.heading.length;
  const nextHeading = content.indexOf("\n## ", bodyStart);
  const body = content
    .slice(bodyStart, nextHeading < 0 ? undefined : nextHeading)
    .trim();

  return body !== section.placeholder;
}

function runBuilder(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: workspaceRoot,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${script} exited with code ${code}`));
    });
  });
}

async function main() {
  const entries = await fs.readdir(draftsDir, { withFileTypes: true });
  const drafts = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name.match(draftPattern))
    .filter(Boolean)
    .sort((left, right) => left[0].localeCompare(right[0]));

  let rendered = 0;
  let skipped = 0;
  for (const match of drafts) {
    const [, kind, fromCompact, toCompact] = match;
    const fileName = match[0];
    const filePath = path.join(draftsDir, fileName);
    const content = await fs.readFile(filePath, "utf8");
    if (reflectionIsCustomized(content, kind)) {
      skipped += 1;
      console.log(
        `Skipped ${fileName}: reflection section has manual content.`,
      );
      continue;
    }

    await runBuilder(`scripts/build-${kind}.mjs`, [
      "--from",
      toDateKey(fromCompact),
      "--to",
      toDateKey(toCompact),
      "--output",
      `drafts/${fileName}`,
    ]);
    rendered += 1;
  }

  console.log(
    `Rendered ${rendered} draft file(s); skipped ${skipped} manual draft(s).`,
  );
}

await main();
