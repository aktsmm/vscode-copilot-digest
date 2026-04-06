# Architecture

## 基本方針

日次収集と隔週記事化を分離します。

1. GitHub Actions が毎日ソースを取得する
2. 新着や差分だけをイベントとして保存する
3. イベントから日次サマリーを作る
4. 14 日分のイベントから記事ドラフトを作る
5. 日次 JSON と Markdown から GitHub Pages 用の静的ページを作る
6. 公開は Qiita API を使って明示的に実行する

## なぜこの構成か

- RSS と Atom は「新着検知」に強い
- HTML スナップショット比較は「既存ページの追記検知」に強い
- 記録を JSON と Markdown の両方で残すと、人も機械も扱いやすい
- GitHub Pages を静的生成にすると、収集ロジックと公開ロジックを分離できる
- 記事生成を手動トリガーにすると、公開前の最終編集を挟みやすい

## イベント種別

- `feed_entry`: RSS / Atom から見つけた新着
- `html_snapshot_change`: 単一 URL のテキスト差分

## 収集フロー

`collect.mjs` は次を行います。

1. ソース定義を読む
2. 各ソースを取得する
3. 新着 ID またはスナップショットハッシュを比較する
4. 新しいイベントだけを [data/events](../data/events) に書く
5. [summaries/daily](../summaries/daily) に日次サマリーを生成する
6. [data/state.json](../data/state.json) を更新する

日次サマリーは公開も意識して、次の順で構成する。

1. 概況
2. 注目トピック
3. テーマ別まとめ
4. ソース内訳
5. 全件一覧
6. データファイル

日次サマリーには次の編集ポリシーを適用する。

1. GitHub / VS Code の公式ソースを優先する
2. 周辺ニュースは 1 日あたり最大 3 件までに絞る
3. GitHub Copilot や VS Code の coding agent と関係が薄い周辺記事は除外する
4. feed に未来日付の項目が出ても、その公開日時までは収集しない
5. 初回取り込み日や未取得分の回収が混ざる日は注記を出す

## 記事化フロー

`build-biweekly.mjs` は次を行います。

1. 指定期間のイベントを集める
2. GitHub Copilot、VS Code、周辺ニュースに大まかに分類する
3. 重要度が高い項目を「今回の要点」に出す
4. Qiita でそのまま編集しやすい Markdown を [drafts](../drafts) に出力する

## 公開フロー

`publish-qiita.mjs` は frontmatter を読み、Qiita API の `POST /api/v2/items` または `PATCH /api/v2/items/:id` を呼びます。

前提:

- `QIITA_ACCESS_TOKEN` が設定されていること
- ドラフト側の frontmatter に `title` と `tags` があること

## GitHub Pages フロー

`build-pages.mjs` は次を行います。

1. [data/events](../data/events) の JSON を読む
2. 重複 URL をまとめて、公開向けの view model を組む
3. index と日次詳細ページを静的 HTML に変換する
4. 元の Markdown と JSON も raw データとして併設する

Pages には次の情報を出す。

1. その日の概要
2. 読む価値が高い更新のハイライト
3. GitHub Copilot / VS Code / GitHub Platform / 周辺ニュース の分類
4. 元ソースへのリンク
5. 生データへのリンク

## 拡張候補

- GitHub Community Discussions の取り込み
- VS Code Bluesky フィード監視
- Bluesky / Mastodon / Slack への通知
- OpenAI / GitHub Models などを使った LLM 要約の追加
- 隔週ドラフトの自動スケジュール化
