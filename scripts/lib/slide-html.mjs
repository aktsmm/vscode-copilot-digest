import { DECK_TEXT, GITHUB_PALETTE as P, STATUS_COLORS } from "./theme.mjs";
import { ACTION_LABELS, STATUS_LABELS, TERM_TYPES, isV2, sourceOf } from "./slides.mjs";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Largest to smallest body size; the slide uses the biggest one whose content fits.
export const FS_STEPS = [24, 22, 20, 19, 18, 17, 16, 15, 14, 13];

const SITE_NAMES = { "github.blog": "GitHub Blog", "github.com": "GitHub", "docs.github.com": "GitHub Docs", "code.visualstudio.com": "VS Code", "www.publickey1.jp": "Publickey", "learn.microsoft.com": "Microsoft Learn" };
// Inline `code` in a line becomes monospace text; everything else stays escaped.
const rich = (v) => esc(v).replace(/`([^`]+)`/g, "<code>$1</code>");
const siteOf = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname === "github.blog" && u.pathname.startsWith("/changelog")) return "GitHub Changelog";
    return SITE_NAMES[u.hostname] ?? u.hostname;
  } catch { return ""; }
};
const CAUTION_IDS = new Set(["caution", "cautions", "constraints", "limits", "impact", "risks"]);

export const PDF_CSS = `
@page{size:1280px 720px;margin:0}
*{box-sizing:border-box}
html,body{margin:0;background:${P.canvas};font-family:"Noto Sans CJK JP","Noto Sans JP","Yu Gothic UI","Meiryo","Segoe UI",sans-serif;color:${P.fg};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:1280px;height:720px;page-break-after:always;overflow:hidden;position:relative}
.slide{padding:22px 38px 14px;display:flex;flex-direction:column;gap:8px;--fs:18px}
.hd{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
.t{font-size:30px;font-weight:700;color:${P.dark};line-height:1.25}
.t small{display:block;font-size:19px;font-weight:600;margin-top:3px;color:${P.copilotDeep}}
.en{font-size:12.5px;color:${P.muted};margin-top:3px}.en .dt{color:${P.fg};font-weight:600;margin-left:12px}
.badge{color:#fff;font-weight:700;font-size:22px;padding:3px 24px;border-radius:999px;white-space:nowrap}
.imp{display:flex;gap:10px}
.imp .c{flex:1;border-radius:8px;padding:5px 12px;font-size:calc(var(--fs) - 1px);line-height:1.38;border:1.5px solid ${P.border};background:#fff}
.imp .c b.l{display:block;font-size:12.5px;color:${P.muted};font-weight:600}
.imp .who{border-color:${P.copilot};background:${P.copilotTint};font-weight:700;color:${P.dark}}
.imp .ch-benefit{border-color:${P.success};background:#eaf6ee}.imp .ch-breaking{border-color:${P.danger};background:#fdecec}
.imp .act-yes{border-color:${P.danger};background:#fdecec}.imp .act-optional{border-color:${P.success};background:#eaf6ee}.imp .act-no,.imp .act-info{border-color:${P.link};background:#eaf3ff}
.imp .c .dl{font-weight:400;color:${P.muted};margin-left:8px}
.tl{display:flex;align-items:center}.tl .pt{flex:none;text-align:center;font-size:13px;max-width:240px}.tl .pt b{display:block;font-size:16px}
.tl .ln{flex:1;height:4px;margin:0 12px;background:linear-gradient(90deg,${P.border},${P.copilot});border-radius:2px}
.cols{display:flex;gap:14px;flex:1;min-height:0}
.main{flex:1.9;display:flex;flex-direction:column;gap:7px;min-width:0}
.side{flex:1;display:flex;flex-direction:column;gap:9px;min-width:0}
.card{border:1.5px solid ${P.border};border-radius:8px;padding:6px 14px;background:#fff}
.card h3{margin:0 0 3px;font-size:calc(var(--fs) + 1px);color:${P.copilotDeep}}
.card.hot{border-color:${P.copilot};background:${P.copilotTint}}
.card.red{border-color:${P.danger};background:#fff4f4}.card.red h3{color:${P.danger}}
.card.sug{border:1.5px dashed ${P.attention};background:#fff8e8}.card.sug h3{color:${P.attention}}
.card.gl{border-color:${P.border};background:${P.subtle}}
ul{margin:0;padding-left:20px;font-size:var(--fs);line-height:1.4}li{margin:1px 0}
.side ul{font-size:calc(var(--fs) - 1px)}
.ba{display:flex;gap:8px;align-items:stretch}
.ba .p{flex:1;border-radius:8px;padding:6px 12px;font-size:var(--fs);line-height:1.4}
.ba .bf{background:${P.subtle};border:1.5px solid ${P.border}}.ba .af{background:#e8f6ec;border:1.5px solid ${P.success}}
.ba .p b.l{display:block;font-size:12.5px;margin-bottom:2px}.ba .bf b.l{color:${P.muted}}.ba .af b.l{color:${P.success}}
.ba .ar{align-self:center;font-size:24px;color:${P.copilot};font-weight:700}
code{font-family:Consolas,"Cascadia Mono",monospace;font-size:.92em;background:#eceff3;border-radius:3px;padding:0 4px}
.term{font-size:calc(var(--fs) - 2px);line-height:1.4;margin:0 0 5px}.term b{color:${P.dark}}
.term .k{display:inline-block;font-size:11px;background:#ece3fd;color:${P.copilotDeep};border-radius:3px;padding:0 5px;margin-left:4px}
.ft{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;font-size:12.5px;color:${P.muted};border-top:1px solid ${P.border};padding-top:6px;margin-top:auto}
.ft a{color:${P.link};text-decoration:underline}.lk .fl{font-weight:700;color:${P.fg};margin-right:4px}.lk .ls{line-height:1.4}
.ft .site{color:${P.muted};margin-left:4px}
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
.cv-links{margin-top:26px;font-size:16px;line-height:1.8}.cv-links a{color:#79C0FF}
.end .note{position:absolute;left:96px;bottom:84px;line-height:1.5;font-size:14px;color:${P.onDark}}.end .note a{color:#79C0FF}
.plain{padding:50px 70px}.plain h2{font-size:34px;color:${P.dark};margin:0 0 18px;border-bottom:3px solid ${P.copilot};padding-bottom:6px}
.toc{font-size:20px;line-height:1.9}.toc .n{display:inline-block;width:44px;color:${P.copilot};font-weight:700}
`;

export function coverHtml(deck) {
  const period = deck.selection?.period ? `<div class="cv-period">対象期間 ${esc(deck.selection.period.start)} 〜 ${esc(deck.selection.period.end)}</div>` : "";
  return `<section class="page cover"><div class="cv-bar"></div><div class="cv-body"><div class="cv-eyebrow">${esc(DECK_TEXT.eyebrow)}</div><h1>${esc(DECK_TEXT.title)}</h1>${period}<div class="cv-count"><b>${deck.slides.length}</b> 件</div><div class="cv-links">作成 <a href="${esc(DECK_TEXT.profileUrl)}">${esc(DECK_TEXT.authorLabel)}</a><br>リポジトリ <a href="${esc(DECK_TEXT.repoUrl)}">${esc(DECK_TEXT.repoUrl)}</a></div></div><div class="cv-foot"><span>作成日 ${esc(String(deck.selection?.snapshotAt ?? "").slice(0, 10))}（UTC）</span><span>${esc(DECK_TEXT.source)}</span></div></section>`;
}

export function tocHtml(deck) {
  return `<section class="page plain"><h2>${esc(DECK_TEXT.tocTitle)}</h2><div class="toc">${deck.slides.map((s, i) => `<div><span class="n">${i + 1}.</span>【${esc(s.topic)}】${esc(s.title.ja)}</div>`).join("")}</div></section>`;
}

export function endHtml() {
  return `<section class="page end"><div class="cv-bar"></div><div class="cv-body"><h1>${esc(DECK_TEXT.endTitle)}</h1><div class="sub">${esc(DECK_TEXT.title)}</div></div><div class="note">${esc(DECK_TEXT.automationNote)}<br><a href="${esc(DECK_TEXT.repoUrl)}">${esc(DECK_TEXT.repoUrl)}</a><br><a href="${esc(DECK_TEXT.profileUrl)}">${esc(DECK_TEXT.authorLabel)}　${esc(DECK_TEXT.profileUrl)}</a><br><a href="${esc(DECK_TEXT.siteUrl)}">${esc(DECK_TEXT.siteUrl)}</a></div><div class="cv-foot"><span>${esc(DECK_TEXT.copyright)}</span><span>${esc(DECK_TEXT.source)}</span></div></section>`;
}

// v1 slides keep rendering: their summary becomes the subtitle and their points one panel.
export function normalizeSlide(s) {
  if (isV2(s)) return s;
  const source = sourceOf(s);
  return {
    ...s,
    title: { ...s.title, subtitleJa: s.summary },
    action: typeof s.action === "string" ? { required: "info", summary: s.action } : s.action,
    panels: [{ id: "points", heading: "ポイント", priority: "core", items: s.points ?? [] }],
    references: { ...s.references, source: { url: source.url, title: "" } },
  };
}

const KIND_LABEL = (s) => STATUS_LABELS[s.status] ?? "更新";

function deadlineLabel(deadline) {
  if (!deadline) return "";
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(deadline);
  return m ? `${m[1]}年${Number(m[2])}月${m[3] ? `${Number(m[3])}日` : ""}` : "";
}

export function slideHtml(input, { fs = FS_STEPS[0] } = {}) {
  const s = normalizeSlide(input);
  const badge = s.status === "unknown" ? "" : `<div class="badge" style="background:${STATUS_COLORS[s.status] ?? STATUS_COLORS.unknown}">${esc(KIND_LABEL(s))}</div>`;
  const original = s.title.original ? `<div class="en">${esc(s.title.original)}<span class="dt">掲載 ${esc(s.date)}</span></div>` : `<div class="en"><span class="dt" style="margin-left:0">掲載 ${esc(s.date)}</span></div>`;
  const cards = [];
  if (s.audience) {
    cards.push(`<div class="c who"><b class="l">誰に関係するか</b>${rich(s.audience.who)}</div>`);
    cards.push(`<div class="c ch-${esc(s.audience.changeNature ?? "neutral")}"><b class="l">${s.audience.changeNature === "breaking" ? "変わること（注意が必要な変更）" : "変わること・使えること"}</b>${rich(s.audience.change)}</div>`);
  }
  if (s.action) {
    const deadline = deadlineLabel(s.action.deadline);
    cards.push(`<div class="c act-${esc(s.action.required)}"><b class="l">対応</b><strong>${esc(ACTION_LABELS[s.action.required] ?? "情報")}</strong>　${rich(s.action.summary)}${deadline ? `<span class="dl">期限 ${esc(deadline)}</span>` : ""}</div>`);
  }
  const timeline = s.timeline?.length
    ? `<div class="tl">${s.timeline.map((t, i, a) => `<div class="pt"><b>${esc(t.when)}</b>${esc(t.label)}</div>${i < a.length - 1 ? '<div class="ln"></div>' : ""}`).join("")}</div>`
    : "";
  const ba = s.beforeAfter ? `<div class="ba"><div class="p bf"><b class="l">変更前</b>${rich(s.beforeAfter.before)}</div><div class="ar">→</div><div class="p af"><b class="l">変更後</b>${rich(s.beforeAfter.after)}</div></div>` : "";
  const panels = (s.panels ?? []).map((p) => `<div class="card ${CAUTION_IDS.has(p.id) ? "red" : p.priority === "core" ? "hot" : ""}"><h3>${esc(p.heading)}</h3><ul>${p.items.map((i) => `<li>${rich(i)}</li>`).join("")}</ul></div>`).join("");
  const glossary = s.glossary?.length
    ? `<div class="card gl"><h3>用語ミニ解説</h3>${s.glossary.map((g) => `<div class="term"><b>${esc(g.term)}</b>${g.type ? `<span class="k">${esc(TERM_TYPES[g.type] ?? g.type)}</span>` : ""}<br>${rich(g.oneLine)}</div>`).join("")}</div>`
    : "";
  const suggestions = s.suggestions?.length ? `<div class="card sug"><h3>こう使うと便利</h3><ul>${s.suggestions.map((x) => `<li>${rich(x)}</li>`).join("")}</ul></div>` : "";
  const side = glossary || suggestions ? `<div class="side">${glossary}${suggestions}</div>` : "";
  const source = s.references.source;
  const docs = (s.references.documents ?? []).map((d) => `<a href="${esc(d.url)}">${esc(d.title)}</a><span class="site">（${esc(siteOf(d.url))}）</span>`).join("　|　");
  const refs = `<div><b class="fl">発表</b> <a href="${esc(source.url)}">${esc(source.title || source.url)}</a><span class="site">（${esc(siteOf(source.url))}）</span></div>${docs ? `<div><b class="fl">詳細</b> ${docs}</div>` : ""}`;
  return `<section class="page slide" data-id="${esc(s.id)}" style="--fs:${fs}px">
<div class="hd"><div><div class="t">${esc(s.title.ja)}${s.title.subtitleJa ? `<small>${rich(s.title.subtitleJa)}</small>` : ""}</div>${original}</div>${badge}</div>
${cards.length ? `<div class="imp">${cards.join("")}</div>` : ""}${timeline}
<div class="cols"><div class="main">${ba}${panels}</div>${side}</div>
<div class="ft"><div class="lk">${refs}</div><div style="white-space:nowrap;text-align:right">分類: ${esc(s.topic)} ｜ ID ${esc(s.id)}<br>Created by <a href="${esc(DECK_TEXT.profileUrl)}">${esc(DECK_TEXT.authorLabel)}</a>　<a href="${esc(DECK_TEXT.repoUrl)}">リポジトリ</a></div></div>
</section>`;
}

export function slideDocHtml(slide, options) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(slide.title.ja)}</title><style>${PDF_CSS}</style></head><body>${slideHtml(slide, options)}</body></html>`;
}

export function deckHtml(deck) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(DECK_TEXT.title)}</title><style>${PDF_CSS}</style></head><body>${coverHtml(deck)}${tocHtml(deck)}${deck.slides.map((s) => slideHtml(s)).join("")}${endHtml()}</body></html>`;
}

// Largest font step where nothing overflows the 1280x720 page; null when even the smallest overflows.
export async function fitFontSize(page, slide) {
  for (const fs of FS_STEPS) {
    await page.setContent(slideDocHtml(slide, { fs }), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const s = document.querySelector(".slide");
      const ft = s.querySelector(".ft").getBoundingClientRect();
      const columns = [...s.querySelectorAll(".main, .side")].map((e) => e.scrollHeight - e.clientHeight);
      const cards = [...s.querySelectorAll(".card")].map((c) => c.getBoundingClientRect().bottom - ft.top);
      return Math.max(0, s.scrollHeight - s.clientHeight, ...columns, ...cards);
    });
    if (overflow <= 0) return fs;
  }
  return null;
}
