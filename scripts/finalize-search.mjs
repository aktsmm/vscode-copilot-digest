import fs from "node:fs/promises";
import path from "node:path";

const { version } = JSON.parse(await fs.readFile(path.join("site", "assets", "search-version.json"), "utf8"));
if (!/^[a-f0-9]{16}$/.test(version)) throw new Error("Invalid search index version");
await fs.cp(path.join("site", "pagefind"), path.join("site", `pagefind-${version}`), { recursive: true });
console.log(`Published immutable Pagefind bundle: pagefind-${version}`);
