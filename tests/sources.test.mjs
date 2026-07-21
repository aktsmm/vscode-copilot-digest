import fs from "node:fs";
import assert from "node:assert/strict";

import { normalizeSnapshotLine } from "../scripts/lib/snapshot-text.mjs";

const sources = JSON.parse(fs.readFileSync("config/sources.json", "utf8"));

assert.ok(Array.isArray(sources), "sources.json must be an array");
assert.ok(sources.length > 0, "sources.json must not be empty");

// A healthy committed html_snapshot has well over this many lines; the
// smallest legitimate one observed is ~12. A snapshot below this floor signals
// a "blind" source whose selectors stopped matching the live page.
const MIN_SNAPSHOT_LINES = 5;

const ids = new Set();
for (const source of sources) {
  assert.equal(typeof source.id, "string", "source.id must be a string");
  assert.ok(source.id.trim().length > 0, "source.id must not be blank");
  assert.ok(!ids.has(source.id), `duplicate source id: ${source.id}`);
  ids.add(source.id);

  assert.equal(
    typeof source.name,
    "string",
    `source.name must be a string (id=${source.id})`,
  );
  assert.ok(
    source.name.trim().length > 0,
    `source.name must not be blank (id=${source.id})`,
  );
  assert.equal(
    typeof source.kind,
    "string",
    `source.kind must be a string (id=${source.id})`,
  );

  if (source.kind === "html_snapshot") {
    assert.equal(
      typeof source.url,
      "string",
      `html_snapshot source must have a url (id=${source.id})`,
    );
    assert.match(
      source.url,
      /^https?:\/\//,
      `html_snapshot url must be absolute (id=${source.id})`,
    );
    assert.equal(
      typeof source.rootSelector,
      "string",
      `html_snapshot source must have rootSelector (id=${source.id})`,
    );
    assert.ok(
      source.rootSelector.trim().length > 0,
      `html_snapshot rootSelector must not be blank (id=${source.id})`,
    );
    assert.equal(
      typeof source.contentSelector,
      "string",
      `html_snapshot source must have contentSelector (id=${source.id})`,
    );
    assert.ok(
      source.contentSelector.trim().length > 0,
      `html_snapshot contentSelector must not be blank (id=${source.id})`,
    );
    if (source.stripOrdinalNavigation !== undefined) {
      assert.equal(
        typeof source.stripOrdinalNavigation,
        "boolean",
        `stripOrdinalNavigation must be boolean (id=${source.id})`,
      );
    }
    if (source.snapshotVersion !== undefined) {
      assert.ok(
        Number.isSafeInteger(source.snapshotVersion) &&
          source.snapshotVersion > 0,
        `snapshotVersion must be a positive integer (id=${source.id})`,
      );
    }

    // Guard against a "blind" source: if collect ever stores an empty or
    // near-empty snapshot (e.g. the page's DOM changed and rootSelector /
    // contentSelector no longer match), the source silently stops detecting
    // updates. Any committed snapshot must therefore carry real content.
    const snapshotFile = `data/snapshots/${source.id}.txt`;
    if (fs.existsSync(snapshotFile)) {
      const nonBlankLines = fs
        .readFileSync(snapshotFile, "utf8")
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);
      assert.ok(
        nonBlankLines.length >= MIN_SNAPSHOT_LINES,
        `snapshot for ${source.id} looks blind (only ${nonBlankLines.length} non-blank lines; expected >= ${MIN_SNAPSHOT_LINES})`,
      );
    }
  }
}

const docsSources = sources.filter((source) =>
  source.id.startsWith("docs-github-"),
);
for (const source of docsSources) {
  assert.equal(
    source.stripOrdinalNavigation,
    true,
    `${source.id} must normalize ordinal navigation labels`,
  );
  assert.equal(
    source.snapshotVersion,
    2,
    `${source.id} must reset its snapshot baseline for selector version 2`,
  );
  assert.match(
    source.contentSelector,
    /\[data-testid="table-of-contents"\] a/,
    `${source.id} must capture individual table-of-contents links rather than list containers`,
  );
  assert.doesNotMatch(
    source.contentSelector,
    /\bli\b/,
    `${source.id} must not capture nested list containers`,
  );
}

assert.equal(
  normalizeSnapshotLine("Build your first Copilot-powered app, 1 of 8", {
    stripOrdinalNavigation: true,
  }),
  "Build your first Copilot-powered app",
  "ordinal navigation suffixes must be removed before snapshot diffing",
);
assert.equal(
  normalizeSnapshotLine("Use Copilot agents", {
    stripOrdinalNavigation: true,
  }),
  "Use Copilot agents",
  "non-ordinal navigation labels must remain available for meaningful diffing",
);

console.log(
  `sources.test.mjs: OK (${sources.length} sources, ${ids.size} unique ids)`,
);
