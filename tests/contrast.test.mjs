// Text on the coloured badges and chips must keep WCAG AA contrast (4.5:1) in both themes. The colours are read from the
// built stylesheet, so a later edit that lightens one of them fails here (run `npm run build:pages` first).
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync("site/assets/styles.css", "utf8");
const parse = (hex) => [0, 2, 4].map((i) => parseInt(hex.replace("#", "").slice(i, i + 2), 16));
const luminance = (rgb) => { const [r, g, b] = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const over = (rgb, alpha, page) => rgb.map((v, i) => v * alpha + page[i] * (1 - alpha));

const lightVars = css.match(/:root\s*\{[^}]*--source-github-text[^}]*\}/)?.[0] ?? "";
const darkVars = css.match(/html\[data-theme="dark"\]\s*\{\s*--source-github-text[^}]*\}/)?.[0] ?? "";
assert.ok(lightVars && darkVars, "the badge text colours must be defined for both themes");
const read = (block, name) => parse(block.match(new RegExp(`--source-${name}-text:\\s*(#[0-9a-fA-F]{6})`))[1]);
const brand = (name) => parse(css.match(new RegExp(`--source-${name}:\\s*(#[0-9a-fA-F]{6})`))[1]);

const failures = [];
for (const [theme, block, page] of [["light", lightVars, parse("#ffffff")], ["dark", darkVars, parse("#151b23")]]) {
  for (const name of ["github", "vscode", "platform", "other"]) {
    const background = over(brand(name), 0.14, page);
    const ratio = contrast(read(block, name), background);
    if (ratio < 4.5) failures.push(`${theme} ${name} badge text is ${ratio.toFixed(2)}:1`);
  }
}
assert.deepEqual(failures, [], `badge text contrast below WCAG AA: ${failures.join("; ")}`);

// The badge rules must use the text colours, not the brand colours.
assert.ok(/\.source-badge--github\s*\{[^}]*color:\s*var\(--source-github-text\)/.test(css), "the badge rules use the text colours");
console.log("contrast tests passed");
