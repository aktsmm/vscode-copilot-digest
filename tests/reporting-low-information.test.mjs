import fs from "node:fs";
import assert from "node:assert/strict";

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

const reportingSource = fs.readFileSync("scripts/lib/reporting.mjs", "utf8");
assertNoDuplicateObjectKeys(reportingSource, "exactSummaryMappings");
assertNoDuplicateObjectKeys(reportingSource, "exactImportanceMappings");

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
}

for (const file of [
  "data/events/2026-05-26.json",
  "data/events/2026-06-01.json",
]) {
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

function assertNoDuplicateObjectKeys(source, objectName) {
  const match = source.match(
    new RegExp(`const ${objectName} = \\{([\\s\\S]*?)\\n\\};`),
  );
  assert.ok(match, `${objectName} block must exist`);

  const keys = Array.from(
    match[1].matchAll(/^  "([^"]+)":/gm),
    (entry) => entry[1],
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
