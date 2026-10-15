# 自動化運用メモ

このリポジトリの自動化は、日次収集レーン、Pages 公開レーン、Discord 通知レーン、Copilot cloud agent による自動執筆レーンで構成しています。データ収集と本文更新を分離しつつ、最終的な Pages 公開までを GitHub Actions 側でつなぐのが基本方針です。

## 全体像

1. [collect-updates.yml](../.github/workflows/collect-updates.yml) が `npm run collect` を実行し、ソース収集の後に全期間の原文・公式資料を補完する
2. 変更があれば `data/**` と `summaries/**` を `github-actions[bot]` が commit する
3. collect workflow から [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を workflow dispatch し、最新データで Pages を再生成する
4. collect 成功後に [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml) が Copilot 向け執筆依頼 Issue を作成または更新する
5. Copilot cloud agent がその Issue を受けて PR を作成する
6. [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml)、[validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml)、[auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml) が PR を正規化・検証・自動 merge する
7. 生成 PR が merge されたときは [redeploy-pages-after-generated-pr-merge.yml](../.github/workflows/redeploy-pages-after-generated-pr-merge.yml) が Pages を再 dispatch し、本文更新を live へ反映したうえで superseded な draft PR / digest-authoring issue を cleanup する

## 日次収集と通知

- [collect-updates.yml](../.github/workflows/collect-updates.yml) は毎日 06:30 / 14:30 / 22:30 JST 目安で実行する。GitHub Actions の schedule は高負荷時に遅延しうる
- Node.js 22 で `npm ci` と `npm run collect` を実行し、[data/events](../data/events) を毎日更新する。[summaries/daily](../summaries/daily) は公開済み更新または未来日付項目がある日だけ生成する
- 補完結果と証跡は [data/resources.json](../data/resources.json) に保存する。取得ページの `.cache/resource-pages` は Actions cache で引き継ぎ、新しい検出より古い原文キャッシュは再取得する
- 日本語の要約がまだ無い実在の記事は、捨てずに、原文の抜粋（先頭に「（原文の抜粋）」）付きで載せる。抜粋も無く定型文しか出せないものだけを、collector が保存前に除外し、`latestRun.skippedLowInformationEvents` に記録する（公開カードには定型文を出さない）
- 日付だけの見出し差分（`Oct.13 Release` など）は内容が無いので、読者向けカードにもスライド候補にも出さない。内容のある差分は「ページに追加された内容」として載せる
- 収集の後に `node scripts/backfill-skipped.mjs --coverage` が、フィードに出ているのに `data/events` に無い記事（過去に捨てたものを含む）を、記事ページから読み直して戻す。最後に `node scripts/coverage-report.mjs --strict` で漏れを確認し、残っていれば run を失敗させて知らせる（2 週間ごとの点検依頼でも確認する）
- **要約の流れ**: [author-summary-pr.yml](../.github/workflows/author-summary-pr.yml)（毎日 03:30 JST が目安）が、英語の抜粋のままになっている更新（スライドも要約も無いもの）を最大 30 件、Copilot に依頼する。Copilot が記事を読み、日本語の要約を [data/summaries-ja.json](../data/summaries-ja.json) に書き足す。[validate-summary-pr.yml](../.github/workflows/validate-summary-pr.yml) が `npm run validate:summaries` と許可ファイル（このファイルだけ、削除なし）を確認し、[auto-merge-summary-pr.yml](../.github/workflows/auto-merge-summary-pr.yml) が自動で merge する。カードの文面は、スライド → 要約 → 原文の抜粋の順で選ばれる。`tests/card-boilerplate.test.mjs` が、定型文や、多くのカードで繰り返される文を検出して失敗させる
- Copilot coding agent のファイアウォールは、リポジトリの Environment `copilot` の変数 `COPILOT_AGENT_FIREWALL_ALLOW_LIST_ADDITIONS` で、記事の取得元（code.visualstudio.com、github.blog、docs.github.com、learn.microsoft.com、www.publickey1.jp など）を許可している。新しい取得元を足したら、この変数にも追加する。許可できずに開けない host がある間は、`scripts/lib/slides.mjs` の `AGENT_UNREACHABLE` に host を入れると、その更新は依頼から外れる
- 日次の執筆依頼（[author-digest-pr.yml](../.github/workflows/author-digest-pr.yml)）は、新規イベントがあるだけでは起票しない（ページ差分ばかりで、マージできる PR にならなかったため）。低情報 fallback の残り、collect / Pages の失敗、手動実行のときだけ起票する。記事の日本語文面は、原文の抜粋 → スライド（`data/slides`）の順で自動的に良くなる
- 変更がなければ commit せず終了する
- 変更があった場合は `github-actions[bot]` が `data/**` と `summaries/**` を commit / push する
- collect の最後に [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を dispatch して、push 起点 workflow の非連鎖を補う
- [notify-weekly-discord.yml](../.github/workflows/notify-weekly-discord.yml) は毎週水曜 06:00 JST 目安で実行し、直近 7 日分の週間要約を Discord Webhook へ送る

## Pages 公開の仕組み

- Pages 用の HTML は [scripts/build-pages.mjs](../scripts/build-pages.mjs) で静的生成する
- 生成対象はトップページ、日本語 / 英語の日次詳細、週間詳細、ハイライト一覧、日次アーカイブ一覧、週間アーカイブ一覧、検索ページ、raw データ導線を含む
- 公開済み更新が 0 件の空日は Pages の日次詳細や日次アーカイブに含めず、最新公開日も直近の公開済み日次を基準にする
- トップページは最新 6 件のハイライトを表示し、全件一覧は 50 件ごとにページ分割する
- 日次・週間・ハイライト一覧は source / topic / importance フィルタと並び替えを持ち、選択状態を URL query に同期する
- Pages build は資料を再取得せず台帳を読む。HTML 生成後に Pagefind インデックスを作り、`finalize-search.mjs` が版付き bundle を配置する。両検索 UI は同じ版のインデックスを参照する
- カードと検索結果の「原文」「関連ドキュメント」は外部リンク、「掲載日のまとめを見る」は日次まとめの更新アンカーへのサイト内リンク。古い日次更新と、検索条件・言語切替後のアンカーも保持する
- 検索対象は `data-pagefind-body` を持つ公開ページだけで、日次・週間の詳細本文とハイライト一覧本文を対象にする
- 専用検索ページは source / topic facet、URL 同期、軽い query expansion、結果重複除去を持つ
- 検索 UI / index の詳細設計は [search-architecture.md](search-architecture.md) を参照する
- Pages のヘッダーに出す `最終更新` は最新の Pages 再生成時刻を表示する
- まれに live の Pages 配信が stale で、日本語 / 英語のどちらか片方だけ古い HTML を返すことがある。その場合は `site/**` と live ページを見比べ、必要なら [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を手動 dispatch して再確認する

## Copilot cloud agent の自動執筆レーン

- [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml) は collect 成功後に、対象日付とスコープを決めて執筆依頼 Issue を作成または更新する
- `latestRun.newEventsCount` が 0 でも、日次 summary に generic fallback や低情報のカテゴリ要約が残っている日は執筆依頼 Issue を起票して本文補正と `reporting.mjs` 更新を促す
- 低情報 fallback の検出 marker は [scripts/lib/reporting.mjs](../scripts/lib/reporting.mjs) の `lowInformationFallbackMarkers` を SSOT とし、Pages build と authoring workflow の両方から参照する。marker を増減した場合は `npm test` で同期と未知タイトル fallback を確認する
- Issue 本文には、対象ファイル、文章ルール、変更許可範囲、PR タイトル規則、検証要件が埋め込まれる
- workflow は GraphQL で Copilot actor を解決し、Issue assignment まで自動化する
- Copilot cloud agent は、その Issue から日次本文、週間 / 隔週ドラフト、必要な対訳更新を含む PR を作成する
- 生成 PR は [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml) が metadata を正規化し、[validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml) が allow-list と build を検証し、[auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml) が安全なものだけ merge する
- Copilot 起点で `action_required` になった review / validate / auto-merge workflow は [rerun-blocked-copilot-workflows.yml](../.github/workflows/rerun-blocked-copilot-workflows.yml) が定期的に検出して 1 回だけ rerun する
- Copilot 由来 PR が merge されたときは [redeploy-pages-after-generated-pr-merge.yml](../.github/workflows/redeploy-pages-after-generated-pr-merge.yml) が [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を再 dispatch し、本文更新を live ページへ反映した後に superseded な draft PR / digest-authoring issue を自動 cleanup する

## 止まらないための仕組み（スライドレーンと点検）

- [slide-watchdog.yml](../.github/workflows/slide-watchdog.yml)（3 時間ごとが目安）は、スライドの流れを自動で直します。
  - Copilot が 2 時間以上ファイルを変えずに止まった依頼は、PR と Issue を閉じて、次の依頼を 1 件ずつに絞ります。1 件だけの依頼が止まった場合は、その更新を `Slide skip: {id}`（ラベル `slide-skip`）として記録し、以後の依頼から外します（再試行するには、その Issue を削除し、ラベルを外します）。
  - 検証が失敗した PR には、30 分後に `@copilot` で修正を依頼します（最大 2 回、同じコミットには 1 度だけ）。それでも直らなければ閉じて作り直します。
  - `needs-human-review` のまま 1 日以上たった PR は閉じて、依頼を作り直します。
  - 直近の Pages デプロイが失敗していれば再実行し、10 日以上スライドの依頼が動いていなければ再開します。
- [pipeline-maintenance.yml](../.github/workflows/pipeline-maintenance.yml) は、**毎週月曜 04:00 JST 目安**（手動実行も可）に点検依頼の Issue を作り、Copilot cloud agent に割り当てます。モデルは指定せず Auto です。直近 14 日の失敗した run、merge されずに閉じた Copilot の PR、PR が付かないまま止まった Copilot の Issue、待機中の PR、`needs-human-review` の Issue、スキップ中のスライドを渡し、原因の調査と修正、テストの確認を依頼します。agent のファイアウォールが PR でブロックを報告した host（信頼する発行元のみ）は、この workflow が許可リスト（`COPILOT_AGENT_FIREWALL_ALLOW_LIST_ADDITIONS`）に自動で追加します。直すものがなければ PR を作らずに Issue を閉じます。
- 点検 PR（タイトル `maint: YYYY-MM-DD 点検`）は専用の検証（`validate-maintenance-pr.yml`）と自動 merge（`auto-merge-maintenance-pr.yml`）を通ります。変更が `scripts/` `tests/` `docs/` `config/` `data/slides/` `data/summaries-ja.json` `.github/workflows/`（例外を除く）`.github/instructions/` `package*.json` の範囲に収まれば自動 merge します。点検の流れ自体を制御するファイル（`pipeline-maintenance.yml`、`validate-maintenance-pr.yml`、`auto-merge-maintenance-pr.yml`、`slide-watchdog.yml`、`deploy-pages.yml`、`scripts/lib/maintenance-guard.mjs`、`scripts/check-maintenance-change.mjs`）、`data/events` などのデータ、新しい secret の参照、`write-all`、`pull_request_target` の追加、workflow の削除、install スクリプトの追加は、`needs-human-review` で止めます。この判定は、base ブランチの `maintenance-guard` を使うので、PR 自身は弱められません。digest 用の workflow は、点検 PR を処理しません。
- **トークンが切れても止まらない仕組み**:
  - 見張り役（`slide-watchdog.yml`）の `token-health` ジョブが、`COPILOT_ASSIGN_TOKEN` の有効期限を毎回確認し、無効、または残り 21 日未満なら `token-health` ラベルの Issue を作ります（Actions 標準の token で作るので、個人トークンが死んでいても通知されます）。GitHub Models は 2026-07-30 に廃止されたため、token なしでスライドを作る代替手段はありません。トークン切れの間は Copilot 経由の流れが止まります。
- 使う token は `COPILOT_ASSIGN_TOKEN`（Copilot への割り当てと、Copilot の PR へのコメント）です。期限が切れると、この仕組み全体が止まります。

## 完全自動ではない部分

- スライド専用レーン（`author-slide-pr.yml` / `validate-slide-pr.yml` / `auto-merge-slide-pr.yml`）は digest 用レーンと分離している。Copilot が PR に独自のタイトルを付けるため、スライド PR は本文の `slide-authoring-request` マーカーまたは `copilot/slide-` ブランチ名で判定する。digest 用 workflow（validate / auto-merge / review 正規化 / redeploy）を変えるときは、スライド PR を処理しない条件を保つこと（`tests/slide-lane.test.mjs` が検証）
- Secret: `COPILOT_ASSIGN_TOKEN`（Issue の Copilot 割り当て）、`PDF_PASSWORD`（スライド PDF の暗号化。`deploy-pages.yml` だけが使い、未設定なら PDF は公開されない）、`DISCORD_WEBHOOK_URL`
- スライド PR の auto-merge は `workflow_run` 起点。Copilot の run が `action_required` で止まる場合は `rerun-blocked-copilot-workflows.yml` が `Validate slide PR` / `Auto-merge slide PR` も再実行する

- GitHub リポジトリ設定で Copilot cloud agent を有効化している必要がある
- repo 側では auto-merge を有効化し、Actions の `GITHUB_TOKEN` は write 権限と PR review approve 権限を持つ前提にしている
- branch protection が無い repo では GitHub の auto-merge API が使えないことがあるため、安全条件を満たした生成 PR は workflow が直接 squash merge する
- workflow の `GITHUB_TOKEN` で実行した collect commit や direct merge は通常の push workflow を自動連鎖しないため、Pages 再デプロイは dispatch で補う
- Copilot Code Review を ruleset で自動化する設定は GitHub 側で有効化が必要で、この repo の workflow だけでは完結しない
- `needs-human-review` が付いた PR は意図的に自動 merge しない
- Cloud agent の `Require approval for workflow runs` が ON でも、Copilot 由来の blocked run は定期 workflow が検出して 1 回だけ rerun して先へ進める
- それでも PR が出ない場合は、Issue 右サイドバーで Copilot assignee が付いているかと GitHub 側キューを確認する
- `Collect updates` が `Collect updates` または `Validate collected output` で失敗すると、`author-digest-pr.yml` が既存の Copilot assignment 経路で traceable な `Collect updates repair` Issue / PR を作る。許可範囲は collector、reporting、source selector、関連テストに限定し、`data/**` と低情報 guard は変更不可。修復 PR は必ず `needs-human-review` とし、main へ自動 merge しない
- Collect failure が上記以外の step の場合も Issue は残すが、Copilot の自動修復は開始せず `needs-human-review` へエスカレーションする。これにより未分類の失敗を成功扱いにしない

## Workflow 一覧

- [collect-updates.yml](../.github/workflows/collect-updates.yml): 毎日 3 回の収集と event / summary 更新
- [deploy-pages.yml](../.github/workflows/deploy-pages.yml): Pages 再生成と公開
- [redeploy-pages-after-generated-pr-merge.yml](../.github/workflows/redeploy-pages-after-generated-pr-merge.yml): Copilot 生成 PR merge 後の Pages 再 dispatch と superseded な generated work の cleanup
- [notify-weekly-discord.yml](../.github/workflows/notify-weekly-discord.yml): 毎週水曜 06:00 JST の週間 Discord 要約通知。本文は短い概要に留め、主な更新は embed カードで表示する
- [build-weekly-draft.yml](../.github/workflows/build-weekly-draft.yml): 毎週金曜 06:00 JST の週間ドラフト生成
- [build-biweekly-draft.yml](../.github/workflows/build-biweekly-draft.yml): 手動の隔週ドラフト生成
- [publish-qiita.yml](../.github/workflows/publish-qiita.yml): Qiita 投稿
- [test-discord-notification.yml](../.github/workflows/test-discord-notification.yml): Discord preview 通知の実送信テスト
- [copilot-setup-steps.yml](../.github/workflows/copilot-setup-steps.yml): Copilot cloud agent 用の Node.js セットアップ
- [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml): Copilot 向け執筆依頼 Issue の自動作成 / 更新
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml): 生成 PR のラベル付けと metadata 正規化
- [rerun-blocked-copilot-workflows.yml](../.github/workflows/rerun-blocked-copilot-workflows.yml): Copilot 起点で `action_required` になった workflow の自動 rerun
- [validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml): 生成 PR の allow-list と build 検証
- [auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml): 安全な生成 PR を ready for review に切り替え、可能なら auto-merge、不可なら直接 squash merge

## Secrets

- `DISCORD_WEBHOOK_URL`: Discord 通知と通知テスト用
- `PAGES_BASE_URL`: Discord 通知に載せる Pages URL のベース。未設定時は公開 URL を既定値として使う
- `QIITA_ACCESS_TOKEN`: Qiita 投稿用
- `COPILOT_ASSIGN_TOKEN`: authoring Issue を Copilot に割り当てるための token

## セキュリティメモ

- リポジトリ内に Discord Webhook URL や GitHub token を直書きしない構成です。通知や投稿はすべて GitHub Secrets 経由です
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml) は `pull_request_target` を使いますが、同一リポジトリの PR に限定しています
- `github-script` への workflow input は script 直埋め込みではなく `env` 経由で渡します
- auto-merge は `summaries/daily/**`、`drafts/**`、`scripts/lib/reporting.mjs` 以外を変更した PR では止まります
- `needs-human-review` ラベルがある PR は必ず手動確認に倒れます
- blocked workflow の rerun は Copilot actor が起点の run に 1 回だけ限定し、無限 rerun を避けます

## Node / action バージョン

GitHub hosted runner の Node 20 deprecation warning に合わせて主要 action は新しい major へ更新していますが、Pages 系 action は upstream 側の都合で warning が出る可能性があります。

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/github-script@v8`

## 手動テストの入口

- `gh workflow run author-digest-pr.yml -f date_key=YYYY-MM-DD -f scope=full -f force_issue=true`
- `gh workflow run notify-weekly-discord.yml -f date_key=YYYY-MM-DD`
- `gh workflow run test-discord-notification.yml -f date_key=YYYY-MM-DD`
- `gh workflow run deploy-pages.yml`
- `node scripts/notify-discord.mjs --mode weekly --date YYYY-MM-DD --window-days 7 --dry-run --force-preview`
  - dry-run JSON の `content` と `embeds` を確認する。読みやすさ guard が文字数超過、ASCII `...`、長すぎる非 URL 行を検出する。
  - 通知本文には Pages URL と検索 URL を出し、先頭 embed は要約、各イベント embed には該当日次 Pages への field を出す。
  - `--include-og` を付けると各イベント URL の `og:image` を短い timeout で取得し、取得できた場合だけ thumbnail に載せる。取得失敗時も通知生成は継続する。
  - `--thread-id` または `--thread-name` は opt-in の Discord thread 投稿用。dry-run では実送信せず、実 webhook 送信時だけ query parameter として使う。
- `npm test`
  - Pages / Discord UX guard では、生成済み `site` の検索 facet、フィルタ、Pagefind 対象、Discord dry-run payload を確認する。検索や Pages UI を変えた後は、先に `npm run build:pages` で `site` を更新してから実行する。

## まず見るべき確認ポイント

- 新しい `digest-authoring` Issue を作っても 10 分以内に PR が出ない場合は、workflow 失敗より先に GitHub リポジトリ設定の Copilot cloud agent 有効化状態を確認する
- 15 分を超えても PR が出ない、または review ruleset が動かない場合は、GitHub 側の Copilot Code Review 設定と GitHub 側キューを見直す
- Pages だけ古い場合は workflow 失敗より先に live HTML の stale 配信を疑い、[deploy-pages.yml](../.github/workflows/deploy-pages.yml) を手動 dispatch して再確認する

## 資料の補完

通常の `collect` は全期間の未補完項目を検証し、原文・公式資料の台帳を `data/resources.json` に保存する。収集 workflow は `.cache/resource-pages` を引き継ぎ、台帳を通常の `data` commit に含める。途中再開、失敗の再試行、日本語本文の検証、全期間件数の解釈は [resource-enrichment.md](resource-enrichment.md) を参照。
