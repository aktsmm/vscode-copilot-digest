import { DECK_TEXT, GITHUB_PALETTE } from "./theme.mjs";
import { STATUS_LABELS } from "./slides.mjs";

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const MAX_MERGE = 50;
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
    password: "PDF のパスワードを入力してください",
    needPassword: "パスワードを入力してください。", wrongPassword: "パスワードが違います。",
    preparing: "準備中…", merging: (d, t) => `結合中… ${d} / ${t}`, saved: (n) => `保存しました（${n} 件）`, failed: "作成できませんでした。時間をおいて再度お試しください。",
    topicLabels: { "GitHub Copilot": "GitHub Copilot", "VS Code": "VS Code", "GitHub Platform": "GitHub Platform", "周辺ニュース": "周辺ニュース" },
    periodPrefix: "対象期間", countUnit: " 件",
  },
  en: {
    title: "Download slides", from: "From", to: "To", last30: "Last 30 days", last7: "Last 7 days", clear: "Clear",
    kind: "Type", topic: "Topic", json: "JSON", pdf: "PDF", pptx: "PPTX", sample: "Sample PDF",
    jsonTitle: "Slide JSON for the selected range",
    pdfTitle: "Merge the selected slides into one PDF (password required)",
    pptxTitle: "The same range as an editable PowerPoint (.pptx) (password required)",
    sampleTitle: "The newest slide (no password needed)",
    summary: (n) => `${n} slides available`,
    password: "Enter the PDF password",
    needPassword: "Enter the password.", wrongPassword: "Wrong password.",
    preparing: "Preparing…", merging: (d, t) => `Merging… ${d} / ${t}`, saved: (n) => `Saved (${n} items)`, failed: "Could not build the file. Please try again later.",
    topicLabels: { "GitHub Copilot": "GitHub Copilot", "VS Code": "VS Code", "GitHub Platform": "GitHub Platform", "周辺ニュース": "Other news" },
    periodPrefix: "Period", countUnit: "",
  },
};

const kindLabel = (locale, k) => (locale === "ja" ? STATUS_LABELS[k] : { ga: "GA", preview: "Preview", retirement: "Retirement", announcement: "Announcement", update: "Update" }[k]);

