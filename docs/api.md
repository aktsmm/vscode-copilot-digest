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
| `api/v1/qa.json` | スライドの**想定問答**（`qa`）を、新しい順に 1 ファイルへ集めたもの。各項目は `id`、`title`（スライドの日本語題名）、`digestDate`、`topic`、`source`、`urls`、`qa[{q, a}]`。件数は `count`（更新数）と `questionCount`（質問数）。個別の更新は `api/v1/updates/{id}.json` の `qa` でも取れ、`months` などの項目には `slide.hasQa` / `slide.qaCount` が付く |
| `slides/{id}.json` | スライド JSON（直近 3 か月） |
| `data/slides.json` | スライドの一覧、PDF の公開状態（`pdf`、`encrypted`、`pdfCrypto`）、サンプル PDF（`sample`） |

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

## ローカルでの確認

```bash
npm run pending:slides -- --limit 5                 # スライド未作成の更新（直近 3 か月）
npm run validate:slides                             # data/slides/*.json の検証
npm run pdf -- --ids <id>[,<id>] --out dist-pdf     # 暗号化なしの PDF をローカルで描画（要 Chrome / Edge）
PDF_PASSWORD=*** npm run build:pdfs                 # デプロイ時と同じ手順（サンプル以外は暗号化）
```

## ダウンロードパネル

トップページとハイライト一覧の「スライドをダウンロード」パネルから、別ページへ移動せずにダウンロードできます。期間（開始・終了・過去30日・過去7日）、種類（GA / Preview / 廃止 / アナウンス / 更新）、トピックで絞り込み、ボタンの件数が絞り込み結果に追従します。

- **JSON（n）**: 絞り込んだスライドを `deck/v1` 形式で。パスワード不要。
- **PDF（n）**: ブラウザ内で各 PDF を取得・復号して 1 つに結合します。表紙・目次（ページ番号付き）・概要・裏表紙（著作権表示とリポジトリへのリンク）はブラウザが描画した画像ページです（文字の検索・選択はできません）。結合後の PDF は暗号化されません。最大 200 件。超えるとボタンが無効になり、理由と対処（期間を狭める・選択を減らす）が表示される。
- **PPTX（n）**: 同じ範囲を PowerPoint（pptxgenjs で生成）として。スライド JSON は公開のため、パスワードは暗号化 PDF を 1 件復号して確認します。
- **サンプル PDF**: 最新の 1 件。パスワード不要。サンプルだけの選択ではパスワードを求めません。
- パスワードは `window.prompt` で尋ね、同じページ内では記憶します。違う場合は「パスワードが違います」と表示します。
- PDF の公開が無い（Secret 未設定など）場合は、PDF と PPTX のボタンを出さず、JSON だけ使えます。
- 実装は `scripts/lib/downloads.mjs` で、pdf-lib と pptxgenjs はボタンを押したときだけ読み込みます（`assets/vendor/`）。

## スライド生成の自動化（専用 PR 系統）

既存の digest 用 PR 系統とは分離しています。

1. [slide-dispatch.yml](../.github/workflows/slide-dispatch.yml)（1 日 4 回を目安、手動実行可）が、スライド未作成の直近 3 か月の更新を新しい順に最大 10 件選び、1 件ずつ agentic workflow [slide.md](../.github/workflows/slide.md)（gh-aw、モデル `claude-sonnet-5.5`）を起動する。`Slide skip` の Issue がある更新、2 回閉じられた更新、PR が開いている更新は外す。
2. agent が記事を読み、`data/slides/{id}.json` だけを書き、`npm run validate:slides` を通して、タイトルが `slides: ` で始まる PR を作る。読めなかった更新は、ファイルを作らず `Slide skip: {id}` の Issue を作る。
3. [auto-merge-agent-prs.yml](../.github/workflows/auto-merge-agent-prs.yml)（毎時、agent の完了後）が [scripts/merge-agent-prs.mjs](../scripts/merge-agent-prs.mjs) で、変更が `data/slides/{id}.json` 1 件だけ（削除不可）であることを確認し、PR を main に merge した作業ブランチで `npm run validate:slides` と `npm run test:data` を通してから squash merge し、Pages を再デプロイする。許可外の変更や検証失敗は `needs-human-review` を付けて停止する。

コード・スキーマ・依存・workflow・暗号化の変更は自動 merge の対象外です。`PDF_PASSWORD` は `deploy-pages.yml` だけが使います（`tests/slide-lane.test.mjs` が検証）。

## テスト

- `npm test`: データ・API・スライド規則・暗号・workflow の分離を検証します。
- `npm run test:e2e`: 暗号化 PDF の生成から、パネルでの絞り込み、JSON / PDF / PPTX のダウンロード、誤ったパスワードの拒否までを検証します（ブラウザが無い環境ではスキップ）。
