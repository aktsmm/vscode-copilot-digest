// Validates data/summaries-ja.json (see scripts/lib/summaries.mjs).
import fs from "node:fs/promises";
import path from "node:path";
import { validateSummaries } from "./lib/summaries.mjs";

const file = path.join(process.cwd(), "data", "summaries-ja.json");
let map;
try {
  map = JSON.parse(await fs.readFile(file, "utf8"));
} catch (error) {
  console.error(`data/summaries-ja.json: ${error.message}`);
  process.exit(1);
}
const errors = validateSummaries(map);
for (const message of errors) console.error(message);
if (errors.length) process.exit(1);
console.log(`Validated ${Object.keys(map).length} written summary(ies).`);
