import { createHash } from "node:crypto";
import {
  classifyEvent,
  eventKey,
  localizedImportanceLabel,
  localizedSummary,
  localizedTitle,
  originalTitle,
  rankEvent,
  sourceGroup,
  editorialQuality,
  meaningfulSnapshotAdditions,
} from "./reporting.mjs";

export const API_VERSION = "v1";
export const API_SCHEMA = "vscode-copilot-digest/api/v1";
export const API_LICENSE = "CC BY-NC-SA 4.0";
export const API_ATTRIBUTION =
  "GitHub Changelog / GitHub Blog / VS Code Release Notes / GitHub Docs. Summaries by yamapan (aktsmm).";

const SITE_BASE = "https://aktsmm.github.io/vscode-copilot-digest/";

export function itemId(event) {
  return createHash("sha256").update(eventKey(event)).digest("hex").slice(0, 16);
}

const dayOf = (value) => String(value ?? "").slice(0, 10);
const monthOf = (value) => dayOf(value).slice(0, 7);

export function buildDigestItems(events, slides = []) {
  const slideById = new Map(slides.map((s) => [s.id, s]));
  const items = events.map((event) => {
    const ja = localizedSummary(event, "ja") || "";
    const en = localizedSummary(event, "en") || "";
    const resources = event.resources ?? {};
    const id = itemId(event);
    const slide = slideById.get(id);
    // A page-change event has no article; the added lines are the only record of what changed.
    const changes = event.kind === "html_snapshot_change" && editorialQuality(event) !== "audit-only"
      ? meaningfulSnapshotAdditions(event).slice(0, 12) : [];
    return {
      id,
      ...(changes.length ? { changes } : {}),
      // Presenter Q&A written with the slide (also in the PPTX speaker notes); see api/v1/qa.json for all of them.
      ...(slide ? { slide: { hasQa: Array.isArray(slide.qa) && slide.qa.length > 0, qaCount: slide.qa?.length ?? 0 } } : {}),
      title: { ja: localizedTitle(event, "ja"), en: localizedTitle(event, "en"), original: originalTitle(event) },
      digestDate: event.digestDate,
      publishedDate: dayOf(event.publishedAt),
      topic: classifyEvent(event),
      sourceKind: event.kind ?? null,
      sourceGroup: sourceGroup(event),
      importance: { score: rankEvent(event), label: localizedImportanceLabel(event, "en") },
      summary: { state: ja ? "generated" : "missing", ja, en },
      resources: {
        status: resources.status ?? "unresearched",
        source: { url: resources.source?.url ?? event.url ?? null, status: resources.source?.status ?? "unconfirmed" },
        documents: (resources.documents ?? []).slice(0, 3).map((d) => ({ url: d.url, title: d.title ?? null, language: d.language ?? null })),
      },
      urls: { self: `api/v1/updates/${id}.json`, daily: `days/${event.digestDate}.html`, source: event.url ?? null },
    };
  });
  return items.sort((a, b) =>
    b.digestDate.localeCompare(a.digestDate) || b.importance.score - a.importance.score || a.id.localeCompare(b.id));
}

// Source-run state is kept separate from per-item enrichment state.
export function buildCoverage(logs) {
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const dates = [...byDate.keys()].sort();
  if (dates.length === 0) return { coveredFrom: null, coveredThrough: null, months: [] };
  const months = new Map();
  const cursor = new Date(`${dates[0]}T00:00:00Z`);
  const end = new Date(`${dates.at(-1)}T00:00:00Z`);
  for (; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const month = months.get(date.slice(0, 7)) ?? { month: date.slice(0, 7), days: 0, missing: 0, errors: 0, empty: 0 };
    const log = byDate.get(date);
    month.days += 1;
    if (!log) month.missing += 1;
    else {
      if ((log.errors ?? []).length > 0) month.errors += 1;
      if ((log.events ?? []).length === 0) month.empty += 1;
    }
    months.set(month.month, month);
  }
  return {
    coveredFrom: dates[0],
    coveredThrough: dates.at(-1),
    months: [...months.values()].map((m) => ({
      month: m.month,
      coverage: m.missing > 0 || m.errors > 0 ? "partial_failure" : m.empty === m.days ? "collected_empty" : "complete",
      days: m.days,
      missingDays: m.missing,
      daysWithErrors: m.errors,
    })),
  };
}

