import { DECK_TEXT, GITHUB_PALETTE } from "./theme.mjs";
import { STATUS_LABELS } from "./slides.mjs";

const escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const MAX_MERGE = 50;

export function slidesPageHtml(version = "0") {
  const P = GITHUB_PALETTE;
  const statusOptions = ["ga", "preview", "retirement", "announcement", "update"].map((s) => `<option value="${s}">${escapeHtml(STATUS_LABELS[s])}</option>`).join("");
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>スライドの JSON / PDF ダウンロード | ${escapeHtml(DECK_TEXT.title)}</title>
<style>
body{margin:0;font-family:"Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif;color:${P.fg};background:${P.subtle}}
header{background:${P.dark};color:${P.onDark};padding:18px 32px;border-bottom:4px solid ${P.copilot}}
header a{color:${P.onDark}}
main{max-width:960px;margin:20px auto;padding:0 20px}
.bar{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;background:#fff;border:1px solid ${P.border};border-radius:8px;padding:12px 16px;margin-bottom:12px}
button{background:${P.copilot};color:#fff;border:0;border-radius:6px;padding:9px 18px;font-size:15px;cursor:pointer}
button:disabled{background:${P.muted};cursor:not-allowed}
button.secondary{background:#fff;color:${P.fg};border:1px solid ${P.border}}
#list{max-height:420px;overflow:auto;border:1px solid ${P.border};border-radius:6px;padding:6px 10px;background:#fff}
#list div{padding:3px 0}
.tag{font-size:12px;color:#fff;border-radius:999px;padding:1px 10px;margin-left:6px}
.lock{color:${P.muted};font-size:13px;margin-left:6px}
#status{min-height:1.5em;font-weight:600}
.err{color:${P.danger}}
small{color:${P.muted}}
</style></head><body>
<header><h1 style="margin:0;font-size:21px">${escapeHtml(DECK_TEXT.title)} スライド</h1><p style="margin:6px 0 0"><a href="./">サイトに戻る</a> ・ <a href="api/v1/index.json">JSON API</a></p></header>
<main>
<p>選んだ更新を、JSON としても、表紙・目次・概要・裏表紙付きの 1 つの PDF としてもダウンロードできます。PDF の結合はブラウザ内で行います。最新の 1 件は PDF を自由に開けます。そのほかの PDF は暗号化されており、結合にはパスワードが必要です（パスワードは画面上の確認だけで、サーバーには送信しません）。結合後の PDF は暗号化されません。最大 ${MAX_MERGE} 件まで選べます。</p>
<p id="empty" hidden>公開中のスライドはまだありません。</p>
<form id="form" onsubmit="return false">
<div class="bar" role="group" aria-label="絞り込み">
<label>開始 <input type="date" id="from"></label><label>終了 <input type="date" id="to"></label>
<label>種類 <select id="kind"><option value="">すべて</option>${statusOptions}</select></label>
<button type="button" class="secondary" id="pick">表示中をすべて選択</button>
<button type="button" class="secondary" id="clear">選択を解除</button>
<span>選択 <strong id="count">0</strong> 件</span></div>
<div id="list" role="group" aria-label="更新の一覧"></div>
<div class="bar" style="margin-top:12px">
<label id="pwlabel">PDF のパスワード <input type="password" id="pw" autocomplete="off"></label>
<button type="button" id="go" disabled>結合 PDF をダウンロード</button>
<button type="button" id="json" disabled>選択を JSON でダウンロード</button></div>
<p id="status" role="status" aria-live="polite"></p>
</form><p><small>${escapeHtml(DECK_TEXT.copyright)}。出典: ${escapeHtml(DECK_TEXT.source.replace("出典: ", ""))}</small></p></main>
<script src="assets/vendor/pdf-lib.min.js?v=${version}"></script>
<script src="assets/slides-ui.js?v=${version}"></script>
</body></html>
`;
}

export function slidesUiJs() {
  return `"use strict";
const THEME = ${JSON.stringify(GITHUB_PALETTE)};
const TEXT = ${JSON.stringify(DECK_TEXT)};
const STATUS_LABELS = ${JSON.stringify(STATUS_LABELS)};
const MAX = ${MAX_MERGE};
const FONT = '"Noto Sans CJK JP","Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif';
const W = 1280, H = 720, PT = 0.75;
const PER_TOC = 13;
const $ = (id) => document.getElementById(id);
let manifest = null;

function setStatus(message, error) { const el = $("status"); el.textContent = message; el.className = error ? "err" : ""; }
function visibleBoxes() { return [...document.querySelectorAll("#list input")].filter((el) => !el.closest("div").hidden); }
function selected() { return [...document.querySelectorAll("#list input:checked")].map((el) => manifest.slides.find((s) => s.id === el.value)); }
function pdfReady() { return !!manifest.pdfCrypto; }
function refresh() {
  const chosen = selected();
  $("count").textContent = String(chosen.length);
  const ok = chosen.length > 0 && chosen.length <= MAX;
  const needsPw = chosen.some((s) => s.encrypted);
  $("json").disabled = !ok;
  $("go").disabled = !ok || !pdfReady() || chosen.some((s) => !s.pdf) || (needsPw && !$("pw").value);
}
function applyFilter() {
  const f = $("from").value, t = $("to").value, k = $("kind").value;
  for (const box of document.querySelectorAll("#list input")) {
    const s = manifest.slides.find((x) => x.id === box.value);
    box.closest("div").hidden = !((!f || s.date >= f) && (!t || s.date <= t) && (!k || s.status === k));
  }
}

async function load() {
  const response = await fetch("data/slides.json", { cache: "no-cache" });
  manifest = await response.json();
  manifest.slides.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  if (manifest.slides.length === 0) { $("empty").hidden = false; $("form").hidden = true; return; }
  if (!pdfReady()) { $("go").hidden = true; $("pwlabel").hidden = true; }
  for (const slide of manifest.slides) {
    const row = document.createElement("div");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox"; box.value = slide.id; box.addEventListener("change", refresh);
    label.append(box, " " + slide.date + " 【" + slide.topic + "】" + slide.title);
    row.append(label);
    if (slide.status !== "unknown") { const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = STATUS_LABELS[slide.status] || slide.status; tag.style.background = THEME.copilot; row.append(tag); }
    if (slide.pdf && !slide.encrypted) { const a = document.createElement("a"); a.href = slide.pdf; a.textContent = " PDF（無料）"; a.className = "lock"; row.append(a); }
    else if (slide.encrypted) { const s = document.createElement("span"); s.className = "lock"; s.textContent = "🔒 PDF は結合時にパスワードが必要"; row.append(s); }
    $("list").append(row);
  }
  refresh();
}

function fitText(ctx, s, max) { if (ctx.measureText(s).width <= max) return s; let t = s; while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1); return t + "…"; }

function footer(ctx, left, right) {
  ctx.fillStyle = "#010409"; ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = THEME.onDark; ctx.font = "16px " + FONT; ctx.textBaseline = "middle";
  ctx.fillText(left, 96, H - 28); ctx.textAlign = "right"; ctx.fillText(right, W - 96, H - 28); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

function frame(ctx) {
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, THEME.copilot); g.addColorStop(0.7, THEME.copilot); g.addColorStop(0.7, THEME.done); g.addColorStop(0.85, THEME.done); g.addColorStop(0.85, THEME.link); g.addColorStop(1, THEME.link);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 14);
}

function drawCover(ctx, items, period, createdUtc) {
  ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H); frame(ctx);
  ctx.fillStyle = THEME.darkSubtle; ctx.beginPath(); ctx.moveTo(W * 0.7, 14); ctx.lineTo(W, 14); ctx.lineTo(W, H - 56); ctx.lineTo(W * 0.42, H - 56); ctx.closePath(); ctx.fill();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = THEME.copilot; ctx.font = "600 22px " + FONT; ctx.fillText(TEXT.eyebrow, 96, 218);
  ctx.fillStyle = "#fff"; ctx.font = "700 50px " + FONT; ctx.fillText(TEXT.title, 96, 290);
  ctx.fillStyle = THEME.onDark; ctx.font = "600 28px " + FONT; if (period) ctx.fillText("対象期間 " + period, 96, 360);
  ctx.font = "700 44px " + FONT; ctx.fillStyle = "#fff"; ctx.fillText(String(items.length), 96, 430);
  const numWidth = ctx.measureText(String(items.length)).width;
  ctx.font = "26px " + FONT; ctx.fillText(" 件", 96 + numWidth, 430);
  footer(ctx, "作成日 " + createdUtc + "（UTC）", TEXT.source);
}

function drawToc(ctx, items, start, first, firstPage) {
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); frame(ctx);
  ctx.fillStyle = THEME.dark; ctx.font = "700 34px " + FONT; ctx.fillText(first ? TEXT.tocTitle.split("・")[0] : TEXT.tocTitle.split("・")[0] + "（続き）", 70, 80);
  ctx.fillStyle = THEME.copilot; ctx.fillRect(70, 94, 240, 4);
  ctx.font = "20px " + FONT;
  items.forEach((item, i) => {
    const y = 150 + i * 36;
    ctx.fillStyle = THEME.copilot; ctx.fillText(String(start + i + 1) + ".", 70, y);
    ctx.fillStyle = THEME.fg; ctx.fillText(fitText(ctx, "【" + item.topic + "】" + item.title, W - 70 - 120 - 130), 120, y);
    const page = String(firstPage + start + i); ctx.fillStyle = THEME.muted; ctx.textAlign = "right"; ctx.fillText(page, W - 70, y); ctx.textAlign = "left";
  });
  footer(ctx, TEXT.title, TEXT.source);
}

function count(items, key) { const m = new Map(); for (const i of items) { const k = key(i); m.set(k, (m.get(k) || 0) + 1); } return [...m].sort((a, b) => b[1] - a[1]); }

function drawSummary(ctx, items) {
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); frame(ctx);
  ctx.fillStyle = THEME.dark; ctx.font = "700 34px " + FONT; ctx.fillText("概要", 70, 80);
  ctx.fillStyle = THEME.copilot; ctx.fillRect(70, 94, 120, 4);
  ctx.font = "600 22px " + FONT; ctx.fillStyle = THEME.copilot; ctx.fillText("種類別", 70, 150); ctx.fillText("トピック別", 560, 150);
  ctx.font = "22px " + FONT; ctx.fillStyle = THEME.fg;
  count(items, (s) => STATUS_LABELS[s.status] || "更新").forEach(([k, v], i) => ctx.fillText(k + "　" + v + " 件", 90, 196 + i * 34));
  count(items, (s) => s.topic).forEach(([k, v], i) => ctx.fillText(k + "　" + v + " 件", 580, 196 + i * 34));
  footer(ctx, TEXT.title, TEXT.source);
}

function drawEnd(ctx) {
  ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H); frame(ctx);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "700 64px " + FONT; ctx.fillText(TEXT.endTitle, W / 2, 330);
  ctx.fillStyle = THEME.copilot; ctx.font = "600 26px " + FONT; ctx.fillText(TEXT.title, W / 2, 390); ctx.textAlign = "left";
  ctx.fillStyle = THEME.onDark; ctx.font = "14px " + FONT; ctx.fillText(TEXT.automationNote, 96, 604);
  ctx.fillStyle = THEME.link; ctx.fillText(TEXT.repoUrl, 96, 630);
  const width = ctx.measureText(TEXT.repoUrl).width; ctx.fillRect(96, 634, width, 1);
  footer(ctx, TEXT.copyright, TEXT.source);
  return { x: 96, top: 616, w: width, h: 22 };
}

