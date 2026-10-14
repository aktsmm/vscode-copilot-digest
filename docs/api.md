# JSON API と スライド / PDF

[Azure Update Digest](https://github.com/aktsmm/azure-update-digest) の機能を、本リポジトリのデータ（`data/events`、`data/resources.json`）に合わせて取り込んだものです。

## 静的 JSON API（`api/v1/`）

ベース URL: `https://aktsmm.github.io/vscode-copilot-digest/`。認証不要の読み取り専用 JSON です。

| パス | 内容 |
| --- | --- |
| `api/v1/index.json` | 件数、取得状態（`coverage`）、月・カテゴリ一覧、エンドポイント |
| `api/v1/latest.json` | 直近 30 日（最新の掲載日基準）の更新 |
| `api/v1/months/YYYY-MM.json` | 掲載日の月別一覧 |
| `api/v1/updates/{id}.json` | 1 件の詳細。`id` は更新キーの SHA-256 先頭 16 桁 |
| `api/v1/categories/{category}.json` | `github-copilot` / `vs-code` / `github-platform` / `news` |

- 出力は決定的です。`snapshotAt` はビルド時刻ではなく、入力ログ（`generatedAt`）の最新値です。
- `coverage.months[].coverage`: `complete` / `collected_empty` / `partial_failure`。`complete` 以外は欠けがありうるため、0 件と同義ではありません。
- 原文本文は再配布しません。ライセンスは CC BY-NC-SA 4.0 です。
- 互換性のない変更は `api/v2/` に分けます。

## スライド

1 更新 1 枚の JSON を `data/slides/{id}.json` に置きます（[schema/slide.schema.json](../schema/slide.schema.json)、検証は `scripts/lib/slides.mjs`）。`status`（GA / Preview 等）は本文に明示的な根拠（`statusEvidence`）がある場合のみ使い、無ければ `unknown` です。

## PDF

- 文言と配色は `scripts/lib/theme.mjs` に集約しています。基調色は GitHub ダーク（`#0d1117`）と GitHub Copilot パープル（`#8534f3`）で、表紙・裏表紙は本リポジトリ版の文言です。
- `npm run build:pdfs` は `data/slides` を検証し、Playwright で PDF を描画します。
- Secret `PDF_PASSWORD` がある場合のみ、AES-256-GCM（PBKDF2-SHA256）で暗号化した `pdf/{id}.pdf.enc` を公開します。Pages は全公開のため、Secret が無い場合は PDF を一切出力しません。`data/slides.json` の `pdfCrypto` が `null` なら PDF は公開されていません。

## 未実装

- スライド JSON を Copilot cloud agent で生成する専用 PR 系統（`data/slides/**` のみ許可する validate / auto-merge）
- サイト上の範囲指定ボタンとブラウザ内の復号・結合
