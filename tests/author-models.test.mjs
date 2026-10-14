import assert from "node:assert/strict";
import fs from "node:fs/promises";

// In-process stand-ins for the article page and the GitHub Models endpoint (no network).
const sample = JSON.parse(await fs.readFile("examples/slide-deck.sample.json", "utf8"));
const good = sample.slides[1];
const articleUrl = good.references.source.url;
const article = `<html><head><title>${good.references.source.title}</title></head><body><nav>menu</nav><article>${"<p>GitHub Copilot CLI makes it easier to choose a local model. Use /model to discover supported models from a running Ollama instance.</p>".repeat(8)}</article></body></html>`;
let calls = 0;
let mode = "ok";
globalThis.fetch = async (url, init) => {
  if (String(url) === articleUrl) return new Response(article, { status: 200, headers: { "content-type": "text/html" } });
  if (String(url) === "https://models.test/inference") {
    if (mode === "denied") return new Response("no access", { status: 403 });
    const request = JSON.parse(init.body);
    assert.ok(request.messages[0].content.includes("slide/v2"), "the prompt carries the schema");
    assert.equal(init.headers.authorization, "Bearer token");
    calls += 1;
    // First reply is broken, the second is fine: the retry path must recover.
    const content = calls === 1 ? "not json" : JSON.stringify({ ...good, id: "ffffffffffffffff", date: "2000-01-01", topic: "VS Code" });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("", { status: 404 });
};
process.env.MODELS_ENDPOINT = "https://models.test/inference";
const { authorOne, pageText, pageTitle, finalize } = await import("../scripts/author-slides-models.mjs");

assert.ok(!pageText(article, 5000).includes("menu"), "navigation is stripped");
assert.equal(pageTitle(article), good.references.source.title);
const item = { id: good.id, digestDate: good.date, topic: good.topic, source: articleUrl, documents: [] };
const ctx = { schemaDoc: "schema", example: good };
const slide = await authorOne(item, ctx, "token");
assert.equal(calls, 2, "retried after the invalid reply");
// The pipeline's own facts win over whatever the model returned.
assert.equal(slide.id, good.id);
assert.equal(slide.date, good.date);
assert.equal(slide.topic, good.topic);
assert.equal(slide.references.source.url, articleUrl);
assert.equal(finalize({ references: {} }, item, "Title of the page").references.source.title, "Title of the page");

// A rejected token surfaces with its status so the workflow can fail loudly.
mode = "denied";
await assert.rejects(authorOne(item, ctx, "token"), (error) => error.status === 403);
console.log("author-models tests passed");
