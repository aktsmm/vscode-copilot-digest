import { DECK_TEXT, GITHUB_PALETTE } from "./theme.mjs";
import { STATUS_LABELS } from "./slides.mjs";

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const MAX_MERGE = 100;
const TOPICS = ["GitHub Copilot", "VS Code", "GitHub Platform", "周辺ニュース"];
const KINDS = ["ga", "preview", "retirement", "announcement", "update"];

const LABELS = {
  ja: {
    title: "スライドをダウンロード", from: "開始", to: "終了", last30: "過去30日", last7: "過去7日", clear: "クリア",
    kind: "種類", topic: "トピック", json: "JSON", pdf: "PDF", pptx: "PPTX", sample: "サンプル PDF",
    jsonTitle: "絞り込んだ範囲のスライド JSON",
    pdfTitle: "絞り込んだ範囲のスライドを 1 つの PDF に結合します（パスワードが必要）",
    pptxTitle: "同じ範囲を編集できる PowerPoint（.pptx）で（パスワードが必要）",
    sampleTitle: "最新のスライド 1 件（パスワード不要）",
    summary: (n) => `スライド作成済み ${n} 件`,
    password: "パスワードを入力してください",
    needPassword: "パスワードを入力してください。", wrongPassword: "パスワードが違います。",
    preparing: "準備中…", merging: (d, t) => `結合中… ${d} / ${t}`, saved: (n) => `保存しました（${n} 件）`, failed: "作成できませんでした。時間をおいて再度お試しください。",
    topicLabels: { "GitHub Copilot": "GitHub Copilot", "VS Code": "VS Code", "GitHub Platform": "GitHub Platform", "周辺ニュース": "周辺ニュース" },
    periodPrefix: "対象期間", countUnit: " 件",
    search: "タイトル・要約で絞り込み", pick: "個別に選ぶ", selectAll: "すべて選択", selectNone: "すべて解除", noItems: "条件に合うスライドはありません",
    tooMany: (n, max) => `一度に保存できるのは ${max} 件までです（いま ${n} 件）。期間を狭める（過去7日など）か、「個別に選ぶ」で減らすか、カードのチェックを外してください。`,
  },
  en: {
    title: "Download slides", from: "From", to: "To", last30: "Last 30 days", last7: "Last 7 days", clear: "Clear",
    kind: "Type", topic: "Topic", json: "JSON", pdf: "PDF", pptx: "PPTX", sample: "Sample PDF",
    jsonTitle: "Slide JSON for the selected range",
    pdfTitle: "Merge the selected slides into one PDF (password required)",
    pptxTitle: "The same range as an editable PowerPoint (.pptx) (password required)",
    sampleTitle: "The newest slide (no password needed)",
    summary: (n) => `${n} slides available`,
    password: "Enter the password",
    needPassword: "Enter the password.", wrongPassword: "Wrong password.",
    preparing: "Preparing…", merging: (d, t) => `Merging… ${d} / ${t}`, saved: (n) => `Saved (${n} items)`, failed: "Could not build the file. Please try again later.",
    topicLabels: { "GitHub Copilot": "GitHub Copilot", "VS Code": "VS Code", "GitHub Platform": "GitHub Platform", "周辺ニュース": "Other news" },
    periodPrefix: "Period", countUnit: "",
    search: "Filter by title or summary", pick: "Pick individually", selectAll: "Select all", selectNone: "Clear selection", noItems: "No slides match the filters",
    tooMany: (n, max) => `You can save up to ${max} slides at a time (${n} selected now). Narrow the dates (for example the last 7 days), or untick items under "Pick individually" or on the cards.`,
  },
};

const kindLabel = (locale, k) => (locale === "ja" ? STATUS_LABELS[k] : { ga: "GA", preview: "Preview", retirement: "Retirement", announcement: "Announcement", update: "Update" }[k]);

export function downloadPanelHtml(locale = "ja") {
  const L = LABELS[locale] ?? LABELS.ja;
  const chip = (group, value, label) => `<label class="dl-chip"><input type="checkbox" data-dl-${group} value="${esc(value)}"><span>${esc(label)}</span></label>`;
  return `<section class="section-block dl-panel" data-dl-panel hidden aria-label="${esc(L.title)}">
    <input class="dl-search" type="search" data-dl-q placeholder="${esc(L.search)}" aria-label="${esc(L.search)}" autocomplete="off">
    <details class="dl-collapse">
    <summary>${esc(L.pick)} <span class="dl-items-count" data-dl-items-count></span></summary>
    <div class="dl-row">
      <label class="dl-field">${esc(L.from)} <input type="date" data-dl-from></label>
      <label class="dl-field">${esc(L.to)} <input type="date" data-dl-to></label>
      <button type="button" class="dl-btn dl-btn--ghost" data-dl-range="30">${esc(L.last30)}</button>
      <button type="button" class="dl-btn dl-btn--ghost" data-dl-range="7">${esc(L.last7)}</button>
      <button type="button" class="dl-btn dl-btn--ghost" data-dl-reset>${esc(L.clear)}</button>
    </div>
    <div class="dl-chips"><span class="dl-label">${esc(L.kind)}</span>${KINDS.map((k) => chip("kind", k, kindLabel(locale, k))).join("")}</div>
    <div class="dl-chips"><span class="dl-label">${esc(L.topic)}</span>${TOPICS.map((t) => chip("topic", t, L.topicLabels[t])).join("")}</div>
    <div class="dl-items">
      <div class="dl-row dl-items-tools">
        <button type="button" class="dl-btn dl-btn--ghost" data-dl-all>${esc(L.selectAll)}</button>
        <button type="button" class="dl-btn dl-btn--ghost" data-dl-none>${esc(L.selectNone)}</button>
      </div>
      <ul class="dl-list" data-dl-list></ul>
    </div>
    </details>
    <div class="dl-actions">
      <button type="button" class="dl-btn" data-dl="json" title="${esc(L.jsonTitle)}">${esc(L.json)}</button>
      <button type="button" class="dl-btn" data-dl="pdf" title="${esc(L.pdfTitle)}" hidden>${esc(L.pdf)}</button>
      <button type="button" class="dl-btn" data-dl="pptx" title="${esc(L.pptxTitle)}" hidden>${esc(L.pptx)}</button>
      <a class="dl-sample" data-dl-sample href="#" target="_blank" rel="noopener" title="${esc(L.sampleTitle)}" hidden>${esc(L.sample)}</a>
      <span class="dl-status" data-dl-status role="status" aria-live="polite"></span>
    </div>
  </section>`;
}

