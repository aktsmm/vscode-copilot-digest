import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export const RESOURCE_VERSION = 6;
export const PARSER_VERSION = 2;
export const resourceKey = (event) =>
  createHash("sha256")
    .update(JSON.stringify([
      event.url, event.title, event.summary, event.sectionTitle,
      event.sectionHeading, event.diffSummary,
    ]))
    .digest("hex");

export function httpUrl(value, base) {
  try {
    const url = new URL(value, base);
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(?:fbclid|gclid)$/.test(key)) url.searchParams.delete(key);
    }
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const normalize = (value) =>
  String(value ?? "").replace(/\s+/g, " ").trim();
const sameDocument = (left, right) =>
  left.split("#")[0].replace(/\/$/, "") === right.split("#")[0].replace(/\/$/, "");

export function isOfficialDocument(value) {
  const url = new URL(value);
  if (url.hostname === "code.visualstudio.com") {
    return /^\/(?:docs\/[^/]+\/[^/]+|api\/extension-guides\/.+|updates\/v\d+_\d+)/.test(url.pathname);
  }
  if (url.hostname === "docs.github.com") {
    return /\/copilot\/(?:how-tos|concepts|reference|tutorials)\/.+/.test(url.pathname) ||
      /\/copilot\/get-started\/(?:cli-quickstart|sdk-quickstart|quickstart-copilot-app)$/.test(url.pathname);
  }
  return url.hostname === "learn.microsoft.com" &&
    /^\/(?:[a-z]{2}-[a-z]{2}\/)?(?:azure|microsoft-365)\/.+\/.+/.test(url.pathname);
}

export function parseResourcePage(html, url, checkedAt = new Date().toISOString()) {
  const $ = cheerio.load(html);
  const canonical = httpUrl($('link[rel="canonical"]').attr("href"), url);
  const root = $("main").first().length ? $("main").first() : $("body");
  root.find("nav, header, footer, aside, script, style, .sidebar, .post-card, .author-bio").remove();
  const content = root.find(".post__content, .entry-content, .markdown-body").first();
  const article = root.find("article").filter((_, element) => $(element).find("h1").length).first();
  const body = content.length ? content : article.length ? article : root;
  const title = normalize(root.find("h1").first().text() || $("title").text());
  const links = (node) => node.find("a[href]").toArray().map((element) => ({
    url: httpUrl($(element).attr("href"), url),
    title: normalize($(element).text()),
  })).filter((link) => link.url && link.title);
  const headings = body.find("h1,h2,h3,h4").toArray();
  const sections = headings.map((element, index) => {
    const heading = $(element);
    const level = Number(element.tagName.slice(1));
    const next = headings.slice(index + 1).find((node) => Number(node.tagName.slice(1)) <= level);
    const nodes = body.find("*").toArray();
    const start = nodes.indexOf(element);
    const end = next ? nodes.indexOf(next) : nodes.length;
    const selected = $(nodes.slice(start, end));
    const id = heading.attr("id") || heading.find("[id]").first().attr("id");
    return {
      title: normalize(heading.text()).replace(/^#\s*/, ""),
      id: id || null,
      text: normalize(selected.filter("p,li").text()).slice(0, 12000),
      links: selected.filter("a[href]").toArray().map((node) => ({
        url: httpUrl($(node).attr("href"), url), title: normalize($(node).text()),
      })).filter((link) => link.url && link.title),
    };
  });
  const prose = normalize(body.find("p,li").text());
  return {
    url, canonical, title, checkedAt, parserVersion: PARSER_VERSION,
    contentHash: createHash("sha256").update(prose).digest("hex"),
    text: prose.slice(0, 18000),
    japaneseBody: (prose.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) ?? []).length >= 80 &&
      (prose.match(/[\u3040-\u30ff]/g) ?? []).length >= 20,
    ids: body.find("[id]").toArray().map((element) => $(element).attr("id")),
    links: links(body), sections,
  };
}

