# Plan: resume automatic data publishing (WP-G, WP-I and WP-J, simplified)

**Context:** a single-maintainer hobby site about three-row EVs. The owner's direction (2026-11-18): **no manual inputs**. Routine updates publish themselves; the owner's only job is to read and merge the PRs that need a person. This plan replaces BUILD-SPEC's WP-G, WP-H, WP-I and WP-J with the smallest change that gets the weekly jobs publishing again **through the data contract** (WP-F, merged).

Publication has been paused since 2026-11-17 (`scripts/refresh/publish-control.json`).

## Goal

Every Monday:
1. **Pre-owned pricing** reprices from CarGurus and merges itself, with no person involved.
2. **Data Watch** records what it saw and merges itself. EPA range auto-fixes stay off.
3. **Data Agent** researches the inbox and opens a PR that **waits for the owner's merge**.

Every change goes through a PR that passes the two required checks, `build` and `data-contract`. A bot PR that the contract flags `needs-owner-review` never merges itself.

## Why the jobs can't simply be unpaused

| Problem today | Effect |
|---|---|
| A PR opened by a workflow (`GITHUB_TOKEN`) doesn't trigger other workflows, so `build` and `data-contract` never run on it | Every bot PR would stay blocked forever |
| Watch and Agent push bookkeeping (`watch.json`, `deferred.json`) **straight to master** | The `protect-main` ruleset rejects the push (PRs only) |
| Pre-owned repricing changes `preowned_range` with no per-row source record | The contract **fails** it as unsourced |
| The weekly CarGurus baseline update (`provenance.preowned`) is listed as a review item | Every pricing PR would be flagged, and none could merge itself |
| Pricing, Watch and Agent PRs can open close together, and the ruleset requires branches to be up to date | After one merges, the others fall behind and stall |

## What changes