export function downloadsCss() {
  const P = GITHUB_PALETTE;
  return `
.dl-panel{background:#fff;border:1px solid ${P.border};border-radius:12px;padding:14px 18px;display:grid;gap:10px;margin:0 0 18px}
.dl-panel[hidden]{display:none}
.dl-row,.dl-chips,.dl-actions{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center}
.dl-field{display:inline-flex;gap:6px;align-items:center;font-size:.92rem;color:${P.muted}}
.dl-field input{font:inherit;padding:6px 8px;border:1px solid ${P.border};border-radius:8px;background:#fff;color:${P.fg}}
.dl-label{font-size:.82rem;font-weight:700;color:${P.muted};min-width:4.5em}
.dl-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid ${P.border};border-radius:999px;padding:4px 12px;font-size:.9rem;background:#fff;cursor:pointer}
.dl-chip:has(input:checked){border-color:${P.copilot};background:${P.copilotTint};color:${P.copilotDeep};font-weight:700}
.dl-search{font:inherit;padding:9px 12px;border:1px solid ${P.border};border-radius:10px;background:#fff;color:${P.fg};width:100%}
.dl-btn{font:inherit;padding:7px 16px;border-radius:8px;border:1px solid ${P.copilot};background:#fff;color:${P.copilotDeep};cursor:pointer}
.dl-btn:hover:not(:disabled),.dl-btn:focus-visible{background:${P.copilotTint}}
.dl-btn:disabled{border-color:${P.border};color:${P.muted};cursor:not-allowed;background:${P.subtle}}
.dl-btn--ghost{border-color:${P.border};color:${P.fg}}
.dl-items-count{font-weight:400;color:${P.muted};margin-left:6px}
.dl-items-tools{margin:8px 0 4px}
.dl-list{list-style:none;margin:6px 0 0;padding:0;max-height:280px;overflow:auto;border:1px solid ${P.border};border-radius:8px}
.dl-list li{border-bottom:1px solid ${P.border}}
.dl-list li:last-child{border-bottom:0}
.dl-list label{display:grid;grid-template-columns:auto 6.2em 5em 1fr;gap:8px;align-items:center;padding:6px 10px;font-size:.9rem;cursor:pointer}
.dl-list label:hover{background:${P.subtle}}
.dl-list .dl-date{color:${P.muted};font-variant-numeric:tabular-nums}
.dl-list .dl-kind{font-size:.78rem;border:1px solid ${P.border};border-radius:999px;padding:1px 8px;text-align:center}
.dl-empty{padding:10px;color:${P.muted};font-size:.9rem}
.dl-sample{color:${P.link};text-decoration:underline;font-size:.92rem}
.dl-status{font-size:.9rem;color:${P.muted}}
.dl-status.is-error{color:${P.danger};font-weight:700}
.filter-block--compact{padding:12px 18px}
.filter-block--compact .section-heading h2{font-size:1rem}
`;
}

