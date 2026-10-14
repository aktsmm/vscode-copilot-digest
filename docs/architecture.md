# Architecture

## 基本方針

このリポジトリは、収集、原文・資料補完、要約 / 記事化、Pages 公開、Copilot cloud agent による本文更新を分離して組み合わせます。更新の記録は `data/events/*.json`、本文は `summaries/daily/*.md`、原文・資料の検証証跡は `data/resources.json` を正本とし、Pages や draft は再生成する前提です。取得ページの `.cache/resource-pages` と公開出力の `site` は正本ではありません。

1. GitHub Actions が毎日ソースを取得する
2. 新着や差分だけをイベントとして保存する
3. 全期間のイベントについて原文と関連する公式資料を確認し、イベント JSON とは別の台帳に保存する
4. イベントと本文、確認台帳から公開用 view model を作る
5. 7 日・14 日単位で draft を作る
6. GitHub Pages 用の静的ページ群と版付き検索インデックスを作る
7. GitHub.com 側の Copilot cloud agent が日次本文や draft の更新 PR を作る
8. 必要なら Qiita API で公開する

## なぜこの構成か

- RSS / Atom は新着検知に強い
- HTML スナップショット比較は既存ページの追記検知に強い
- GitHub Docs のように RSS が無いソースは、カテゴリ index ページ（例: `/en/copilot/how-tos`、`/concepts`、`/reference`）のスナップショットを監視し、Changelog や blog に出ない doc-only 更新も拾う。ルート index は server-side で全記事を列挙しないため、カテゴリ index を併用する
- 記録を JSON と Markdown の両方で残すと、人も機械も扱いやすい
- GitHub Pages を静的生成にすると、収集ロジック、本文更新、公開ロジックを分離できる
- Copilot cloud agent の自動執筆を Issue / PR フローに閉じ込めることで、変更範囲と検証条件を workflow 側で制御しやすい

## システム構成

### 収集レイヤー

- [config/sources.json](../config/sources.json): 監視対象ソースの定義
- [scripts/collect.mjs](../scripts/collect.mjs): 収集本体
- [data/state.json](../data/state.json): 前回取得状態とスナップショット比較の基準
- [data/events](../data/events): 日次イベント JSON
- [summaries/daily](../summaries/daily): 日次 Markdown

### 生成レイヤー

- [scripts/lib/reporting.mjs](../scripts/lib/reporting.mjs): 分類、重複除去、日本語化、要約生成の共通ロジック
- [scripts/build-weekly.mjs](../scripts/build-weekly.mjs): 7 日 draft 生成
- [scripts/build-biweekly.mjs](../scripts/build-biweekly.mjs): 14 日 draft 生成
- [scripts/build-pages.mjs](../scripts/build-pages.mjs): Pages 用静的サイト生成
- [scripts/notify-discord.mjs](../scripts/notify-discord.mjs): Discord 通知 payload の生成と送信。概要は本文、主な更新は embed カードで表現する
- [scripts/publish-qiita.mjs](../scripts/publish-qiita.mjs): Qiita 投稿
- [search-architecture.md](search-architecture.md): Pagefind を使った検索 UI / index 設計

### 原文・公式資料の補完レイヤー

- [scripts/enrich-resources.mjs](../scripts/enrich-resources.mjs): 原文と公式資料の取得・検証、チェックポイント保存、監査
- [scripts/lib/resources.mjs](../scripts/lib/resources.mjs): 入力内容に基づく補完キー、HTML 解析、原文の見出し解決、資料候補と状態の集計
- [config/resource-documents.json](../config/resource-documents.json): 対話調査で確認した候補と調査手段。登録だけで採用せず、本文取得と関連性を確認する
- [data/resources.json](../data/resources.json): 出典、文書タイトル、確認日時、本文 hash、採用理由、原文解決結果、取得失敗を保存する台帳
- `.cache/resource-pages`: 取得ページの作業用キャッシュ。通常の Actions 実行でも引き継ぐ
- [resource-enrichment.md](resource-enrichment.md): 選定方針、状態、キャッシュ鮮度、再開コマンド、集計単位

### 自動執筆レイヤー

- [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml): Copilot 向け執筆依頼 Issue を作る
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml): 生成 PR を正規化する
- [validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml): 生成 PR を検証する
- [auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml): 安全な PR を自動 merge する
- [redeploy-pages-after-generated-pr-merge.yml](../.github/workflows/redeploy-pages-after-generated-pr-merge.yml): merge 後の Pages 再デプロイを補う

## イベント種別

- `feed_entry`: RSS / Atom から見つけた新着
- `html_snapshot_change`: 単一 URL のスナップショット差分
- `vscode_release_note_section`: 対象リリースの機能見出し単位の新着・変更

イベントは最終的に `reporting.mjs` で dedupe と分類をかけ、GitHub Copilot、VS Code、GitHub Platform、周辺ニュースへ再編成して表示に使います。

## 収集フロー

`collect.mjs` は次を行います。

1. ソース定義を読む
2. 各ソースを取得する
3. 新着 ID またはスナップショットハッシュを比較する
4. 新しいイベントだけを [data/events](../data/events) に書く
5. [summaries/daily](../summaries/daily) に日次サマリーを生成する
6. [data/state.json](../data/state.json) を更新する

収集時の編集ポリシー:

1. GitHub / VS Code の公式ソースを優先する
2. 周辺ニュースは 1 日あたり最大 3 件までに絞る
3. GitHub Copilot や VS Code の coding agent と関係が薄い周辺記事は除外する
4. feed に未来日付の項目が見えた場合は、収集自体は行うが通常のハイライトには混ぜず、警告セクションで扱う
5. 生データは SSOT として扱い、Pages や draft のために直接書き換えない

