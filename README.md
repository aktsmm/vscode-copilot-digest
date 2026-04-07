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
- collect は毎日動かしつつ、Discord Webhook には 5 日ごとに直近 5 日分をまとめて通知する
- Pages 上でソース出自バッジとハッシュタグ付きフィルタで更新を見分ける
- GitHub.com 上の Copilot cloud agent 向け Issue / PR フローを自動起票する

運用の詳細は [docs/automation.md](docs/automation.md) にまとめています。

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
- feed に未来日付の項目が見えた場合は、通常のハイライトには混ぜず、警告付きの別セクションで扱う
- 初回取り込みや未取得分の回収が混ざる日は、日次と隔週ドラフトに注記を出す
- 通知文面、日次 Markdown、Pages 表示で同じ日本語化ルールを使う
- Pages では文書更新日とこのサイトに載った日を両方表示する
- Pages は日本語と英語の両方を静的生成する

## セットアップ

前提:

- Node.js 22 系推奨
- npm
- GitHub Actions と GitHub Pages を使える GitHub リポジトリ

GitHub Actions 内部の主要 action は新しい major へ更新済みですが、Pages 系 action は upstream 側の都合で Node 20 deprecation warning が出る可能性があります。

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
node scripts/notify-discord.mjs --date 2026-04-06 --window-days 5 --cadence-days 5 --anchor-date 2026-04-06 --dry-run --force-preview
```

## 生成物

- [data/events](data/events): 日次イベント JSON
- [data/snapshots](data/snapshots): HTML スナップショット比較用テキスト
- [summaries/daily](summaries/daily): 日次 Markdown
- [drafts](drafts): 14 日ドラフト
- [site](site): GitHub Pages 用の静的出力

## 主要スクリプト

- [scripts/collect.mjs](scripts/collect.mjs): ソース収集、未来日付項目の警告付き分離、日次 JSON / Markdown 生成
- [scripts/build-pages.mjs](scripts/build-pages.mjs): Pages 用静的サイト生成
- [scripts/build-biweekly.mjs](scripts/build-biweekly.mjs): 14 日ドラフト生成
- [scripts/build-weekly.mjs](scripts/build-weekly.mjs): 7 日ドラフト生成
- [scripts/notify-discord.mjs](scripts/notify-discord.mjs): Discord 通知と preview 出力。workflow では 2026-04-06 を基準日に、5日ごとに直近5日分をまとめて投稿する設定で使う
- [scripts/publish-qiita.mjs](scripts/publish-qiita.mjs): Qiita API への新規投稿 / 更新
- [scripts/lib/reporting.mjs](scripts/lib/reporting.mjs): 分類、重複除去、日本語化、注記生成の共通ロジック

## GitHub Actions

### 日次収集と Pages 公開

- 毎日 12:30 JST を目安に `collect-updates.yml` がスケジュール実行される（GitHub Actions の schedule は遅延しうる）
- 変更があれば `data/**` と `summaries/**` をコミットする
- main への push で自動的に `deploy-pages.yml` が Pages を再生成する
- Discord Webhook には 5 日ごとに直近 5 日分をまとめて通知する

### Copilot Coding Agent による自動化

- `collect-updates.yml` 成功後に `author-digest-pr.yml` が Copilot 向けの執筆依頼 Issue を自動作成する
- Issue の Copilot assignee が自動化され、Copilot cloud agent がダイジェスト PR を生成する
- 生成 PR に対して以下の workflow が自動実行される：
  - `request-copilot-review.yml`: PR にラベルやメタデータを付与する
  - `validate-generated-pr.yml`: draft の構文と内容を検証する
  - `auto-merge-generated-pr.yml`: 検証成功時に PR を ready for review に変更し、可能なら自動 merge する
- Copilot が作成した workflow run が `action_required` で blocked された場合、`rerun-blocked-copilot-workflows.yml` が定期的に検出して 1 回だけ自動リトライする

### workflow の詳細

- GitHub hosted runner の Node 20 deprecation warning に対応し、主要 action は新しい major へ更新済み
- 生成 PR は `summaries/daily/**`、`drafts/**`、`scripts/lib/reporting.mjs` 以外を変更しない限り auto-merge される
- `needs-human-review` ラベルがある PR は自動 merge から除外される
- Pages 再生成は commit や squash merge の直後に別途 dispatch で呼び出す（push 起点の workflow が自動連鎖しないため）

### 詳細は設計資産を参照

- workflow ごとの役割、Secrets、手動テスト手順は [docs/automation.md](docs/automation.md) を参照してください
- 設計資産や learnings は [AGENTS.md](AGENTS.md) を参照してください

## 必要な Secrets

- 使用する Secrets と Copilot cloud agent 運用メモは [docs/automation.md](docs/automation.md) に移しました。

## Pages 構成

- トップページ: このサイトの見方、公開方針、最新ハイライト、週間アーカイブ、日次アーカイブ
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

## ライセンス

- このリポジトリのサイト本文、README、docs、日次要約、drafts、生成済み Pages は [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) が基本です。
- ただし Microsoft Corporation とその関連会社には、対象コンテンツについて商用利用を含む追加許諾を与えます。
- 詳細な適用範囲は [LICENSE](LICENSE) を参照してください。
- GitHub、GitHub Copilot、Visual Studio Code などの名称やロゴは各権利者に帰属します。
