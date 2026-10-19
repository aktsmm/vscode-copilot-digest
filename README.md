# vscode-copilot-digest

GitHub Copilot と VS Code 周辺の更新を毎日収集し、日次イベント、日次本文、週間・隔週ドラフト、GitHub Pages 用の静的サイト、更新ごとのスライド（JSON / PDF / PPTX）を自動生成するリポジトリです。GitHub Actions が収集と公開を回し、GitHub Agentic Workflows（gh-aw、モデルは Claude Sonnet 5.5）がスライド・日本語要約・点検を担当します。人手を介さず、失敗は自動で検知して直す構成です。

現在の公開先:

- GitHub Pages: https://aktsmm.github.io/vscode-copilot-digest/

## できること

- RSS / Atom / HTML スナップショットから GitHub Copilot / VS Code 関連更新を収集する
- 日次イベントを JSON で保存し、公開済み更新または未来日付項目がある日だけ Markdown を保存する
- GitHub Pages 用に、日本語 / 英語のトップページ、日次詳細、週間詳細、ハイライト一覧、日次アーカイブ一覧、週間アーカイブ一覧、検索ページを静的生成する
- トップページは直近の更新を最大 120 件、項番付きの 1 列カードで表示し、期間・種類・トピック・キーワードで絞り込める（既定は過去 30 日）。全件一覧は 50 件単位でページ分割して公開する
- 提供終了・廃止に関わる更新だけを並べた「提供終了・廃止」ページ（`retirements.html`、英語版 `en/retirements.html`）を公開する
- 「About」ページ（`about.html`、英語版 `en/about.html`）で、収集元・つくり方・注意点と、データの状態（追跡中の更新、スライド・想定問答・要約の件数、収集期間、最終確認）を公開する。数値はビルド時にデータから計算する
- ダークモードに対応する。ヘッダーの切り替えボタンで変更でき、選択はブラウザに保存される。初回は OS の設定（`prefers-color-scheme`）に従う。実装は `scripts/lib/theme-dark.mjs`
- 7 日分の記録から週間ドラフト、14 日分の記録から隔週ドラフトを生成する
- 必要なら Qiita API へ投稿し、投稿 ID と URL をドラフト frontmatter に反映する
- collect は 1 日 3 回動かしつつ、Discord Webhook には週 1 回で直近 7 日分をまとめて通知する
- Pages 上では source-only の簡素なフィルタと、Pagefind による全文検索を提供する
- 更新カード・トップページの簡易検索・専用検索・日次／週間詳細から、原文、確認済みの公式資料（最大 3 件）、掲載日のまとめの該当箇所を直接開ける
- スライド・日本語要約・点検は agentic workflow が書き、PR を `scripts/merge-agent-prs.mjs` が検証（スキーマ、1 ページに収まるか、事実が引用ページにあるか）してから自動 merge する
- 失敗は `heal-on-failure.yml` が点検の agent に渡し、直せるものは PR で直し、直せないものは Issue にまとめる。毎日、Issue「Pipeline status」に運用状況の表を更新する
- 静的 JSON API（`api/v1/`）として、更新一覧・月別・カテゴリ別・個別詳細・想定問答（`qa.json`）と取得状態を公開する
- 1 更新 = 1 枚のスライド JSON（`data/slides/`）を agent が記事から書く。発表者向けの**想定問答**（`qa`）は PPTX のスライドノートと JSON、API に入る
- スライドを PDF 化する（GitHub ダーク＋Copilot パープルの表紙・裏表紙）。最新 1 件は無料サンプル、残りは `PDF_PASSWORD` で暗号化して公開する
- トップページとハイライト一覧の「スライドをダウンロード」パネルで、期間・種類・トピックを絞り、JSON / PDF / PPTX（PowerPoint）をその場でダウンロードできる（別ページへの遷移なし）。サンプル PDF はパスワード不要

運用の詳細は [docs/automation.md](docs/automation.md) にまとめています。
静的 JSON API・スライド・PDF・PPTX のダウンロードパネルは [docs/api.md](docs/api.md) を参照してください。
検索の仕組みは [docs/search-architecture.md](docs/search-architecture.md) に分けてあります。
原文と公式資料の選び方、確認状態、途中再開は [docs/resource-enrichment.md](docs/resource-enrichment.md) にまとめています。

