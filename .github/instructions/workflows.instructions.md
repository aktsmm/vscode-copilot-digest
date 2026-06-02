---
description: "GitHub Actions workflow 変更時の検証、生成データ、安全なスケジュール表現のルール"
applyTo: ".github/workflows/**/*.yml"
---

# Workflow Instructions

## Validation Gate

- When changing collection, Pages, or automation workflows, run the narrowest local validation first.
- Minimum validation for collect / Pages related changes:
  - `npm run collect`
  - `npm run build:pages`
- If the user expectation includes remote behavior, also run the relevant GitHub Actions workflow manually and verify the live outcome.

## Generated State Files

- If `data/state.json` or generated JSON / Markdown files are edited or conflict-resolved, verify they remain valid before pushing.
- A broken generated state file can stop scheduled and manual workflows even when the workflow code itself is correct.

## Schedule Interpretation

- GitHub Actions cron timing is approximate. Expect delays under load.
- When documenting or discussing workflow timing, use wording like `毎日 12:30 JST を目安` rather than implying exact execution.

## Future-Dated Feed Items

- Future-dated feed items must not be mixed into normal highlights before their publish date.
- If they are surfaced, keep them in a warning-style separate section until the publish date arrives.
