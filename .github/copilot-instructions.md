# Copilot Instructions

This repository tracks GitHub Copilot and VS Code updates, stores daily event logs in JSON and Markdown, and builds a static GitHub Pages site from those artifacts.

Prefer the existing scripts instead of reimplementing behavior. The main entry points are `npm run collect`, `npm run build:pages`, `npm run weekly`, and `npm run biweekly`.

For digest authoring tasks, treat `data/events/*.json` as source material and update only the files explicitly requested in the task. Unless the task explicitly says otherwise, do not modify `data/**`, `config/**`, or workflow files while preparing a digest PR.

For GitHub.com issue-driven coding tasks, labels and `@copilot` comments alone are not enough. The supported path is to assign the issue to Copilot, and this repository now attempts that automatically in `author-digest-pr.yml` via GraphQL actor assignment.

When validating the end-to-end digest authoring flow, expect `author-digest-pr.yml` to create a `digest-authoring` issue first. If no Copilot-generated PR appears within about 10 minutes after issue creation, check the repository's Copilot cloud agent settings before assuming the workflow is broken. If it still has not appeared after about 15 minutes, treat it as a GitHub-side configuration or queue problem rather than a local workflow failure.

Daily summaries live in `summaries/daily`, weekly and biweekly drafts live in `drafts`, and shared classification / translation logic lives in `scripts/lib/reporting.mjs`. Pages rendering is implemented in `scripts/build-pages.mjs` and writes generated output to `site`.

Keep Japanese prose concise, factual, and close to the source material. Each highlight should say what changed and why it matters operationally. Do not add unsupported numbers, product names, or claims.

When changing generation logic, preserve the existing section structure and editorial policy: official GitHub and VS Code sources come first, surrounding news is capped, and future-dated items should not be surfaced early.

Validate every non-trivial change by running the narrowest relevant commands. For authoring and rendering tasks, `npm run build:pages` is the minimum validation. If you touch collection logic, also run `npm run collect`.