async function canvasPng(draw) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const result = draw(canvas.getContext("2d"));
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), result };
}

function b64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }
async function deriveKey(password, info) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(info.salt), iterations: info.iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}
async function decrypt(key, bytes) { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12))); }

function download(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); }
function ordered() { return selected().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)); }
function periodOf(chosen) { return chosen.length ? chosen[0].date + " 〜 " + chosen[chosen.length - 1].date : ""; }
function fileStem(chosen) { return "copilot-vscode-digest-" + (chosen[0] ? chosen[0].date : "") + "_" + (chosen.length ? chosen[chosen.length - 1].date : ""); }

async function merge() {
  const chosen = ordered();
  $("go").disabled = true;
  try {
    const { PDFDocument, PDFString } = PDFLib;
    let key = null;
    if (chosen.some((s) => s.encrypted)) key = await deriveKey($("pw").value, manifest.pdfCrypto);
    const out = await PDFDocument.create();
    const addImage = async (draw) => {
      const { bytes, result } = await canvasPng(draw);
      const page = out.addPage([W * PT, H * PT]);
      page.drawImage(await out.embedPng(bytes), { x: 0, y: 0, width: W * PT, height: H * PT });
      return { page, result };
    };
    const tocPages = Math.max(1, Math.ceil(chosen.length / PER_TOC));
    const firstPage = 1 + tocPages + 1 + 1;
    await addImage((ctx) => drawCover(ctx, chosen, periodOf(chosen), new Date().toISOString().slice(0, 10)));
    for (let start = 0; start < chosen.length; start += PER_TOC) await addImage((ctx) => drawToc(ctx, chosen.slice(start, start + PER_TOC), start, start === 0, firstPage));
    await addImage((ctx) => drawSummary(ctx, chosen));
    let done = 0;
    for (const slide of chosen) {
      setStatus("取得中 " + (++done) + " / " + chosen.length);
      const response = await fetch(slide.pdf);
      if (!response.ok) throw new Error(slide.id + " を取得できませんでした (" + response.status + ")");
      let bytes = new Uint8Array(await response.arrayBuffer());
      if (slide.encrypted) { try { bytes = await decrypt(key, bytes); } catch (e) { throw new Error("復号に失敗しました。パスワードを確認してください。"); } }
      const src = await PDFDocument.load(bytes);
      for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
    }
    const end = await addImage(drawEnd);
    const r = end.result;
    const link = out.context.obj({ Type: "Annot", Subtype: "Link", Rect: [r.x * PT, (H - r.top - r.h) * PT, (r.x + r.w) * PT, (H - r.top) * PT], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(TEXT.repoUrl) } });
    end.page.node.addAnnot(out.context.register(link));
    out.setTitle(TEXT.title);
    download(new Blob([await out.save()], { type: "application/pdf" }), fileStem(chosen) + ".pdf");
    setStatus("ダウンロードしました（" + chosen.length + " 件）");
  } catch (error) { setStatus(error.message, true); }
  finally { refresh(); }
}

