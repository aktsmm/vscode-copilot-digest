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

## スライド生成の自動化（専用 PR 系統）

既存の digest 用 PR 系統とは分離しています。

1. [author-slide-pr.yml](../.github/workflows/author-slide-pr.yml)（月・木 03:00 JST を目安、手動実行可）が、スライド未作成の直近 3 か月の更新を新しい順に最大 10 件選び、`Slide authoring request` Issue を作成または更新して Copilot cloud agent に割り当てる。
2. Copilot が `data/slides/{id}.json` だけを追加する PR（`slides: update YYYY-MM-DD`）を作る。
3. [validate-slide-pr.yml](../.github/workflows/validate-slide-pr.yml) が、変更が `data/slides/{id}.json` の追加・更新だけであること（削除不可）、`npm run validate:slides`、`npm run test:data`、Pages ビルドを検証する。
4. [auto-merge-slide-pr.yml](../.github/workflows/auto-merge-slide-pr.yml) が、許可パス以外の変更や `needs-human-review` がなければタイトルを正規化して squash merge し、Pages を再デプロイする。許可外の変更があれば `needs-human-review` を付けて停止する。

digest 用の `validate-generated-pr` / `auto-merge-generated-pr` / `request-copilot-review` / `redeploy-pages-after-generated-pr-merge` はスライド PR を処理しません。コード・スキーマ・依存・workflow・暗号化の変更は自動 merge の対象外です。`PDF_PASSWORD` は `deploy-pages.yml` だけが使います（`tests/slide-lane.test.mjs` が検証）。

## ブラウザでの範囲選択・結合

`slides.html`（サイト直下）で期間と更新を選び、パスワードを入力すると、ブラウザ内で各 PDF を復号して結合します。

- 表紙・目次・裏表紙は `scripts/lib/theme.mjs` の文言と GitHub / Copilot 配色でブラウザが描画し、画像ページとして追加します（文字検索・選択はできません）。
- 結合後の PDF は暗号化されません。最大 50 件です。パスワードが違う場合は「復号に失敗しました」と表示します。
- PDF が公開されていない場合（Secret 未設定・スライドなし）は、選択 UI を出さず案内だけを表示します。
- `npm run test:e2e` が、暗号化 PDF の生成からブラウザでの結合までを検証します（ブラウザが無い環境ではスキップ）。