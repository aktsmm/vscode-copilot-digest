import { DECK_TEXT, GITHUB_PALETTE as P, STATUS_COLORS } from "./theme.mjs";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const PDF_CSS = `
@page{size:1280px 720px;margin:0}
html,body{margin:0;background:${P.canvas};font-family:"Noto Sans CJK JP","Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif;color:${P.fg};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1280px;height:720px;box-sizing:border-box;page-break-after:always;overflow:hidden;position:relative}
.slide{padding:28px 44px 18px;display:flex;flex-direction:column;gap:10px}
.slide .t{font-size:30px;font-weight:700;color:${P.dark};line-height:1.25}
.slide .meta{font-size:14px;color:${P.muted}}
.badge{display:inline-block;color:#fff;font-weight:700;font-size:18px;padding:2px 18px;border-radius:999px}
.sum{font-size:20px;line-height:1.5;border-left:6px solid ${P.copilot};background:${P.copilotTint};padding:10px 16px;border-radius:0 8px 8px 0}
.pts{font-size:18px;line-height:1.55;margin:0;padding-left:24px}
.ft{margin-top:auto;display:flex;justify-content:space-between;gap:12px;font-size:13px;color:${P.muted};border-top:1px solid ${P.border};padding-top:8px}
.ft a{color:${P.link}}
.cover,.end{display:flex;flex-direction:column;background:${P.dark};color:${P.onDark}}
.cv-bar{height:14px;background:linear-gradient(90deg,${P.copilot} 0 70%,${P.done} 70% 85%,${P.link} 85%)}
.cv-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 96px;background:linear-gradient(120deg,${P.dark} 0 55%,${P.darkSubtle} 55%)}
.cv-eyebrow{font-size:22px;font-weight:600;color:${P.copilot};letter-spacing:.06em;margin-bottom:12px}
.cover h1{font-size:50px;margin:0 0 28px;color:#fff;line-height:1.25;white-space:nowrap}
.cv-period{font-size:28px;color:${P.onDark};font-weight:600}
.cv-count{font-size:26px;margin-top:14px}.cv-count b{font-size:44px;color:#fff}
.cv-foot{display:flex;justify-content:space-between;padding:16px 96px;background:#010409;color:${P.onDark};font-size:16px}
.end .cv-body{align-items:center;background:linear-gradient(120deg,${P.dark} 0 45%,${P.darkSubtle} 45%)}
.end h1{font-size:64px;margin:0 0 12px;color:#fff}.end .sub{font-size:26px;color:${P.copilot};font-weight:600}
.plain{padding:50px 70px}.plain h2{font-size:34px;color:${P.dark};margin:0 0 18px;border-bottom:3px solid ${P.copilot};padding-bottom:6px}
.toc{font-size:20px;line-height:1.9}.toc .n{display:inline-block;width:44px;color:${P.copilot};font-weight:700}
`;

export function coverHtml(deck) {
  const period = deck.selection?.period ? `<div class="cv-period">対象期間 ${esc(deck.selection.period.start)} 〜 ${esc(deck.selection.period.end)}</div>` : "";
  return `<section class="page cover"><div class="cv-bar"></div><div class="cv-body"><div class="cv-eyebrow">${esc(DECK_TEXT.eyebrow)}</div><h1>${esc(DECK_TEXT.title)}</h1>${period}<div class="cv-count"><b>${deck.slides.length}</b> 件</div></div><div class="cv-foot"><span>作成日 ${esc(String(deck.selection?.snapshotAt ?? "").slice(0, 10))}（UTC）</span><span>${esc(DECK_TEXT.source)}</span></div></section>`;
}

export function tocHtml(deck) {
  return `<section class="page plain"><h2>${esc(DECK_TEXT.tocTitle)}</h2><div class="toc">${deck.slides.map((s, i) => `<div><span class="n">${i + 1}.</span>【${esc(s.topic)}】${esc(s.title.ja)}</div>`).join("")}</div></section>`;
}

export function endHtml() {
  return `<section class="page end"><div class="cv-bar"></div><div class="cv-body"><h1>${esc(DECK_TEXT.endTitle)}</h1><div class="sub">${esc(DECK_TEXT.title)}</div></div><div class="cv-foot"><span>${esc(DECK_TEXT.creator)}</span><span>${esc(DECK_TEXT.source)}</span></div></section>`;
}

export function slideHtml(s) {
  const docs = (s.references.documents ?? []).map((d) => `<a href="${esc(d.url)}">${esc(d.title)}</a>`).join(" / ");
  return `<section class="page slide" data-id="${esc(s.id)}"><div class="meta">${esc(s.date)} ・ ${esc(s.topic)} ${s.status === "unknown" ? "" : `<span class="badge" style="background:${STATUS_COLORS[s.status] ?? STATUS_COLORS.unknown}">${esc(s.status)}</span>`}</div><div class="t">${esc(s.title.ja)}</div><div class="sum">${esc(s.summary)}</div><ul class="pts">${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><div class="ft"><div><a href="${esc(s.references.source)}">原文</a>${docs ? ` ／ ${docs}` : ""}</div><div>${esc(DECK_TEXT.creator)}</div></div></section>`;
}

export function deckHtml(deck) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(DECK_TEXT.title)}</title><style>${PDF_CSS}</style></head><body>${coverHtml(deck)}${tocHtml(deck)}${deck.slides.map(slideHtml).join("")}${endHtml()}</body></html>`;
}