export function downloadPanelHtml(locale = "ja") {
  const L = LABELS[locale] ?? LABELS.ja;
  const chip = (group, value, label) => `<label class="dl-chip"><input type="checkbox" data-dl-${group} value="${esc(value)}"><span>${esc(label)}</span></label>`;
  return `<section class="section-block dl-panel" data-dl-panel hidden aria-label="${esc(L.title)}">
    <div class="dl-row">
      <label class="dl-field">${esc(L.from)} <input type="date" data-dl-from></label>
      <label class="dl-field">${esc(L.to)} <input type="date" data-dl-to></label>
      <button type="button" class="dl-btn dl-btn--ghost" data-dl-range="30">${esc(L.last30)}</button>
      <button type="button" class="dl-btn dl-btn--ghost" data-dl-range="7">${esc(L.last7)}</button>
      <button type="button" class="dl-btn dl-btn--ghost" data-dl-reset>${esc(L.clear)}</button>
    </div>
    <div class="dl-chips"><span class="dl-label">${esc(L.kind)}</span>${KINDS.map((k) => chip("kind", k, kindLabel(locale, k))).join("")}</div>
    <div class="dl-chips"><span class="dl-label">${esc(L.topic)}</span>${TOPICS.map((t) => chip("topic", t, L.topicLabels[t])).join("")}</div>
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
.dl-btn{font:inherit;padding:7px 16px;border-radius:8px;border:1px solid ${P.copilot};background:#fff;color:${P.copilotDeep};cursor:pointer}
.dl-btn:hover:not(:disabled),.dl-btn:focus-visible{background:${P.copilotTint}}
.dl-btn:disabled{border-color:${P.border};color:${P.muted};cursor:not-allowed;background:${P.subtle}}
.dl-btn--ghost{border-color:${P.border};color:${P.fg}}
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
  function selection() {
    var from = $("[data-dl-from]").value, to = $("[data-dl-to]").value, kinds = checked("kind"), topics = checked("topic");
    return manifest.slides.filter(function (s) {
      return (!from || s.date >= from) && (!to || s.date <= to) && (!kinds.length || kinds.indexOf(s.status === "unknown" ? "update" : s.status) >= 0) && (!topics.length || topics.indexOf(s.topic) >= 0);
    });
  }
  function ordered(list) { return list.slice().sort(function (a, b) { return a.date.localeCompare(b.date) || a.id.localeCompare(b.id); }); }
  function refresh() {
    var sel = selection(), withPdf = sel.filter(function (s) { return s.pdf; });
    var json = $('[data-dl="json"]'), pdf = $('[data-dl="pdf"]'), pptx = $('[data-dl="pptx"]');
    json.textContent = L.json + "（" + sel.length + "）"; json.disabled = sel.length === 0 || sel.length > MAX;
    pdf.textContent = L.pdf + "（" + withPdf.length + "）"; pdf.disabled = withPdf.length === 0 || withPdf.length > MAX;
    pptx.textContent = L.pptx + "（" + withPdf.length + "）"; pptx.disabled = withPdf.length === 0 || withPdf.length > MAX;
  }
  function setRange(days) {
    var end = new Date(); var start = new Date(end.getTime() - (days - 1) * 86400000);
    var fmt = function (d) { return d.toISOString().slice(0, 10); };
    $("[data-dl-from]").value = fmt(start); $("[data-dl-to]").value = fmt(end); refresh();
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
  function drawCover(ctx, items, period, created) {
    ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H); frame(ctx);
    ctx.fillStyle = THEME.darkSubtle; ctx.beginPath(); ctx.moveTo(W * 0.7, 14); ctx.lineTo(W, 14); ctx.lineTo(W, H - 56); ctx.lineTo(W * 0.42, H - 56); ctx.closePath(); ctx.fill();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = THEME.copilot; ctx.font = "600 22px " + FONT; ctx.fillText(TEXT.eyebrow, 96, 218);
    ctx.fillStyle = "#fff"; ctx.font = "700 50px " + FONT; ctx.fillText(TEXT.title, 96, 290);
    ctx.fillStyle = THEME.onDark; ctx.font = "600 28px " + FONT; if (period) ctx.fillText("対象期間 " + period, 96, 360);
    ctx.font = "700 44px " + FONT; ctx.fillStyle = "#fff"; ctx.fillText(String(items.length), 96, 430);
    var w = ctx.measureText(String(items.length)).width; ctx.font = "26px " + FONT; ctx.fillText(" 件", 96 + w, 430);
    footer(ctx, "作成日 " + created + "（UTC）", TEXT.source);
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
    count(items, function (s) { return STATUS_LABELS[s.status] || "更新"; }).forEach(function (kv, i) { ctx.fillText(kv[0] + "　" + kv[1] + " 件", 90, 196 + i * 34); });
    count(items, function (s) { return s.topic; }).forEach(function (kv, i) { ctx.fillText(kv[0] + "　" + kv[1] + " 件", 580, 196 + i * 34); });
    footer(ctx, TEXT.title, TEXT.source);
  }
  function drawEnd(ctx) {
    ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H); frame(ctx);
    ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "700 64px " + FONT; ctx.fillText(TEXT.endTitle, W / 2, 330);
    ctx.fillStyle = THEME.copilot; ctx.font = "600 26px " + FONT; ctx.fillText(TEXT.title, W / 2, 390); ctx.textAlign = "left";
    ctx.fillStyle = THEME.onDark; ctx.font = "14px " + FONT; ctx.fillText(TEXT.automationNote, 96, 604);
    ctx.fillStyle = THEME.link; ctx.fillText(TEXT.repoUrl, 96, 630);
    var width = ctx.measureText(TEXT.repoUrl).width; ctx.fillRect(96, 634, width, 1);
    footer(ctx, TEXT.copyright, TEXT.source);
    return { x: 96, top: 616, w: width, h: 22 };
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
      await addImage(function (ctx) { drawCover(ctx, list, periodOf(list), new Date().toISOString().slice(0, 10)); });
      for (var s = 0; s < list.length; s += PER_TOC) { await addImage(function (ctx) { drawToc(ctx, list.slice(s, s + PER_TOC), s, s === 0, firstPage); }); }
      await addImage(function (ctx) { drawSummary(ctx, list); });
      var done = 0;
      for (var i = 0; i < list.length; i++) {
        setStatus(mergingText(++done, list.length));
        var src = await PDFDocument.load(await fetchPdf(list[i], password));
        var pages = await out.copyPages(src, src.getPageIndices()); pages.forEach(function (p) { out.addPage(p); });
      }
      var end = await addImage(drawEnd), r = end.result;
      var link = out.context.obj({ Type: "Annot", Subtype: "Link", Rect: [r.x * PT, (H - r.top - r.h) * PT, (r.x + r.w) * PT, (H - r.top) * PT], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(TEXT.repoUrl) } });
      end.page.node.addAnnot(out.context.register(link));
      out.setTitle(TEXT.title);
      download(new Blob([await out.save()], { type: "application/pdf" }), stem(list) + ".pdf");
      setStatus(savedText(list.length));
    } catch (e) { setStatus(e instanceof WrongPassword ? L.wrongPassword : L.failed, true); }
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
      var cover = pptx.addSlide(); cover.background = { color: hex(THEME.dark) };
      cover.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: hex(THEME.copilot) }, line: { color: hex(THEME.copilot) } });
      cover.addText(TEXT.eyebrow, { x: 0.9, y: 2.0, w: 11, h: 0.4, fontFace: F, fontSize: 18, bold: true, color: hex(THEME.copilot) });
      cover.addText(TEXT.title, { x: 0.9, y: 2.5, w: 11.5, h: 1, fontFace: F, fontSize: 38, bold: true, color: "FFFFFF" });
      cover.addText((periodOf(list) ? "対象期間 " + periodOf(list) + "　" : "") + list.length + " 件", { x: 0.9, y: 3.7, w: 11, h: 0.6, fontFace: F, fontSize: 22, color: hex(THEME.onDark) });
      cover.addText(TEXT.source, { x: 0.9, y: 6.8, w: 11.5, h: 0.4, fontFace: F, fontSize: 12, color: hex(THEME.onDark) });
      var toc = pptx.addSlide();
      toc.addText(TEXT.tocTitle, { x: 0.6, y: 0.3, w: 12, h: 0.7, fontFace: F, fontSize: 28, bold: true, color: hex(THEME.dark) });
      toc.addText(slides.map(function (s, i) { return { text: (i + 1) + ".  【" + s.topic + "】" + s.title.ja, options: { breakLine: true } }; }), { x: 0.6, y: 1.2, w: 12, h: 5.8, fontFace: F, fontSize: 14, color: hex(THEME.fg), valign: "top" });
      slides.forEach(function (s) {
        var sl = pptx.addSlide(); var y = 0.3;
        sl.addText(s.date + " ・ " + s.topic + (s.status !== "unknown" ? " ・ " + (STATUS_LABELS[s.status] || s.status) : ""), { x: 0.5, y: y, w: 12.3, h: 0.3, fontFace: F, fontSize: 11, color: hex(THEME.muted) }); y += 0.35;
        sl.addText(s.title.ja, { x: 0.5, y: y, w: 12.3, h: 0.7, fontFace: F, fontSize: 24, bold: true, color: hex(THEME.dark) }); y += 0.8;
        sl.addText(s.summary, { x: 0.5, y: y, w: 12.3, h: 0.9, fontFace: F, fontSize: 15, color: hex(THEME.fg), fill: { color: hex(THEME.copilotTint) }, margin: 8 }); y += 1.0;
        if (s.audience) { sl.addText([{ text: "誰に関係するか　", options: { bold: true, color: hex(THEME.copilotDeep) } }, { text: s.audience.who, options: { breakLine: true } }, { text: "何が変わるか　", options: { bold: true, color: hex(THEME.copilotDeep) } }, { text: s.audience.change }], { x: 0.5, y: y, w: 12.3, h: 0.8, fontFace: F, fontSize: 12, color: hex(THEME.fg) }); y += 0.9; }
        if (s.beforeAfter) { sl.addText("変更前　" + s.beforeAfter.before + "\\n変更後　" + s.beforeAfter.after, { x: 0.5, y: y, w: 12.3, h: 0.8, fontFace: F, fontSize: 12, color: hex(THEME.fg) }); y += 0.9; }
        sl.addText(s.points.map(function (p) { return { text: p, options: { bullet: true, breakLine: true } }; }), { x: 0.5, y: y, w: 12.3, h: 1.6, fontFace: F, fontSize: 14, color: hex(THEME.fg), valign: "top" }); y += 1.7;
        if (s.action) { sl.addText("やること　" + s.action, { x: 0.5, y: y, w: 12.3, h: 0.5, fontFace: F, fontSize: 12, color: hex(THEME.attention) }); y += 0.55; }
        if (s.timeline) { sl.addText(s.timeline.map(function (t) { return t.when + " " + t.label; }).join("　→　"), { x: 0.5, y: y, w: 12.3, h: 0.4, fontFace: F, fontSize: 11, color: hex(THEME.muted) }); y += 0.45; }
        if (s.glossary) { sl.addText(s.glossary.map(function (g) { return g.term + "　" + g.oneLine; }).join("\\n"), { x: 0.5, y: y, w: 12.3, h: 0.7, fontFace: F, fontSize: 11, color: hex(THEME.fg) }); }
        sl.addText([{ text: "原文: " + s.references.source, options: { hyperlink: { url: s.references.source } } }], { x: 0.5, y: 7.0, w: 9, h: 0.3, fontFace: F, fontSize: 9, color: hex(THEME.link) });
        sl.addText(TEXT.creator, { x: 9.3, y: 7.0, w: 3.6, h: 0.3, fontFace: F, fontSize: 9, color: hex(THEME.muted), align: "right" });
      });
      var end = pptx.addSlide(); end.background = { color: hex(THEME.dark) };
      end.addText(TEXT.endTitle, { x: 0, y: 2.6, w: 13.33, h: 1, fontFace: F, fontSize: 44, bold: true, color: "FFFFFF", align: "center" });
      end.addText(TEXT.title, { x: 0, y: 3.6, w: 13.33, h: 0.5, fontFace: F, fontSize: 18, color: hex(THEME.copilot), align: "center" });
      end.addText(TEXT.automationNote + "\\n" + TEXT.repoUrl, { x: 0.9, y: 6.2, w: 11.5, h: 0.6, fontFace: F, fontSize: 10, color: hex(THEME.onDark) });
      end.addText(TEXT.copyright, { x: 0.9, y: 6.9, w: 11.5, h: 0.3, fontFace: F, fontSize: 10, color: hex(THEME.onDark) });
      await pptx.writeFile({ fileName: stem(list) + ".pptx" });
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

  panel.addEventListener("change", refresh);
  panel.querySelectorAll("[data-dl-range]").forEach(function (b) { b.addEventListener("click", function () { setRange(Number(b.getAttribute("data-dl-range"))); }); });
  $("[data-dl-reset]").addEventListener("click", function () { panel.querySelectorAll("input").forEach(function (i) { if (i.type === "checkbox") i.checked = false; else i.value = ""; }); setStatus(""); refresh(); });
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
    refresh();
  }).catch(function () { /* no slides published */ });
})();
`;
}
