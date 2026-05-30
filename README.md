# vscode-copilot-digest

GitHub Copilot と VS Code 周辺の更新を毎日収集し、日次イベント、日次本文、週間・隔週ドラフト、GitHub Pages 用の静的サイトを自動生成するリポジトリです。GitHub Actions が収集と公開を回し、GitHub.com 側の Copilot cloud agent が本文・要点・対訳の更新 PR を自動作成します。

現在の公開先:

- GitHub Pages: https://aktsmm.github.io/vscode-copilot-digest/

## できること

- RSS / Atom / HTML スナップショットから GitHub Copilot / VS Code 関連更新を収集する
- 日次イベントを JSON で保存し、公開済み更新または未来日付項目がある日だけ Markdown を保存する
- GitHub Pages 用に、日本語 / 英語のトップページ、日次詳細、週間詳細、ハイライト一覧、日次アーカイブ一覧、週間アーカイブ一覧、検索ページを静的生成する
- 最新ハイライトをトップページでは 6 件表示し、全件一覧は 50 件単位でページ分割して公開する
- 7 日分の記録から週間ドラフト、14 日分の記録から隔週ドラフトを生成する
- 必要なら Qiita API へ投稿し、投稿 ID と URL をドラフト frontmatter に反映する
- collect は 1 日 3 回動かしつつ、Discord Webhook には週 1 回で直近 7 日分をまとめて通知する
- Pages 上では source-only の簡素なフィルタと、Pagefind による全文検索を提供する
- GitHub.com 上の Copilot cloud agent 向け執筆依頼 Issue / PR フローを自動起票する
- 日次本文、要点、日本語化・対訳の更新には GitHub Copilot Cloud Agent を使う

運用の詳細は [docs/automation.md](docs/automation.md) にまとめています。
検索の仕組みは [docs/search-architecture.md](docs/search-architecture.md) に分けてあります。

## 自動更新と自動執筆の流れ