async function downloadJson() {
  const chosen = ordered();
  $("json").disabled = true;
  try {
    const slides = [];
    for (const entry of chosen) {
      const response = await fetch("slides/" + entry.id + ".json");
      if (!response.ok) throw new Error(entry.id + " の JSON を取得できませんでした (" + response.status + ")");
      slides.push(await response.json());
    }
    const deck = { schema: "vscode-copilot-digest/deck/v1", selection: { mode: "ids", period: chosen.length ? { start: chosen[0].date, end: chosen[chosen.length - 1].date } : undefined, snapshotAt: new Date().toISOString() }, slides };
    download(new Blob([JSON.stringify(deck, null, 2) + "\\n"], { type: "application/json" }), fileStem(chosen) + ".json");
    setStatus("JSON をダウンロードしました（" + chosen.length + " 件）");
  } catch (error) { setStatus(error.message, true); }
  finally { refresh(); }
}

$("pick").addEventListener("click", () => { let n = 0; for (const box of document.querySelectorAll("#list input")) box.checked = false; for (const box of visibleBoxes()) { if (n < MAX) { box.checked = true; n++; } } refresh(); });
$("clear").addEventListener("click", () => { for (const box of document.querySelectorAll("#list input")) box.checked = false; refresh(); });
for (const id of ["from", "to", "kind"]) $(id).addEventListener("change", applyFilter);
$("pw").addEventListener("input", refresh);
$("go").addEventListener("click", merge);
$("json").addEventListener("click", downloadJson);
load().catch((error) => setStatus("一覧を読み込めませんでした: " + error.message, true));
`;
}
