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
4. **Close open data PRs** (an older PR may still have GitHub's auto-merge enabled):
   ```bash
   gh pr list --state open --json number,headRefName -q '.[] | select(.headRefName | startswith("data-refresh/")) | .number' |
     while read -r n; do gh pr merge "$n" --disable-auto 2>/dev/null; gh pr close "$n" --comment "Closed for a schema migration (docs/runbooks/migration.md)."; done
   ```
   An agent PR closed this way returns its inbox items to pending.

## Merge

5. Merge the migration PR once CI is green. Confirm that `master` passes `npm run validate` and that Vercel deploys.

## After merging

6. **Re-enable only what the new code can run.** Every producer refuses data whose `schema_version` isn't listed in `scripts/refresh/compat.json`, so re-enabling is safe; while paused, the jobs still read sources but write nothing.
   - **While paused:** **Data Watch** and **Pre-owned Pricing Refresh** run in report-only mode: they fetch sources and post to the Data inbox, with no repository writes.
   - **Resume publication** (docs/plans/resume-publishing.md, "Rollout"): run the rehearsal (Data Watch, manual run with `rehearsal` ticked; it should open a bookkeeping PR and merge it with nobody clicking anything), then merge a PR setting `"paused": false`, and re-enable Data Agent.

## Rollback

Revert the whole migration PR together: code, data, `compat.json` and workflows. Never revert the JSON alone: the code would then reject (or misread) the data. After a revert, repeat steps 2–4 before re-enabling anything.

## The `protect-main` ruleset (since 2026-11-17)

`master` accepts changes only through pull requests, with every review conversation resolved (Codex reviews each PR automatically). For this runbook:
- **Flipping the pause switch** (`scripts/refresh/publish-control.json`) needs a PR like any other change; resolve Codex's conversations and merge. An admin can bypass the ruleset in an emergency, but the PR route leaves a record.
- **Data PRs with sensitive changes** pass the `data-contract` check but carry the `needs-owner-review` label; the owner's merge approves them (there is no approval form).
- **The data workflows publish only through PRs** (`scripts/refresh/publish-pr.sh`): every change, bookkeeping included, is a PR that runs `build` and `data-contract` on itself and then merges itself, unless it is flagged `needs-owner-review` or is an agent PR that changes site data (those wait for the owner).
- **Bot PRs and conversation resolution.** An open Codex conversation blocks a bot PR's merge. AGENTS.md tells Codex to comment on `data-refresh/*` PRs only for a real P0/P1. If it does, the publisher's merge is refused: the run closes the PR and fails (so the backup schedule retries), and the failure shows in Actions.
