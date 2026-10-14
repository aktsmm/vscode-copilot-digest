# スライド JSON スキーマ（1 更新 = 1 枚）

1 つの更新を、読者向けの 1 枚の解説スライドとして表現する JSON です。PDF・PowerPoint・JSON のダウンロードは、すべてこのスキーマを入力にします。`data/slides/{id}.json` に保存し、`id` は API の更新 ID（更新キーの SHA-256 先頭 16 桁）と同じです。

- スキーマ: [schema/slide.schema.json](../schema/slide.schema.json)（v2）
- サンプル: [examples/slide-deck.sample.json](../examples/slide-deck.sample.json)（GA の例と、通常の更新の例）
- 検証: `npm run validate:slides`（同じ規則を `scripts/lib/slides.mjs` が実装）
- 以前の v1（`vscode-copilot-digest/slide/v1`、題名・要約・要点・リンクだけ）も検証と描画は通りますが、新しく書くものは v2 です。`npm run pending:slides -- --refresh` が v2 でないスライドを書き直し対象として返します。

## 方針

1. **確認できることだけ書く。** 記事とその公式ドキュメントに書かれていることだけをまとめ、数値・製品名・プラン名・日付を補いません。確認できない項目は省略します。
2. **1 枚で読み切れる。** 誰に関係し、何が変わり、何をすればよいかを上段に、詳細をパネルに置き、用語は短く添えます。
3. **リンクは、ページの題名で示す。** 「原文」のような総称ではなく、リンク先ページの実際のタイトルとサイト名を表示します。
4. **何が変わったかを特定できないものは作らない。** 「X changed」のようなページの差分検出は、追加された行（`changes`）から変わった内容を読み取れるときだけ対象にし、その行に書かれた範囲だけをまとめます。「ページが変わった」とだけ言うものや、追加行のない差分、一覧ページは対象外です。

## 画面上の配置

```
┌ 日本語タイトル / 副題（要点 1 行） ─────────── [GA など] ┐
│ 英語の元タイトル　掲載 YYYY-MM-DD                         │
│ [誰に関係するか] [変わること・使えること] [対応の要否]     │
│ ── タイムライン（任意）────────────────────────────────── │
│ ┌ Before → After（任意） ────┐ ┌ 用語ミニ解説 ┐          │
│ │ パネル（core）              │ ├ こう使うと便利 ┤         │
│ │ パネル（detail / 注意点）   │ └───────────────┘          │
│ 発表  記事のタイトル（サイト名）                            │
│ 詳細  資料のタイトル（サイト名）｜ …    分類 ｜ ID           │
└────────────────────────────────────────────────────────┘
```

本文の文字サイズは 24px から 13px まで段階的に下げ、1 枚に収まる最大の大きさを使います。最小でも収まらない場合は、その更新の PDF だけを作らず警告を出します（デプロイは止めません）。

## フィールド（v2）

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `schema` | ○ | 固定値 `vscode-copilot-digest/slide/v2` |
| `id` | ○ | 更新 ID（16 桁の 16 進）。ファイル名と一致させる |
| `title.ja` | ○ | 日本語の見出し。80 文字以内、名詞止めを推奨 |
| `title.subtitleJa` |  | 副題。要点を 1 行で。70 文字以内 |
| `title.original` | ○ | 記事の英語タイトル。160 文字以内 |
| `date` | ○ | 掲載日 `YYYY-MM-DD` |
| `topic` | ○ | `GitHub Copilot` / `VS Code` / `GitHub Platform` / `周辺ニュース` |
| `status` | ○ | `ga` / `preview` / `retirement` / `announcement` / `update` / `unknown`。右上のバッジ（`unknown` は出さない） |
| `statusEvidence` | 条件付き | `ga` `preview` `retirement` `announcement` のとき必須。原文の該当箇所の引用 |
| `audience.who` | ○ | 誰に関係するか。90 文字以内（太字・強調枠で表示） |
| `audience.change` | ○ | 何が変わるか・使えるようになるか。110 文字以内 |
| `audience.changeNature` | ○ | `benefit`（嬉しい点・緑）/ `neutral` / `breaking`（注意が必要な変更・赤） |
| `action.required` | ○ | `yes`（要対応）/ `optional`（任意）/ `no`（対応不要）/ `info`（情報） |
| `action.summary` | ○ | やること。110 文字以内 |
| `action.deadline` |  | 期限 `YYYY-MM` または `YYYY-MM-DD`（月までしか分からないときは月のまま） |
| `beforeAfter` |  | `before` / `after`。各 100 文字以内。**変更前は、原文に旧仕様の記述があるときだけ** |
| `timeline` |  | `when`（20 文字以内）と `label`（40 文字以内）を 1〜4 件 |
| `panels` | ○ | 1〜4 枚。`id`（kebab-case・一意）、`heading`（20 文字以内）、`priority`（`core` / `detail`）、`items`（1〜5 行・各 100 文字以内）。`core` が 1 枚以上必要 |
| `glossary` |  | 最大 6 語。`term`、`type`（`product` / `feature` / `term` / `label`）、`oneLine`（90 文字以内）。**記事・ドキュメントに定義がある語だけ** |
| `suggestions` |  | 「こう使うと便利」。最大 3 件・各 100 文字以内。事実と区別するため橙の破線枠で表示 |
| `references.source` | ○ | `{ title, url }`。`title` は記事ページの実際のタイトル（8〜120 文字、「GitHub Changelog」のようなサイト名だけは不可）。「発表」として表示 |
| `references.documents` |  | 最大 3 件の `{ title, url }`。各ページの実際のタイトル。日本語版があれば優先。「詳細」として表示 |
| `evidence` | ○ | 記述を確認した URL。1 件以上 |

パネルの `id` が `caution` / `cautions` / `constraints` / `limits` / `impact` / `risks` のものは、赤い枠で表示します。`core` の標準的な見出しは「使える場所とプラン」「使い方」「前提と制限」、`detail` は「注意点」などです。

## 検証規則

- **許可ホスト**: `github.blog`、`github.com`、`docs.github.com`、`code.visualstudio.com`、`www.publickey1.jp`、`learn.microsoft.com`。それ以外は人の確認が必要です。
- **内部メモの語を出さない**: 「未確認」「記載なし」「要確認」「推定」「未発表」「判定保留」「AI 生成」「データ時点」「初心者向け」は読者向けの本文に入れません。
- **根拠のない状態は書かない**: GA / Preview / 廃止などは原文が明示している場合だけ使います。重要度やトピックから推測しません。
- Azure 版の文言・配色（Microsoft Azure、#0078d4 など）は使えません。

## 描画と公開

- `scripts/lib/slide-html.mjs` が 1280×720 のページを描画します。色と文言は `scripts/lib/theme.mjs`（GitHub ダーク `#0d1117` と Copilot パープル `#8534f3`）が単一の定義です。
- 公開するのは直近 3 か月（JST の暦月、当月を含む）の更新です。`PDF_RETENTION_MONTHS` で変更でき、`0` は無期限です。スライド JSON 自体は Git に残ります。
- ダウンロードパネルが書き出す JSON（`vscode-copilot-digest/deck/v1`）は `selection`（`mode` / `period` / `snapshotAt`）と `slides[]` を持ちます。PowerPoint も同じ項目から作ります。
