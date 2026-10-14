# スライド JSON スキーマ

1 更新 = 1 枚のスライドを `data/slides/{id}.json` に保存します。`id` は API の更新 ID（更新キーの SHA-256 先頭 16 桁）と同じです。機械可読なスキーマは [schema/slide.schema.json](../schema/slide.schema.json)、サンプルは [examples/slide-deck.sample.json](../examples/slide-deck.sample.json) です。検証は `npm run validate:slides` で、同じ規則を `scripts/lib/slides.mjs` が実装しています。

## フィールド

| フィールド | 内容 |
| --- | --- |
| `schema` | 固定値 `vscode-copilot-digest/slide/v1` |
| `id` | 更新 ID（16 桁の 16 進）。ファイル名と一致させる |
| `title.ja` | 日本語の見出し。80 文字以内。名詞止めを推奨 |
| `date` | 掲載日 `YYYY-MM-DD` |
| `topic` | `GitHub Copilot` / `VS Code` / `GitHub Platform` / `周辺ニュース` |
| `status` | `ga` / `preview` / `retirement` / `announcement` / `update` / `unknown` |
| `statusEvidence` | `status` が `ga` `preview` `retirement` `announcement` のとき必須。原文の該当箇所の引用 |
| `summary` | 日本語の要約。220 文字以内 |
| `points` | 要点 1〜5 件。各 120 文字以内 |
| `references.source` | 原文の URL |
| `references.documents` | 関連公式資料 最大 3 件（タイトル付き、重複なし） |
| `evidence` | 記述を確認した URL。1 件以上 |

## 規則

- **根拠のない状態は書かない。** GA / Preview / 廃止などは原文が明示している場合だけ使い、それ以外は `unknown`（バッジなし）にします。重要度やトピックから推測しません。
- **URL は許可ホストだけ。** `github.blog`、`github.com`、`docs.github.com`、`code.visualstudio.com`、`www.publickey1.jp`、`learn.microsoft.com`。それ以外は人の確認が必要です。
- **内部メモの語を出さない。** 「未確認」「記載なし」「要確認」「推定」「未発表」「判定保留」「AI 生成」「データ時点」「初心者向け」は読者向けの本文に入れません。
- **本文は日本語、数値や製品名を補わない。** 資料と `evidence` から確認できる内容だけを書きます。
- Azure 版の文言・配色（Microsoft Azure、#0078d4 など）は使えません。

## 描画

- `scripts/lib/slide-html.mjs` が 1280×720 のページとして描画します。本文の文字サイズは 20px から 13px まで段階的に下げ、収まる最大の大きさを使います。最小でも収まらない場合、その更新の PDF だけを作らず警告を出します（デプロイは止めません）。
- 公開するのは直近 3 か月（JST の暦月、当月を含む）の更新です。`PDF_RETENTION_MONTHS` で変更でき、`0` は無期限です。スライド JSON 自体は Git に残ります。
- 色と文言は `scripts/lib/theme.mjs`（GitHub ダーク `#0d1117` と Copilot パープル `#8534f3`）が単一の定義です。

## デッキ

`slides.html` が書き出す JSON（`vscode-copilot-digest/deck/v1`）は `selection`（`mode` / `period` / `snapshotAt`）と `slides[]` を持ちます。
