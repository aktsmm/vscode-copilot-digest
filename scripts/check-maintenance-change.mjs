// Usage: node check-maintenance-change.mjs <files.json>   (the pull request files API output)
import fs from "node:fs";
import { checkMaintenanceChange } from "./lib/maintenance-guard.mjs";

const files = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const errors = checkMaintenanceChange(files);
for (const message of errors) console.error(message);
if (errors.length) process.exit(1);
console.log(`Maintenance change is within bounds (${files.length} file(s)).`);
