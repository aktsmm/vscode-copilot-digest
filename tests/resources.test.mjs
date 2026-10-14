import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parseResourcePage, selectSource, documentCandidates, resourceKey,
  resourceStats, attachResources, httpUrl, isOfficialDocument,
} from "../scripts/lib/resources.mjs";
import { enrichEvent, createPageFetcher } from "../scripts/enrich-resources.mjs";

const releaseUrl = "https://code.visualstudio.com/updates/v1_109";
const docUrl = "https://code.visualstudio.com/docs/copilot/customization/agent-skills";
const html = `<main><nav><a href="/docs/unrelated/topic">Navigation</a></nav>
<h1>January 2026</h1><h2 id="_customization">Customization</h2>
<h3 id="_agent-skills">Agent skills</h3><p>Skills package instructions and resources for agents to use during tasks.</p>
<a href="${docUrl}">Agent skills documentation</a>
<h3 id="_other">Other feature</h3><p>Unrelated feature text.</p><a href="/docs/unrelated/topic">Other docs</a></main>`;
const page = parseResourcePage(html, releaseUrl);
const event = { eventId: "release:skills", url: releaseUrl, title: "Visual Studio Code 1.109: Agent skills", sectionTitle: "Agent skills", summary: "Skills packaging", kind: "vscode_release_note_section" };
const source = selectSource(event, page);
assert.equal(source.url, releaseUrl + "#_agent-skills");
assert.equal(source.links.length, 1);
assert.equal(documentCandidates(event, source)[0].url, docUrl);
assert.equal(selectSource({ ...event, sectionTitle: "Imaginary" }, page).status, "unconfirmed");
assert.equal(httpUrl("javascript:alert(1)"), null);
assert.equal(httpUrl("https://user:password@example.com"), null);
assert.equal(httpUrl(docUrl + "?utm_source=announcement"), docUrl);
assert.equal(isOfficialDocument("https://code.visualstudio.com/docs"), false);
assert.equal(isOfficialDocument("https://docs.github.com/en/copilot"), false);
assert.equal(resourceKey(event), resourceKey({ ...event, eventId: "another-source" }));
assert.notEqual(resourceKey(event), resourceKey({ ...event, summary: "Different content" }));
assert.equal(selectSource({
  url: "https://github.com/features/copilot/whats-new", sourceId: "copilot-whats-new",
  diffSummary: { additions: ["H3: Oct.13 Release"] },
}, page).status, "unconfirmed", "date headings must not become product features");
const observedArchive = parseResourcePage(`<main><h1>Changelog</h1><h3 id="change-123">Oct.13 Release</h3>
<a href="https://github.blog/changelog/2026-10-13-real-feature">An actual release</a><p>${"Actual release description. ".repeat(5)}</p></main>`, "https://github.blog/changelog/?label=copilot");
const observed = selectSource({ sourceId: "copilot-whats-new", url: "https://github.com/features/copilot/whats-new",
  diffSummary: { headings: ["Oct.13 Release"], additions: ["H3: Oct.13 Release"] } }, observedArchive);
assert.equal(observed.status, "article_pending");
assert.equal(observed.url, "https://github.blog/changelog/2026-10-13-real-feature");
assert.match(observed.reason, /not a standalone feature/);
assert.equal(documentCandidates({ title: "GPT model retired" }, {
  url: releaseUrl, status: "verified", links: [],
}, [{ title: "MCP servers for Copilot CLI", url: "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers" }]).length, 0);
assert.equal(documentCandidates({ title: "Copilot CLI second opinion", summary: "Use Rubber Duck for an independent review." }, {
  url: "https://github.blog/changelog/cli", status: "verified", links: [],
}, [{ title: "About the rubber duck agent", url: "https://docs.github.com/en/copilot/concepts/agents/copilot-cli/rubber-duck" }]).length, 1);
assert.equal(documentCandidates({ title: "Copilot CLI second opinion", summary: "Use Rubber Duck for an independent review." }, {
  url: "https://github.blog/changelog/cli", status: "verified", links: [],
}, [{ title: "Using Copilot CLI for an enterprise", url: "https://docs.github.com/en/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise" }]).length, 0);

const docPage = parseResourcePage(`<main><h1>Agent skills</h1><p>${"Skills documentation. ".repeat(10)}</p></main>`, docUrl);
const enriched = await enrichEvent(event, async (url) => url === releaseUrl ? page : docPage);
assert.equal(enriched.status, "verified");
assert.equal(enriched.documents.length, 1);
assert.equal(enriched.documents[0].title, "Agent skills");
assert.ok(enriched.documents[0].contentHash);
const failed = await enrichEvent(event, async () => { throw new Error("HTTP 429"); });
assert.equal(failed.status, "fetch_failed");
assert.match(failed.errors[0].message, /429/);
const ledger = { entries: { [resourceKey(event)]: enriched } };
assert.equal(attachResources(event, ledger).resources.status, "verified");
assert.deepEqual(resourceStats([event, event, { ...event, eventId: "pending", summary: "Other" }], ledger), {
  total: 2, occurrences: 3, withDocuments: 1, documents: 1, unconfirmed: 0, fetchFailed: 0, unresearched: 1,
});

const githubUrl = "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers";
const japaneseUrl = githubUrl.replace("/en/", "/ja/");
const githubSource = parseResourcePage(`<main><h1>CLI MCP servers</h1><p>${"MCP servers configuration. ".repeat(10)}</p><a href="${githubUrl}">MCP servers</a></main>`, "https://github.blog/changelog/cli-mcp");
const english = parseResourcePage(`<main><nav>日本語ナビゲーション</nav><h1>MCP servers</h1><p>${"English article body. ".repeat(20)}</p></main>`, japaneseUrl);
const localized = await enrichEvent({ title: "CLI MCP", url: githubSource.url }, async (url) =>
  url === githubSource.url ? githubSource : { ...english, url });
assert.equal(localized.documents[0].language, "en", "Japanese navigation is not a translated article");
assert.equal(localized.documents[0].url, githubUrl);
const translated = parseResourcePage(`<main><h1>MCPサーバー</h1><p>${"サーバーの設定方法を説明します。".repeat(20)}</p></main>`, japaneseUrl);
const translatedEntry = await enrichEvent({ title: "CLI MCP", url: githubSource.url }, async (url) =>
  url === githubSource.url ? githubSource : url === japaneseUrl ? translated : { ...english, url });
assert.equal(translatedEntry.documents[0].language, "ja");
assert.equal(translatedEntry.documents[0].url, japaneseUrl);

const cache = await fs.mkdtemp(path.join(os.tmpdir(), "digest-resources-"));
try {
  let requests = 0;
  const request = async () => {
    requests++;
    return new Response(html, { headers: { "content-type": "text/html" } });
  };
  await createPageFetcher({ cache, delay: 0, request })(releaseUrl);
  await createPageFetcher({ cache, delay: 0, request })(releaseUrl);
  assert.equal(requests, 1, "verified pages must survive process restarts");
  const redirect = createPageFetcher({ cache, delay: 0, request: async () =>
    new Response(null, { status: 302, headers: { location: "https://unapproved.example/private" } }) });
  await assert.rejects(redirect("https://github.blog/changelog/redirect"), /Unapproved redirect/);
} finally {
  await fs.rm(cache, { recursive: true });
}
console.log("Resource verification tests passed.");