export function selectSource(event, page) {
  if (event.sectionTitle) {
    const section = page.sections.find((entry) =>
      normalize(entry.title).toLowerCase() === normalize(event.sectionTitle).toLowerCase());
    if (!section?.id) {
      return { url: event.url, status: "unconfirmed", reason: "Feature heading/id not found in fetched release", links: [] };
    }
    return {
      url: `${page.url.split("#")[0]}#${encodeURIComponent(section.id)}`,
      status: "verified", reason: `Exact release heading: ${section.title}`,
      links: section.links, text: section.text,
    };
  }
  if (event.sourceId === "copilot-whats-new") {
    const additions = event.diffSummary?.additions ?? [];
    const substantive = additions.filter((line) => !/^H[1-6]:/.test(line));
    if (!substantive.length) {
      const changed = event.diffSummary?.headings ?? [];
      const sections = page.sections.filter((section) =>
        changed.some((heading) => normalize(heading) === section.title));
      if (sections.length === 1) {
        const articles = sections[0].links.filter((link) =>
          /^https:\/\/github\.blog\/changelog\/\d{4}-\d{2}-\d{2}-/.test(link.url));
        if (articles.length === 1) return {
          url: articles[0].url, status: "article_pending",
          reason: `Snapshot observation, not a standalone feature: ${sections[0].title}; explicit article: ${articles[0].title}`,
          links: [],
        };
      }
      if (sections[0]?.id) return {
        url: `${page.url.split("#")[0]}#${encodeURIComponent(sections[0].id)}`,
        status: "unconfirmed", reason: "Multiple changed date headings; linked observed archive item without inferring a feature", links: [],
      };
      return { url: event.url, status: "unconfirmed", reason: "Date/filter headings only; no identifiable product feature", links: [] };
    }
  }
  if (event.sourceId === "vscode-updates") {
    const version = `${event.title} ${(event.headings ?? []).join(" ")} ${(event.diffSummary?.additions ?? []).join(" ")}`
      .match(/(?:Code |Downloads for |Update )(1\.\d+)/)?.[1];
    const release = version && page.links.find((link) =>
      new URL(link.url).pathname === `/updates/v${version.replace(".", "_")}`);
    if (release) {
      return { url: release.url, status: "release_pending", reason: `Explicit release link for ${version}`, links: [] };
    }
    return { url: event.url, status: "unconfirmed", reason: "Historical release cannot be identified from explicit links", links: [] };
  }
  if (event.kind === "html_snapshot_change") {
    const changed = event.diffSummary?.headings ?? [];
    const sections = page.sections.filter((section) => section.id &&
      changed.some((heading) => normalize(heading).toLowerCase() === section.title.toLowerCase()));
    if (sections.length) {
      return {
        url: `${page.url.split("#")[0]}#${encodeURIComponent(sections[0].id)}`,
        status: "verified",
        reason: `Observed changed heading(s): ${sections.map((section) => section.title).join("; ")}`,
        links: sections.flatMap((section) => section.links),
        text: sections.map((section) => section.text).join(" "),
      };
    }
    return { url: event.url, status: "unconfirmed", reason: "Historical changed feature not identifiable in current page", links: [] };
  }
  const fragment = new URL(event.url).hash;
  if (fragment && !page.ids.includes(decodeURIComponent(fragment.slice(1)))) {
    return { url: event.url.split("#")[0], status: "unconfirmed", reason: "Original fragment not found in fetched page", links: [] };
  }
  return { url: page.url + fragment, status: "verified", reason: "Fetched original article", links: page.links, text: page.text };
}

const stopWords = new Set("github copilot visual studio code vscode new now update updates release preview public available support using use with from this that your more agent agents model models for and the to in on is at as by an a it be are all how can get has have introduces introducing improved improvements changed will its of about".split(" "));
export function relevance(event, title) {
  const words = normalize(event.sectionTitle || event.title)
    .toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? [];
  const distinctive = [...new Set(words.filter((word) => !stopWords.has(word)))];
  const target = normalize(title).toLowerCase();
  const titleMatches = distinctive.filter((word) => new RegExp(`\\b${word}\\b`).test(target)).length;
  const targetWords = (target.match(/[a-z][a-z0-9-]{2,}/g) ?? []).filter((word) => !stopWords.has(word));
  const summary = normalize(event.summary).toLowerCase();
  const namedPhrase = targetWords.some((word, index) => targetWords[index + 1] &&
    summary.includes(`${word} ${targetWords[index + 1]}`));
  return Math.max(titleMatches, namedPhrase ? 2 : 0);
}

export function documentCandidates(event, source, catalog = []) {
  if (source.status !== "verified") return [];
  const allowed = (link) => isOfficialDocument(link.url) &&
    !sameDocument(link.url, source.url) &&
    !/\/copilot-surfaces\/|\/docs\/(?:setup\/|getstarted\/|supporting\/|copilot\/overview)/.test(new URL(link.url).pathname) &&
    (!link.url.includes("learn.microsoft.com") || /azure|microsoft.?365/i.test(`${event.title} ${event.summary}`));
  const explicit = source.links.filter(allowed).map((link) => ({
    ...link, basis: "Explicit link in original article/feature section", discoveryUrl: source.url,
  })).sort((left, right) => relevance(event, right.title) - relevance(event, left.title));
  const discovered = catalog.filter((link) => allowed(link) && relevance(event, link.title) >= 2 &&
      (!/copilot-cli/.test(link.url) || /\bcli\b/i.test(event.title)) &&
      (!/cloud-agent|coding-agent/.test(link.url) || /cloud agent|coding agent/i.test(event.title)) &&
      (!/github-copilot-app/.test(link.url) || /copilot app/i.test(event.title)))
    .map((link) => ({ ...link, basis: "Matching feature terms in official documentation index" }));
  const unique = new Map();
  for (const link of [...explicit, ...(explicit.length ? [] : discovered)]) {
    if (!unique.has(link.url)) unique.set(link.url, link);
  }
  return [...unique.values()].slice(0, 12);
}

export function resourceStats(events, ledger) {
  const unique = [...new Map(events.map((event) => [event.eventId, event])).values()];
  const stats = { total: unique.length, occurrences: events.length, withDocuments: 0, documents: 0, unconfirmed: 0, fetchFailed: 0, unresearched: 0 };
  for (const event of unique) {
    const entry = ledger.entries[resourceKey(event)];
    if (!entry) stats.unresearched++;
    else {
      if (entry.documents.length) {
        stats.withDocuments++;
        stats.documents += entry.documents.length;
      }
      if (entry.status === "unconfirmed") stats.unconfirmed++;
      if (entry.status === "fetch_failed") stats.fetchFailed++;
    }
  }
  return stats;
}

export function attachResources(event, ledger) {
  return { ...event, resources: ledger.entries[resourceKey(event)] ?? {
    status: "unresearched", source: { url: event.url, status: "unconfirmed" }, documents: [],
  } };
}
