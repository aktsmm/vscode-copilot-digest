# vscode-copilot-digest

GitHub Actions で日次の情報収集を回し、2週間単位でブログ記事のたたきを作るための最小構成です。

## 何をするか

- GitHub Actions で毎日ソースを巡回する
- 新着フィードと HTML スナップショット差分を記録する
- 日次サマリーを Markdown と JSON で残す
- GitHub Pages に日次ダイジェストを公開する
- 14日分の記録から Qiita 向けの下書きを生成する
- 必要なら Qiita API で公開する

## 監視ソース

- GitHub Changelog
- GitHub Changelog / Copilot ラベル
- GitHub Blog / GitHub Copilot
- VS Code feed
- VS Code Updates
- VS Code Release Notes 1.109
- GitHub Copilot What's New
- Publickey

上のうち、現時点での必須ソースは GitHub Changelog と VS Code Updates です。

運用ルール:

- GitHub / VS Code の公式ソースを優先する
- 周辺ニュースは 1 日あたり最大 3 件までに絞る
- GitHub Copilot や VS Code の coding agent と関係が薄い周辺記事は除外する

ソース定義は [config/sources.json](config/sources.json) にあります。

## ディレクトリ

- [config/sources.json](config/sources.json): 監視ソース定義
- [data/state.json](data/state.json): 既読 ID とスナップショット状態
- [data/events](data/events): 日次イベント JSON
- [data/snapshots](data/snapshots): HTML 差分比較用テキスト
- [summaries/daily](summaries/daily): 日次 Markdown サマリー
- [drafts](drafts): 2週間まとめの下書き
- [scripts/collect.mjs](scripts/collect.mjs): 日次収集
- [scripts/build-biweekly.mjs](scripts/build-biweekly.mjs): 14日まとめ作成
- [scripts/build-pages.mjs](scripts/build-pages.mjs): GitHub Pages 用の静的サイト生成
- [scripts/publish-qiita.mjs](scripts/publish-qiita.mjs): Qiita 投稿

## 使い方

```bash
npm install
npm run collect
npm run build:pages
npm run biweekly
```

Qiita へ投稿する場合は、`QIITA_ACCESS_TOKEN` を設定してから次を実行します。

```bash
node scripts/publish-qiita.mjs drafts/biweekly-YYYYMMDD-YYYYMMDD.md
```

## GitHub Actions

- [.github/workflows/collect-updates.yml](.github/workflows/collect-updates.yml): 毎日収集して記録をコミット
- [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml): main への push を契機に GitHub Pages を再生成して公開
- [.github/workflows/build-biweekly-draft.yml](.github/workflows/build-biweekly-draft.yml): 手動で 14 日ドラフトを生成
- [.github/workflows/publish-qiita.yml](.github/workflows/publish-qiita.yml): 手動で Qiita に公開

日次収集 workflow は、その実行で新着が 1 件以上あったときだけ Discord Webhook に通知できます。

## Pages の見せ方

- トップページ: 最新日次への導線、公開方針、横断ハイライト
- 日次ページ: 概況、注目トピック、テーマ別まとめ、ソース内訳、全件一覧
- 生データ: 各日ごとの Markdown と JSON をそのまま参照可能

## 運用メモ

- feed に未来日付の項目が見えても、その公開日時になるまでは収集しない
- 初回取り込み日や未取得分の回収が混ざる日は、日次や隔週ドラフトに注記を出す
- 通知や Pages でも日次サマリーと同じ日本語化ルールを使う

## シークレット

- `QIITA_ACCESS_TOKEN`: Qiita 投稿用。手動公開 workflow と `publish-qiita.mjs` で使用
- `DISCORD_WEBHOOK_URL`: Discord 通知用。日次収集で新着があったときだけ使用

## 補足

- X 自動投稿は技術的には可能ですが、2026 年時点では課金と認証管理のコストが高いため、この初期構成には入れていません。
- 通知を追加するなら Bluesky、Mastodon、Slack のほうが現実的です。
- 設計メモは [docs/architecture.md](docs/architecture.md) にまとめています。
