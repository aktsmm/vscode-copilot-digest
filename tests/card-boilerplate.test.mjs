// Guards the published cards against boilerplate: a sentence that repeats across many cards says
// nothing about any one update. Slide wording is exempt because one slide appears on many pages.
// Needs `npm run build:pages` first.
import assert from "node:assert/strict";
import fs from "node:fs";
import * as cheerio from "cheerio";

const normalize = (text) => text.replace(/\s+/g, " ").trim().replace(/「[^」]*」/g, "「…」").replace(/\d+/g, "N");

const slideTexts = new Set();
for (const file of fs.readdirSync("data/slides").filter((f) => f.endsWith(".json"))) {
  const slide = JSON.parse(fs.readFileSync(`data/slides/${file}`, "utf8"));
  for (const value of [slide.title?.subtitleJa, slide.audience?.change, slide.audience?.who, slide.action?.summary]) {
    if (value) slideTexts.add(normalize(value).replace(/。$/, ""));
  }
}
const fromSlide = (text) => [...slideTexts].some((s) => s.length > 8 && text.includes(s));

const counts = new Map();
const forbidden = [
  /公開内容を追跡し/,
  /監視入口として意味があります/,
  /なぜ重要か: 「[^」]*」が (?:GA として扱える|リリースされたため)/,
  /早期検証できるため、正式利用前に/,
  /版一覧ページに/,
];
for (const file of fs.readdirSync("site/days").filter((f) => f.endsWith(".html"))) {
  const $ = cheerio.load(fs.readFileSync(`site/days/${file}`, "utf8"));
  $("article.update-card, article.mini-highlight").each((_, article) => {
    const seen = new Set();
    $(article).find("p").each((__, p) => {
      const text = $(p).text().replace(/\s+/g, " ").trim();
      for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${file}: boilerplate on a card: ${text.slice(0, 80)}`);
      const key = normalize(text);
      if (key.length < 25 || seen.has(key) || fromSlide(key) || /^原題:/.test(key)) return;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });
}
const repeated = [...counts].filter(([, n]) => n > 15).sort((a, b) => b[1] - a[1]);
assert.equal(repeated.length, 0, `Sentences repeated across many cards: ${repeated.slice(0, 3).map(([t, n]) => `${n}x ${t.slice(0, 60)}`).join(" | ")}`);
console.log("card-boilerplate tests passed");
