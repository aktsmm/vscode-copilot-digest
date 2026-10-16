import assert from "node:assert/strict";
import fs from "node:fs";
import { checkClaims, citedUrls, extractClaims } from "../scripts/lib/slide-facts.mjs";

const base = JSON.parse(fs.readFileSync("examples/slides/ga.json", "utf8"));
const withItems = (items) => ({ ...base, panels: [{ id: "facts", heading: "事実", priority: "core", items }] });

const corpus = "VS Code 1.141 adds chat.agent.sandbox.enabled. Up to 25 alerts can be selected. The models are retired on November 16th, 2026. GPT-6.1 Sol is the replacement. 20% faster.";

// What is in the source passes.
const ok = extractClaims(withItems(["1.141 で chat.agent.sandbox.enabled を試せる", "最大 25 件を選べる", "11月16日に廃止、移行先は GPT-6.1 Sol", "20% 高速化"]));
assert.deepEqual(checkClaims(ok, corpus), []);

// A version or identifier the source never mentions stops the slide.
const fakeVersion = extractClaims(withItems(["1.199 で追加された"]));
assert.ok(checkClaims(fakeVersion, corpus).some((p) => p.includes("1.199")));
const fakeSetting = extractClaims(withItems(["chat.agent.sandbox.timeout を設定する"]));
assert.ok(checkClaims(fakeSetting, corpus).some((p) => p.includes("chat.agent.sandbox.timeout")));

// A wrong day is caught; two unknown numbers are caught, one is tolerated.
assert.ok(checkClaims(extractClaims(withItems(["12月5日に廃止"])), corpus).some((p) => p.includes("day")));
assert.ok(checkClaims(extractClaims(withItems(["最大 37 件", "50 倍速い"])), corpus).some((p) => p.includes("numbers")));
assert.deepEqual(checkClaims(extractClaims(withItems(["最大 37 件"])), corpus).filter((p) => p.includes("numbers")), []);

// Q&A answers are checked too.
const qa = [1, 2, 3].map((n) => ({ q: `質問${n}はどうなりますか`, a: n === 3 ? "version 8.8.8 が必要です。" : "記事に書かれています。" }));
assert.ok(extractClaims({ ...base, qa }).identifiers.includes("8.8.8"));

assert.ok(citedUrls(base).length >= 2 && citedUrls(base).every((u) => u.startsWith("https://")));
console.log("slide-facts tests passed");
