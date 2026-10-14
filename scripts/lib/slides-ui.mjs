import { DECK_TEXT, GITHUB_PALETTE } from "./theme.mjs";

const escapeHtml = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const MAX_MERGE = 50;

export function slidesPageHtml() {
  const P = GITHUB_PALETTE;
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>スライド PDF の作成 | ${escapeHtml(DECK_TEXT.title)}</title>
<style>
body{margin:0;font-family:"Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif;color:${P.fg};background:${P.subtle}}
header{background:${P.dark};color:${P.onDark};padding:20px 32px;border-bottom:4px solid ${P.copilot}}
header a{color:${P.onDark}}
main{max-width:960px;margin:24px auto;padding:0 20px}
fieldset{border:1px solid ${P.border};background:#fff;border-radius:8px;margin:0 0 16px;padding:14px 18px}
label{display:inline-block;margin:4px 14px 4px 0}
button{background:${P.copilot};color:#fff;border:0;border-radius:6px;padding:10px 20px;font-size:16px;cursor:pointer}
button:disabled{background:${P.muted};cursor:not-allowed}
button.secondary{background:#fff;color:${P.fg};border:1px solid ${P.border}}
#list{max-height:360px;overflow:auto;border:1px solid ${P.border};border-radius:6px;padding:6px 10px;background:#fff}
#list div{padding:3px 0}
#status{min-height:1.5em;font-weight:600}
.err{color:${P.danger}}
</style></head><body>
<header><h1 style="margin:0;font-size:22px">${escapeHtml(DECK_TEXT.title)} スライド PDF</h1><p style="margin:6px 0 0"><a href="./">サイトに戻る</a></p></header>
<main>
<p>選んだ更新の PDF をブラウザ内で復号・結合し、表紙・目次・裏表紙付きの 1 つの PDF としてダウンロードします。結合後の PDF は暗号化されません。最大 ${MAX_MERGE} 件まで選べます。</p>
<p id="unavailable" hidden>PDF は現在公開されていません（スライド未作成、または PDF の公開設定が無効です）。</p>
<form id="form" onsubmit="return false">
<fieldset><legend>期間</legend>
<label>開始 <input type="date" id="from"></label><label>終了 <input type="date" id="to"></label>
<button type="button" class="secondary" id="pick">期間内をすべて選択</button>
<button type="button" class="secondary" id="clear">選択を解除</button></fieldset>
<fieldset><legend>更新（<span id="count">0</span> 件選択）</legend><div id="list" role="group" aria-label="更新の一覧"></div></fieldset>
<fieldset><legend>パスワード</legend><label>PDF のパスワード <input type="password" id="pw" autocomplete="off"></label>
<button type="button" id="go" disabled>結合してダウンロード</button></fieldset>
<p id="status" role="status" aria-live="polite"></p>
</form></main>
<script src="assets/vendor/pdf-lib.min.js"></script>
<script src="assets/slides-ui.js"></script>
</body></html>
`;
}

export function slidesUiJs() {
  return `"use strict";
const THEME = ${JSON.stringify(GITHUB_PALETTE)};
const TEXT = ${JSON.stringify(DECK_TEXT)};
const MAX = ${MAX_MERGE};
const FONT = '"Noto Sans CJK JP","Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif';
const W = 1280, H = 720, PT_W = 960, PT_H = 540;
const $ = (id) => document.getElementById(id);
let manifest = null;

function setStatus(message, error) { const el = $("status"); el.textContent = message; el.className = error ? "err" : ""; }

function selectedIds() { return [...document.querySelectorAll("#list input:checked")].map((el) => el.value); }
function refresh() { $("count").textContent = String(selectedIds().length); $("go").disabled = selectedIds().length === 0 || selectedIds().length > MAX || !$("pw").value; }

function inRange(slide) { const f = $("from").value, t = $("to").value; return (!f || slide.date >= f) && (!t || slide.date <= t); }

async function load() {
  const response = await fetch("data/slides.json", { cache: "no-cache" });
  manifest = await response.json();
  const available = (manifest.slides || []).filter((s) => s.pdf).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  if (!manifest.pdfCrypto || available.length === 0) { $("unavailable").hidden = false; $("form").hidden = true; return; }
  manifest.available = available;
  for (const slide of available) {
    const row = document.createElement("div");
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox"; box.value = slide.id; box.addEventListener("change", refresh);
    label.append(box, " " + slide.date + " 【" + slide.topic + "】" + slide.title);
    row.append(label); $("list").append(row);
  }
  refresh();
}

function drawCover(ctx, items, period, createdUtc) {
  ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, THEME.copilot); g.addColorStop(0.7, THEME.copilot); g.addColorStop(0.7, THEME.done); g.addColorStop(0.85, THEME.done); g.addColorStop(0.85, THEME.link); g.addColorStop(1, THEME.link);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 14);
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

function footer(ctx, left, right) {
  ctx.fillStyle = "#010409"; ctx.fillRect(0, H - 56, W, 56);
  ctx.fillStyle = THEME.onDark; ctx.font = "16px " + FONT; ctx.textBaseline = "middle";
  ctx.fillText(left, 96, H - 28); ctx.textAlign = "right"; ctx.fillText(right, W - 96, H - 28); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

function drawToc(ctx, items, start, first) {
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = THEME.dark; ctx.font = "700 34px " + FONT; ctx.fillText(first ? TEXT.tocTitle : TEXT.tocTitle + "（続き）", 70, 80);
  ctx.fillStyle = THEME.copilot; ctx.fillRect(70, 94, 240, 4);
  ctx.font = "20px " + FONT;
  items.forEach((item, i) => {
    const y = 150 + i * 26;
    ctx.fillStyle = THEME.copilot; ctx.fillText(String(start + i + 1) + ".", 70, y);
    ctx.fillStyle = THEME.fg; ctx.fillText("【" + item.topic + "】" + item.title, 120, y);
  });
}

function drawEnd(ctx) {
  ctx.fillStyle = THEME.dark; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = THEME.copilot; ctx.fillRect(0, 0, W, 14);
  ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = "700 64px " + FONT; ctx.fillText(TEXT.endTitle, W / 2, 340);
  ctx.fillStyle = THEME.copilot; ctx.font = "600 26px " + FONT; ctx.fillText(TEXT.title, W / 2, 400); ctx.textAlign = "left";
  footer(ctx, TEXT.creator, TEXT.source);
}

async function canvasPng(draw) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  draw(canvas.getContext("2d"));
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

async function decrypt(bytes, password, iterations) {
  const salt = bytes.slice(0, 16), iv = bytes.slice(16, 28), tag = bytes.slice(28, 44), body = bytes.slice(44);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const joined = new Uint8Array(body.length + tag.length); joined.set(body); joined.set(tag, body.length);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, joined));
}

async function merge() {
  const ids = selectedIds();
  const chosen = manifest.available.filter((s) => ids.includes(s.id)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const password = $("pw").value;
  $("go").disabled = true;
  try {
    const { PDFDocument } = PDFLib;
    const out = await PDFDocument.create();
    const dates = chosen.map((s) => s.date);
    const period = dates.length ? dates[0] + " 〜 " + dates.at(-1) : "";
    const embedImage = async (draw) => { const image = await out.embedPng(await canvasPng(draw)); const page = out.addPage([PT_W, PT_H]); page.drawImage(image, { x: 0, y: 0, width: PT_W, height: PT_H }); };
    await embedImage((ctx) => drawCover(ctx, chosen, period, new Date().toISOString().slice(0, 10)));
    const perPage = 20;
    for (let start = 0; start < chosen.length; start += perPage) await embedImage((ctx) => drawToc(ctx, chosen.slice(start, start + perPage), start, start === 0));
    let done = 0;
    for (const slide of chosen) {
      setStatus("復号中 " + (++done) + " / " + chosen.length);
      const response = await fetch(slide.pdf);
      if (!response.ok) throw new Error(slide.id + " を取得できませんでした (" + response.status + ")");
      let plain;
      try { plain = await decrypt(new Uint8Array(await response.arrayBuffer()), password, manifest.pdfCrypto.iterations); }
      catch (e) { throw new Error("復号に失敗しました。パスワードを確認してください。"); }
      const src = await PDFDocument.load(plain);
      for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
    }
    await embedImage(drawEnd);
    out.setTitle(TEXT.title);
    const blob = new Blob([await out.save()], { type: "application/pdf" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "copilot-vscode-digest-" + (dates[0] || "") + "_" + (dates.at(-1) || "") + ".pdf"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    setStatus("ダウンロードしました（" + chosen.length + " 件）");
  } catch (error) { setStatus(error.message, true); }
  finally { refresh(); }
}

$("pick").addEventListener("click", () => { let n = 0; for (const box of document.querySelectorAll("#list input")) { const slide = manifest.available.find((s) => s.id === box.value); box.checked = inRange(slide) && n < MAX; if (box.checked) n++; } refresh(); });
$("clear").addEventListener("click", () => { for (const box of document.querySelectorAll("#list input")) box.checked = false; refresh(); });
$("pw").addEventListener("input", refresh);
$("go").addEventListener("click", merge);
load().catch((error) => setStatus("一覧を読み込めませんでした: " + error.message, true));
`;
}
