# vscode-copilot-digest

GitHub Copilot と VS Code 周辺の更新を毎日収集し、日次ダイジェストと隔週ドラフトを自動生成するリポジトリです。

現在の公開先:

- GitHub Pages: https://aktsmm.github.io/vscode-copilot-digest/

## できること

- RSS / Atom / HTML スナップショットから更新を収集する
- 日次イベントを JSON と Markdown で保存する
- GitHub Pages 用の静的サイトを生成して公開する
- 日次ページに加えて、直近 7 日単位の週間ダイジェストも Pages に出す
- 14 日分の記録から Qiita 向けドラフトを生成する
- 7 日分の記録から週間ドラフトを生成する
- 必要なら Qiita API へ投稿し、投稿 ID と URL をドラフト frontmatter に反映する
- 新着がある日だけ Discord Webhook へ通知する
- Pages 上でソース出自バッジとハッシュタグ付きフィルタで更新を見分ける
- GitHub.com 上の Copilot cloud agent 向け Issue / PR フローを自動起票する

## 監視対象

- GitHub Changelog
- GitHub Changelog / Copilot ラベル
- GitHub Blog / GitHub Copilot
- VS Code feed
- VS Code Updates
- VS Code Release Notes 1.109
- GitHub Copilot What's New
- Publickey

ソース定義は [config/sources.json](config/sources.json) にあります。

## 編集ポリシー

- GitHub / VS Code の公式ソースを優先する
- 周辺ニュースは 1 日あたり最大 3 件までに絞る
- GitHub Copilot や VS Code の coding agent と関係が薄い記事は除外する
- feed に未来日付の項目が見えても、その公開日時までは取り込まない
- 初回取り込みや未取得分の回収が混ざる日は、日次と隔週ドラフトに注記を出す
- 通知文面、日次 Markdown、Pages 表示で同じ日本語化ルールを使う
- Pages では文書更新日とこのサイトに載った日を両方表示する
- Pages は日本語と英語の両方を静的生成する

## セットアップ

前提:

- Node.js 22 系推奨
- npm
- GitHub Actions と GitHub Pages を使える GitHub リポジトリ

インストール:

```bash
npm ci
```

## ローカル実行

日次収集:

```bash
npm run collect
```

Pages 生成:

```bash
npm run build:pages
```

隔週ドラフト生成:

```bash
npm run biweekly
```

週間ドラフト生成:

```bash
npm run weekly
```

任意の日数でドラフト生成:

```bash
node scripts/build-biweekly.mjs --days 14
node scripts/build-biweekly.mjs --from 2026-03-23 --to 2026-04-05
```

Discord 通知 preview:

```bash
npm run notify:discord -- --date 2026-04-06 --dry-run --force-preview
```

Qiita 投稿:

```bash
node scripts/publish-qiita.mjs drafts/biweekly-YYYYMMDD-YYYYMMDD.md
```

引数を省略すると、[scripts/publish-qiita.mjs](scripts/publish-qiita.mjs) は drafts 配下の最新 Markdown を対象にします。

## 生成物

- [data/events](data/events): 日次イベント JSON
- [data/snapshots](data/snapshots): HTML スナップショット比較用テキスト
- [summaries/daily](summaries/daily): 日次 Markdown
- [drafts](drafts): 14 日ドラフト
- [site](site): GitHub Pages 用の静的出力

## 主要スクリプト

- [scripts/collect.mjs](scripts/collect.mjs): ソース収集、未来日付除外、日次 JSON / Markdown 生成
- [scripts/build-pages.mjs](scripts/build-pages.mjs): Pages 用静的サイト生成
- [scripts/build-biweekly.mjs](scripts/build-biweekly.mjs): 14 日ドラフト生成
- [scripts/build-weekly.mjs](scripts/build-weekly.mjs): 7 日ドラフト生成
- [scripts/notify-discord.mjs](scripts/notify-discord.mjs): Discord 通知と preview 出力
- [scripts/publish-qiita.mjs](scripts/publish-qiita.mjs): Qiita API への新規投稿 / 更新
- [scripts/lib/reporting.mjs](scripts/lib/reporting.mjs): 分類、重複除去、日本語化、注記生成の共通ロジック

## GitHub Actions