## 更新カードのリンク

| 表示 | 開く先 |
| --- | --- |
| **原文** | 更新の発表記事や対象リリース。確認できた場合は、実在する機能見出しまで直接移動する |
| **関連ドキュメント** | 設定・使い方・制限を確認する公式資料。文書タイトル付きで最大 3 件、日本語の本文が提供されている場合は日本語版を優先する |
| **掲載日のまとめを見る** | このサイトの日次まとめにある、その更新の掲載箇所。ページ内で探し直さなくて済むよう、更新アンカー付きで移動する |

「原文」と「関連ドキュメント」は外部サイト、「掲載日のまとめを見る」はサイト内へのリンクです。古い日次カードはその日の更新を開き、後日に同じ URL が再検出されても別の日の更新へ飛ばしません。言語切替でも検索条件と更新アンカーを保持します。

資料が確認できない場合は「対応資料未確認」、取得に失敗した場合は「資料の取得失敗」、未処理の場合は「資料未調査」と表示します。未確認を資料不存在と断定せず、無関係なトップページや推測 URL で埋めません。

## 自動更新と自動執筆の流れ

1. [collect-updates.yml](.github/workflows/collect-updates.yml) が `npm run collect` を実行し、ソース収集と全期間の原文・資料補完を行う。イベントは [data/events](data/events)、本文は [summaries/daily](summaries/daily)、確認証跡は [data/resources.json](data/resources.json) に保存する
2. 変更があれば `github-actions[bot]` が `data/**` と `summaries/**` を commit する
3. collect commit の直後に workflow から [deploy-pages.yml](.github/workflows/deploy-pages.yml) を dispatch し、最新データで Pages を再生成する
4. スライドは [slide-dispatch.yml](.github/workflows/slide-dispatch.yml)（1 日 4 回、各回最大 10 件）が 1 件ずつ [slide.md](.github/workflows/slide.md) に渡し、日本語要約は [summarize-dispatch.yml](.github/workflows/summarize-dispatch.yml) が未処理があるときだけ [summarize.md](.github/workflows/summarize.md) を起動する。agent が記事を読み、PR（`slides:` / `summaries:`）を作る
5. [auto-merge-agent-prs.yml](.github/workflows/auto-merge-agent-prs.yml)（毎時）が PR を main に merge した作業ブランチで検証し、通ったものだけ squash merge して Pages を再デプロイする
6. 失敗は [heal-on-failure.yml](.github/workflows/heal-on-failure.yml) が [maintain.md](.github/workflows/maintain.md)（点検の agent）に渡し、毎週月曜にも点検が動く

`.github/workflows/*.md` が agentic workflow の正本で、`gh aw compile` が `*.lock.yml` を作ります（lock は手で編集しません）。

## 監視対象

- GitHub Changelog
- GitHub Changelog / Copilot ラベル
- GitHub Blog / GitHub Copilot
- VS Code feed
- VS Code Updates
- VS Code Release Notes（直近 5 リリース。機能見出しごとに 1 件の更新として扱う）
- VS Code Docs / agents（新規ページの検知と、automations などの主要ページの変更）
- GitHub Copilot What's New
- Publickey

ソース定義は [config/sources.json](config/sources.json) にあります。

## 編集ポリシー

- GitHub / VS Code の公式ソースを優先する
- 周辺ニュースは 1 日あたり最大 3 件までに絞る
- GitHub Copilot や VS Code の coding agent と関係が薄い記事は除外する
- feed に未来日付の項目が見えた場合は、通常のハイライトには混ぜず、日次ページの警告付き別セクションで扱う
- 公開済み更新が 0 件の空日は Pages の日次ページとして公開しない
- 通知文面、日次 Markdown、Pages 表示で同じ日本語化ルールを使い、カードの文面はスライド → 書かれた要約（`data/summaries-ja.json`）→ 原文の抜粋の順で選ぶ
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

`collect` は収集後に全期間の未補完資料を検証し、`data/resources.json` の補完台帳を更新します。イベント JSON に資料を手入力しないため、再収集で資料が消えません。

資料の全期間監査／補完／失敗の再確認:

```bash
npm run audit:resources
npm run enrich:resources
npm run enrich:resources -- --retry-failed
```

