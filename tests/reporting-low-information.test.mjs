import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  buildDailyDigest,
  importanceReason,
  localizedSummary,
  lowInformationFallbackMarkers,
  summarizeEventSet,
} from "../scripts/lib/reporting.mjs";

assert.ok(
  Array.isArray(lowInformationFallbackMarkers),
  "lowInformationFallbackMarkers must be an array",
);
assert.ok(
  lowInformationFallbackMarkers.length > 0,
  "lowInformationFallbackMarkers must not be empty",
);
assert.equal(
  new Set(lowInformationFallbackMarkers).size,
  lowInformationFallbackMarkers.length,
  "lowInformationFallbackMarkers must not contain duplicates",
);
for (const marker of lowInformationFallbackMarkers) {
  assert.equal(typeof marker, "string", "fallback marker must be a string");
  assert.ok(marker.trim().length > 0, "fallback marker must not be blank");
}

const buildPagesSource = fs.readFileSync("scripts/build-pages.mjs", "utf8");
assert.match(
  buildPagesSource,
  /lowInformationFallbackMarkers/,
  "build-pages must use the reporting marker SSOT",
);
assert.doesNotMatch(
  buildPagesSource,
  /const\s+publishedFallbackPhrases\s*=\s*\[/,
  "build-pages must not define a separate fallback marker list",
);
assert.match(
  buildPagesSource,
  /pathName\.endsWith\("\/en\/"\)/,
  "build-pages must resolve Pagefind assets correctly for /en/ directory URLs",
);

const authorWorkflowSource = fs.readFileSync(
  ".github/workflows/author-digest-pr.yml",
  "utf8",
);
assert.match(
  authorWorkflowSource,
  /lowInformationFallbackMarkers/,
  "author-digest-pr workflow must use the reporting marker SSOT",
);
assert.doesNotMatch(
  authorWorkflowSource,
  /const\s+lowInformationSummaryMarkers\s*=\s*\[/,
  "author-digest-pr workflow must not define a separate fallback marker list",
);
assert.match(
  authorWorkflowSource,
  /低情報 fallback を解消する場合も `data\/\*\*` は変更せず/,
  "author-digest-pr workflow must tell Copilot to fix low-information fallback via reporting mappings",
);

const selfHealWorkflowSource = fs.readFileSync(
  ".github/workflows/self-heal-generated-pr.yml",
  "utf8",
);
assert.match(
  selfHealWorkflowSource,
  /Validate low-information fallback guard/,
  "self-heal workflow must have dedicated low-information fallback feedback",
);
assert.match(
  selfHealWorkflowSource,
  /`data\/\*\*` は生データなので変更しないでください/,
  "self-heal fallback feedback must keep data files read-only",
);

const reportingSource = fs.readFileSync("scripts/lib/reporting.mjs", "utf8");
assertNoDuplicateObjectKeys(reportingSource, "vscodeReleaseSummaries");
assertNoDuplicateObjectKeys(reportingSource, "exactSummaryMappings");
assertNoDuplicateObjectKeys(reportingSource, "exactImportanceMappings");

assertCliFails(
  [
    "scripts/build-weekly.mjs",
    "--days",
    "abc",
    "--output",
    "drafts/tmp-invalid-weekly.md",
  ],
  "--days",
);
assertCliFails(
  [
    "scripts/build-biweekly.mjs",
    "--days",
    "0",
    "--output",
    "drafts/tmp-invalid-biweekly.md",
  ],
  "--days",
);
assertCliFails(
  [
    "scripts/build-weekly.mjs",
    "--from",
    "2026-02-31",
    "--output",
    "drafts/tmp-invalid-weekly.md",
  ],
  "--from",
);
assertCliFails(
  ["scripts/build-biweekly.mjs", "--days", "14", "--output", "README.md"],
  "--output",
);
assertCliFails(
  [
    "scripts/build-weekly.mjs",
    "--from",
    "2026-06-10",
    "--to",
    "2026-06-04",
    "--output",
    "drafts/tmp-invalid-weekly.md",
  ],
  "--from",
);
assertCliFails(
  ["scripts/notify-discord.mjs", "--date", "2026-99-99", "--dry-run"],
  "--date",
);
assertCliFails(["scripts/publish-qiita.mjs", "README.md"], "drafts/");

const publishQiitaWorkflowSource = fs.readFileSync(
  ".github/workflows/publish-qiita.yml",
  "utf8",
);
assert.doesNotMatch(
  publishQiitaWorkflowSource,
  /node scripts\/publish-qiita\.mjs "\$\{\{ inputs\.file \}\}"/,
  "publish-qiita workflow must not pass inputs.file directly in shell commands",
);
assert.doesNotMatch(
  publishQiitaWorkflowSource,
  /git add "\$\{\{ inputs\.file \}\}"/,
  "publish-qiita workflow must not git-add inputs.file directly",
);

const unknownSamples = [
  {
    title: "Example Copilot billing control shipped",
    summary:
      "GitHub Copilot now shows usage controls for administrators. The post Example appeared first on The GitHub Blog.",
    categories: ["Release"],
  },
  {
    title: "Visual Studio Code 1.122: Example section",
    kind: "vscode_release_note_section",
    sectionTitle: "Example section",
    summary:
      "The model picker now displays detailed routing and token usage for administrators.",
    categories: ["release", "section"],
  },
  {
    title: "Example code review automation update",
    summary:
      "GitHub Copilot code review now groups suggestions by severity so reviewers can focus on high-priority issues first.",
    categories: ["Improvement"],
  },
];

for (const event of unknownSamples) {
  assertNoLowInformationFallback(localizedSummary(event), event.title);
  assertNoLowInformationFallback(importanceReason(event), event.title);
  assertNoEnglishSummaryFallback(localizedSummary(event), event.title);
}
assert.doesNotMatch(
  summarizeEventSet(unknownSamples, "ja", { maxHighlights: 3 }),
  /英語 summary では/,
  "aggregate Japanese summaries must not use English-summary fallback as highlights",
);

const mappedCodeReviewEvent = {
  title: "Copilot code review: AGENTS.md support and UI improvements",
  summary:
    "Copilot code review now supports repository-level AGENTS.md files, and it’s easier to request a review from Copilot on draft pull requests with the Request button.",
  categories: ["Improvement", "copilot"],
};
assert.doesNotMatch(
  localizedSummary(mappedCodeReviewEvent),
  /英語 summary では/,
  "mapped Copilot code review event must render as a real Japanese summary",
);
assert.doesNotMatch(
  importanceReason(mappedCodeReviewEvent),
  /英語 summary では/,
  "mapped Copilot code review event importance must render as Japanese copy",
);

const highExposureMappedEvents = [
  "Upcoming deprecation of Opus 4.6 (fast)",
  "Agent finder for GitHub Copilot now available",
  "GitHub Copilot app generally available",
  "Copilot-authored pull requests now included in author searches",
  "GitHub Agentic Workflows is now in public preview",
  "Enterprise-managed settings now support bypass permission controls",
  "Enterprise-managed settings now support strictKnownMarketplaces in VS Code and GitHub Copilot CLI",
  "MAI-Code-1-Flash for Copilot Business and Copilot Enterprise",
  "GitHub Desktop 3.6: Worktrees and deeper Copilot integration",
].map((title) => ({ title, summary: title, categories: ["copilot"] }));

for (const event of highExposureMappedEvents) {
  assertNoGenericJapaneseFallback(localizedSummary(event), event.title);
  assertNoGenericJapaneseFallback(importanceReason(event), event.title);
}

for (const file of fs
  .readdirSync("data/events")
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .map((name) => `data/events/${name}`)) {
  const eventLog = JSON.parse(fs.readFileSync(file, "utf8"));
  const digest = buildDailyDigest(eventLog);
  const generatedText = [
    summarizeEventSet(digest.uniqueEvents, "ja", {
      maxLength: 960,
      maxHighlights: 5,
    }),
    ...digest.uniqueEvents.flatMap((event) => [
      localizedSummary(event),
      importanceReason(event),
    ]),
  ].join("\n");

  assertNoLowInformationFallback(generatedText, file);
  assertNoEnglishSummaryFallback(generatedText, file);
}

for (const file of fs
  .readdirSync("summaries/daily")
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
  .map((name) => `summaries/daily/${name}`)) {
  assertNoLowInformationFallback(fs.readFileSync(file, "utf8"), file);
}

for (const file of fs
  .readdirSync("drafts")
  .filter((name) => /^(?:weekly|biweekly)-\d{8}-\d{8}\.md$/.test(name))
  .map((name) => `drafts/${name}`)) {
  const content = fs.readFileSync(file, "utf8");
  assertNoEnglishSummaryFallback(content, file);
  assert.doesNotMatch(
    content,
    /CLI 利用や自動化フローへの影響候補/,
    `${file} contains generic Copilot CLI fallback copy`,
  );
}

function assertNoLowInformationFallback(text, context) {
  const hits = lowInformationFallbackMarkers.filter((marker) =>
    String(text).includes(marker),
  );
  assert.deepEqual(
    hits,
    [],
    `${context} contains low-information fallback copy`,
  );
}

function assertNoEnglishSummaryFallback(text, context) {
  assert.doesNotMatch(
    String(text),
    /英語 summary では/,
    `${context} contains English-summary fallback copy`,
  );
}

function assertNoGenericJapaneseFallback(text, context) {
  assert.doesNotMatch(
    String(text),
    /追跡対象ソースの更新|利用状況、管理、開発フローへの影響候補|CLI 利用や自動化フローへの影響候補/,
    `${context} contains generic Japanese fallback copy`,
  );
}

function assertNoDuplicateObjectKeys(source, objectName) {
  const match = source.match(
    new RegExp(`const ${objectName} = \\{([\\s\\S]*?)\\n\\};`),
  );
  assert.ok(match, `${objectName} block must exist`);

  const keys = Array.from(
    match[1].matchAll(/^  (?:(?:"([^"]+)")|([0-9]+(?:\.[0-9]+)?)):/gm),
    (entry) => entry[1] ?? entry[2],
  );
  const duplicates = [
    ...new Set(keys.filter((key, index) => keys.indexOf(key) !== index)),
  ];
  assert.deepEqual(
    duplicates,
    [],
    `${objectName} must not contain duplicate keys`,
  );
}

function assertCliFails(args, expectedText) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `${args.join(" ")} must fail`);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${args.join(" ")} must mention ${expectedText}`,
  );
}
