import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { resourceStats } from "../scripts/lib/resources.mjs";
import os from "node:os";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";

const ledger = JSON.parse(fs.readFileSync(path.join("data", "resources.json")));
const events = fs.readdirSync(path.join("data", "events")).filter((name) => name.endsWith(".json"))
  .flatMap((name) => JSON.parse(fs.readFileSync(path.join("data", "events", name))).events ?? []);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join("site", "assets", "resource-audit.json"))),
  resourceStats(events, ledger), "published full-history totals must match the operational audit");

const { version } = JSON.parse(fs.readFileSync(path.join("site", "assets", "search-version.json")));
assert.ok(fs.existsSync(path.join("site", `pagefind-${version}`, "pagefind.js")));
let cards = 0;
const archiveHeadings = new Map();
for (const locale of ["", "en"]) {
  const prefix = path.join("site", locale);
  const files = ["index.html", "highlights.html", ...fs.readdirSync(path.join(prefix, "days"))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name)).map((name) => path.join("days", name)),
    ...fs.readdirSync(path.join(prefix, "weeks")).filter((name) => name !== "index.html" && name.endsWith(".html"))
      .map((name) => path.join("weeks", name))];
  for (const file of files) {
    const html = fs.readFileSync(path.join(prefix, file), "utf8");
    const $ = cheerio.load(html);
    $(".resource-links").each((_, element) => {
      cards++;
      assert.ok($(element).find('a[target="_blank"]').length >= 1, `${file}: original source link missing`);
      assert.ok($(element).find("li").length <= 3);
      const archive = $(element).find("[data-archive-path]").attr("data-archive-path");
      if (archive) {
        assert.equal($(element).find("[data-archive-path]").text(),
          locale ? "View that day's digest" : "掲載日のまとめを見る",
          "archive actions must explain that they open the publication day's digest");
        const [target, id] = archive.split("#");
        if (!archiveHeadings.has(target)) {
          const destination = cheerio.load(fs.readFileSync(path.join("site", ...target.split("/")), "utf8"));
          const headings = new Map();
          destination("h3[id]").each((_, heading) => {
            const headingId = destination(heading).attr("id");
            assert.ok(!headings.has(headingId), `${target}: duplicate update anchor ${headingId}`);
            headings.set(headingId, destination(heading).text().replace(/\s+/g, " ").trim());
          });
          archiveHeadings.set(target, headings);
        }
        assert.ok(archiveHeadings.get(target).has(id), `${file}: missing archive target ${archive}`);
        if (file.startsWith(`days${path.sep}`)) {
          assert.equal(target, `${locale ? "en/" : ""}days/${path.basename(file)}`,
            "historical daily cards must link to their own occurrence, not a newer observation of the same source URL");
        }
        const expectedTitle = $(element).closest("article").find("h3").first().text().replace(/\s+/g, " ").trim();
        assert.equal(archiveHeadings.get(target).get(id), expectedTitle,
          `${file}: archive anchor must identify the displayed update, not just an existing heading`);
      }
    });
    if ($("article").filter((_, element) => $(element).find("h3").text().includes("What's New")).length) {
      assert.ok(html.includes(locale ? "not a standalone product-feature announcement" : "独立した製品機能の発表ではありません"));
    }
  }
  for (const file of ["index.html", "search.html"]) {
    const html = fs.readFileSync(path.join(prefix, file), "utf8");
    assert.ok(html.includes(`pagefind-${version}/pagefind.js`));
    assert.match(html, /resourcesHtml/);
    assert.match(html, /data-archive-path/);
  }
}
assert.ok(cards > 100, "verify full generated history, not only a few sample cards");
const anchoredDay = fs.readFileSync(path.join("site", "days", "2026-04-06.html"), "utf8");
const languageScript = anchoredDay.slice(anchoredDay.indexOf("var toggle=document.querySelector"),
  anchoredDay.indexOf("var shareFeedback=document.querySelector"));
for (const preference of ["ja", "en"]) {
  let click;
  let replaced;
  const location = { search: "?q=skills", hash: "#event-test", href: "",
    replace: (value) => { replaced = value; } };
  runInNewContext(languageScript, {
    document: { querySelector: () => ({
      getAttribute: () => "../en/days/2026-04-06.html",
      addEventListener: (_, handler) => { click = handler; },
    }) },
    localStorage: { getItem: () => preference, setItem: () => {} },
    window: { location },
  });
  if (preference === "en") assert.equal(replaced, "../en/days/2026-04-06.html?q=skills#event-test");
  click();
  assert.equal(location.href, "../en/days/2026-04-06.html?q=skills#event-test",
    "language switching must preserve the selected update anchor and search parameters");
}
const rendererSource = fs.readFileSync(path.join("scripts", "build-pages.mjs"), "utf8");
const versionCalculation = rendererSource.slice(
  rendererSource.indexOf('  const searchHash = createHash("sha256")'),
  rendererSource.indexOf("  for (const log of logs) log.events ="),
).replace("new URL(import.meta.url)", "rendererPath");
assert.ok(versionCalculation.includes("searchInputFiles"), "search input version calculation must be testable");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "digest-search-version-"));
try {
  const library = path.join(fixture, "scripts", "lib", "reporting.mjs");
  const summary = path.join(fixture, "summaries", "daily", "2026-04-01.md");
  fs.mkdirSync(path.dirname(library), { recursive: true });
  fs.mkdirSync(path.dirname(summary), { recursive: true });
  fs.writeFileSync(library, "initial translations\n");
  fs.writeFileSync(summary, "initial daily content\n");
  const calculate = () => runInNewContext(`(async () => { let searchVersion; ${versionCalculation} return searchVersion; })()`, {
    fs: fs.promises, path, createHash, logs: [], ledger: { entries: {} },
    workspaceRoot: fixture, summariesDir: path.dirname(summary),
    rendererPath: path.resolve("scripts", "build-pages.mjs"),
  });
  const initialVersion = await calculate();
  fs.writeFileSync(library, "updated translations\n");
  const translatedVersion = await calculate();
  assert.notEqual(translatedVersion, initialVersion, "translation-only updates must invalidate the search bundle");
  fs.writeFileSync(library, "updated translations\r\n");
  assert.equal(await calculate(), translatedVersion, "OS newline differences must not create inconsistent versions");
  fs.writeFileSync(summary, "updated daily content\n");
  assert.notEqual(await calculate(), translatedVersion, "daily text updates must invalidate the search bundle");
} finally {
  fs.rmSync(fixture, { recursive: true });
}
console.log(`Verified resource actions and archive targets in ${cards} generated cards.`);