const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

// Returns [{ path, content }] relative to site/. Deterministic for identical input.
export function buildApiFiles({ logs, events, slides = [] }) {
  const items = buildDigestItems(events, slides);
  const slideById = new Map(slides.map((s) => [s.id, s]));
  const coverage = buildCoverage(logs);
  const snapshotAt = logs.map((l) => l.generatedAt).filter(Boolean).sort().at(-1) ?? null;
  const base = { schema: API_SCHEMA, apiVersion: API_VERSION, snapshotAt, license: API_LICENSE, attribution: API_ATTRIBUTION };
  const files = [];
  const add = (p, body) => files.push({ path: `api/v1/${p}`, content: stableJson({ ...base, ...body }) });

  const monthsList = [...new Set(items.map((i) => monthOf(i.digestDate)))].sort().reverse();
  for (const month of monthsList) {
    const list = items.filter((i) => monthOf(i.digestDate) === month);
    add(`months/${month}.json`, { month, count: list.length, items: list });
  }
  const topics = [...new Set(items.map((i) => i.topic))].sort();
  const slug = (t) => ({ "GitHub Copilot": "github-copilot", "VS Code": "vs-code", "GitHub Platform": "github-platform", "周辺ニュース": "news" })[t] ?? "other";
  for (const topic of topics) {
    const list = items.filter((i) => i.topic === topic);
    add(`categories/${slug(topic)}.json`, {
      category: slug(topic), label: topic, count: list.length,
      items: list.map((i) => ({ id: i.id, title: i.title, digestDate: i.digestDate, urls: i.urls })),
    });
  }
  for (const item of items) add(`updates/${item.id}.json`, { item, ...(slideById.get(item.id)?.qa?.length ? { qa: slideById.get(item.id).qa } : {}) });
  // Every presenter Q&A in one file, newest first, for tools that build a Q&A bank or a speaker prompt.
  const qaItems = items.filter((i) => slideById.get(i.id)?.qa?.length).map((i) => ({
    id: i.id, title: slideById.get(i.id).title?.ja ?? i.title.ja, digestDate: i.digestDate, topic: i.topic,
    source: i.resources.source.url, urls: i.urls, qa: slideById.get(i.id).qa,
  }));
  add("qa.json", { count: qaItems.length, questionCount: qaItems.reduce((n, i) => n + i.qa.length, 0), items: qaItems });

  const newest = items[0]?.digestDate;
  const cutoff = newest ? new Date(new Date(`${newest}T00:00:00Z`).getTime() - 29 * 86400000).toISOString().slice(0, 10) : null;
  add("latest.json", { windowDays: 30, items: cutoff ? items.filter((i) => i.digestDate >= cutoff) : [] });
  add("index.json", {
    siteBase: SITE_BASE,
    count: items.length,
    coverage,
    months: monthsList.map((m) => ({ month: m, path: `api/v1/months/${m}.json` })),
    categories: topics.map((t) => ({ category: slug(t), label: t, path: `api/v1/categories/${slug(t)}.json` })),
    endpoints: ["api/v1/index.json", "api/v1/latest.json", "api/v1/months/YYYY-MM.json", "api/v1/updates/{id}.json", "api/v1/categories/{category}.json", "api/v1/qa.json"],
    notes: [
      "digestDate and months use the digest's calendar date as published on the site.",
      "coverage.months[].coverage other than complete may be missing updates; it is not the same as zero updates.",
      "Original article bodies are not redistributed.",
    ],
  });
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
