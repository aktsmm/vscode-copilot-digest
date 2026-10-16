// Prints the ids of published v2 slides that have no speaker-note Q&A yet, newest first (one per line).
import fs from "node:fs";

const dir = "data/slides";
const rows = fs.readdirSync(dir)
  .filter((name) => name.endsWith(".json"))
  .map((name) => JSON.parse(fs.readFileSync(`${dir}/${name}`, "utf8")))
  .filter((slide) => slide.schema === "vscode-copilot-digest/slide/v2" && !slide.qa)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id));
console.log(rows.map((slide) => slide.id).join("\n"));
