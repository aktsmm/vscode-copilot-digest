// Checks that the concrete facts of a slide (versions, identifiers, numbers) appear in the pages it cites.
// A model can write a plausible number that the article never said; this catches that before the slide is merged.
import { renderedTexts } from "./slides.mjs";

const normalize = (text) => String(text ?? "").normalize("NFKC").toLowerCase().replace(/[\u00a0\s,]+/g, " ");
const compact = (text) => normalize(text).replace(/\s+/g, "");

// Identifiers and versions: `chat.agent.sandbox.enabled`, `v1.141`, `GPT-6.1`, `claude-opus-5.5`, `25MB`.
const IDENTIFIER = /[A-Za-z][A-Za-z0-9_]*(?:[.\-/][A-Za-z0-9_]+)+|\b[A-Za-z]+\d+(?:\.\d+)*\b|\b\d+(?:\.\d+)+\b/g;
// Plain quantities: `25 件`, `20%`, `3 倍`, `100 万`.
const QUANTITY = /(?<![\d.])\d{2,}(?:[.,]\d+)?(?=\s*(?:%|件|倍|分|秒|時間|日|か月|ヶ月|個|人|回|行|万|億|GB|MB|KB|ms|x|×))/g;
// Dates written as M月D日: the day must appear in the source.
const MONTH_DAY = /(\d{1,2})月(\d{1,2})日/g;

const IGNORED = new Set(["github.com", "e.g", "i.e", "vs.code", "ci/cd", "pull/request", "read/write", "on/off", "and/or"]);
const isUrlLike = (token) => /^(https?:|www\.)/i.test(token) || /\.(com|io|dev|net|org|jp)$/i.test(token);

export function extractClaims(slide) {
  const text = renderedTexts(slide).concat((slide.qa ?? []).flatMap((x) => [x?.q, x?.a])).join("\n");
  const identifiers = new Set();
  const quantities = new Set();
  const days = new Set();
  for (const match of text.matchAll(IDENTIFIER)) {
    const token = match[0].replace(/[.\-/]+$/, "");
    if (token.length < 4 || IGNORED.has(token.toLowerCase()) || isUrlLike(token)) continue;
    identifiers.add(token);
  }
  for (const match of text.matchAll(QUANTITY)) quantities.add(match[0]);
  for (const match of text.matchAll(MONTH_DAY)) days.add(match[2]);
  return { identifiers: [...identifiers], quantities: [...quantities], days: [...days] };
}

export function checkClaims(claims, corpus) {
  const spaced = ` ${normalize(corpus)} `;
  const tight = compact(corpus);
  const has = (token) => tight.includes(compact(token));
  const problems = [];
  const missingIdentifiers = claims.identifiers.filter((token) => !has(token));
  // A version or identifier that is nowhere in the sources is the typical hallucination; one is enough to stop.
  for (const token of missingIdentifiers) problems.push(`"${token}" is not in the cited pages`);
  const missingQuantities = claims.quantities.filter((token) => !has(token.replace(/[^\d.,]/g, "").replace(/,/g, "")) && !has(token));
  if (missingQuantities.length >= 2) problems.push(`numbers not found in the cited pages: ${missingQuantities.join(", ")}`);
  const missingDays = claims.days.filter((day) => !new RegExp(`(?:^|[^\\d])0?${day}(?:st|nd|rd|th)?(?:[^\\d]|$)`).test(spaced));
  for (const day of missingDays) problems.push(`day "${day}" (M月${day}日) is not in the cited pages`);
  return problems;
}

export const citedUrls = (slide) => [...new Set([
  slide.references?.source?.url,
  ...(slide.references?.documents ?? []).map((d) => d.url),
  ...(slide.evidence ?? []),
].filter((url) => typeof url === "string" && /^https:/.test(url)))];
