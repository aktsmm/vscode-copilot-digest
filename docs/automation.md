# 自動化運用メモ

このリポジトリの自動化は、日次収集、Pages 公開、Discord 通知、Copilot cloud agent 向けの Issue / PR フローで構成しています。

## いま自動で動くもの

- 毎日 12:30 JST に [collect-updates.yml](../.github/workflows/collect-updates.yml) が収集を実行する
- 変更があれば `data/**` と `summaries/**` をコミットする
- main 更新で [deploy-pages.yml](../.github/workflows/deploy-pages.yml) が Pages を再生成する
- 新着がある日は Discord Webhook に通知する
- collect 成功後に [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml) が Copilot 向け Issue を作成または更新する
- 生成 PR では [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml) が metadata を正規化し、[validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml) が検証し、[auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml) が安全なものだけ auto-merge する

## 完全自動か

かなり自動化されていますが、GitHub.com 側の Copilot cloud agent 設定に依存する部分があります。

- リポジトリ設定で Copilot cloud agent を有効化している必要がある
- Copilot Code Review を自動で回すには GitHub 側設定が必要
- `needs-human-review` が付いた PR は意図的に自動 merge しない
- GitHub Docs 上の正式導線は、Issue を Copilot に assign すること。`author-digest-pr.yml` は GraphQL で Copilot assignment まで自動化する
- それでも PR が出ない場合は、Issue 右サイドバーで Copilot assignee が付いているかと GitHub 側キューを確認する

## Workflow 一覧

- [collect-updates.yml](../.github/workflows/collect-updates.yml): 毎日 12:30 JST の収集と Discord 通知
- [deploy-pages.yml](../.github/workflows/deploy-pages.yml): main push で Pages 公開
- [build-weekly-draft.yml](../.github/workflows/build-weekly-draft.yml): 毎週土曜 12:30 JST の週間ドラフト生成
- [build-biweekly-draft.yml](../.github/workflows/build-biweekly-draft.yml): 手動の隔週ドラフト生成
- [publish-qiita.yml](../.github/workflows/publish-qiita.yml): Qiita 投稿
- [test-discord-notification.yml](../.github/workflows/test-discord-notification.yml): Discord preview 通知の実送信テスト
- [copilot-setup-steps.yml](../.github/workflows/copilot-setup-steps.yml): Copilot cloud agent 用の Node.js セットアップ
- [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml): Copilot 向け執筆依頼 Issue の自動作成
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml): 生成 PR のラベル付けと metadata 正規化
- [validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml): 生成 PR の allow-list と build 検証
- [auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml): 安全な生成 PR の auto-merge

## Secrets

- `DISCORD_WEBHOOK_URL`: Discord 通知と通知テスト用
- `PAGES_BASE_URL`: Discord 通知に載せる Pages URL のベース。未設定時は公開 URL を既定値として使う
- `QIITA_ACCESS_TOKEN`: Qiita 投稿用

## セキュリティメモ

- リポジトリ内に Discord Webhook URL や GitHub token を直書きしない構成です。通知や投稿はすべて GitHub Secrets 経由です
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml) は `pull_request_target` を使いますが、同一リポジトリの PR に限定しています
- `github-script` への workflow input は script 直埋め込みではなく `env` 経由で渡します
- auto-merge は `summaries/daily/**`、`drafts/**`、`scripts/lib/reporting.mjs` 以外を変更した PR では止まります
- `needs-human-review` ラベルがある PR は必ず手動確認に倒れます

## Node 24 対応

GitHub hosted runner の Node 20 deprecation warning に合わせて、主要 action は Node 24 対応版へ更新しています。

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/github-script@v8`

## 手動テストの入口

- `gh workflow run author-digest-pr.yml -f date_key=YYYY-MM-DD -f scope=full -f force_issue=true`
- `gh workflow run test-discord-notification.yml -f date_key=YYYY-MM-DD`

## 次に確認すること

- `author-digest-pr.yml` で作成した `digest-authoring` Issue から、GitHub Copilot cloud agent が実際に PR を起こすところを本番経路で確認する
- `digest-authoring` Issue の右サイドバーに Copilot が assignee として自動で入っているかを確認する
- 新しい `digest-authoring` Issue を作っても 10 分以内に PR が出ない場合は、workflow 失敗より先に GitHub リポジトリ設定の Copilot cloud agent 有効化状態を確認する
- 15 分を超えても PR が出ない場合は、GitHub 側のキューや設定を疑い、手動で repo 設定と Copilot Code Review 設定を見直す
