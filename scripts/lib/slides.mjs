import { FORBIDDEN_AZURE_TOKENS } from "./theme.mjs";

export const SLIDE_SCHEMA = "vscode-copilot-digest/slide/v1";
export const SLIDE_STATUSES = ["ga", "preview", "retirement", "announcement", "update", "unknown"];
const TOPICS = ["GitHub Copilot", "VS Code", "GitHub Platform", "周辺ニュース"];
const isHttps = (v) => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v);
const hasJapanese = (v) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(String(v ?? ""));

export function validateSlide(slide) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!slide || typeof slide !== "object") return ["slide must be an object"];
  if (slide.schema !== SLIDE_SCHEMA) err(`schema must be ${SLIDE_SCHEMA}`);
  if (!/^[0-9a-f]{16}$/.test(slide.id ?? "")) err("id must be a 16-char hex update id");
  if (!slide.title?.ja || !hasJapanese(slide.title.ja)) err("title.ja must be Japanese text");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slide.date ?? "")) err("date must be YYYY-MM-DD");
  if (!TOPICS.includes(slide.topic)) err("topic is not a known topic");
  if (!SLIDE_STATUSES.includes(slide.status)) err("status is not allowed");
  if (!slide.summary || slide.summary.length > 220 || !hasJapanese(slide.summary)) err("summary must be Japanese, 1-220 chars");
  if (!Array.isArray(slide.points) || slide.points.length < 1 || slide.points.length > 5 || slide.points.some((p) => !p || p.length > 120)) err("points must be 1-5 items of up to 120 chars");
  if (!isHttps(slide.references?.source)) err("references.source must be an https URL");
  const docs = slide.references?.documents ?? [];
  if (!Array.isArray(docs) || docs.length > 3 || docs.some((d) => !isHttps(d.url) || !d.title)) err("references.documents must be up to 3 titled https URLs");
  if (!Array.isArray(slide.evidence) || slide.evidence.length < 1 || !slide.evidence.every(isHttps)) err("evidence must list at least one https URL");
  const text = JSON.stringify(slide);
  for (const token of FORBIDDEN_AZURE_TOKENS) if (text.includes(token)) err(`forbidden token: ${token}`);
  if (slide.status !== "unknown" && slide.status !== "update" && !slide.statusEvidence) err("a lifecycle status requires statusEvidence quoted from the source");
  return errors;
}

export function validateDeck(deck) {
  const errors = [];
  if (deck?.schema !== SLIDE_SCHEMA.replace("/slide/", "/deck/")) errors.push("deck schema mismatch");
  if (!Array.isArray(deck?.slides)) return [...errors, "slides must be an array"];
  const seen = new Set();
  deck.slides.forEach((slide, index) => {
    for (const message of validateSlide(slide)) errors.push(`slides[${index}]: ${message}`);
    if (seen.has(slide?.id)) errors.push(`slides[${index}]: duplicate id`);
    seen.add(slide?.id);
  });
  return errors;
}
