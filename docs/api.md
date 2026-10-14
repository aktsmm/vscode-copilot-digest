# JSON API・スライド・PDF

[Azure Update Digest](https://github.com/aktsmm/azure-update-digest) の機能のうち、本リポジトリに無かったものを、このリポジトリのデータ（`data/events`、`data/resources.json`）に合わせて取り込んだものです。MRC 取得や Azure 固有の分類は取り込んでいません。

## 静的 JSON API（`api/v1/`）

ベース URL: `https://aktsmm.github.io/vscode-copilot-digest/`。認証不要の読み取り専用 JSON です（GitHub Pages のため CORS は `*`）。

| パス | 内容 |
| --- | --- |
| `api/v1/index.json` | 件数、取得状態（`coverage`）、月・カテゴリ一覧、エンドポイント、ライセンスと出典 |
| `api/v1/latest.json` | 最新の掲載日から 30 日以内の更新 |
| `api/v1/months/YYYY-MM.json` | 掲載日の月別一覧 |
| `api/v1/updates/{id}.json` | 1 件の詳細。`id` は更新キーの SHA-256 先頭 16 桁 |
| `api/v1/categories/{category}.json` | `github-copilot` / `vs-code` / `github-platform` / `news` の軽量索引 |
| `slides/{id}.json` | スライド JSON（直近 3 か月） |
| `data/slides.json` | スライドの一覧と PDF の公開状態（`pdf`、`encrypted`、`pdfCrypto`） |

- 出力は決定的です。`snapshotAt` はビルド時刻ではなく入力ログ（`generatedAt`）の最新値で、同じ入力から同じ JSON が出ます。
- `coverage.months[].coverage` は `complete` / `collected_empty` / `partial_failure` です。`complete` 以外は更新が欠けている可能性があり、0 件と同義ではありません。
- `summary.state` は `generated` / `missing`、`resources.status` は原文・資料の確認状態（`verified` など）です。
- 原文本文は再配布しません。ライセンスは CC BY-NC-SA 4.0 で、Microsoft Corporation とその関連会社には [LICENSE](../LICENSE) の追加許諾があります。出典は `index.json` の `attribution` にあります。
- 互換性のない変更は `api/v2/` に分けます。

## スライド

1 更新 = 1 枚の JSON を `data/slides/{id}.json` に保存します。スキーマ・規則・描画は [slide-schema.md](slide-schema.md) を参照してください。

## PDF

- 色と文言は `scripts/lib/theme.mjs` に集約しています。基調色は GitHub ダーク（`#0d1117`）と GitHub Copilot パープル（`#8534f3`）、表紙・目次・概要・裏表紙の文言は本リポジトリ版です。
- `npm run build:pdfs` が `data/slides` を検証し、直近 3 か月（`PDF_RETENTION_MONTHS` で変更）を Playwright で描画します。不正なスライドや収まらないスライドは警告を出してその 1 件だけ飛ばし、サイトのデプロイは止めません。
- **最新の 1 件は無料サンプルとして `pdf/{id}.pdf` を誰でも開けます。** それ以外は AES-256-GCM（PBKDF2-SHA256、全 PDF で共通の salt を `data/slides.json` に公開）で暗号化した `pdf/{id}.pdf.enc` です。ブラウザは鍵を 1 回だけ導出して復号します。
- Secret `PDF_PASSWORD` が無い、またはブラウザが使えない場合は PDF を 1 件も公開しません（Pages は全公開のため）。このとき `data/slides.json` の `pdfCrypto` は `null` で、スライド JSON と一覧は公開されます。
- パスワードは暗号化の鍵であって、ユーザー認証ではありません。知っている人は全 PDF を復号できます。変更するときは Secret を更新して `deploy-pages.yml` を再実行します。

## `slides.html`（範囲指定・結合）

期間・種類（GA / Preview / 廃止 / アナウンス / 更新）で絞り込み、更新を選んで次をダウンロードできます。

- **選択を JSON で**: パスワード不要。`deck/v1` 形式です。
- **結合 PDF**: ブラウザ内で各 PDF を取得・復号して結合します。サンプルだけの選択はパスワード不要です。表紙・目次（ページ番号付き）・概要・裏表紙（著作権表示とリポジトリへのリンク）はブラウザが描画して画像ページとして追加します（文字の検索・選択はできません）。結合後の PDF は暗号化されません。最大 50 件です。
- 一覧は `data/slides.json` から作ります。PDF の公開が無い場合は JSON のみ使えます。CSS / JS は内容 hash 付きの URL で配信し、Pages のキャッシュによる古い版を避けます。

## スライド生成の自動化（専用 PR 系統）

既存の digest 用 PR 系統とは分離しています。

1. [author-slide-pr.yml](../.github/workflows/author-slide-pr.yml)（月・木 03:00 JST を目安、手動実行可）が、スライド未作成の直近 3 か月の更新を新しい順に最大 10 件選び、`Slide authoring request` Issue を作成または更新して Copilot cloud agent に割り当てる。
2. Copilot が `data/slides/{id}.json` だけを追加する PR を作る。Copilot は PR タイトルを自分で付けるため、スライド PR は **Issue のマーカー（`slide-authoring-request`）または `copilot/slide-` ブランチ名** で判定する。
3. [validate-slide-pr.yml](../.github/workflows/validate-slide-pr.yml) が、変更が `data/slides/{id}.json` の追加・更新だけであること（削除不可）、`npm run validate:slides`、`npm run test:data`、Pages ビルドを検証する。
4. [auto-merge-slide-pr.yml](../.github/workflows/auto-merge-slide-pr.yml) が、許可外の変更や `needs-human-review` がなければタイトルを `slides: update YYYY-MM-DD` に正規化して squash merge し、Pages を再デプロイする。許可外の変更があれば `needs-human-review` を付けて停止する。

digest 用の `validate-generated-pr` / `auto-merge-generated-pr` / `request-copilot-review` / `redeploy-pages-after-generated-pr-merge` はスライド PR を処理しません。コード・スキーマ・依存・workflow・暗号化の変更は自動 merge の対象外です。`PDF_PASSWORD` は `deploy-pages.yml` だけが使います（`tests/slide-lane.test.mjs` が検証）。

## テスト

- `npm test`: データ・API・スライド規則・暗号・workflow の分離を検証します。
- `npm run test:e2e`: 暗号化 PDF の生成からブラウザでの結合・JSON ダウンロードまでを検証します（ブラウザが無い環境ではスキップ）。
