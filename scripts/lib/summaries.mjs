// Japanese card wording written by the summary lane: data/summaries-ja.json maps an update id to
// { summary, why? }. A slide, when one exists, wins over these entries.
import { FORBIDDEN_PHRASES } from "./slides.mjs";

const hasJapanese = (text) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(text);

export function validateSummaries(map) {
  const errors = [];
  if (!map || typeof map !== "object" || Array.isArray(map)) return ["the file must be a JSON object keyed by update id"];
  for (const [id, entry] of Object.entries(map)) {
    const at = (message) => errors.push(`${id}: ${message}`);
    if (!/^[0-9a-f]{16}$/.test(id)) { at("the key must be a 16-character update id"); continue; }
    if (!entry || typeof entry !== "object") { at("the value must be an object"); continue; }
    const extra = Object.keys(entry).filter((key) => !["title", "summary", "why", "points"].includes(key));
    if (extra.length) at(`unknown field(s): ${extra.join(", ")}`);
    const { summary, why } = entry;
    if (typeof summary !== "string" || summary.length < 30 || summary.length > 280) at("summary must be 30-280 characters");
    else if (!hasJapanese(summary)) at("summary must be written in Japanese");
    if (why !== undefined && (typeof why !== "string" || why.length < 10 || why.length > 160 || !hasJapanese(why))) at("why must be 10-160 Japanese characters");
    const { points, title } = entry;
    if (title !== undefined && (typeof title !== "string" || title.length < 6 || title.length > 60 || !hasJapanese(title))) at("title must be 6-60 Japanese characters");
    if (points !== undefined) {
      if (!Array.isArray(points) || points.length < 1 || points.length > 4) at("points must be 1-4 items");
      else for (const p of points) if (typeof p !== "string" || p.length < 8 || p.length > 90 || !hasJapanese(p)) at("each point must be 8-90 Japanese characters");
    }
    for (const text of [title, summary, why, ...(Array.isArray(points) ? points : [])].filter((value) => typeof value === "string")) {
      if (/https?:\/\//.test(text)) at("do not put URLs in the text");
      if (/原文の抜粋|公開内容を追跡し|確認したい更新です/.test(text)) at("boilerplate wording is not allowed");
      for (const phrase of FORBIDDEN_PHRASES) if (text.includes(phrase)) at(`forbidden phrase "${phrase}"`);
    }
  }
  return errors;
}
