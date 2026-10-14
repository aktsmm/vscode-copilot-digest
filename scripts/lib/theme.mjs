// Shared PDF/slide theme tokens. HTML slide rendering and the browser-side PDF
// merge both read these values so wording and colors cannot drift.

export const GITHUB_PALETTE = Object.freeze({
  canvas: "#ffffff",
  subtle: "#f6f8fa",
  border: "#d0d7de",
  fg: "#1f2328",
  muted: "#59636e",
  dark: "#0d1117",
  darkSubtle: "#161b22",
  onDark: "#e6edf3",
  copilot: "#8534f3",
  copilotDeep: "#6e2fd0",
  copilotTint: "#f5f0ff",
  link: "#0969da",
  success: "#1a7f37",
  done: "#8250df",
  danger: "#cf222e",
  attention: "#9a6700",
});

export const DECK_TEXT = Object.freeze({
  eyebrow: "GitHub Copilot / VS Code",
  title: "GitHub Copilot & VS Code アップデート情報",
  tocTitle: "目次・概要",
  endTitle: "以上",
  source: "出典: GitHub Changelog ／ GitHub Blog ／ VS Code Release Notes ／ GitHub Docs",
  creator: "Created by yamapan（GitHub: aktsmm）",
  repoUrl: "https://github.com/aktsmm/vscode-copilot-digest",
  siteUrl: "https://aktsmm.github.io/vscode-copilot-digest/",
});

// Lifecycle badges are used only when the source text states them explicitly.
export const STATUS_COLORS = Object.freeze({
  ga: GITHUB_PALETTE.success,
  preview: GITHUB_PALETTE.done,
  retirement: GITHUB_PALETTE.danger,
  announcement: GITHUB_PALETTE.copilot,
  update: GITHUB_PALETTE.muted,
  unknown: GITHUB_PALETTE.muted,
});

export const FORBIDDEN_AZURE_TOKENS = Object.freeze([
  "#0078d4",
  "#243a5e",
  "#50e6ff",
  "Microsoft Azure",
  "Azure アップデート情報",
  "Azure Updates",
]);
