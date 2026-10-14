import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  RESOURCE_VERSION, PARSER_VERSION, resourceKey, parseResourcePage, selectSource,
  documentCandidates, resourceStats, httpUrl, isOfficialDocument,
} from "./lib/resources.mjs";

const ledgerFile = path.resolve("data", "resources.json");
const cacheDir = path.resolve(".cache", "resource-pages");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const allowedHosts = new Set(["github.blog", "github.com", "docs.github.com", "code.visualstudio.com", "learn.microsoft.com", "www.publickey1.jp"]);

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

export function createPageFetcher({ cache = cacheDir, delay = 200, request = fetch, retryFailed = false } = {}) {
  const pending = new Map();
  let nextRequest = 0;
  return function getPage(value, { notBefore } = {}) {
    const url = new URL(value);
    url.hash = "";
    const key = url.href;
    const requiredTime = notBefore == null ? 0 : Date.parse(notBefore);
    if (!Number.isFinite(requiredTime)) throw new Error(`Invalid source freshness boundary: ${notBefore}`);
    const freshEnough = (checkedAt) => !requiredTime || Date.parse(checkedAt) >= requiredTime;
    if (!httpUrl(key) || !allowedHosts.has(url.hostname)) {
      throw new Error(`Unsupported resource host: ${key}`);
    }
    if (pending.has(key)) {
      const previous = pending.get(key);
      const refresh = () => {
        if (pending.get(key) === previous) pending.delete(key);
        return getPage(value, { notBefore });
      };
      return previous.then(
        (page) => freshEnough(page.checkedAt) ? page : refresh(),
        (error) => {
          if (requiredTime && error.resourceCheckedAt && !freshEnough(error.resourceCheckedAt)) return refresh();
          throw error;
        },
      );
    }
    const result = (async () => {
      const file = path.join(cache, `${createHash("sha256").update(key).digest("hex")}.json`);
      const saved = await readJson(file, null);
      if (saved?.parserVersion === PARSER_VERSION && freshEnough(saved.checkedAt) && !(retryFailed && saved.error) &&
          Date.now() - Date.parse(saved.checkedAt) < (saved.error ? 3600000 : 7 * 86400000)) {
        if (saved.error) {
          const error = new Error(saved.error);
          error.resourceCheckedAt = saved.checkedAt;
          throw error;
        }
        saved.links = saved.links.map((link) => ({ ...link, url: httpUrl(link.url) }));
        saved.sections = saved.sections.map((section) => ({ ...section,
          links: section.links.map((link) => ({ ...link, url: httpUrl(link.url) })),
        }));
        saved.japaneseBody = (saved.text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).length >= 80 &&
          (saved.text.match(/[\u3040-\u30ff]/g) ?? []).length >= 20;
        return saved;
      }
      await fs.mkdir(cache, { recursive: true });
      let page;
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          await sleep(Math.max(0, nextRequest - Date.now()));
          nextRequest = Date.now() + delay;
          let response;
          let current = key;
          for (let redirects = 0; redirects <= 5; redirects++) {
            response = await request(current, {
              headers: { "User-Agent": "vscode-copilot-digest-resource-verifier/1.0" },
              signal: AbortSignal.timeout(25000), redirect: "manual",
            });
            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            const target = httpUrl(response.headers.get("location"), current);
            if (!target || !allowedHosts.has(new URL(target).hostname)) throw new Error(`Unapproved redirect from ${current}`);
            current = target;
          }
          if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
            const retry = response.headers.get("retry-after");
            const seconds = Number(retry);
            const retryDate = retry ? Date.parse(retry) : NaN;
            const wait = retry && !Number.isNaN(seconds) ? seconds * 1000 :
              !Number.isNaN(retryDate) ? Math.max(0, retryDate - Date.now()) : 2000 * (attempt + 1);
            nextRequest = Date.now() + Math.min(60000, Math.max(delay, wait));
            continue;
          }
          if (!response.ok) throw new Error(`GET ${key}: HTTP ${response.status}`);
          if (!/text\/html/i.test(response.headers.get("content-type") ?? "")) throw new Error(`Non-HTML resource: ${key}`);
          page = parseResourcePage(await response.text(), current);
          if (!page.title || page.text.length < 80) throw new Error(`Article body missing: ${key}`);
          break;
        }
        if (!page) throw new Error(`Retry budget exhausted: ${key}`);
        await fs.writeFile(file, JSON.stringify(page));
        return page;
      } catch (error) {
        error.resourceCheckedAt = new Date().toISOString();
        await fs.writeFile(file, JSON.stringify({ parserVersion: PARSER_VERSION, checkedAt: error.resourceCheckedAt, error: error.message }));
        throw error;
      }
    })();
    pending.set(key, result);
    return result;
  };
}

