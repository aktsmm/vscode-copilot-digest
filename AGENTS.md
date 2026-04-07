# AGENTS

## Learnings

### Validate Before Close

- After any non-trivial change, run the narrowest relevant validation before treating the work as done.
- If the acceptance criteria depend on GitHub Actions, GitHub Pages, or other remote automation, do not stop at local validation. Trigger the relevant workflow and verify the live result.

### Generated Data Integrity

- Treat `data/state.json`, `data/events/*.json`, and generated summaries as workflow inputs, not disposable artifacts.
- After manually editing them or resolving merge/rebase conflicts in them, validate that they still parse and rerun `npm run collect` before pushing.

### Schedule Expectations

- GitHub Actions `schedule` is best-effort and may drift materially from the configured cron time.
- In docs and incident analysis, describe daily workflow timing as a target time, not as an exact guarantee.