export function downloadsJs() {
  return `"use strict";
(function () {
  var panel = document.querySelector("[data-dl-panel]");
  if (!panel) return;
  var scriptEl = document.currentScript || document.querySelector('script[src*="downloads.js"]');
  var root = new URL("../", scriptEl.src);
  var version = (new URL(scriptEl.src).searchParams.get("v")) || "0";
  var locale = document.documentElement.lang === "en" ? "en" : "ja";
  var LABELS = ${JSON.stringify(Object.fromEntries(Object.entries(LABELS).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x !== "function"))])))};
  var L = LABELS[locale];
  var summaryText = locale === "ja" ? function (n) { return "スライド作成済み " + n + " 件"; } : function (n) { return n + " slides available"; };
  var mergingText = locale === "ja" ? function (d, t) { return "結合中… " + d + " / " + t; } : function (d, t) { return "Merging… " + d + " / " + t; };
  var savedText = locale === "ja" ? function (n) { return "保存しました（" + n + " 件）"; } : function (n) { return "Saved (" + n + " items)"; };
  var THEME = ${JSON.stringify(GITHUB_PALETTE)};
  var TEXT = ${JSON.stringify(DECK_TEXT)};
  var STATUS_LABELS = ${JSON.stringify(STATUS_LABELS)};
  var MAX = ${MAX_MERGE};
  var FONT = '"Noto Sans CJK JP","Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif';
  var W = 1280, H = 720, PT = 0.75, PER_TOC = 13;
  var $ = function (sel) { return panel.querySelector(sel); };
  var manifest = null, pwCache = null;

  function setStatus(message, error) { var el = $("[data-dl-status]"); el.textContent = message || ""; el.className = "dl-status" + (error ? " is-error" : ""); }
  function checked(attr) { return Array.prototype.map.call(panel.querySelectorAll("[data-dl-" + attr + "]:checked"), function (el) { return el.value; }); }
  var excluded = new Set();
  // Slides that pass the date, type and topic filters; the list below lets the reader drop single ones.
  var feedCards = Array.prototype.slice.call(document.querySelectorAll("[data-card-date]"));
  var cardText = {};
  feedCards.forEach(function (c) { var sid = c.getAttribute("data-slide-id"); if (sid) cardText[sid] = c.textContent.toLowerCase(); });
  var KIND_IMPORTANCE = { ga: ["ga"], preview: ["preview"], retirement: ["retired"], announcement: ["release"], update: ["update", "feature-update", "snapshot"] };
  function matching() {
    var from = $("[data-dl-from]").value, to = $("[data-dl-to]").value, kinds = checked("kind"), topics = checked("topic"), q = $("[data-dl-q]").value.trim().toLowerCase();
    return manifest.slides.filter(function (s) {
      var hay = cardText[s.id] || String(s.title || "").toLowerCase();
      return (!from || s.date >= from) && (!to || s.date <= to) && (!kinds.length || kinds.indexOf(s.status === "unknown" ? "update" : s.status) >= 0) && (!topics.length || topics.indexOf(s.topic) >= 0) && (!q || hay.indexOf(q) >= 0);
    });
  }
  function selection() { return matching().filter(function (s) { return !excluded.has(s.id); }); }
  // The update list on the page follows the same date / type / topic filters, and each card that has a slide can be dropped.
  function syncFeed() {
    if (!feedCards.length || !manifest) return;
    var from = $("[data-dl-from]").value, to = $("[data-dl-to]").value, kinds = checked("kind"), topics = checked("topic"), q = $("[data-dl-q]").value.trim().toLowerCase();
    var inRange = new Set(matching().map(function (s) { return s.id; }));
    feedCards.forEach(function (card) {
      var sid = card.getAttribute("data-slide-id"), date = card.getAttribute("data-card-date") || "";
      var kindOk = !kinds.length || kinds.some(function (k) { return (KIND_IMPORTANCE[k] || []).indexOf(card.getAttribute("data-importance")) >= 0; });
      var show = sid ? inRange.has(sid) : ((!from || date >= from) && (!to || date <= to) && kindOk && (!topics.length || topics.indexOf(card.getAttribute("data-topic")) >= 0) && (!q || card.textContent.toLowerCase().indexOf(q) >= 0));
      card.classList.toggle("dl-out", !show);
      var box = card.querySelector("[data-card-pick]");
      if (box) { box.checked = !excluded.has(sid); card.classList.toggle("dl-unpicked", !box.checked); }
    });
    var holder = document.querySelector("[data-latest-highlights]"), label = holder && holder.querySelector(".section-heading-tools span");
    if (label) label.textContent = feedCards.filter(function (c) { return !c.classList.contains("dl-out"); }).length + (holder.getAttribute("data-count-suffix") || "");
  }
  var pickedText = locale === "ja" ? function (n, m) { return "選択中 " + n + " / " + m + " 件"; } : function (n, m) { return n + " of " + m + " selected"; };
  function renderList() {
    var list = $("[data-dl-list]"), items = matching();
    list.textContent = "";
    if (items.length === 0) { var empty = document.createElement("li"); empty.className = "dl-empty"; empty.textContent = L.noItems; list.appendChild(empty); return; }
    items.forEach(function (s) {
      var li = document.createElement("li"), label = document.createElement("label"), box = document.createElement("input");
      box.type = "checkbox"; box.setAttribute("data-dl-item", ""); box.value = s.id; box.checked = !excluded.has(s.id);
      var date = document.createElement("span"); date.className = "dl-date"; date.textContent = s.date;
      var kind = document.createElement("span"); kind.className = "dl-kind"; kind.textContent = (STATUS_LABELS[s.status] || STATUS_LABELS.update || "");
      var title = document.createElement("span"); title.textContent = s.title;
      label.appendChild(box); label.appendChild(date); label.appendChild(kind); label.appendChild(title); li.appendChild(label); list.appendChild(li);
    });
  }
  function ordered(list) { return list.slice().sort(function (a, b) { return a.date.localeCompare(b.date) || a.id.localeCompare(b.id); }); }
  function refresh() {
    var sel = selection(), withPdf = sel.filter(function (s) { return s.pdf; });
    var json = $('[data-dl="json"]'), pdf = $('[data-dl="pdf"]'), pptx = $('[data-dl="pptx"]');
    syncFeed();
    $("[data-dl-items-count]").textContent = pickedText(sel.length, matching().length);
    json.textContent = L.json + "（" + sel.length + "）"; json.disabled = sel.length === 0 || sel.length > MAX;
    pdf.textContent = L.pdf + "（" + withPdf.length + "）"; pdf.disabled = withPdf.length === 0 || withPdf.length > MAX;
    pptx.textContent = L.pptx + "（" + withPdf.length + "）"; pptx.disabled = withPdf.length === 0 || withPdf.length > MAX;
    var st = $("[data-dl-status]"), over = Math.max(sel.length, withPdf.length) > MAX;
    if (over) { st.textContent = L.tooMany(Math.max(sel.length, withPdf.length), MAX); st.className = "dl-status is-error"; }
    else if (st.getAttribute("data-too-many")) { st.textContent = ""; st.className = "dl-status"; }
    if (over) st.setAttribute("data-too-many", "1"); else st.removeAttribute("data-too-many");
  }
  function setRange(days) {
    var end = new Date(); var start = new Date(end.getTime() - (days - 1) * 86400000);
    var fmt = function (d) { return d.toISOString().slice(0, 10); };
    $("[data-dl-from]").value = fmt(start); $("[data-dl-to]").value = fmt(end); renderList(); refresh();
  }

  function b64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  async function keyFor(password) {
    if (pwCache && pwCache.pw === password) return pwCache.key;
    var info = manifest.pdfCrypto;
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(info.salt), iterations: info.iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    pwCache = { pw: password, key: key }; return key;
  }
  function WrongPassword() { this.name = "WrongPassword"; }
  async function fetchPdf(entry, password) {
    var res = await fetch(new URL(entry.pdf, root));
    if (!res.ok) throw new Error(entry.id + " " + res.status);
    var bytes = new Uint8Array(await res.arrayBuffer());
    if (!entry.encrypted) return bytes;
    try { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await keyFor(password), bytes.slice(12))); }
    catch (e) { pwCache = null; throw new WrongPassword(); }
  }
  function askPassword(list) {
    if (!list.some(function (s) { return s.encrypted; })) return "";
    return (pwCache && pwCache.pw) || window.prompt(L.password) || null;
  }
  function loadScript(path) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script"); s.src = new URL(path + "?v=" + version, root).href; s.onload = resolve; s.onerror = function () { reject(new Error("load " + path)); }; document.head.appendChild(s);
    });
  }
  function download(blob, name) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000); }
  function stem(list) { var o = ordered(list); return "copilot-vscode-digest-" + (o[0] ? o[0].date : "") + "_" + (o.length ? o[o.length - 1].date : ""); }
  function periodOf(list) { var o = ordered(list); return o.length ? o[0].date + " 〜 " + o[o.length - 1].date : ""; }
  async function fetchSlideJson(list) {
    return Promise.all(list.map(async function (e) { var r = await fetch(new URL("slides/" + e.id + ".json", root)); if (!r.ok) throw new Error(e.id + " " + r.status); return r.json(); }));
  }

  function footer(ctx, left, right) {
    ctx.fillStyle = "#010409"; ctx.fillRect(0, H - 56, W, 56);
    ctx.fillStyle = THEME.onDark; ctx.font = "16px " + FONT; ctx.textBaseline = "middle";
    ctx.fillText(left, 96, H - 28); ctx.textAlign = "right"; ctx.fillText(right, W - 96, H - 28); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  function frame(ctx) {
    var g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, THEME.copilot); g.addColorStop(0.7, THEME.copilot); g.addColorStop(0.7, THEME.done); g.addColorStop(0.85, THEME.done); g.addColorStop(0.85, THEME.link); g.addColorStop(1, THEME.link);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 14);
  }
  function fitText(ctx, s, max) { if (ctx.measureText(s).width <= max) return s; var t = s; while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; }
  function count(items, key) { var m = new Map(); items.forEach(function (i) { var k = key(i); m.set(k, (m.get(k) || 0) + 1); }); return Array.from(m).sort(function (a, b) { return b[1] - a[1]; }); }
  // Draws a link-coloured, underlined line and returns its clickable rectangle (px, top-based).
  function linkLine(ctx, text, x, y, url, size) {
    ctx.font = (size || 16) + "px " + FONT; ctx.fillStyle = "#79C0FF"; ctx.fillText(text, x, y);
    var w = ctx.measureText(text).width; ctx.fillRect(x, y + 4, w, 1);
    return { x: x, top: y - (size || 16), w: w, h: (size || 16) + 8, url: url };
  }
  function drawCover(ctx, items, period, created) {
    ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H); frame(ctx);
    ctx.fillStyle = THEME.darkSubtle; ctx.beginPath(); ctx.moveTo(W * 0.7, 14); ctx.lineTo(W, 14); ctx.lineTo(W, H - 56); ctx.lineTo(W * 0.42, H - 56); ctx.closePath(); ctx.fill();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = THEME.copilot; ctx.font = "600 22px " + FONT; ctx.fillText(TEXT.eyebrow, 96, 218);
    ctx.fillStyle = "#fff"; ctx.font = "700 50px " + FONT; ctx.fillText(TEXT.title, 96, 290);
    ctx.fillStyle = THEME.onDark; ctx.font = "600 28px " + FONT; if (period) ctx.fillText("対象期間 " + period, 96, 360);
    ctx.font = "700 44px " + FONT; ctx.fillStyle = "#fff"; ctx.fillText(String(items.length), 96, 430);
    var w = ctx.measureText(String(items.length)).width; ctx.font = "26px " + FONT; ctx.fillText(" 件", 96 + w, 430);
    var links = [];
    ctx.fillStyle = THEME.onDark; ctx.font = "16px " + FONT; ctx.fillText("作成", 96, 520);
    links.push(linkLine(ctx, TEXT.authorLabel, 150, 520, TEXT.profileUrl));
    ctx.fillStyle = THEME.onDark; ctx.font = "16px " + FONT; ctx.fillText("リポジトリ", 96, 552);
    links.push(linkLine(ctx, TEXT.repoUrl, 190, 552, TEXT.repoUrl));
    footer(ctx, "作成日 " + created + "（UTC）", TEXT.source);
    return { links: links };
  }
  function drawToc(ctx, items, start, first, firstPage) {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); frame(ctx);
    var head = TEXT.tocTitle.split("・")[0];
    ctx.fillStyle = THEME.dark; ctx.font = "700 34px " + FONT; ctx.fillText(first ? head : head + "（続き）", 70, 80);
    ctx.fillStyle = THEME.copilot; ctx.fillRect(70, 94, 240, 4); ctx.font = "20px " + FONT;
    items.forEach(function (item, i) {
      var y = 150 + i * 36;
      ctx.fillStyle = THEME.copilot; ctx.fillText(String(start + i + 1) + ".", 70, y);
      ctx.fillStyle = THEME.fg; ctx.fillText(fitText(ctx, "【" + item.topic + "】" + item.title, W - 70 - 120 - 130), 120, y);
      ctx.fillStyle = THEME.muted; ctx.textAlign = "right"; ctx.fillText(String(firstPage + start + i), W - 70, y); ctx.textAlign = "left";
    });
    footer(ctx, TEXT.title, TEXT.source);
  }
  function drawSummary(ctx, items) {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); frame(ctx);
    ctx.fillStyle = THEME.dark; ctx.font = "700 34px " + FONT; ctx.fillText("概要", 70, 80);
    ctx.fillStyle = THEME.copilot; ctx.fillRect(70, 94, 120, 4);
    ctx.font = "600 22px " + FONT; ctx.fillText("種類別", 70, 150); ctx.fillText("トピック別", 560, 150);
    ctx.font = "22px " + FONT; ctx.fillStyle = THEME.fg;
    // Labels sit on the left and the counts line up on a shared right edge.
    var rows = function (list, x) { list.forEach(function (kv, i) { ctx.textAlign = "left"; ctx.fillText(kv[0], x, 196 + i * 34); ctx.textAlign = "right"; ctx.fillText(kv[1] + " 件", x + 380, 196 + i * 34); }); ctx.textAlign = "left"; };
    rows(count(items, function (s) { return STATUS_LABELS[s.status] || "更新"; }), 90);
    rows(count(items, function (s) { return s.topic; }), 580);
    footer(ctx, TEXT.title, TEXT.source);
  }
  function drawEnd(ctx) {
    ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H); frame(ctx);
    ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "700 64px " + FONT; ctx.fillText(TEXT.endTitle, W / 2, 330);
    ctx.fillStyle = THEME.copilot; ctx.font = "600 26px " + FONT; ctx.fillText(TEXT.title, W / 2, 390); ctx.textAlign = "left";
    ctx.fillStyle = THEME.onDark; ctx.font = "14px " + FONT; ctx.fillText(TEXT.automationNote, 96, 560);
    var links = [
      linkLine(ctx, TEXT.repoUrl, 96, 590, TEXT.repoUrl, 14),
      linkLine(ctx, TEXT.authorLabel + "　" + TEXT.profileUrl, 96, 614, TEXT.profileUrl, 14),
      linkLine(ctx, TEXT.siteUrl, 96, 638, TEXT.siteUrl, 14),
    ];
    footer(ctx, TEXT.copyright, TEXT.source);
    return { links: links };
  }
  async function canvasPng(draw) {
    var canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    var result = draw(canvas.getContext("2d"));
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
    return { bytes: new Uint8Array(await blob.arrayBuffer()), result: result };
  }

  async function mergePdf() {
    var list = ordered(selection().filter(function (s) { return s.pdf; }));
    var password = askPassword(list);
    if (password === null) { setStatus(L.needPassword, true); return; }
    setStatus(L.preparing);
    try {
      await loadScript("assets/vendor/pdf-lib.min.js");
      var PDFDocument = PDFLib.PDFDocument, PDFString = PDFLib.PDFString;
      var out = await PDFDocument.create();
      var addImage = async function (draw) {
        var r = await canvasPng(draw); var page = out.addPage([W * PT, H * PT]);
        page.drawImage(await out.embedPng(r.bytes), { x: 0, y: 0, width: W * PT, height: H * PT }); return { page: page, result: r.result };
      };
      var tocPages = Math.max(1, Math.ceil(list.length / PER_TOC)), firstPage = 1 + tocPages + 1 + 1;
      var addLinks = function (item) {
        item.result.links.forEach(function (r) {
          var a = out.context.obj({ Type: "Annot", Subtype: "Link", Rect: [r.x * PT, (H - r.top - r.h) * PT, (r.x + r.w) * PT, (H - r.top) * PT], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(r.url) } });
          item.page.node.addAnnot(out.context.register(a));
        });
      };
      addLinks(await addImage(function (ctx) { return drawCover(ctx, list, periodOf(list), new Date().toISOString().slice(0, 10)); }));
      for (var s = 0; s < list.length; s += PER_TOC) { await addImage(function (ctx) { drawToc(ctx, list.slice(s, s + PER_TOC), s, s === 0, firstPage); }); }
      await addImage(function (ctx) { drawSummary(ctx, list); });
      var done = 0;
      for (var i = 0; i < list.length; i++) {
        setStatus(mergingText(++done, list.length));
        var src = await PDFDocument.load(await fetchPdf(list[i], password));
        var pages = await out.copyPages(src, src.getPageIndices()); pages.forEach(function (p) { out.addPage(p); });
      }
      addLinks(await addImage(drawEnd));
      out.setTitle(TEXT.title);
      download(new Blob([await out.save()], { type: "application/pdf" }), stem(list) + ".pdf");
      setStatus(savedText(list.length));
    } catch (e) { setStatus(e instanceof WrongPassword ? L.wrongPassword : L.failed, true); }
  }

  // v1 slides: the summary becomes the subtitle and the points one panel.
  function norm(s) {
    if (s.schema === "vscode-copilot-digest/slide/v2") return s;
    var src = typeof s.references.source === "string" ? { url: s.references.source, title: "" } : s.references.source;
    return Object.assign({}, s, { title: Object.assign({}, s.title, { subtitleJa: s.summary }), action: typeof s.action === "string" ? { required: "info", summary: s.action } : s.action, panels: [{ id: "points", heading: "ポイント", priority: "core", items: s.points || [] }], references: Object.assign({}, s.references, { source: src }) });
  }
  async function buildPptx() {
    var list = ordered(selection().filter(function (s) { return s.pdf; }));
    var password = askPassword(list);
    if (password === null) { setStatus(L.needPassword, true); return; }
    setStatus(L.preparing);
    try {
      // The slide JSON is public, so the password is verified by decrypting one protected PDF.
      var probe = list.find(function (s) { return s.encrypted; });
      if (probe) await fetchPdf(probe, password);
      await loadScript("assets/vendor/pptxgen.bundle.js");
      var slides = await fetchSlideJson(list);
      var pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE"; pptx.title = TEXT.title;
      var hex = function (c) { return c.replace("#", ""); };
      var F = "Yu Gothic";
      // Text boxes have fixed sizes and PowerPoint does not shrink text on open, so the text height is estimated with the
      // browser's own font metrics and the font is scaled down until it fits. Anything that still does not fit is
      // recorded in window.__pptxOverflow (tests/pptx-fit.test.mjs fails on it).
      var meas = document.createElement("canvas").getContext("2d"), widths = {};
      window.__pptxOverflow = []; window.__pptxScales = [];
      function sz(pt, scale) { return Math.max(6, Math.floor(pt * scale * 2) / 2); }
      function cw(ch, pt, bold) { var k = (bold ? "b" : "n") + pt + ch; if (widths[k] === undefined) { meas.font = (bold ? "700 " : "400 ") + pt + "px " + FONT; widths[k] = meas.measureText(ch).width; } return widths[k]; }
      function wrapLines(t, pt, bold, availPt) { var n = 0; String(t).split("\\n").forEach(function (part) { var cur = 0, k = 1; for (var i = 0; i < part.length; i++) { var w = cw(part[i], pt, bold) * 1.03; if (cur + w > availPt && cur > 0) { k++; cur = w; } else cur += w; } n += k; }); return n; }
      function needIn(paras, w, m, scale) { var mx = m === undefined ? 7.2 : m, my = m === undefined ? 3.6 : m, availPt = w * 72 - 2 * mx, tot = 2 * my; paras.forEach(function (p) { var pt = sz(p.pt, scale); tot += wrapLines(p.t, pt, p.bold, availPt - (p.indent || 0)) * pt * 1.25; }); return tot / 72; }
      function scaleFor(id, what, paras, w, h, m) { for (var st = 20; st >= 11; st--) { if (needIn(paras, w, m, st / 20) <= h + 0.001) { window.__pptxScales.push(st / 20); return st / 20; } } window.__pptxOverflow.push({ id: id, what: what }); return 0.55; }
      var W = 13.33, H = 7.5, PER_TOC = 13;
      var frame = function (s, left, right, dark) {
        s.addShape("rect", { x: 0, y: 0, w: W * 0.7, h: 0.15, fill: { color: hex(THEME.copilot) }, line: { color: hex(THEME.copilot), width: 0 } });
        s.addShape("rect", { x: W * 0.7, y: 0, w: W * 0.15, h: 0.15, fill: { color: hex(THEME.done) }, line: { color: hex(THEME.done), width: 0 } });
        s.addShape("rect", { x: W * 0.85, y: 0, w: W * 0.15, h: 0.15, fill: { color: hex(THEME.link) }, line: { color: hex(THEME.link), width: 0 } });
        s.addShape("rect", { x: 0, y: H - 0.58, w: W, h: 0.58, fill: { color: "010409" }, line: { color: "010409", width: 0 } });
        s.addText(left, { x: 1, y: H - 0.52, w: 6, h: 0.46, fontFace: F, fontSize: 11, color: hex(THEME.onDark), valign: "middle", margin: 0 });
        s.addText(right, { x: W - 1 - 7, y: H - 0.52, w: 7, h: 0.46, fontFace: F, fontSize: 11, color: hex(THEME.onDark), valign: "middle", align: "right", margin: 0 });
      };
      var cover = pptx.addSlide(); cover.background = { color: hex(THEME.dark) };
      cover.addShape("custGeom", { x: 0, y: 0.15, w: W, h: H - 0.73, fill: { color: hex(THEME.darkSubtle) }, line: { color: hex(THEME.darkSubtle), width: 0 }, points: [{ x: W * 0.7, y: 0 }, { x: W, y: 0 }, { x: W, y: H - 0.73 }, { x: W * 0.42, y: H - 0.73 }, { close: true }] });
      frame(cover, "作成日 " + new Date().toISOString().slice(0, 10) + "（UTC）", TEXT.source);
      cover.addText(TEXT.eyebrow, { x: 1, y: 2.0, w: 11, h: 0.45, fontFace: F, fontSize: 20, bold: true, color: hex(THEME.copilot), margin: 0 });
      cover.addText(TEXT.title, { x: 1, y: 2.55, w: 11.5, h: 1.0, fontFace: F, fontSize: 36, bold: true, color: "FFFFFF", margin: 0, fit: "shrink" });
      cover.addText([{ text: periodOf(list) ? "対象期間 " + periodOf(list) : "", options: { breakLine: true, fontSize: 24 } }, { text: list.length + " 件", options: { fontSize: 36, bold: true } }], { x: 1, y: 3.75, w: 11, h: 1.6, fontFace: F, color: hex(THEME.onDark), valign: "top", margin: 0 });
      cover.addText([{ text: "作成　", options: { color: hex(THEME.onDark) } }, { text: TEXT.authorLabel, options: { hyperlink: { url: TEXT.profileUrl }, color: "79C0FF", underline: { style: "sng" }, breakLine: true } }, { text: "リポジトリ　", options: { color: hex(THEME.onDark) } }, { text: TEXT.repoUrl, options: { hyperlink: { url: TEXT.repoUrl }, color: "79C0FF", underline: { style: "sng" } } }], { x: 1, y: 5.4, w: 11, h: 0.8, fontFace: F, fontSize: 13, valign: "top", margin: 0 });
      var tocPages = Math.max(1, Math.ceil(slides.length / PER_TOC)), firstPage = 1 + tocPages + 1 + 1;
      for (var t = 0; t < tocPages; t++) {
        var toc = pptx.addSlide(); frame(toc, TEXT.title, TEXT.source);
        toc.addText(t === 0 ? "目次" : "目次（続き）", { x: 0.7, y: 0.4, w: 8, h: 0.7, fontFace: F, fontSize: 28, bold: true, color: hex(THEME.dark), margin: 0 });
        toc.addShape("rect", { x: 0.7, y: 1.12, w: 2.4, h: 0.05, fill: { color: hex(THEME.copilot) }, line: { color: hex(THEME.copilot), width: 0 } });
        slides.slice(t * PER_TOC, (t + 1) * PER_TOC).forEach(function (s, i) {
          var n = t * PER_TOC + i, y = 1.35 + i * 0.4;
          toc.addText(String(n + 1) + ".", { x: 0.7, y: y, w: 0.6, h: 0.36, fontFace: F, fontSize: 15, bold: true, color: hex(THEME.copilot), margin: 0 });
          toc.addText("【" + s.topic + "】" + s.title.ja, { x: 1.3, y: y, w: 10.4, h: 0.36, fontFace: F, fontSize: 15, color: hex(THEME.fg), margin: 0, fit: "shrink" });
          toc.addText(String(firstPage + n), { x: 11.8, y: y, w: 0.8, h: 0.36, fontFace: F, fontSize: 15, color: hex(THEME.muted), align: "right", margin: 0 });
        });
      }
      var sum = pptx.addSlide(); frame(sum, TEXT.title, TEXT.source);
      sum.addText("概要", { x: 0.7, y: 0.4, w: 8, h: 0.7, fontFace: F, fontSize: 28, bold: true, color: hex(THEME.dark), margin: 0 });
      sum.addShape("rect", { x: 0.7, y: 1.12, w: 1.2, h: 0.05, fill: { color: hex(THEME.copilot) }, line: { color: hex(THEME.copilot), width: 0 } });
      var tally = function (key) { var m = {}; slides.forEach(function (x) { var k = key(x); m[k] = (m[k] || 0) + 1; }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).map(function (k) { return [k, m[k]]; }); };
      var column = function (title, rows, x) {
        sum.addText(title, { x: x, y: 1.5, w: 5.5, h: 0.45, fontFace: F, fontSize: 20, bold: true, color: hex(THEME.copilot), margin: 0 });
        rows.forEach(function (kv, i) {
          sum.addText(kv[0], { x: x + 0.2, y: 2.1 + i * 0.5, w: 3.6, h: 0.42, fontFace: F, fontSize: 18, color: hex(THEME.fg), margin: 0, valign: "middle" });
          sum.addText(kv[1] + " 件", { x: x + 3.8, y: 2.1 + i * 0.5, w: 1.5, h: 0.42, fontFace: F, fontSize: 18, color: hex(THEME.fg), align: "right", margin: 0, valign: "middle" });
        });
      };
      column("種類別", tally(function (x) { return STATUS_LABELS[x.status] || "更新"; }), 0.9);
      column("トピック別", tally(function (x) { return x.topic; }), 7.2);      slides.forEach(function (raw) {
        var s = JSON.parse(JSON.stringify(norm(raw)).replace(/\\u0060/g, "")); var sl = pptx.addSlide();
        var badgeColor = { ga: THEME.success, preview: THEME.done, retirement: THEME.danger, announcement: THEME.copilot, update: THEME.muted }[s.status];
        var tw = s.status === "unknown" ? 12.5 : 10.9, tk = scaleFor(s.id, "title", [{ t: s.title.ja, pt: 22, bold: true }], tw, 0.55);
        sl.addText(s.title.ja, { x: 0.4, y: 0.25, w: tw, h: 0.55, fontFace: F, fontSize: sz(22, tk), bold: true, color: hex(THEME.dark), valign: "top" });
        if (s.title.subtitleJa) sl.addText(s.title.subtitleJa, { x: 0.4, y: 0.8, w: 11, h: 0.35, fontFace: F, fontSize: sz(13, scaleFor(s.id, "subtitle", [{ t: s.title.subtitleJa, pt: 13, bold: true }], 11, 0.35)), bold: true, color: hex(THEME.copilotDeep) });
        var origText = (s.title.original ? s.title.original + "　" : "") + "掲載 " + s.date;
        sl.addText(origText, { x: 0.4, y: 1.15, w: 11, h: 0.3, fontFace: F, fontSize: sz(9, scaleFor(s.id, "original", [{ t: origText, pt: 9 }], 11, 0.3)), color: hex(THEME.muted) });
        if (s.status !== "unknown") sl.addText(STATUS_LABELS[s.status] || "", { x: 11.5, y: 0.3, w: 1.4, h: 0.45, fontFace: F, fontSize: 14, bold: true, color: "FFFFFF", align: "center", fill: { color: hex(badgeColor || THEME.muted) }, rectRadius: 0.2, shape: pptx.ShapeType.roundRect });
        var cards = [];
        if (s.audience) { cards.push(["誰に関係するか", s.audience.who, THEME.copilotTint, THEME.copilot]); cards.push(["変わること・使えること", s.audience.change, s.audience.changeNature === "breaking" ? "FDECEC" : "EAF6EE", s.audience.changeNature === "breaking" ? THEME.danger : THEME.success]); }
        if (s.action) cards.push(["対応　" + ({ yes: "要対応", optional: "任意", no: "対応不要", info: "情報" }[s.action.required] || "情報"), s.action.summary, s.action.required === "yes" ? "FDECEC" : "EAF3FF", s.action.required === "yes" ? THEME.danger : THEME.link]);
        var cw = cards.length ? (12.5 - 0.15 * (cards.length - 1)) / cards.length : 0;
        cards.forEach(function (c, i) { var ck = scaleFor(s.id, "card " + c[0], [{ t: c[0], pt: 10 }, { t: c[1], pt: 14 }], cw, 0.95, 6); sl.addText([{ text: c[0], options: { fontSize: sz(10, ck), color: hex(THEME.muted), breakLine: true } }, { text: c[1], options: { fontSize: sz(14, ck), color: hex(THEME.fg) } }], { x: 0.4 + i * (cw + 0.15), y: 1.5, w: cw, h: 0.95, fontFace: F, valign: "top", fill: { color: hex(c[2]) }, line: { color: hex(c[3]), width: 1 }, margin: 6 }); });
        var y = 2.6;
        if (s.timeline) { var tlText = s.timeline.map(function (t) { return t.when + " " + t.label; }).join("　→　"); var tlH = Math.max(0.3, needIn([{ t: tlText, pt: 10, bold: true }], 12.5, undefined, 1)); sl.addText(tlText, { x: 0.4, y: y, w: 12.5, h: tlH, fontFace: F, fontSize: 10, bold: true, color: hex(THEME.copilotDeep) }); y += tlH + 0.1; }
        if (s.beforeAfter) { var baText = "変更前　" + s.beforeAfter.before + "\\n変更後　" + s.beforeAfter.after; var baH = Math.max(0.7, needIn([{ t: baText, pt: 10 }], 8.3, 6, 1)); sl.addText(baText, { x: 0.4, y: y, w: 8.3, h: baH, fontFace: F, fontSize: 10, color: hex(THEME.fg), fill: { color: hex(THEME.subtle) }, margin: 6 }); y += baH + 0.1; }
        var hasSide = (s.glossary && s.glossary.length) || (s.suggestions && s.suggestions.length);
        var mainW = hasSide ? 8.3 : 12.5, py = y, avail = 6.85 - y, total = s.panels.reduce(function (n, p) { return n + 1 + p.items.length; }, 0);
        var panelParas = s.panels.map(function (p) { return [{ t: p.heading, pt: 16, bold: true }].concat(p.items.map(function (i) { return { t: i, pt: 13, indent: 14 }; })); });
        var pk = 0.55, needs = [];
        for (var pst = 20; pst >= 11; pst--) { needs = panelParas.map(function (ps) { return needIn(ps, mainW, 6, pst / 20); }); pk = pst / 20; window.__pptxScales.push(pk); if (needs.reduce(function (a, b) { return a + b; }, 0) + 0.08 * needs.length <= avail + 0.001) break; if (pst === 11) window.__pptxOverflow.push({ id: s.id, what: "panels" }); }
        var spare = Math.max(0, avail - needs.reduce(function (a, b) { return a + b; }, 0) - 0.08 * needs.length);
        s.panels.forEach(function (p, pi) {
          var h = needs[pi] + spare * (1 + p.items.length) / total, red = ["caution", "cautions", "constraints", "limits", "impact", "risks"].indexOf(p.id) >= 0;
          sl.addText([{ text: p.heading, options: { bold: true, fontSize: sz(16, pk), color: hex(red ? THEME.danger : THEME.copilotDeep), breakLine: true } }].concat(p.items.map(function (i) { return { text: i, options: { bullet: { indent: 14 }, fontSize: sz(13, pk), color: hex(THEME.fg), breakLine: true } }; })), { x: 0.4, y: py, w: mainW, h: h, fontFace: F, valign: "top", fill: { color: red ? "FFF4F4" : p.priority === "core" ? hex(THEME.copilotTint) : "FFFFFF" }, line: { color: hex(red ? THEME.danger : THEME.border), width: 1 }, margin: 6 });
          py += h + 0.08;
        });
        if (hasSide) {
          var sy = y;
          if (s.glossary && s.glossary.length) { var gk = scaleFor(s.id, "glossary", [{ t: "用語ミニ解説", pt: 15, bold: true }].concat(s.glossary.map(function (g) { return { t: g.term + "　" + g.oneLine, pt: 12 }; })), 4.0, 2.6, 6); sl.addText([{ text: "用語ミニ解説", options: { bold: true, fontSize: sz(15, gk), color: hex(THEME.copilotDeep), breakLine: true } }].concat(s.glossary.map(function (g) { return { text: g.term + "　" + g.oneLine, options: { fontSize: sz(12, gk), color: hex(THEME.fg), breakLine: true } }; })), { x: 8.9, y: sy, w: 4.0, h: 2.6, fontFace: F, valign: "top", fill: { color: hex(THEME.subtle) }, line: { color: hex(THEME.border), width: 1 }, margin: 6 }); sy += 2.7; }
          if (s.suggestions && s.suggestions.length) { var sh = Math.max(1, 6.85 - sy), sk = scaleFor(s.id, "suggestions", [{ t: "こう使うと便利", pt: 15, bold: true }].concat(s.suggestions.map(function (x) { return { t: x, pt: 12, indent: 14 }; })), 4.0, sh, 6); sl.addText([{ text: "こう使うと便利", options: { bold: true, fontSize: sz(15, sk), color: hex(THEME.attention), breakLine: true } }].concat(s.suggestions.map(function (x) { return { text: x, options: { bullet: { indent: 14 }, fontSize: sz(12, sk), color: hex(THEME.fg), breakLine: true } }; })), { x: 8.9, y: sy, w: 4.0, h: sh, fontFace: F, valign: "top", fill: { color: "FFF8E8" }, line: { color: hex(THEME.attention), width: 1, dashType: "dash" }, margin: 6 }); }
        }
        var refs = [{ text: "発表　", options: { bold: true, color: hex(THEME.fg) } }, { text: s.references.source.title || s.references.source.url, options: { hyperlink: { url: s.references.source.url }, color: hex(THEME.link) } }];
        (s.references.documents || []).forEach(function (d, i) { refs.push({ text: i === 0 ? "　　詳細　" : "　|　", options: { bold: i === 0, color: hex(THEME.fg) } }); refs.push({ text: d.title, options: { hyperlink: { url: d.url }, color: hex(THEME.link) } }); });
        var refText = refs.map(function (r) { return r.text; }).join("");
        sl.addText(refs, { x: 0.4, y: 6.9, w: 9.4, h: 0.5, fontFace: F, fontSize: sz(9, scaleFor(s.id, "references", [{ t: refText, pt: 9 }], 9.4, 0.5)), valign: "top" });
        sl.addNotes(["発表: " + s.references.source.url].concat((s.references.documents || []).map(function (d) { return "詳細: " + d.url; }), (s.evidence || []).map(function (u) { return "根拠: " + u; }), (s.qa && s.qa.length ? ["", "【想定問答】"].concat(s.qa.map(function (x, i) { return "Q" + (i + 1) + ". " + x.q + "\\nA. " + x.a; })) : [])).join("\\n"));
        sl.addText("分類: " + s.topic + " ｜ ID " + s.id, { x: 9.9, y: 7.12, w: 3.0, h: 0.25, fontFace: F, fontSize: 8, color: hex(THEME.muted), align: "right" });
      });
      var end = pptx.addSlide(); end.background = { color: hex(THEME.dark) };
      end.addShape("custGeom", { x: 0, y: 0.15, w: W, h: H - 0.73, fill: { color: hex(THEME.darkSubtle) }, line: { color: hex(THEME.darkSubtle), width: 0 }, points: [{ x: W * 0.45, y: 0 }, { x: W, y: 0 }, { x: W, y: H - 0.73 }, { x: W * 0.2, y: H - 0.73 }, { close: true }] });
      frame(end, TEXT.copyright, TEXT.source);
      end.addText(TEXT.endTitle, { x: 0, y: 2.4, w: W, h: 1.1, fontFace: F, fontSize: 48, bold: true, color: "FFFFFF", align: "center", margin: 0 });
      end.addText(TEXT.title, { x: 0, y: 3.55, w: W, h: 0.55, fontFace: F, fontSize: 20, bold: true, color: hex(THEME.copilot), align: "center", margin: 0 });
      end.addText([{ text: TEXT.automationNote, options: { breakLine: true, color: hex(THEME.onDark) } }, { text: TEXT.repoUrl, options: { hyperlink: { url: TEXT.repoUrl }, color: "79C0FF", underline: { style: "sng" }, breakLine: true } }, { text: TEXT.authorLabel + "　" + TEXT.profileUrl, options: { hyperlink: { url: TEXT.profileUrl }, color: "79C0FF", underline: { style: "sng" }, breakLine: true } }, { text: TEXT.siteUrl, options: { hyperlink: { url: TEXT.siteUrl }, color: "79C0FF", underline: { style: "sng" } } }], { x: 1, y: 5.4, w: 11.3, h: 1.1, fontFace: F, fontSize: 11, valign: "top", margin: 0 });      await pptx.writeFile({ fileName: stem(list) + ".pptx" });
      setStatus(savedText(list.length));
    } catch (e) { setStatus(e instanceof WrongPassword ? L.wrongPassword : L.failed, true); }
  }

  async function downloadJson() {
    var list = ordered(selection());
    setStatus(L.preparing);
    try {
      var slides = await fetchSlideJson(list);
      var o = ordered(list);
      var deck = { schema: "vscode-copilot-digest/deck/v1", selection: { mode: "filter", period: o.length ? { start: o[0].date, end: o[o.length - 1].date } : undefined, snapshotAt: new Date().toISOString() }, slides: slides };
      download(new Blob([JSON.stringify(deck, null, 2) + "\\n"], { type: "application/json" }), stem(list) + ".json");
      setStatus(savedText(list.length));
    } catch (e) { setStatus(L.failed, true); }
  }

  panel.addEventListener("change", function (e) {
    var t = e.target;
    if (t && t.hasAttribute && t.hasAttribute("data-dl-item")) { if (t.checked) excluded.delete(t.value); else excluded.add(t.value); refresh(); return; }
    renderList(); refresh();
  });
  $("[data-dl-q]").addEventListener("input", function () { renderList(); refresh(); });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || !t.hasAttribute || !t.hasAttribute("data-card-pick")) return;
    if (t.checked) excluded.delete(t.value); else excluded.add(t.value);
    renderList(); refresh();
  });
  $("[data-dl-all]").addEventListener("click", function () { excluded.clear(); renderList(); refresh(); });
  $("[data-dl-none]").addEventListener("click", function () { matching().forEach(function (s) { excluded.add(s.id); }); renderList(); refresh(); });
  panel.querySelectorAll("[data-dl-range]").forEach(function (b) { b.addEventListener("click", function () { setRange(Number(b.getAttribute("data-dl-range"))); }); });
  $("[data-dl-reset]").addEventListener("click", function () { panel.querySelectorAll("input:not([data-dl-item])").forEach(function (i) { if (i.type === "checkbox") i.checked = false; else i.value = ""; }); excluded.clear(); setStatus(""); renderList(); refresh(); });
  $('[data-dl="json"]').addEventListener("click", downloadJson);
  $('[data-dl="pdf"]').addEventListener("click", mergePdf);
  $('[data-dl="pptx"]').addEventListener("click", buildPptx);

  fetch(new URL("data/slides.json", root), { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (m) {
    manifest = m;
    if (!m.slides || m.slides.length === 0) return;
    m.slides.sort(function (a, b) { return b.date.localeCompare(a.date) || a.id.localeCompare(b.id); });
    panel.hidden = false;
    if (m.pdfCrypto) { $('[data-dl="pdf"]').hidden = false; $('[data-dl="pptx"]').hidden = false; }
    if (m.sample) { var a = $("[data-dl-sample]"); a.href = new URL(m.sample, root).href; a.hidden = false; }
    setRange(30);
  }).catch(function () { /* no slides published */ });
})();
`;
}
