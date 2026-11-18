# Runbook: merging a data-schema migration

Use this whenever a PR changes the data schema (`schema_version` in `lib/ev-data.json`). It keeps the automated data workflows from writing old-format data, or building on an old base, while code and data change together. Background: build spec E.3 and I.4.

## Before merging

1. **Pause publication.** The pause is `scripts/refresh/publish-control.json` on `master`. The migration PR itself may set `"paused": true` (WP-E does). Otherwise, commit that change to `master` first. Every data workflow reads this file live (`scripts/refresh/can-publish.sh`) just before writing, and writes nothing while it is paused.
2. **Stop the workflows.** Jobs already running may predate the pause check:
   ```bash
   gh workflow disable "Data Agent"
   gh workflow disable "Pre-owned Pricing Refresh"
   gh workflow disable "Data Watch"
   ```
3. **Drain runs.** Cancel any queued runs, then wait until nothing is in progress:
   ```bash
   for w in data-agent.yml preowned-refresh.yml data-watch.yml; do
     gh run list --workflow "$w" --status queued --json databaseId -q '.[].databaseId' | xargs -r -n1 gh run cancel
   done
   gh run list --status in_progress --json workflowName -q '.[].workflowName'   # must list none of the three
   ```
4. **Close open data PRs.** GitHub's auto-merge fires on its own once its checks pass:
   ```bash
   gh pr list --state open --json number,headRefName -q '.[] | select(.headRefName | startswith("data-refresh/")) | .number' |
     while read -r n; do gh pr merge "$n" --disable-auto 2>/dev/null; gh pr close "$n" --comment "Closed for a schema migration (docs/runbooks/migration.md)."; done
   ```
   An agent PR closed this way returns its inbox items to pending.

## Merge

5. Merge the migration PR once CI is green. Confirm that `master` passes `npm run validate` and that Vercel deploys.

## After merging

6. **Re-enable only what the new code can run.** Every producer refuses data whose `schema_version` isn't listed in `scripts/refresh/compat.json`, so re-enabling is safe; while paused, the jobs still read sources but write nothing.
   - **During the WP-E to WP-I window:** re-enable **Data Watch** and **Pre-owned Pricing Refresh**. They run in report-only mode: they fetch sources and post to the Data inbox, with no repository writes. Leave **Data Agent** disabled.
   - **Resume publication** (set `"paused": false`, and re-enable Data Agent) only when WP-F, WP-G and WP-I have all landed, per the build spec.

## Rollback

Revert the whole migration PR together: code, data, `compat.json` and workflows. Never revert the JSON alone: the code would then reject (or misread) the data. After a revert, repeat steps 2–4 before re-enabling anything.

## The `protect-main` ruleset (since 2026-11-17)

`master` accepts changes only through pull requests, with every review conversation resolved (Codex reviews each PR automatically). For this runbook:
- **Flipping the pause switch** (`scripts/refresh/publish-control.json`) needs a PR like any other change; resolve Codex's conversations and merge. An admin can bypass the ruleset in an emergency, but the PR route leaves a record.
- **The data workflows' direct pushes are blocked.** Data Watch commits its state straight to `master`, and the agent does the same for deferral-only runs; the ruleset rejects both. While publication is paused they don't push. Before resuming, WP-J moves that state to the `data-state` branch (which the ruleset doesn't cover), and WP-I has the bots publish through PRs that pass the same checks.
- **Bot PRs and conversation resolution.** Codex's automatic review can leave conversations on bot PRs (pre-owned, Data Watch, agent), which would block their merge until someone resolves them. WP-I must settle how these are handled: for example, the reviewer workflow resolves "no findings" threads, or a person resolves them as part of review.
