// Validates every data/slides/*.json against scripts/lib/slides.mjs.
import fs from "node:fs/promises";
import path from "node:path";
import { validateSlide } from "./lib/slides.mjs";

const dir = path.join(process.cwd(), "data", "slides");
const names = (await fs.readdir(dir).catch((e) => (e.code === "ENOENT" ? [] : Promise.reject(e)))).sort();
let failed = false;
for (const name of names) {
  if (!/^[0-9a-f]{16}\.json$/.test(name)) {
    console.error(`${name}: file name must be {id}.json`);
    failed = true;
    continue;
  }
  let slide;
  try {
    slide = JSON.parse(await fs.readFile(path.join(dir, name), "utf8"));
  } catch (error) {
    console.error(`${name}: ${error.message}`);
    failed = true;
    continue;
  }
  const errors = validateSlide(slide);
  if (slide?.id !== name.replace(/\.json$/, "")) errors.push("id does not match the file name");
  for (const message of errors) console.error(`${name}: ${message}`);
  failed ||= errors.length > 0;
}
if (failed) process.exit(1);
console.log(`Validated ${names.length} slide file(s).`);
