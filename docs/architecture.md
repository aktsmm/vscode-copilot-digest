# Architecture

## 基本方針

このリポジトリは、収集、要約 / 記事化、Pages 公開、Copilot cloud agent による本文更新を分離して組み合わせます。データの SSOT は `data/events/*.json` と `summaries/daily/*.md` で、Pages や draft はそれらから再生成する前提です。

1. GitHub Actions が毎日ソースを取得する
2. 新着や差分だけをイベントとして保存する
3. イベントから日次本文と公開用 view model を作る
4. 7 日・14 日単位で draft を作る
5. GitHub Pages 用の静的ページ群を作る
6. GitHub.com 側の Copilot cloud agent が日次本文や draft の更新 PR を作る
7. 必要なら Qiita API で公開する

## なぜこの構成か

- RSS / Atom は新着検知に強い
- HTML スナップショット比較は既存ページの追記検知に強い
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
- [scripts/notify-discord.mjs](../scripts/notify-discord.mjs): Discord 通知本文の生成と送信
- [scripts/publish-qiita.mjs](../scripts/publish-qiita.mjs): Qiita 投稿
- [search-architecture.md](search-architecture.md): Pagefind を使った検索 UI / index 設計

### 自動執筆レイヤー

- [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml): Copilot 向け執筆依頼 Issue を作る
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml): 生成 PR を正規化する
- [validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml): 生成 PR を検証する
- [auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml): 安全な PR を自動 merge する
- [redeploy-pages-after-generated-pr-merge.yml](../.github/workflows/redeploy-pages-after-generated-pr-merge.yml): merge 後の Pages 再デプロイを補う

## イベント種別

- `feed_entry`: RSS / Atom から見つけた新着
- `html_snapshot_change`: 単一 URL のスナップショット差分

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

## draft 生成フロー

`build-weekly.mjs` と `build-biweekly.mjs` は次を行います。

1. 指定期間のイベントを集める
2. GitHub Copilot、VS Code、GitHub Platform、周辺ニュースに分類する
3. 重要度が高い項目を要点へ出す
4. 公開前に人間が編集しやすい Markdown を [drafts](../drafts) に出力する

## GitHub Pages フロー

`build-pages.mjs` は次を行います。

1. [data/events](../data/events) の JSON を読む
2. 日次 digest と週次 digest の view model を組む
3. 重複 URL をまとめて、公開向けのイベント列を作る
4. 日本語 / 英語の HTML を静的生成する
5. Pagefind インデックスを作る
6. 元の Markdown と JSON も raw データとして併設する

Pages の主要出力:

1. トップページ: 最新 6 件ハイライト、週間アーカイブ、日次アーカイブ、簡易検索
2. ハイライト一覧: 公開済みハイライトの全件一覧。50 件ごとにページ分割
3. 日次アーカイブ一覧: 日付ごとの digest を縦一覧で表示
4. 週間アーカイブ一覧: 週単位 digest を縦一覧で表示
5. 日次詳細: 未来日付項目の警告セクション、ハイライト、テーマ別まとめ、ソース内訳、全件一覧
6. 週間詳細: ハイライト、テーマ別まとめ、ソース内訳、全件一覧
7. 検索ページ: `data-pagefind-body` を持つ公開ページを Pagefind で横断検索

フィルタ UI は source-only の簡素版で統一し、トップページと一覧ページで同じ操作感を使う。

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
