import fs from "node:fs";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  buildDailyDigest,
  editorialQuality,
  importanceReason,
  isHighlightEligible,
  isReaderEvent,
  localizedSummary,
  localizedTitle,
  lowInformationFallbackMarkers,
  originalTitle,
  rankEvent,
  selectEditorialHighlights,
  summarizeEventSet,
} from "../scripts/lib/reporting.mjs";
import { editorialOverrides } from "../scripts/lib/editorial-overrides.mjs";

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
assert.match(
  authorWorkflowSource,
  /buildDailyDigest, lowInformationFallbackMarkers/,
  "author-digest-pr workflow must use the shared reader-facing digest classifier",
);
assert.match(
  authorWorkflowSource,
  /digest\.freshReaderCount/,
  "author-digest-pr workflow must ignore audit-only new events",
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

const genericSnapshotMarkers = [
  "監視対象ページで差分を検知",
  "固定ページの追記や差し替えを拾うための更新です。",
];

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(
  packageJson.scripts["render:summaries"],
  "node scripts/collect.mjs --render-existing",
  "package must expose the offline summary renderer",
);
const collectSource = fs.readFileSync("scripts/collect.mjs", "utf8");
assert.match(
  collectSource,
  /if \(renderExistingSummariesOnly\) \{\s*await writeDailySummaries\(logs\);[\s\S]*?return;/,
  "offline summary renderer must return before source collection",
);

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

const utcBoundaryDigest = buildDailyDigest({
  date: "2026-07-20",
  events: [
    {
      title: "UTC boundary sample",
      sourceId: "github-changelog-copilot",
      sourceName: "GitHub Changelog / Copilot",
      summary: "A published GitHub Copilot update.",
      publishedAt: "2026-07-20T18:24:14.000Z",
      isFutureDated: false,
    },
  ],
});
assert.equal(
  utcBoundaryDigest.uniqueEventCount,
  1,
  "an event published late on the digest date in UTC must remain in that daily digest",
);

const ordinalNavigationSnapshot = {
  kind: "html_snapshot_change",
  sourceId: "docs-github-copilot-howtos",
  diffSummary: {
    additions: [
      "Copilot SDK, 8 of 20Build your first Copilot-powered app, 1 of 8Authentication, 2 of 8",
      "Build your first Copilot-powered app, 1 of 8",
      "Authentication, 2 of 8",
      "Features, 3 of 8",
    ],
  },
};
assert.equal(
  editorialQuality(ordinalNavigationSnapshot),
  "audit-only",
  "ordinal Docs navigation changes must be audit-only",
);
assert.equal(
  isReaderEvent(ordinalNavigationSnapshot),
  false,
  "ordinal Docs navigation changes must not be reader events",
);
assert.equal(
  isHighlightEligible(ordinalNavigationSnapshot),
  false,
  "ordinal Docs navigation changes must not be highlight candidates",
);

const docsBreadcrumbSnapshot = {
  kind: "html_snapshot_change",
  sourceId: "docs-github-cloud-agent",
  diffSummary: {
    additions: ["GitHub Copilot", "How-tos", "Use Copilot agents"],
  },
};
assert.equal(
  editorialQuality(docsBreadcrumbSnapshot),
  "audit-only",
  "Docs breadcrumb-only changes must be audit-only",
);
assert.equal(isReaderEvent(docsBreadcrumbSnapshot), false);

const substantiveSnapshot = {
  kind: "html_snapshot_change",
  sourceId: "vscode-updates",
  diffSummary: {
    additions: ["Update 1.128.1: The update addresses these security issues."],
  },
};
assert.equal(
  editorialQuality(substantiveSnapshot),
  "medium",
  "snapshot changes with a concrete addition must remain reader-visible",
);
assert.equal(isReaderEvent(substantiveSnapshot), true);
assert.equal(isHighlightEligible(substantiveSnapshot), false);
assert.equal(
  localizedSummary(substantiveSnapshot),
  "VS Code 1.128.1 のセキュリティ修正を含む更新案内が追加された。",
  "concrete snapshot additions must render as factual reader copy",
);
assert.doesNotMatch(
  localizedSummary(substantiveSnapshot),
  /監視対象ページで差分を検知/,
  "concrete snapshot additions must not use generic monitoring copy",
);

const insidersAnnouncement = {
  kind: "feed_entry",
  title: "Visual Studio Code 1.130 (Insiders)",
  summary:
    "Learn what's new in Visual Studio Code 1.130 (Insiders) Read the full article",
};
assert.equal(
  editorialQuality(insidersAnnouncement),
  "medium",
  "bare Insiders release announcements must stay out of weekly and Discord highlights",
);
assert.equal(isReaderEvent(insidersAnnouncement), true);
assert.equal(isHighlightEligible(insidersAnnouncement), false);

const verboseReleaseSnapshot = {
  kind: "html_snapshot_change",
  score: 18,
  diffSummary: {
    headings: ["A concrete release heading"],
    additions: [
      "A concrete release update with enough text to be reader-facing.",
      "Another concrete release update.",
      "A third concrete release update.",
    ],
  },
};
assert.equal(editorialQuality(verboseReleaseSnapshot), "high");
assert.equal(
  rankEvent(verboseReleaseSnapshot),
  3,
  "high-quality snapshots must not inherit an unbounded heading-count score",
);
assert.equal(
  rankEvent({ categories: ["Release"], score: 4 }),
  6,
  "substantive releases must outrank high-quality snapshots by default",
);

const qualityDigest = buildDailyDigest({
  date: "2026-07-21",
  latestRun: {
    newEventIds: ["audit", "release"],
  },
  events: [
    {
      ...ordinalNavigationSnapshot,
      eventId: "audit",
      title: "Docs navigation changed",
      sourceName: "GitHub Docs / Copilot how-tos",
      summary: "Detected navigation changes.",
      publishedAt: "2026-07-21T07:43:56.000Z",
      detectedAt: "2026-07-21T07:43:56.000Z",
      categories: ["snapshot"],
    },
    {
      eventId: "release",
      title: "Concrete release",
      sourceId: "github-changelog-copilot",
      sourceName: "GitHub Changelog / Copilot",
      summary: "A concrete GitHub Copilot release.",
      publishedAt: "2026-07-21T07:43:56.000Z",
      detectedAt: "2026-07-21T07:43:56.000Z",
      categories: ["Release", "copilot"],
    },
  ],
});
assert.equal(qualityDigest.uniqueEventCount, 2);
assert.equal(qualityDigest.readerEventCount, 1);
assert.equal(qualityDigest.auditEventCount, 1);
assert.equal(qualityDigest.freshReaderCount, 1);
assert.deepEqual(
  qualityDigest.highlights.map((event) => event.eventId),
  ["release"],
  "audit-only snapshots must not displace substantive daily highlights",
);

const clusteredHighlights = selectEditorialHighlights(
  [
    {
      eventId: "section-one",
      title: "Release section one",
      url: "https://example.test/release",
      publishedAt: "2026-07-21T00:00:00.000Z",
      categories: ["Release"],
    },
    {
      eventId: "section-two",
      title: "Release section two",
      url: "https://example.test/release",
      publishedAt: "2026-07-21T00:00:00.000Z",
      categories: ["Release"],
    },
    {
      eventId: "different-release",
      title: "Different release",
      url: "https://example.test/different-release",
      publishedAt: "2026-07-21T00:00:00.000Z",
      categories: ["Release"],
    },
  ],
  3,
);
assert.equal(
  clusteredHighlights.length,
  2,
  "highlights must collapse multiple sections from the same source URL",
);
assert.equal(
  clusteredHighlights.find(
    (event) => event.url === "https://example.test/release",
  )?.relatedEventCount,
  2,
  "clustered highlights must retain the related section count",
);

for (const event of unknownSamples) {
  assertLowInformationFallback(localizedSummary(event), event.title);
  assertNoLowInformationFallback(importanceReason(event), event.title);
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

for (const [title, override] of Object.entries(editorialOverrides)) {
  const event = { title, summary: "" };
  assert.match(
    override.jaTitle,
    /[ぁ-んァ-ヶ一-龠]/,
    `${title} must include a Japanese title`,
  );
  assert.match(
    override.jaSummary,
    /[ぁ-んァ-ヶ一-龠]/,
    `${title} must include a Japanese summary`,
  );
  assert.match(
    override.jaWhy,
    /[ぁ-んァ-ヶ一-龠]/,
    `${title} must include a Japanese importance reason`,
  );
  assert.equal(
    localizedTitle(event),
    override.jaTitle,
    `${title} must have a Japanese title`,
  );
  assert.equal(
    originalTitle(event),
    title,
    `${title} must retain its original English title`,
  );
  assert.equal(
    localizedTitle(event, "en"),
    title,
    `${title} must remain unchanged in English`,
  );
}

const billingOverrideSamples = [
  {
    title: "AI credit pools for cost centers in the billing UI",
    summary:
      "You can now manage a cost center's AI credit pool directly in the billing UI where you create and edit cost centers. Previously, you could only manage this through another route.",
    englishText: "You can now manage a cost center's AI credit pool",
  },
  {
    title: "Copilot users can now see AI credits used per billing cycle",
    summary:
      "Copilot Business and Copilot Enterprise users can now see how many AI credits they've used this billing cycle, even without an individual budget.",
    englishText: "Copilot Business and Copilot Enterprise users",
  },
];

for (const event of billingOverrideSamples) {
  const override = editorialOverrides[event.title];
  assert.equal(localizedSummary(event), override.jaSummary);
  assert.equal(importanceReason(event), override.jaWhy);
  assert.match(localizedSummary(event, "en"), new RegExp(event.englishText));
}
assert.equal(
  localizedTitle({
    title: "AI\u00a0credit pools for cost centers in the billing UI",
    summary: "",
  }),
  editorialOverrides["AI credit pools for cost centers in the billing UI"]
    .jaTitle,
  "editorial title lookup must normalize non-breaking spaces",
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
    summarizeEventSet(digest.readerEvents, "ja", {
      maxLength: 960,
      maxHighlights: 5,
    }),
    ...digest.readerEvents.flatMap((event) => [
      localizedSummary(event),
      importanceReason(event),
    ]),
  ].join("\n");

  assertNoLowInformationFallback(generatedText, file);
  assertNoEnglishSummaryFallback(generatedText, file);
  assertNoGenericSnapshotCopy(generatedText, file);
}

for (const file of fs
  .readdirSync("summaries/daily")
  .filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name))
  .map((name) => `summaries/daily/${name}`)) {
  const content = fs.readFileSync(file, "utf8");
  assertNoLowInformationFallback(content, file);
  assertNoGenericSnapshotCopy(content, file);
}

for (const file of fs
  .readdirSync("drafts")
  .filter((name) => /^(?:weekly|biweekly)-\d{8}-\d{8}\.md$/.test(name))
  .map((name) => `drafts/${name}`)) {
  const content = fs.readFileSync(file, "utf8");
  assertNoEnglishSummaryFallback(content, file);
  assertNoGenericSnapshotCopy(content, file);
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

function assertLowInformationFallback(text, context) {
  const hits = lowInformationFallbackMarkers.filter((marker) =>
    String(text).includes(marker),
  );
  assert.ok(
    hits.length > 0,
    `${context} must be detected as low-information until it receives an editorial mapping`,
  );
}

function assertNoEnglishSummaryFallback(text, context) {
  assert.doesNotMatch(
    String(text),
    /英語 summary では/,
    `${context} contains English-summary fallback copy`,
  );
}

function assertNoGenericSnapshotCopy(text, context) {
  const hits = genericSnapshotMarkers.filter((marker) =>
    String(text).includes(marker),
  );
  assert.deepEqual(
    hits,
    [],
    `${context} contains generic snapshot copy`,
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
