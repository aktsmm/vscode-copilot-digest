// Dark theme: a variable override plus the few hard-coded light surfaces, a pre-paint theme switch and the toggle.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`;

export const THEME_TOGGLE_SCRIPT = `(function(){var b=document.querySelector("[data-theme-toggle]");if(!b)return;var root=document.documentElement;function label(){var d=root.getAttribute("data-theme")==="dark";b.setAttribute("aria-pressed",d?"true":"false");b.textContent=d?b.getAttribute("data-light"):b.getAttribute("data-dark")}label();b.addEventListener("click",function(){var next=root.getAttribute("data-theme")==="dark"?"light":"dark";root.setAttribute("data-theme",next);try{localStorage.setItem("theme",next)}catch(e){}label()})})();`;

export function themeToggleHtml(locale) {
  const dark = locale === "ja" ? "ダーク表示" : "Dark";
  const light = locale === "ja" ? "ライト表示" : "Light";
  const aria = locale === "ja" ? "ダークモードの切り替え" : "Toggle dark mode";
  return `<button class="theme-toggle" type="button" data-theme-toggle data-dark="${dark}" data-light="${light}" aria-label="${aria}" aria-pressed="false">${dark}</button>`;
}

export const DARK_CSS = `
.theme-toggle { font: inherit; font-size: 0.85rem; padding: 4px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--panel); color: var(--muted); cursor: pointer; white-space: nowrap; }
.theme-toggle:hover { border-color: var(--accent); color: var(--accent-strong); }
html[data-theme="dark"] { color-scheme: dark; --bg: #0d1117; --panel: #151b23; --line: #30363d; --text: #e6edf3; --muted: #9ba3ad; --accent: #b388ff; --accent-strong: #c9aaff; --accent-soft: rgba(179, 136, 255, 0.16); --shadow: 0 1px 2px rgba(0, 0, 0, 0.5); --pf-background: #151b23; --pf-text: #e6edf3; --pf-border: #30363d; --pf-text-secondary: #9ba3ad; --pf-outline-focus: #b388ff; }
html[data-theme="dark"] body { background: var(--bg); color: var(--text); }
html[data-theme="dark"] .site-header { background: rgba(13, 17, 23, 0.94); }
html[data-theme="dark"] .demo-nav details > summary, html[data-theme="dark"] .demo-nav .demo-links, html[data-theme="dark"] .search-input, html[data-theme="dark"] .filter-block, html[data-theme="dark"] .dl-panel, html[data-theme="dark"] .date-chip, html[data-theme="dark"] .dl-field input, html[data-theme="dark"] .dl-chip, html[data-theme="dark"] .dl-search, html[data-theme="dark"] .dl-btn, html[data-theme="dark"] .filter-reset, html[data-theme="dark"] .section-action, html[data-theme="dark"] .pager-link, html[data-theme="dark"] .lang-toggle, html[data-theme="dark"] .pagefind-shell, html[data-theme="dark"] .metric-card, html[data-theme="dark"] .content-card, html[data-theme="dark"] .update-card, html[data-theme="dark"] .mini-highlight, html[data-theme="dark"] .digest-card, html[data-theme="dark"] .topic-section, html[data-theme="dark"] .side-panel { background: var(--panel); color: var(--text); border-color: var(--line); }
html[data-theme="dark"] .search-input, html[data-theme="dark"] .dl-field input, html[data-theme="dark"] .dl-search { color: var(--text); }
html[data-theme="dark"] .dl-btn { border-color: var(--accent); color: var(--accent-strong); }
html[data-theme="dark"] .dl-btn:disabled { opacity: 0.5; }
html[data-theme="dark"] .hero, html[data-theme="dark"] .hero.hero-home { background: none; }
html[data-theme="dark"] a { color: var(--accent-strong); }
html[data-theme="dark"] .site-brand, html[data-theme="dark"] .site-nav a, html[data-theme="dark"] h1, html[data-theme="dark"] h2, html[data-theme="dark"] h3 { color: var(--text); }
html[data-theme="dark"] .site-nav a:hover { color: var(--accent-strong); }
html[data-theme="dark"] .original-title, html[data-theme="dark"] .meta-row, html[data-theme="dark"] .hero-copy, html[data-theme="dark"] .about-fresh { color: var(--muted); }
html[data-theme="dark"] .pill { background: var(--accent-soft); color: var(--accent-strong); }
html[data-theme="dark"] .lang-toggle-option.active { color: #fff; }
html[data-theme="dark"] .source-badge-mark { background: rgba(255, 255, 255, 0.14); }
html[data-theme="dark"] .filter-chip:not([class*="source-badge--"]), html[data-theme="dark"] .filter-reset:disabled { background: rgba(255, 255, 255, 0.06); color: var(--text); }
html[data-theme="dark"] .filter-chip.active:not([class*="source-badge--"]) { background: var(--accent-soft); }
html[data-theme="dark"] .pagefind-shell--compact, html[data-theme="dark"] .hero .pagefind-shell { background: transparent; border-color: transparent; }
`;