1. [collect-updates.yml](.github/workflows/collect-updates.yml) が毎日ソースを収集し、[data/events](data/events) と [summaries/daily](summaries/daily) を更新する
2. 変更があれば `github-actions[bot]` が `data/**` と `summaries/**` を commit する
3. collect commit の直後に workflow から [deploy-pages.yml](.github/workflows/deploy-pages.yml) を dispatch し、最新データで Pages を再生成する
4. collect 成功後に [author-digest-pr.yml](.github/workflows/author-digest-pr.yml) が Copilot 向け執筆依頼 Issue を作成または更新する
5. Copilot cloud agent が Issue を受けて、日次本文・ドラフト・必要な対訳更新を含む PR を作成する
6. [request-copilot-review.yml](.github/workflows/request-copilot-review.yml)、[validate-generated-pr.yml](.github/workflows/validate-generated-pr.yml)、[auto-merge-generated-pr.yml](.github/workflows/auto-merge-generated-pr.yml) が PR を正規化・検証・自動 merge する
7. 生成 PR が merge されたときは [redeploy-pages-after-generated-pr-merge.yml](.github/workflows/redeploy-pages-after-generated-pr-merge.yml) が Pages を再度 dispatch し、本文更新を live へ反映したうえで superseded な draft PR / digest-authoring issue を cleanup する

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
- feed に未来日付の項目が見えた場合は、通常のハイライトには混ぜず、日次ページの警告付き別セクションで扱う
- 公開済み更新が 0 件の空日は Pages の日次ページとして公開しない
- 通知文面、日次 Markdown、Pages 表示で同じ日本語化ルールを使い、必要な対訳更新は GitHub Copilot Cloud Agent の PR フローで反映する
- `要点` と `なぜ重要か / Why it matters` は、単なる release / preview ラベルの定型文に寄りすぎないよう、主要タイトルには個別の説明文を優先して使う
- Pages では文書更新日とこのサイトに載った日を両方表示する
- Pages は日本語と英語の両方を静的生成し、フィルタ UI は source-only の簡素版に揃える

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
node scripts/notify-discord.mjs --mode weekly --date 2026-04-10 --window-days 7 --dry-run --force-preview
```

Discord 通知は短い概要を本文に置き、主な更新は embed カードとして出力する。`--dry-run` では JSON payload を確認できる。

## 生成物

- [data/events](data/events): 日次イベント JSON
- [data/snapshots](data/snapshots): HTML スナップショット比較用テキスト
- [summaries/daily](summaries/daily): 公開済み更新または未来日付項目がある日だけ生成する日次 Markdown
- [drafts](drafts): 14 日ドラフト
- [site](site): GitHub Pages 用の静的出力

## 主要スクリプト

- [scripts/collect.mjs](scripts/collect.mjs): ソース収集、未来日付項目の警告付き分離、日次 JSON / Markdown 生成
- [scripts/build-pages.mjs](scripts/build-pages.mjs): トップページ、日次・週間詳細、ハイライト一覧、日次・週間アーカイブ一覧、検索ページを含む Pages 用静的サイト生成
- [scripts/build-biweekly.mjs](scripts/build-biweekly.mjs): 14 日ドラフト生成
- [scripts/build-weekly.mjs](scripts/build-weekly.mjs): 7 日ドラフト生成
- [scripts/notify-discord.mjs](scripts/notify-discord.mjs): Discord 通知と preview 出力。workflow では weekly mode と 7 日 window で、短い概要と更新カードを投稿する設定で使う
- [scripts/publish-qiita.mjs](scripts/publish-qiita.mjs): Qiita API への新規投稿 / 更新
- [scripts/lib/reporting.mjs](scripts/lib/reporting.mjs): 分類、重複除去、日本語化、注記生成の共通ロジック

## GitHub Actions

### 日次収集と Pages 公開

- 毎日 06:30 / 14:30 / 22:30 JST を目安に `collect-updates.yml` がスケジュール実行される（GitHub Actions の schedule は遅延しうる）
- 変更があれば `data/**` と `summaries/**` をコミットする
- collect commit の直後に workflow dispatch で `deploy-pages.yml` を呼び出し、Pages を再生成する
- 毎週金曜 06:00 JST を目安に `build-weekly-draft.yml` が直近 7 日分の週間ドラフトを更新する
- 毎週水曜 06:00 JST を目安に `notify-weekly-discord.yml` が直近 7 日分の週間要約を Discord Webhook へ通知する
- Copilot 由来の PR が merge されたときも `redeploy-pages-after-generated-pr-merge.yml` が `deploy-pages.yml` を再 dispatch し、superseded な draft PR / digest-authoring issue を cleanup する

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
- 最新 collect が 0 件なら、トップページの「最新日付」は前回公開された日次のまま据え置きになる。これは反映漏れではなく、新規公開対象が無かったことを示す
- 新規イベントも Pages build failure も low-information fallback も無い日に stale な `digest-authoring` Issue が残っていた場合、`author-digest-pr.yml` が自動で close してキューを整理する
- まれに live の Pages 配信が stale で、日本語 / 英語のどちらか片方だけ古い文面を返すことがある。その場合は repo 上の `site/**` と raw summary を先に確認し、必要なら `deploy-pages.yml` を手動 dispatch して再確認する

### 詳細は設計資産を参照

- workflow ごとの役割、Secrets、手動テスト手順は [docs/automation.md](docs/automation.md) を参照してください
- 設計資産や learnings は [AGENTS.md](AGENTS.md) を参照してください

## 必要な Secrets

- 使用する Secrets と Copilot cloud agent 運用メモは [docs/automation.md](docs/automation.md) に移しました。

## Pages 構成

- トップページ: 最新 6 件ハイライト、週間アーカイブ、日次アーカイブ、簡易検索
- ハイライト一覧: 公開済みハイライトの全件一覧。50 件ごとにページ分割
- 日次アーカイブ一覧: 日付ごとのダイジェストを 1 行 1 件寄りの縦一覧で表示
- 週間アーカイブ一覧: 週単位ダイジェストを 1 行 1 件寄りの縦一覧で表示
- 日次ページ: 未来日付項目の警告セクション、注目トピック、テーマ別まとめ、ソース内訳、全件一覧
- 週間ページ: 直近 7 日のハイライト、テーマ別まとめ、ソース内訳、全件一覧
- 検索ページ: Pagefind のインデックスを使い、公開済み日次・週間詳細ページから title / excerpt を横断検索する
- raw データ: 各日の Markdown と JSON をそのまま参照可能

## 検索実装

- `npm run build:pages` は静的 HTML 生成のあとに `pagefind --site site --output-subdir pagefind` を実行し、公開用インデックスを作る
- トップページは `pagefind-component-ui` を使った簡易検索を埋め込み、最近の公開更新へすぐ飛べるようにしている
- 専用の `search.html` は `pagefind.js` を直接読み込み、クエリ文字列同期、preload、結果整形を含む軽量な検索 UI を静的配布している
- 検索対象は `data-pagefind-body` を持つ公開ページだけで、日次・週間の詳細本文から検索できる
- 詳細設計は [docs/search-architecture.md](docs/search-architecture.md) を参照

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
- 検索 UI / index の設計は [docs/search-architecture.md](docs/search-architecture.md) にあります。

## ライセンス

- このリポジトリのサイト本文、README、docs、日次要約、drafts、生成済み Pages は [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) が基本です。
- ただし Microsoft Corporation とその関連会社には、対象コンテンツについて商用利用を含む追加許諾を与えます。
- 詳細な適用範囲は [LICENSE](LICENSE) を参照してください。
- GitHub、GitHub Copilot、Visual Studio Code などの名称やロゴは各権利者に帰属します。