html_snapshot ソースの安全策: ページの DOM 変化で `rootSelector` が一致しない、または `contentSelector` が本文を 1 件も拾えない場合、collect は空・全文化したスナップショットで baseline を上書きせず、その回をソース単位のエラーとして記録し前回状態を保ちます。これによりセレクタ破損時の「無言の検知停止」や全文 false diff を防ぎます。`config/sources.json` の必須項目とコミット済みスナップショットの非空チェックは [tests/sources.test.mjs](../tests/sources.test.mjs) が検証します。

## 原文・資料補完フロー

`npm run collect` は `collect.mjs` の後に `enrich-resources.mjs` を実行します。補完は最新数件に限らず、全期間の未処理・確認期限切れ・再試行対象を走査します。

1. 原文記事または該当機能見出しの明示リンクを取得する
2. 実在する見出し id を確認し、可能なら個別記事・対象リリース・機能見出しへ原文を解決する
3. 明示的な候補がなければ公式索引と登録済み候補から関連資料を選び、本文と日本語版を確認する
4. 最大 3 件の資料と証跡、未確認・取得失敗などの状態を台帳に保存する
5. 入力ごとにチェックポイントを保存し、次回は未完了分から再開する

通常実行は公開ページの HTTP 取得と語句照合による候補選定であり、MCP を定期実行から呼び出す構成ではありません。GitHub / Microsoft Learn MCP は対話調査で候補を確認する際に使います。What's New の日付見出しだけの差分は独立した製品機能と解釈しません。

原文の検出日時より古い取得キャッシュは再利用せず、関連文書の通常キャッシュは維持します。資料が確認できない状態、取得失敗、未調査を区別し、確認できない URL や id を推測で作りません。詳細条件は [resource-enrichment.md](resource-enrichment.md) を正本とします。

## draft 生成フロー

`build-weekly.mjs` と `build-biweekly.mjs` は次を行います。

1. 指定期間のイベントを集める
2. GitHub Copilot、VS Code、周辺ニュースに分類する
3. 重要度が高い項目を要点へ出す
4. 公開前に人間が編集しやすい Markdown を [drafts](../drafts) に出力する

## GitHub Pages フロー

`npm run build:pages` は次を行います。収集・資料取得はこの段階では実行しません。

1. `build-pages.mjs` が [data/events](../data/events)、日次本文、[data/resources.json](../data/resources.json) を読む
2. 日次 digest と週次 digest の view model を組む
3. 重複 URL をまとめて、公開向けのイベント列を作る
4. 日本語 / 英語の HTML を静的生成する
5. 元の Markdown と JSON、確認状態の監査 JSON を併設する
6. Pagefind CLI が静的 HTML から検索インデックスを作る
7. `finalize-search.mjs` が `pagefind-<version>/` に検索 bundle を配置する

各更新には「原文」「関連ドキュメント」「掲載日のまとめを見る」を表示します。最後のリンクはこのサイトの日次まとめの更新アンカーへ移動するもので、外部の原文・資料リンクとは異なります。日次カードはその掲載日の更新を開き、一覧／検索は採用した日次更新を開きます。言語切替でもアンカーを保持します。

Pages の主要出力:

1. トップページ: 最新 6 件ハイライト、週間アーカイブ、日次アーカイブ、簡易検索
2. ハイライト一覧: 公開済みハイライトの全件一覧。50 件ごとにページ分割
3. 日次アーカイブ一覧: 日付ごとの digest を縦一覧で表示
4. 週間アーカイブ一覧: 週単位 digest を縦一覧で表示
5. 日次詳細: 未来日付項目の警告セクション、ハイライト、テーマ別まとめ、ソース内訳、全件一覧
6. 週間詳細: ハイライト、テーマ別まとめ、ソース内訳、全件一覧
7. 検索ページ: `data-pagefind-body` を持つ公開ページを Pagefind で横断検索

トップページのハイライトは source-only の簡素なフィルタを使う。日次・週間・ハイライト一覧は source / topic / importance と並び替え、専用検索は source / topic の絞り込みを提供する。

検索の詳細な構成、index 対象、トップページ簡易検索と専用検索ページの役割分担は [search-architecture.md](search-architecture.md) を参照。

## 自動執筆フロー

1. collect 成功後に [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml) が対象日付とスコープを決める
2. workflow が Copilot 向け執筆依頼 Issue を作成または更新し、assignment まで自動化する
3. Copilot cloud agent が Issue から PR を作成する
4. PR は review / validate / auto-merge workflow で整形・検証・自動 merge される
5. merge 後は Pages 再デプロイ workflow が走り、本文更新を live へ反映する

この構成により、収集と本文更新を別レーンに分離しつつ、最終的な公開物は workflow で再現可能な形に維持する。

## 公開フロー

`publish-qiita.mjs` は frontmatter を読み、Qiita API の `POST /api/v2/items` または `PATCH /api/v2/items/:id` を呼びます。

前提:

- `QIITA_ACCESS_TOKEN` が設定されていること
- draft 側の frontmatter に `title` と `tags` があること

## 拡張候補

- GitHub Community Discussions の取り込み
- VS Code Bluesky フィード監視
- Bluesky / Mastodon / Slack への通知
- OpenAI / GitHub Models などを使った LLM 要約の追加
- weekly / biweekly draft の対象期間ルールの強化