- [collect-updates.yml](.github/workflows/collect-updates.yml)
  毎日 12:30 JST に収集し、変更があれば data と summaries をコミットします。新着がある場合だけ Discord 通知を送ります。

- [deploy-pages.yml](.github/workflows/deploy-pages.yml)
  main への push を契機に Pages を再生成して公開します。日本語と英語の両ページ、日次ページ、週間ページをまとめて出力します。

- [build-biweekly-draft.yml](.github/workflows/build-biweekly-draft.yml)
  workflow_dispatch で指定日数の隔週ドラフトを作り、drafts をコミットします。

- [build-weekly-draft.yml](.github/workflows/build-weekly-draft.yml)
  毎週土曜日 12:30 JST に週間ドラフトを生成し、必要なら手動実行でも更新できます。

- [publish-qiita.yml](.github/workflows/publish-qiita.yml)
  workflow_dispatch で指定ファイルを Qiita へ公開し、投稿メタデータをドラフトへ書き戻します。

- [test-discord-notification.yml](.github/workflows/test-discord-notification.yml)
  workflow_dispatch で指定日または最新日の Discord preview 通知を実送信し、Webhook 設定を確認できます。

- [copilot-setup-steps.yml](.github/workflows/copilot-setup-steps.yml)
  Copilot cloud agent が作業を始める前に Node.js と依存関係を準備します。

- [author-digest-pr.yml](.github/workflows/author-digest-pr.yml)
  collect 完了後に最新イベントを見て、Copilot cloud agent 向けの執筆依頼 Issue を自動作成または更新します。手動実行時は対象日、スコープ、0件でも起票するかを選べます。

- [request-copilot-review.yml](.github/workflows/request-copilot-review.yml)
  Copilot 由来 PR にラベルを付け、Copilot reviewer の追加を試みます。review API が使えない環境では設定依存のため warning に留めます。

- [validate-generated-pr.yml](.github/workflows/validate-generated-pr.yml)
  自動生成 PR の変更対象、Markdown 構造、`npm run collect`、`npm run build:pages` を検証します。

- [auto-merge-generated-pr.yml](.github/workflows/auto-merge-generated-pr.yml)
  validate 成功後、許可ファイルのみを変更している Copilot PR に対して auto-merge を有効化します。

## 必要な Secrets

- `DISCORD_WEBHOOK_URL`
  Discord 通知を有効にする場合のみ必要です。

- `PAGES_BASE_URL`
  Discord 通知に載せる Pages URL のベースです。未設定時は `https://aktsmm.github.io/vscode-copilot-digest` を使います。

- `QIITA_ACCESS_TOKEN`
  Qiita 投稿を有効にする場合のみ必要です。

## Copilot cloud agent 運用メモ

- リポジトリ全体の指示は [.github/copilot-instructions.md](.github/copilot-instructions.md) に置きます。
- Copilot cloud agent の開発環境は [.github/workflows/copilot-setup-steps.yml](.github/workflows/copilot-setup-steps.yml) で事前セットアップします。
- 自動執筆フローを使うには、リポジトリ設定で Copilot cloud agent へのアクセスを有効化してください。
- Copilot Code Review を自動で使うには、リポジトリ設定の Copilot > Code review で自動レビューを有効にしてください。

## Pages 構成

- トップページ: 公開方針、最新ハイライト、週間アーカイブ、日次アーカイブ
- 日次ページ: 概況、注記、注目トピック、テーマ別まとめ、ソース内訳、全件一覧
- 週間ページ: 直近 7 日のハイライト、テーマ別まとめ、ソース内訳、全件一覧
- raw データ: 各日の Markdown と JSON をそのまま参照可能

## ディレクトリ概要

- [config](config): 監視ソース定義
- [data](data): 収集結果と内部状態
- [summaries](summaries): 日次要約
- [drafts](drafts): 記事ドラフト
- [scripts](scripts): 収集 / 生成 / 投稿処理
- [docs](docs): 設計メモ
- [research](research): 調査メモ

## 補足

- X 自動投稿は技術的には可能ですが、2026 年時点では課金と認証管理のコストが高いため、この構成には含めていません。
- 通知追加先としては Bluesky、Mastodon、Slack のほうが現実的です。
- 設計メモは [docs/architecture.md](docs/architecture.md) にあります。
