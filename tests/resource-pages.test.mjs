import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const { version } = JSON.parse(fs.readFileSync(path.join("site", "assets", "search-version.json")));
assert.ok(fs.existsSync(path.join("site", `pagefind-${version}`, "pagefind.js")));
let cards = 0;
for (const locale of ["", "en"]) {
  const prefix = path.join("site", locale);
  const files = ["index.html", "highlights.html", ...fs.readdirSync(path.join(prefix, "days"))
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.html$/.test(name)).map((name) => path.join("days", name))];
  for (const file of files) {
    const html = fs.readFileSync(path.join(prefix, file), "utf8");
    const $ = cheerio.load(html);
    $(".resource-links").each((_, element) => {
      cards++;
      assert.ok($(element).find('a[target="_blank"]').length >= 1, `${file}: original source link missing`);
      assert.ok($(element).find("li").length <= 3);
      const archive = $(element).find("[data-archive-path]").attr("data-archive-path");
      if (archive) {
        const [target, id] = archive.split("#");
        const targetHtml = fs.readFileSync(path.join("site", ...target.split("/")), "utf8");
        assert.ok(targetHtml.includes(`id="${id}"`), `${file}: missing archive target ${archive}`);
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
console.log(`Verified resource actions and archive targets in ${cards} generated cards.`);
