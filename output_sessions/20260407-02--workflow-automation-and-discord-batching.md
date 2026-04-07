---
type: debug
exported_at: 2026-04-07T12:41:28
tools_used:
  [
    gh,
    GitHub Actions,
    apply_patch,
    collect.mjs,
    notify-discord.mjs,
    build-pages.mjs,
  ]
outcome_status: success
---

# Copilot PR 自動化の完全自走化と Discord 5日まとめ通知

## Summary

GitHub Copilot 向けの digest authoring 自動化を、人手 rerun なしで issue 作成から PR 処理、no-op close、issue close まで自走する形に整理した。あわせて Pages の更新日時が fresh workflow で実際に変わることを確認し、Discord 通知を 2026-04-06 基準の 5日ごと・直近5日分まとめ投稿に変更した。

## Timeline

### Phase 1 - 自動化フローの観測と根因特定

- `author-digest-pr.yml` を起点に fresh run を複数回流し、issue 自動作成、Copilot assignment、generated PR、validate、auto-merge、Pages 反映のどこで止まるかを観測した。
- block 要因は fork ではなく、Copilot 生成 PR の初期 WIP metadata、assignment race、blocked run の回収漏れ、no-op PR 後始末不足にあると切り分けた。
- Modified: [.github/workflows/author-digest-pr.yml](.github/workflows/author-digest-pr.yml)
- Modified: [.github/workflows/rerun-blocked-copilot-workflows.yml](.github/workflows/rerun-blocked-copilot-workflows.yml)

### Phase 2 - Author workflow の self-healing 化

- `author-digest-pr.yml` に shepherding を入れ、generated PR の検出、title/body の正規化、failed / action_required run の再実行を author workflow 自身が担うようにした。
- issue 作成直後の GraphQL race を避けるため、issue 番号の再解決ではなく REST の `node_id` を assignment に使うよう修正した。
- PR 検出は title 依存ではなく、branch 名と issue 参照も使うようにして、Copilot の初期 WIP title 揺れを吸収した。
- 3回以上の試行錯誤は author workflow hardening として圧縮し、最終的に no-touch で自走する形に収束させた。
- Modified: [.github/workflows/author-digest-pr.yml](.github/workflows/author-digest-pr.yml)

### Phase 3 - no-op PR と linked issue の自動終了

- no-op generated PR は失敗扱いではなく自動 close に寄せ、linked issue も閉じるよう auto-merge workflow を調整した。
- linked issue を閉じるには workflow 権限に `issues: write` が必要だったため、権限を追加して最終 close まで自動化した。
- Modified: [.github/workflows/auto-merge-generated-pr.yml](.github/workflows/auto-merge-generated-pr.yml)

### Phase 4 - Pages 更新日時の実地検証

- `Deploy GitHub Pages` 単独ではなく、`Collect updates` を fresh に起動して `generatedAt` を進める必要があることを確認した。
- その後 `Deploy GitHub Pages` が自動 dispatch され、live site の `最終更新` が `2026/04/07 09:03 JST` から `2026/04/07 11:40 JST` に実際に変わることを確認した。
- `build-pages.mjs` の更新日時は deploy 時刻ではなく `data/events/*.json` の `generatedAt` / `latestRun.generatedAt` を使っている点を確認した。
- Modified: [scripts/build-pages.mjs](scripts/build-pages.mjs)

### Phase 5 - Discord 通知の 5日まとめ化

- `notify-discord.mjs` に `--window-days`、`--cadence-days`、`--anchor-date` を追加し、直近複数日を集約して 1 回投稿できるようにした。
- workflow 側では `2026-04-06` を基準日に固定し、5日ごとに直近5日分をまとめて送る設定へ変更した。
- 通知本文は日別見出し付きにして、対象期間、通知間隔、日別件数、ソース内訳を先頭に出す形式へ改善した。
- dry-run で、非投稿日の skip、preview、投稿日 payload の 3 パターンを確認した。
- Modified: [scripts/notify-discord.mjs](scripts/notify-discord.mjs)
- Modified: [.github/workflows/collect-updates.yml](.github/workflows/collect-updates.yml)
- Modified: [.github/workflows/test-discord-notification.yml](.github/workflows/test-discord-notification.yml)
- Modified: [docs/automation.md](docs/automation.md)
- Modified: [README.md](README.md)

## Key Learnings

- Copilot 由来 PR の自動化は、review / validate / merge を別 workflow で受けるだけでは不安定で、起点の author workflow が downstream を shepherd する方が堅い。
- issue 作成直後の GraphQL 解決は伝播 race を踏みやすい。REST で得た issue `node_id` をそのまま assignment に使う方が安定する。
- no-op PR は「更新不要の正常系」なので、PR close と linked issue close を自動でやらないと運用ノイズが増える。
- Pages の `最終更新` は deploy 時刻ではなく collect 由来の `generatedAt` を見ているため、更新日時を確実に動かしたいときは `collect-updates.yml` 起点で検証する必要がある。
- Discord 通知は毎日送るより、固定 anchor の cadence と複数日集約を script 側で持たせると、workflow を増やさず運用だけ落ち着かせられる。

## Commands & Code

```powershell
# fresh collect を起動して Pages の更新日時変化まで確認
gh workflow run collect-updates.yml
gh run list --workflow "Collect updates" --limit 3 --json "databaseId,status,conclusion,displayTitle,createdAt,url"
gh run list --workflow "Deploy GitHub Pages" --limit 5 --json "databaseId,status,conclusion,displayTitle,createdAt,url"

# live site の最終更新を確認
(Invoke-WebRequest -UseBasicParsing https://aktsmm.github.io/vscode-copilot-digest/).Content | Select-String -Pattern '最終更新:' | Out-String

# Discord 5日まとめ通知の dry-run
node scripts/notify-discord.mjs --date 2026-04-07 --window-days 5 --cadence-days 5 --anchor-date 2026-04-06 --dry-run --force-preview
```

```javascript
// 5日 cadence の判定
function shouldNotify(targetDate, anchorDate, cadenceDays) {
  if (cadenceDays <= 1) return true;
  const delta = diffDays(targetDate, anchorDate);
  return delta >= 0 && delta % cadenceDays === 0;
}

// batched Discord 本文の見出し構成
const headerLines = [
  `GitHub Copilot / VS Code 監視で直近${options.windowDays}日分の新着 ${uniqueEvents.length} 件をまとめました。`,
  `対象期間: ${activeWindowLabel}`,
  `通知間隔: ${options.cadenceDays}日ごと`,
  `日別件数: ${dailySummary}`,
];
```

## References

- [GitHub Pages site](https://aktsmm.github.io/vscode-copilot-digest/)
- [Discord notification script](scripts/notify-discord.mjs)
- [Automation notes](docs/automation.md)

## Next Steps

- [ ] workflow 変更を commit / push する前に、意図しない `data/**` 差分と今回のロジック差分を分けて整理する
- [ ] `README.md` の `トップページ: 、` のような無関係な文言崩れを別コミットで直す
- [ ] Discord 5日まとめ通知に、必要なら「最重要 1件だけ先頭固定」の editorial ルールを追加する
