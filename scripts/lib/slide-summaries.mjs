import fs from "node:fs/promises";
import path from "node:path";
import { registerSlideSummaries } from "./reporting.mjs";

// Loads data/slides so cards, summaries and the API use the slide's Japanese wording when one exists.
export async function loadSlideSummaries(root = process.cwd()) {
  const dir = path.join(root, "data", "slides");
  const names = (await fs.readdir(dir).catch(() => [])).filter((n) => n.endsWith(".json"));
  const slides = [];
  for (const name of names) {
    try { slides.push(JSON.parse(await fs.readFile(path.join(dir, name), "utf8"))); } catch { /* an unreadable slide is reported by validate:slides */ }
  }
  registerSlideSummaries(slides);
  return slides.length;
}
