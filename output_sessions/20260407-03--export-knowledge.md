---
type: debug
exported_at: 2026-04-07T15:26:47
tools_used: [apply_patch, gh, npm, fetch_webpage, memory, GitHub Actions]
outcome_status: success
---

# Workflow 修正・live 検証・Knowledge/Session Export

## Summary

GitHub Actions の schedule drift 実例確認、future-dated feed 項目の warning section 実装、壊れていた generated state の修復、manual Collect updates による live GitHub Pages 更新時刻の検証、retrospective learnings の設計資産反映、knowledge export と session log export までを一連で完了した。

## Timeline

### Phase 1 - スケジュール挙動と remote failure の切り分け

- `Collect updates` の recent run を確認し、scheduled 実行は設定上存在するだけでなく、実際には 12:30 JST 設定に対して 14:22 JST 頃に遅延して発火していたことを確認
- failed run のログを取得し、原因が schedule 不発ではなく remote 側の `data/state.json` の JSON 破損であることを特定
- Modified: [docs/automation.md](docs/automation.md)
- Modified: [README.md](README.md)

### Phase 2 - future-dated 項目の扱いを変更

- feed の未来日付項目を完全除外する代わりに、published event と分離して warning section に出す設計へ変更
- `seenIds` とは別に `futureSeenIds` を保持し、future item が公開日に到達したら通常 event へ昇格できるように調整
- 日次 Markdown と Pages の両方に「先行検知した未来日付の項目」セクションを追加
- Modified: [scripts/collect.mjs](scripts/collect.mjs)
- Modified: [scripts/lib/reporting.mjs](scripts/lib/reporting.mjs)
- Modified: [scripts/build-pages.mjs](scripts/build-pages.mjs)

### Phase 3 - generated state の修復と再検証

- 壊れていた `data/state.json` の重複キーを修正して `collect` が再度読める状態に戻した
- `npm run collect` と `npm run build:pages` を再実行し、ローカルの pipeline は通ることを確認
- synthetic data を使った `buildDailyDigest()` テストで、公開済みイベントが通常ハイライト、未来日付イベントが future section に分離されることを確認
- Modified: [data/state.json](data/state.json)
- Modified: [summaries/daily/2026-04-07.md](summaries/daily/2026-04-07.md)
- Modified: [data/events/2026-04-07.json](data/events/2026-04-07.json)

### Phase 4 - live GitHub Pages 更新時刻の end-to-end 検証

- live site の `最終更新` を事前取得し、`2026/04/07 11:40 JST` を baseline に記録
- 修正を push 後、`collect-updates.yml` を manual trigger し、collect job が `Collect updates` → `Commit changes` → `Redeploy Pages after collect commit` → `Notify Discord when new updates are found` まで成功することを確認
- live site を再取得し、`最終更新` が `2026/04/07 15:15 JST` に進んだことを確認
- Modified: [README.md](README.md)
- Modified: [docs/automation.md](docs/automation.md)

### Phase 5 - retrospective learnings と knowledge/session export

- 今回のインシデントから再利用可能な知見を抽出し、共通原則は `AGENTS.md`、workflow 固有ルールは `.github/instructions/workflows.instructions.md` に新規反映
- repository memory に「workflow 変更はローカル検証だけで終えず、必要なら live まで確認する」 gate を記録
- knowledge export を `blog` と `automation` の 2 形態で出力し、その後この session 自体も `workflow-automation-and-discord-batching` と今回の `export-knowledge` として保存
- Modified: [AGENTS.md](AGENTS.md)
- Modified: [.github/instructions/workflows.instructions.md](.github/instructions/workflows.instructions.md)
- Modified: [output_sessions/20260407-02--workflow-automation-and-discord-batching.md](output_sessions/20260407-02--workflow-automation-and-discord-batching.md)

## Key Learnings

- GitHub Actions の `schedule` は設定時刻どおりに動く前提を置けない。高負荷時は数十分からそれ以上遅れることがあり、運用文言は「毎日 12:30 JST を目安」に寄せる方が正確
- generated data は単なる成果物ではなく workflow 入力でもある。`data/state.json` や generated summary の conflict 解消後は、JSON parse と `npm run collect` まで確認しないと remote workflow failure を見逃す
- future-dated feed 項目は「完全除外」より「warning 付き別セクション」の方が観測性は高いが、通常ハイライトと混ぜるとノイズになる。`futureSeenIds` を separate tracking して、公開日到達後に通常 event として昇格させる設計が妥当
- workflow や Pages の修正では、ローカル成功だけでは不十分。manual trigger から live site の `最終更新` 変化まで確認して初めて end-to-end で直ったと言える

## Commands & Code

```powershell
# local validation
npm run collect
npm run build:pages

# manual remote verification
gh workflow run -R aktsmm/vscode-copilot-digest collect-updates.yml
gh run list -R aktsmm/vscode-copilot-digest --workflow "Collect updates" --limit 5 --json "databaseId,status,conclusion,createdAt,event,url"
gh run watch -R aktsmm/vscode-copilot-digest 24067292199 --exit-status
gh run view -R aktsmm/vscode-copilot-digest 24067292199 --json jobs

# live Pages check
(Invoke-WebRequest -UseBasicParsing https://aktsmm.github.io/vscode-copilot-digest/).Content |
  Select-String -Pattern '最終更新.{0,80}' -AllMatches |
  ForEach-Object { $_.Matches.Value }
```

```javascript
// future-dated item は通常イベントと分離し、公開後に通常 event に昇格させる
if (existingEvent?.isFutureDated && !event.isFutureDated) {
  mergedEvents[existingIndex] = {
    ...existingEvent,
    ...event,
  };
}

const futureEvents = allEvents.filter(
  (event) =>
    event.isFutureDated ||
    safeDate(event.publishedAt ?? event.detectedAt) > reportDate,
);
```

## References

- [GitHub Actions workflow timing docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
- [GitHub Pages site](https://aktsmm.github.io/vscode-copilot-digest/)
- [Collect updates run 24067292199](https://github.com/aktsmm/vscode-copilot-digest/actions/runs/24067292199)

## Next Steps

- [ ] Pages 系 action の Node 20 deprecation warning を抑えるための upstream 対応状況を継続確認する
- [ ] future-dated 項目が実データで発生した日に、warning section の見え方を本番データでも再確認する
- [ ] README の `トップページ: 、` のような文言崩れを別修正で整える
