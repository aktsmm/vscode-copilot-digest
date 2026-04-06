import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

const workspaceRoot = process.cwd();

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    throw new Error("Frontmatter tags must be an array.");
  }

  return tags.map((tag) => {
    if (typeof tag === "string") {
      return { name: tag };
    }

    if (tag && typeof tag.name === "string") {
      return {
        name: tag.name,
        versions: Array.isArray(tag.versions) ? tag.versions : [],
      };
    }

    throw new Error(
      "Each tag must be a string or an object with a name property.",
    );
  });
}

async function findLatestDraft() {
  const draftsDir = path.join(workspaceRoot, "drafts");
  const entries = await fs.readdir(draftsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.join(draftsDir, entry.name));

  if (files.length === 0) {
    throw new Error("No draft Markdown file was found in drafts/.");
  }

  const stats = await Promise.all(
    files.map(async (filePath) => ({
      filePath,
      stat: await fs.stat(filePath),
    })),
  );
  stats.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
  return stats[0].filePath;
}

async function main() {
  const token = process.env.QIITA_ACCESS_TOKEN;
  if (!token) {
    throw new Error("QIITA_ACCESS_TOKEN is not set.");
  }

  const targetFile = process.argv[2]
    ? path.resolve(workspaceRoot, process.argv[2])
    : await findLatestDraft();

  const raw = await fs.readFile(targetFile, "utf8");
  const parsed = matter(raw);

  if (!parsed.data.title) {
    throw new Error("Frontmatter title is required.");
  }

  const payload = {
    title: parsed.data.title,
    body: parsed.content.trim(),
    tags: normalizeTags(parsed.data.tags ?? []),
    private: Boolean(parsed.data.private),
    tweet: Boolean(parsed.data.tweet),
  };

  const existingItemId = parsed.data.qiitaItemId;
  const url = existingItemId
    ? `https://qiita.com/api/v2/items/${existingItemId}`
    : "https://qiita.com/api/v2/items";

  const response = await fetch(url, {
    method: existingItemId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-actions-update-monitor/0.1",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Qiita API failed: ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  const item = await response.json();
  const nextFrontmatter = {
    ...parsed.data,
    qiitaItemId: item.id,
    qiitaUrl: item.url,
    publishedAt: item.created_at ?? new Date().toISOString(),
  };

  const updatedFile = matter.stringify(parsed.content, nextFrontmatter);
  await fs.writeFile(targetFile, updatedFile, "utf8");

  console.log(JSON.stringify({ id: item.id, url: item.url }, null, 2));
}

await main();