対象範囲、件数、関連資料あり、資料リンク数、対応資料未確認、取得失敗、未調査を出力します。検証途中で停止した場合は同じコマンドで再開します。詳細は [資料補完の運用](docs/resource-enrichment.md) を参照してください。

Pages 生成:

```bash
npm run build:pages
```

低情報 fallback、資料補完、生成ページの検査（先に Pages を生成する）:

```bash
npm test
```

隔週ドラフト生成:

```bash
npm run biweekly
```

週間ドラフト生成:

```bash
npm run weekly
```

既存の週次・隔週ドラフトを再生成（手入力済みの所感欄はスキップ）:

```bash
npm run render:drafts
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
- [data/resources.json](data/resources.json): 原文・公式資料の検証台帳（採用根拠、確認日時、本文 hash、失敗情報）
- `.cache/resource-pages`: 取得ページの作業用キャッシュ。Git 管理対象ではなく、確認台帳とは別に扱う
- [summaries/daily](summaries/daily): 公開済み更新または未来日付項目がある日だけ生成する日次 Markdown
- [drafts](drafts): 14 日ドラフト
- [data/slides](data/slides): 1 更新 1 枚のスライド JSON（Copilot が生成し、検証を通ったものだけ merge）
- [site](site): GitHub Pages 用の静的出力（`api/v1/`、`slides/`、`pdf/` を含む）

## 主要スクリプト

- [scripts/collect.mjs](scripts/collect.mjs): ソース収集、未来日付項目の警告付き分離、日次 JSON / Markdown 生成
- [scripts/enrich-resources.mjs](scripts/enrich-resources.mjs): 全期間の原文・公式資料の補完、本文と見出しの確認、証跡保存、監査と途中再開
- [scripts/lib/resources.mjs](scripts/lib/resources.mjs): 補完キー、HTML 解析、原文解決、資料候補の選定、確認状態の集計
- [scripts/build-pages.mjs](scripts/build-pages.mjs): トップページ、日次・週間詳細、ハイライト一覧、日次・週間アーカイブ一覧、検索ページを含む Pages 用静的サイト生成
- [scripts/finalize-search.mjs](scripts/finalize-search.mjs): Pagefind の出力を版付き bundle に複製し、公開 HTML と検索データの版を揃える
- [scripts/build-biweekly.mjs](scripts/build-biweekly.mjs): 14 日ドラフト生成
- [scripts/build-weekly.mjs](scripts/build-weekly.mjs): 7 日ドラフト生成
- [scripts/notify-discord.mjs](scripts/notify-discord.mjs): Discord 通知と preview 出力。workflow では weekly mode と 7 日 window で、短い概要と更新カードを投稿する設定で使う
- [scripts/publish-qiita.mjs](scripts/publish-qiita.mjs): Qiita API への新規投稿 / 更新
- [scripts/lib/reporting.mjs](scripts/lib/reporting.mjs): 分類、重複除去、日本語化、注記生成の共通ロジック
- [scripts/lib/api.mjs](scripts/lib/api.mjs): 静的 JSON API と取得状態（coverage）の生成
- [scripts/lib/slides.mjs](scripts/lib/slides.mjs): スライドの検証規則（許可ホスト、内部メモ語の禁止、状態の根拠）
- [scripts/lib/theme.mjs](scripts/lib/theme.mjs): PDF / スライドの配色（GitHub / Copilot）と文言の単一定義
- [scripts/build-slide-pdfs.mjs](scripts/build-slide-pdfs.mjs): スライドの PDF 化、サンプル以外の暗号化、`data/slides.json`（一覧・サンプル・暗号化情報）の出力
- [scripts/pending-slides.mjs](scripts/pending-slides.mjs) / [scripts/validate-slides.mjs](scripts/validate-slides.mjs): スライド未作成の更新の抽出と検証
- [scripts/render-pdf.mjs](scripts/render-pdf.mjs): 指定したスライドを暗号化なしの PDF としてローカルで描画（`npm run pdf`）。1 ページに収まらないスライドは失敗にする
- [scripts/merge-agent-prs.mjs](scripts/merge-agent-prs.mjs): agent の PR（`slides:` / `summaries:` / `maint:`）を、許可範囲・検証を通したものだけ merge する
- [scripts/verify-slide-facts.mjs](scripts/verify-slide-facts.mjs) / [scripts/lib/slide-facts.mjs](scripts/lib/slide-facts.mjs): スライドの版番号・識別子・数値・日付が、引用ページにあるかを確認する
- [scripts/fetch-text.mjs](scripts/fetch-text.mjs): agent が記事を読むためのページ取得（許可した host だけ）
- [scripts/health-report.mjs](scripts/health-report.mjs) / [scripts/status-issue.mjs](scripts/status-issue.mjs): 点検の agent に渡す健康チェックと、運用状況 Issue の本文
- [scripts/pending-summaries.mjs](scripts/pending-summaries.mjs) / [scripts/slides-without-qa.mjs](scripts/slides-without-qa.mjs): 要約待ち・想定問答が無いスライドの抽出
- [scripts/backfill-skipped.mjs](scripts/backfill-skipped.mjs) / [scripts/coverage-report.mjs](scripts/coverage-report.mjs): フィードにあるのに `data/events` に無い記事の復元と確認

## GitHub Actions

### 日次収集と Pages 公開

- 毎日 06:30 / 14:30 / 22:30 JST を目安に `collect-updates.yml` がスケジュール実行される（GitHub Actions の schedule は遅延しうる）
- 変更があれば `data/**` と `summaries/**` をコミットする
- collect commit の直後に workflow dispatch で `deploy-pages.yml` を呼び出し、Pages を再生成する
- 毎週金曜 06:00 JST を目安に `build-weekly-draft.yml` が直近 7 日分の週間ドラフトを更新する
- 毎週水曜 06:00 JST を目安に `notify-weekly-discord.yml` が直近 7 日分の週間要約を Discord Webhook へ通知する
- agent の PR が merge されたときは、merger が `deploy-pages.yml` を dispatch して反映する

### スライド・要約・点検（agentic workflow）

- スライド: `slide-dispatch.yml` が 1 日 4 回（各回最大 10 件）、スライド未作成の直近 3 か月の更新を新しい順に 1 件ずつ `slide.md` に渡す。読めない更新は `Slide skip` Issue に記録して依頼から外す。新しい更新が無いときの余力で、想定問答が無い既存スライドに `qa` を足す
- 要約: `summarize-dispatch.yml` が 1 日 4 回、未処理があり `summaries:` の PR が開いていないときだけ `summarize.md` を起動する（最大 30 件）。対象はスライドと違い直近 6 か月で、古いカードの英語タイトル・抜粋のままの要約も新しい順に書き直す
- 点検: 毎週月曜 04:00 JST を目安に `maintain.md` が動き、失敗を検知した `heal-on-failure.yml` からも起動する。健康チェック（`scripts/health-report.mjs`）を読み、原因を直す PR か、直せないものの Issue を作る
- merge: `auto-merge-agent-prs.yml` が検証して merge する。スライドは `data/slides/{id}.json` 1 件だけ、要約は `data/summaries-ja.json` だけ、点検は `scripts/lib/maintenance-guard.mjs` の範囲だけ。1 ページに収まるか、事実が引用ページにあるかも確認する。検証に失敗したスライド・要約の PR は閉じて書き直させ、同じ更新で 2 回閉じられたら依頼から外す
- `watchdog.yml`（毎日）が、トークンの期限の警告、固まった agent の run の取り消し、失敗した Pages デプロイの再実行、回復した `[aw]` 失敗 Issue のクローズを行い、`pipeline-status.yml`（毎日）が運用状況の Issue を更新する
- `deploy-pages.yml` が `PDF_PASSWORD` を使って PDF を生成・暗号化する。Secret が無い、またはブラウザが使えない場合は PDF を公開せず、サイトのデプロイは続行する
- 詳細は [docs/automation.md](docs/automation.md)、[docs/api.md](docs/api.md)、[docs/slide-schema.md](docs/slide-schema.md) を参照

### workflow の詳細

- GitHub hosted runner の Node 20 deprecation warning に対応し、主要 action は新しい major へ更新済み
- `needs-human-review` ラベルがある PR は自動 merge から除外される
- Pages 再生成は commit や squash merge の直後に別途 dispatch で呼び出す（push 起点の workflow が自動連鎖しないため）
- 最新 collect が 0 件なら、トップページの「最新日付」は前回公開された日次のまま据え置きになる。これは反映漏れではなく、新規公開対象が無かったことを示す
- まれに live の Pages 配信が stale で、日本語 / 英語のどちらか片方だけ古い文面を返すことがある。その場合は repo 上の `site/**` と raw summary を先に確認し、必要なら `deploy-pages.yml` を手動 dispatch して再確認する

### 詳細は設計資産を参照

- workflow ごとの役割、Secrets、手動テスト手順は [docs/automation.md](docs/automation.md) を参照してください
- 設計資産や learnings は [AGENTS.md](AGENTS.md) を参照してください

## 必要な Secrets

- `COPILOT_GITHUB_TOKEN`: agentic workflow が Copilot を使うための fine-grained PAT（「Copilot Requests」権限のみ。OAuth トークンは使えない）。期限が近づくと `token-health` Issue で知らせる
- `PDF_PASSWORD`: スライド PDF の暗号化に使う。未設定なら PDF は公開されない（`deploy-pages.yml` だけが使用）
- リポジトリ設定で「Actions に PR の作成・承認を許可」が必要。日次の agent の費用上限は変数 `GH_AW_DEFAULT_MAX_DAILY_AI_CREDITS`（1500）
- `DISCORD_WEBHOOK_URL`: 週次 Discord 通知用
- 詳しい運用メモは [docs/automation.md](docs/automation.md) を参照してください。

## Pages 構成

- トップページ: 直近の更新（最大 120 件・項番付き）、期間・種類・トピック・キーワードの絞り込み、ダウンロードパネル、週間アーカイブ、日次アーカイブ（日付チップ）、簡易検索
- ハイライト一覧: 公開済みハイライトの全件一覧。50 件ごとにページ分割
- 提供終了・廃止ページ: 提供終了・廃止・移行に関わる更新だけを新しい順に表示
- 日次アーカイブ一覧: 日付ごとのダイジェストを 1 行 1 件寄りの縦一覧で表示
- 週間アーカイブ一覧: 週単位ダイジェストを 1 行 1 件寄りの縦一覧で表示
- 日次ページ: 未来日付項目の警告セクション、注目トピック、テーマ別まとめ、ソース内訳、全件一覧
- 週間ページ: 直近 7 日のハイライト、テーマ別まとめ、ソース内訳、全件一覧
- 検索ページ: Pagefind のインデックスを使い、公開済み日次・週間詳細ページから title / excerpt を横断検索する
- raw データ: 各日の Markdown と JSON をそのまま参照可能
- 「スライドをダウンロード」パネル（トップ・ハイライト一覧）: 絞り込み結果の JSON / PDF / PPTX をダウンロード。実装は [scripts/lib/downloads.mjs](scripts/lib/downloads.mjs)
- `api/v1/`: 読み取り専用の JSON API

## 検索実装

- `npm run build:pages` は静的 HTML 生成 → Pagefind インデックス生成 → `finalize-search.mjs` による版付き bundle 配置まで実行する
- トップページと専用検索ページは同じ Pagefind API と結果描画を使い、原文と資料へ直接アクセスできる
- 専用の `search.html` は `pagefind.js` を直接読み込み、クエリ文字列同期、preload、結果整形を含む軽量な検索 UI を静的配布している
- 検索対象は `data-pagefind-body` を持つ公開ページだけで、日次・週間の詳細本文とハイライト一覧本文から検索できる。原文・資料の補助リンクは検索本文から除外する
- 詳細設計は [docs/search-architecture.md](docs/search-architecture.md) を参照
- 検索 bundle は入力と描画コードの hash を含む `pagefind-<version>/` に配布し、以前の検索データとの混在を防ぐ

## ディレクトリ概要

- [config](config): 監視ソース定義
- [data](data): 収集結果と内部状態
- [summaries](summaries): 日次要約
- [drafts](drafts): 記事ドラフト
- [scripts](scripts): 収集 / 生成 / 投稿処理
- [schema](schema) / [examples](examples): スライド JSON のスキーマとサンプル
- [docs](docs): 設計メモ（[api.md](docs/api.md)、[slide-schema.md](docs/slide-schema.md) を含む）
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