### 1. Bot PRs trigger the checks themselves (from WP-I, simplified)
- `ci.yml` gains a `workflow_dispatch` trigger. A dispatched run of the `build` job on the PR branch posts a `build` check on the PR's head commit, from the GitHub Actions app, so it satisfies the required check.
- `data-contract.yml` already accepts dispatch with `base_sha`, `head_sha` and `pr`. It labels the PR and posts the `data-contract` status on the head commit.
- **The publisher's one shared step** (`scripts/refresh/publish-pr.sh`, used by all three workflows) runs in this order:
  1. Check the pause flag (`can-publish.sh`, unchanged).
  2. Commit the allowed files to `data-refresh/<producer>-<date>`.
  3. Open the PR.
  4. Dispatch `ci.yml` (ref = branch) and `data-contract.yml` (base = master's SHA at branching, head = the commit, pr = number).
  5. **Wait** for both required checks on that head SHA, polling with a 25-minute limit.
  6. Then decide:
     - **Both pass, no `needs-owner-review` label, and producer ≠ agent:** `gh pr merge --squash`.
     - **Label present, or producer = agent:** assign the owner and request their review. Leave the PR open.
     - **A check fails, or the wait times out:** leave the PR open and add a line to the Data inbox issue. The owner doesn't need to act; the next run closes it (§4).

   The script reads the label **after** `data-contract` completes. The contract applies the label *before* it posts success, so a flagged PR can't be merged by mistake.
- **Why not GitHub auto-merge:** it would need the label decision before the contract has run. Waiting inside the job is simpler, and the job is already serialized (§4).

### 2. No direct pushes to master
- **Watch:** `watch.json` and refreshed range provenance go in the Watch PR. A bookkeeping-only PR has no data change, so the contract passes it with no review items and it merges itself. Vercel's `ignoreCommand` already skips the deploy for commits touching only `scripts/refresh/**` and provenance.
- **Agent deferrals** (`deferred.json` only) go through a PR the same way and merge themselves. A deferral changes no site data, and it is the agent's existing promise that "nothing the agent writes is merged automatically" applied to **site data**. If the agent also changed data, deferrals ride in that PR and wait for the owner with it.
- **The cost:** about two small auto-merged PRs a week. They serve as the audit trail. No `data-state` branch is needed (WP-J.2 is dropped).

### 3. Sourced repricing (WP-G, slimmed)
- **Producer** (`preowned.mjs` / `lib/preowned-plan.mjs`): for each row whose `preowned_range` it changes, it writes a field record:

  ```json
  { "method": "derived", "derivation": "cargurus_scaled", "method_version": 1,
    "source_url": "<the vehicle's CarGurus price-trends URL>", "verified_on": "<today>",
    "baseline_year": "2025", "prev_avg": 41711, "new_avg": 40320,
    "evidence": "CarGurus average 41,711 → 40,320 (model year 2025); range scaled by the ratio",
    "value": "$38,000 - $45,000" }
  ```
- **Contract** (`validate-diff.mjs`): it accepts a changed `preowned_range` with such a record when all of the following hold:
  - the domain is `cargurus.com` (`source-policy.json` already says this);
  - the head's `provenance.preowned[vehicle]` has the same `source_url`, and year `baseline_year` has `avg_price == new_avg`;
  - the base's baseline for that year has `avg_price == prev_avg`;
  - **recomputing** `scaleRange(before, new_avg / prev_avg)` gives exactly `value`. It uses the **base revision's** `preowned-plan.mjs`, so the PR can't change the math that judges it.
- **Baseline updates are routine.** Changes to `avg_price`, `as_of`, `last_repriced` or `last_move_pct` within an existing vehicle and year are not review items. A changed `source_url` or `basis`, or an added or removed vehicle or year, stays a review item.
- **Unchanged:** moves over the 15% guard are held for the inbox, as today. "No used market yet" ↔ price changes stay review items.
- **Dropped from WP-G:** computing `count_data` / `count_totals` / tables at load. It isn't needed to publish (the `preowned` table is already gone, from step 3).

### 4. One publisher at a time; stale PRs are replaced
- All three publish jobs share `concurrency: { group: data-publish, cancel-in-progress: false }`. Each waits for its PR to merge (§1) before releasing the group, so the next one branches from the updated master. The Monday times (13:17, 13:47, 14:47 UTC) are kept.
- **At the start of each run,** a producer closes its own previous open PR (same `data-refresh/<producer>-` prefix) if it has **no** `needs-owner-review` label, and deletes the branch. Its run will regenerate the change from fresh data. A **labelled** PR is left for the owner, and that producer skips writing until it's merged or closed. This is the current behaviour, narrowed to the PR that actually conflicts.
- **The agent PR:** pricing and Watch keep waiting while an agent PR is open, as today (it edits the same files). The owner reviewing the agent PR within the week keeps pricing on schedule. If the agent PR is behind master when the owner gets to it, GitHub's **Update branch** button re-runs the checks. That's the one possible extra click, and only when it happens.
- **Dropped from WP-I:** `patch_sha256` manifests, the separate proposal/verify/write artifacts, "base moved" re-dispatch, and pause-aware CI. The contract already runs from the trusted base revision on the exact head commit, and the data-only file guard in each workflow stays.

### 5. Kept as is
- **Data Agent containment:** the existing four-job layout. Only one job holds the Claude token; the verify job holds no secret; the publish job runs no npm; the patch only touches data files; and its PR is always human-merged. **WP-H** (containers, egress blocking, canary suite) **is dropped** as out of proportion for this site.
- **The inbox issue** and its lifecycle as they work today. **WP-J.1** (item IDs, outcomes, `inbox.json`) **is dropped.**
- **EPA range auto-fix** (`--fix-ranges`) stays off. WP-J.3 (reviewed EPA mappings) is a possible later plan, and the inbox still reports range mismatches.
- **The backup schedules** (`ran-since.sh`) and the `publication-paused` marker.

## Things to confirm before relying on this

1. **The ruleset setting `require_extra_approval_for_unattributed_changes: true`** (on `protect-main`'s pull-request rule) might require an approval on PRs whose commits aren't from a person. The rehearsal (below) shows whether a bot PR merges with zero approvals. If it doesn't, the fix is to turn that one setting off, since it guards nothing here that the required checks don't. That is a settings change the owner makes once, or I make with `gh api` on the owner's say-so.
2. **A dispatched `build` run satisfies the required `build` check.** The check name and the app (integration 15368) match; the rehearsal proves it.
3. **Watch's range-provenance refresh passes the contract.** Records are re-verified with no value change, from fueleconomy.gov. A contract test covers it, using a real `watch.mjs` output fixture.

## Rollout

1. **Build PR** (code only: workflows, `publish-pr.sh`, producer, contract, tests). The pause stays on. The owner merges.
2. **Rehearsal**, on the owner's go-ahead to trigger it. Dispatch Data Watch with an input `rehearsal: true`, which bypasses the pause for a **bookkeeping-only** change: it may commit only `scripts/refresh/state/watch.json`. It runs the full §1 path and should merge itself. This confirms items 1 and 2 above against the real ruleset.
3. **Unpause PR:** `publish-control.json` `paused: false`, plus the docs. The owner merges.
4. **First Monday:** I check the three runs and the PRs and report back. If anything misbehaves, the rollback is to set `paused: true` again (one reviewed PR). Every write path checks that flag first.

## Tests

- **Contract:**
  - accepts a correct `cargurus_scaled` record;
  - rejects a wrong ratio, a mismatched `prev_avg` or `new_avg`, a baseline URL that doesn't match, and a non-CarGurus URL;
  - routine baseline fields aren't review items, while URL/basis changes and added or removed years are;
  - a bookkeeping-only diff (`watch.json` + re-verified range records) passes with 0 review items.
- **Producer:** a fixture run writes one record per changed row whose recomputation matches. This is an end-to-end test: producer output → `validate-diff` passes.
- **`publish-pr.sh`** (bash, with `gh` stubbed by a fake on PATH):
  - merges when the checks pass and there's no label;
  - doesn't merge when the label is set, a check fails, the wait times out, or the producer is the agent;
  - writes nothing when paused;
  - refuses files outside the producer's allowlist.
- **Workflows:** `actionlint` in CI for the edited workflows.

## Docs
CLAUDE.md ("Pre-owned pricing and provenance"), `.claude/commands/refresh.md` and `refresh-ci.md`, `docs/runbooks/migration.md` (pause/unpause), and a supersession note in BUILD-SPEC for WP-G to WP-J.

## Out of scope
WP-H; WP-J.1, J.2 and J.3; the WP-G derived count tables; WP-K.2 and K.3 (CSP, performance), which are optional and unrelated to publishing.