async function verifyDocument(candidate, getPage) {
  const original = await getPage(candidate.url);
  if (!isOfficialDocument(original.url)) throw new Error(`Document redirected to a landing page: ${original.url}`);
  let hash = new URL(candidate.url).hash;
  let fragmentVerification = hash ? "verified" : "none";
  if (hash && !original.ids.includes(decodeURIComponent(hash.slice(1)))) {
    fragmentVerification = `Original anchor no longer exists; verified document body used: ${hash}`;
    hash = "";
  }
  let chosen = original;
  let localization = "not_applicable";
  const url = new URL(original.url);
  if (url.hostname === "docs.github.com" || url.hostname === "learn.microsoft.com") {
    const localized = new URL(original.url);
    localized.pathname = url.hostname === "docs.github.com"
      ? localized.pathname.replace(/^\/en(?:-us)?\//, "/ja/")
      : localized.pathname.replace(/^\/(?:en-us\/)?/, "/ja-jp/");
    localization = "english_body";
    if (localized.href !== original.url) {
      try {
        const japanese = await getPage(localized.href);
        if (japanese.japaneseBody) {
          chosen = japanese;
          localization = "japanese_body_verified";
          if (hash && !japanese.ids.includes(decodeURIComponent(hash.slice(1)))) {
            fragmentVerification = `Localized anchor not found; verified Japanese document body used: ${hash}`;
            hash = "";
          }
        }
      } catch (error) {
        // A missing translation is distinct from an original-document fetch failure.
        localization = `translation_unavailable: ${error.message}`;
      }
    } else if (original.japaneseBody) localization = "japanese_body_verified";
  }
  return {
    url: chosen.url + hash, title: chosen.title, language: chosen.japaneseBody ? "ja" : "en",
    checkedAt: chosen.checkedAt, contentHash: chosen.contentHash,
    discoveryUrl: candidate.discoveryUrl, basis: candidate.basis, localization, fragmentVerification,
    kind: new URL(chosen.url).pathname.includes("/updates/") ? "release_notes" : "documentation",
    scope: "Current documentation; historical availability remains defined by the original announcement",
  };
}

export async function enrichEvent(event, getPage, catalog = []) {
  const checkedAt = new Date().toISOString();
  const errors = [];
  const documents = [];
  let source;
  try {
    let page = await getPage(event.url, { notBefore: event.detectedAt });
    if (event.sourceId === "copilot-whats-new") {
      const heading = event.diffSummary?.headings?.find((value) => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\./.test(value));
      if (heading && !page.sections.some((section) => section.title === heading)) {
        const month = String(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(heading.slice(0, 3)) + 1).padStart(2, "0");
        const detected = new Date(event.detectedAt ?? event.publishedAt);
        const year = detected.getUTCFullYear() - (Number(month) > detected.getUTCMonth() + 1 ? 1 : 0);
        const findMonth = (candidate) => candidate.links.find((link) =>
          new URL(link.url).pathname === `/changelog/${year}/${month}/` &&
          new URL(link.url).searchParams.get("label") === "copilot");
        let monthLink = findMonth(page);
        if (!monthLink) {
          const yearLink = page.links.find((link) => new URL(link.url).pathname === `/changelog/${year}/` &&
            new URL(link.url).searchParams.get("label") === "copilot");
          if (yearLink) monthLink = findMonth(await getPage(yearLink.url, { notBefore: event.detectedAt }));
        }
        if (monthLink) page = await getPage(monthLink.url, { notBefore: event.detectedAt });
      }
    }
    source = selectSource(event, page);
    if (source.status === "release_pending" || source.status === "article_pending") {
      const article = source.status === "article_pending";
      const release = await getPage(source.url, { notBefore: event.detectedAt });
      source = { ...selectSource({ ...event, sourceId: "resolved-original",
        kind: article ? "feed_entry" : event.kind, url: source.url }, release), reason: source.reason };
      page = release;
    }
    source = { ...source, checkedAt: page.checkedAt, contentHash: page.contentHash };
    const candidates = documentCandidates(event, source, catalog);
    for (const candidate of candidates) {
      try {
        const document = await verifyDocument(candidate, getPage);
        if (!documents.some((entry) => entry.url.split("#")[0] === document.url.split("#")[0]) &&
            document.url.split("#")[0] !== source.url.split("#")[0]) documents.push(document);
      } catch (error) {
        errors.push({ url: candidate.url, message: error.message });
      }
      if (documents.length === 3) break;
    }
  } catch (error) {
    errors.push({ url: event.url, message: error.message });
    source = { url: event.url, status: "fetch_failed", reason: error.message };
  }
  delete source.links;
  delete source.text;
  return {
    version: RESOURCE_VERSION, checkedAt, inputUrl: event.url,
    inputTitle: event.title,
    status: errors.length ? "fetch_failed" : documents.length ? "verified" : "unconfirmed",
    source, documents, errors,
    research: ["Original article explicit links", "Feature-matched official documentation indexes"],
  };
}

export async function main() {
  const files = (await fs.readdir(path.resolve("data", "events"))).filter((file) => file.endsWith(".json")).sort();
  const events = [];
  for (const file of files) events.push(...(await readJson(path.resolve("data", "events", file), {})).events ?? []);
  const ledger = await readJson(ledgerFile, { version: RESOURCE_VERSION, entries: {} });
  if (process.argv.includes("--audit")) {
    console.log(JSON.stringify({ range: [files[0], files.at(-1)], ...resourceStats(events, ledger) }, null, 2));
    return;
  }
  const getPage = createPageFetcher({ retryFailed: process.argv.includes("--retry-failed") });
  ledger.version = RESOURCE_VERSION;
  const catalog = [];
  const catalogErrors = [];
  for (const url of [
    "https://docs.github.com/en/copilot/how-tos",
    "https://docs.github.com/en/copilot/concepts",
    "https://docs.github.com/en/copilot/reference",
    "https://code.visualstudio.com/docs",
  ]) {
    try {
      const page = await getPage(url);
      catalog.push(...page.links.filter((link) => isOfficialDocument(link.url)).map((link) => ({ ...link, discoveryUrl: url })));
    } catch (error) {
      catalogErrors.push({ url, message: error.message });
      console.warn(`Documentation index failed: ${url}: ${error.message}`);
    }
  }
  // These candidates were discovered through the real GitHub / Learn MCP tools.
  const reviewed = await readJson(path.resolve("config", "resource-documents.json"), []);
  catalog.push(...reviewed);
  const maxArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = maxArg ? Number(maxArg.split("=")[1]) : Infinity;
  if (!(limit >= 0)) throw new Error("Invalid --limit");
  let processed = 0;
  let added = 0;
  for (const event of events) {
    const key = resourceKey(event);
    const previous = ledger.entries[key];
    const retry = previous?.status === "fetch_failed" &&
      (process.argv.includes("--retry-failed") || Date.now() - Date.parse(previous.checkedAt) > 3600000);
    const expired = previous && Date.now() - Date.parse(previous.checkedAt) > 30 * 86400000;
    if (previous?.version === RESOURCE_VERSION && !retry && !expired) continue;
    if (processed >= limit) break;
    const entry = await enrichEvent(event, getPage, catalog);
    if (catalogErrors.length && entry.status === "unconfirmed" && entry.source.status === "verified") {
      entry.status = "fetch_failed";
      entry.errors.push(...catalogErrors);
    }
    added += entry.documents.filter((doc) => !previous?.documents.some((old) => old.url === doc.url)).length;
    ledger.entries[key] = entry;
    processed++;
    // Checkpoint after every input; identical product/source/content shares evidence.
    await fs.writeFile(`${ledgerFile}.tmp`, JSON.stringify(ledger, null, 2) + "\n");
    await fs.rename(`${ledgerFile}.tmp`, ledgerFile);
    if (processed % 25 === 0) console.log(`Verified ${processed} inputs; ${added} new document links`);
  }
  console.log(JSON.stringify({ range: [files[0], files.at(-1)], processed, added, ...resourceStats(events, ledger) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
