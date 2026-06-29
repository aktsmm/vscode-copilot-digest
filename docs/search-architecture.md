# Search Architecture

## 目的

このリポジトリの検索機能は、GitHub Pages 上で公開している digest をサーバーサイド実装なしで横断検索できるようにするためのものです。検索対象は公開済みページに限定し、ローカル build と GitHub Pages 配布の両方で同じ挙動を再現できることを優先しています。

## 基本方針

1. 検索は静的ホスティングで完結させる
2. 生データではなく、公開向けに整形済みのページ本文を index 対象にする
3. トップページの簡易検索と専用検索ページで同じ index を共有する
4. 日本語 / 英語を同じ build で生成し、Pagefind 側の多言語 index をそのまま使う

## 構成要素

### インデックス生成

- [scripts/build-pages.mjs](../scripts/build-pages.mjs) が静的 HTML を生成する
- その直後に `pagefind --site site --output-subdir pagefind` を実行する
- 生成された index は [site/pagefind](../site/pagefind) に出力され、Pages 配布物に含まれる

### 検索対象ページ

- 日次詳細ページ
- 週間詳細ページ
- ハイライト一覧ページ
- 検索対象は `data-pagefind-body` 属性を持つ本文コンテナのみ
- トップページ、日次アーカイブ一覧、週間アーカイブ一覧は現状 index 対象に含めない

この制約により、検索結果は「公開向けに意味づけされた本文」へ寄せられ、カード一覧や補助 UI の断片が index を汚さないようにしています。

## UI 構成

### トップページの簡易検索

- `pagefind-component-ui` を使う
- [site/index.html](../site/index.html) に検索ボックスを埋め込む
- 最近の公開更新へ素早く飛ぶ用途に寄せる
- `max-results="6"` で結果数を抑え、トップページの補助導線として扱う

### 専用検索ページ

- [site/search.html](../site/search.html) を専用 UI として生成する
- `pagefind.js` を直接読み込み、クエリ URL 同期、preload、結果整形を自前で制御する
- 結果には digest 日付、source group、topic、importance を補足表示する
- source group と topic の facet を持ち、クエリと facet を URL に同期する
- `GitHub Copilot`、`VS Code`、`Copilot CLI` などの表記ゆれは client-side query expansion で補助する
- Pagefind の sub results を展開し、見出し単位の一致を優先して見せる
- ハイライト一覧と詳細ページの重複 hit は、結果表示時に URL + title で軽く重複除去する

## build-pages.mjs の役割

検索アーキテクチャの中で [scripts/build-pages.mjs](../scripts/build-pages.mjs) は次を担当します。

1. 公開済みイベント列を組み立てる
2. 検索用 metadata を付加する
3. トップページの component search 用スクリプトを埋め込む
4. 専用検索ページの検索 UI と整形ロジックを埋め込む
5. `data-pagefind-body` を詳細ページ本文とハイライト一覧本文へ付与する

## 検索結果に載せる情報

専用検索ページでは Pagefind の素の結果に加えて、生成時に保持した metadata を使って次を補足表示します。

- digest 日付
- source group
- topic
- importance label
- 日次ページへの導線
- source / topic facet 用の内部値

この metadata は [scripts/lib/reporting.mjs](../scripts/lib/reporting.mjs) の分類ロジックに依存しています。

## 多言語対応

- build は日本語 / 英語ページを同時生成する
- Pagefind 側で言語を自動検出し、現在は `ja` と `en` の 2 言語 index を生成する
- 日本語は stemming 非対応なので、語幹一致よりも語句一致に寄った検索になる

## 制約と既知の注意点

- 日本語は stemming 非対応なので、query expansion で補助しても表記ゆれ吸収には限界がある
- index 対象は詳細ページ本文とハイライト一覧本文だけなので、トップページのカード文言だけではヒットしないことがある
- Pagefind index は `npm run build:pages` を回さないと更新されない
- live の GitHub Pages 配信が stale の場合、HTML と index の更新タイミングがずれて見えることがある

## 運用時の確認ポイント

1. 検索仕様を変えたら `npm run build:pages` を実行する
2. `site/pagefind` が更新されていることを確認する
3. トップページの簡易検索と `search.html` の両方で結果を確認する
4. live で古い結果が出る場合は Pages 再デプロイを確認する

## 今後の拡張候補

- 日次 / 週次アーカイブ一覧も検索対象に含めるかの再検討
- Pagefind の native filter / sort を使うか、現状の表示層 facet を維持するかの再検討
- 日本語の表記ゆれ対策を増やす場合の synonym 管理場所の整理
