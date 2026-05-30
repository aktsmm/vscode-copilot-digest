# AGENTS

## Learnings

### Validate Before Close

- After any non-trivial change, run the narrowest relevant validation before treating the work as done.
- If the acceptance criteria depend on GitHub Actions, GitHub Pages, or other remote automation, do not stop at local validation. Trigger the relevant workflow and verify the live result.

### Generated Data Integrity

- Treat `data/state.json`, `data/events/*.json`, and generated summaries as workflow inputs, not disposable artifacts.
- After manually editing them or resolving merge/rebase conflicts in them, validate that they still parse and rerun `npm run collect` before pushing.
- If `npm run collect` is only a validation step, restore generated `data/**` and `summaries/**` diffs before committing unless those outputs are the intended change.

### Generated Pages Guardrails

- When changing `scripts/build-pages.mjs`, keep generated-output guards in sync with the behavior being protected, then verify `node scripts/build-pages.mjs` and Pagefind artifacts.
- For UI or accessibility changes, validate representative generated HTML/CSS, not only source templates; `site/**` is the behavior surface that GitHub Pages serves.

### Generated PR Workflow Sync

- When changing generated PR allow-lists or repair rules, update validation, auto-merge, self-heal feedback, and authoring issue instructions together.
- Keep exceptional write access narrow and marker-gated, such as Pages build repair access to `scripts/build-pages.mjs`.

### Schedule Expectations

- GitHub Actions `schedule` is best-effort and may drift materially from the configured cron time.
- In docs and incident analysis, describe daily workflow timing as a target time, not as an exact guarantee.
