# 自動化運用メモ

このリポジトリの自動化は、日次収集、Pages 公開、Discord 通知、Copilot cloud agent 向けの Issue / PR フローで構成しています。

## いま自動で動くもの

- 毎日 12:30 JST を目安に [collect-updates.yml](../.github/workflows/collect-updates.yml) が収集を実行する（GitHub Actions の schedule は高負荷時に遅延しうる）
- 変更があれば `data/**` と `summaries/**` をコミットする
- main 更新で [deploy-pages.yml](../.github/workflows/deploy-pages.yml) が Pages を再生成する
- Pages のヘッダーに出す `最終更新` は、最新の collect / 生成で `data/events/*.json` に書かれた時刻を表示する
- feed に未来日付の項目が見えた場合は、通常のハイライトには混ぜず、警告付きの別セクションで扱う
- Discord Webhook 通知は collect 自体は毎日走らせつつ、2026-04-06 を基準日に 5日ごとに直近5日分をまとめて投稿する
- collect 成功後に [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml) が Copilot 向け Issue を作成または更新する
- 生成 PR では [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml) が metadata を正規化し、[validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml) が検証し、[auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml) が安全なものだけ merge する
- Copilot 起点で `action_required` になった review / validate / auto-merge workflow は [rerun-blocked-copilot-workflows.yml](../.github/workflows/rerun-blocked-copilot-workflows.yml) が定期的に検出して 1 回だけ rerun する
- direct squash merge を workflow から実行した場合は、その merge では push 起点 workflow が連鎖しないため、Pages 再生成は [auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml) から [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を明示 dispatch する
- collect workflow が `GITHUB_TOKEN` で `main` に commit した場合も push 起点 workflow は自動連鎖しないため、Pages 再生成は [collect-updates.yml](../.github/workflows/collect-updates.yml) から [deploy-pages.yml](../.github/workflows/deploy-pages.yml) を明示 dispatch する

## 完全自動か

かなり自動化されていますが、GitHub.com 側の Copilot 機能設定に依存する部分はまだあります。

- リポジトリ設定で Copilot cloud agent を有効化している必要がある
- repo 設定では auto-merge を有効化し、Actions の `GITHUB_TOKEN` は write 権限と PR review approve 権限を持つ前提にしている
- branch protection が無い repo では GitHub の auto-merge API が使えないことがあるため、安全条件を満たした生成 PR は workflow が直接 squash merge する
- workflow の `GITHUB_TOKEN` で実行した direct merge は通常の push workflow を自動連鎖しないため、Pages 再デプロイは別途 dispatch で補う
- workflow の `GITHUB_TOKEN` で実行した collect commit も通常の push workflow を自動連鎖しないため、Pages 再デプロイは別途 dispatch で補う
- Copilot Code Review を ruleset で自動化する設定は GitHub 側で有効化が必要で、この repo の workflow だけでは完結しない
- `needs-human-review` が付いた PR は意図的に自動 merge しない
- GitHub Docs 上の正式導線は、Issue を Copilot に assign すること。`author-digest-pr.yml` は GraphQL で Copilot assignment まで自動化する
- Cloud agent の `Require approval for workflow runs` が ON でも、Copilot 由来の blocked run は定期 workflow が検出して 1 回だけ rerun して先へ進める
- それでも PR が出ない場合は、Issue 右サイドバーで Copilot assignee が付いているかと GitHub 側キューを確認する

## Workflow 一覧

- [collect-updates.yml](../.github/workflows/collect-updates.yml): 毎日 12:30 JST の収集と、5日ごとの Discord まとめ通知
- [deploy-pages.yml](../.github/workflows/deploy-pages.yml): main push で Pages 公開
- [build-weekly-draft.yml](../.github/workflows/build-weekly-draft.yml): 毎週土曜 12:30 JST の週間ドラフト生成
- [build-biweekly-draft.yml](../.github/workflows/build-biweekly-draft.yml): 手動の隔週ドラフト生成
- [publish-qiita.yml](../.github/workflows/publish-qiita.yml): Qiita 投稿
- [test-discord-notification.yml](../.github/workflows/test-discord-notification.yml): Discord preview 通知の実送信テスト
- [copilot-setup-steps.yml](../.github/workflows/copilot-setup-steps.yml): Copilot cloud agent 用の Node.js セットアップ
- [author-digest-pr.yml](../.github/workflows/author-digest-pr.yml): Copilot 向け執筆依頼 Issue の自動作成
- [request-copilot-review.yml](../.github/workflows/request-copilot-review.yml): 生成 PR のラベル付けと metadata 正規化
- [rerun-blocked-copilot-workflows.yml](../.github/workflows/rerun-blocked-copilot-workflows.yml): Copilot 起点で `action_required` になった review / validate / auto-merge workflow の自動 rerun
- [validate-generated-pr.yml](../.github/workflows/validate-generated-pr.yml): 生成 PR の allow-list と build 検証
- [auto-merge-generated-pr.yml](../.github/workflows/auto-merge-generated-pr.yml): 安全な生成 PR を ready for review に切り替え、可能なら auto-merge、不可なら直接 squash merge

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
- blocked workflow の rerun は Copilot actor が起点の run に 1 回だけ限定し、無限 rerun を避けます

## Node 24 対応

GitHub hosted runner の Node 20 deprecation warning に合わせて主要 action は新しい major へ更新していますが、Pages 系 action は upstream 側の都合で warning が出る可能性があります。

- `actions/checkout@v6`
- `actions/setup-node@v6`
- `actions/github-script@v8`

## 手動テストの入口

- `gh workflow run author-digest-pr.yml -f date_key=YYYY-MM-DD -f scope=full -f force_issue=true`
- `gh workflow run test-discord-notification.yml -f date_key=YYYY-MM-DD`
- `node scripts/notify-discord.mjs --date YYYY-MM-DD --window-days 5 --cadence-days 5 --anchor-date 2026-04-06 --dry-run --force-preview`

## 次に確認すること

- repository ruleset で Copilot Code Review の自動 review を有効化し、PR 上の review comment まで GitHub 側機能で補完する
- 新しい `digest-authoring` Issue で、draft PR の validate 成功後に ready for review 化と auto-merge 有効化まで人手なしで進むかを確認する
- 新しい `digest-authoring` Issue を作っても 10 分以内に PR が出ない場合は、workflow 失敗より先に GitHub リポジトリ設定の Copilot cloud agent 有効化状態を確認する
- 15 分を超えても PR が出ない、または review ruleset が動かない場合は、GitHub 側の Copilot Code Review 設定と GitHub 側キューを見直す
