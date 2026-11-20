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
*As built after the rehearsal (2026-11-20):* the PR is now opened with the owner's publishing token, so its own `pull_request` runs report both checks, and dispatching is only a fallback. See "Rehearsal findings" below.
- `ci.yml` gains a `workflow_dispatch` trigger. A dispatched run of the `build` job on the PR branch posts a `build` check on the PR's head commit, from the GitHub Actions app, so it satisfies the required check.
- `data-contract.yml` already accepts dispatch with `base_sha`, `head_sha` and `pr`. It labels the PR and posts the `data-contract` status on the head commit.
- **The publisher's one shared step** (`scripts/refresh/publish-pr.sh <intent>`, used by all three workflows) states its **intent** explicitly:
  - `auto`: pricing, Watch, and agent deferral-only PRs;
  - `owner`: agent PRs that change site data.

  It runs:
  1. Check the pause flag (`can-publish.sh`, unchanged).
  2. Commit the allowed files to `data-refresh/<producer>-<date>`.
  3. Open the PR; record `base` (master's SHA at branching) and `head` (the commit).
  4. Dispatch `ci.yml` (ref = branch) and `data-contract.yml` (base, head, pr).
  5. **Wait** for the required `build` check and `data-contract` status **on `head`**, polling with a 25-minute limit.
  6. **Then decide:**
     - **`auto`, both pass, no `needs-owner-review` label, and the live pause flag still clear** (re-read right here): `gh pr merge --squash --match-head-commit "$head"`. GitHub refuses the merge if the PR now points anywhere else.
     - **Label present, or intent `owner`:** assign the owner and request their review. Leave the PR open.
     - **A check fails, the wait times out, or the merge is refused:** close the PR (with a comment saying why) and **fail the job**, so the run doesn't count as done (§6) and GitHub reports the failure. *As built:* no inbox note, because the inbox is the agent's to-do list and it can't act on a failed bot PR.

   The label is read **after** `data-contract` has finished on `head`. The contract applies the label *before* it posts success, so a flagged PR can't be merged by mistake.
- **Permissions and time:** publish jobs get `actions: write` (to dispatch) and a 40-minute timeout.
- **Why not GitHub auto-merge:** it would need the label decision before the contract has run. Waiting inside the job is simpler, and the job is already serialized (§4).

### 2. No direct pushes to master
- **Watch:** publishes **only `watch.json`** (what it last saw). It stops writing range provenance for now: `updateRangeProvenance()` emits partial records (no `value`, `method` or `method_version`) that the contract rejects. EPA findings stay report-only in the inbox. A bookkeeping-only PR has no data change, so the contract passes it with no review items and it merges itself. Vercel's `ignoreCommand` already skips the deploy for commits touching only `scripts/refresh/**` and provenance.
- **Agent deferrals** (`deferred.json` only) go through a PR with intent `auto` and merge themselves. A deferral changes no site data. The agent's rule "nothing the agent writes to site data is merged automatically" still holds. If the agent also changed data, deferrals ride in that PR (intent `owner`).
- **The cost:** about two small auto-merged PRs a week. They serve as the audit trail. No `data-state` branch is needed (WP-J.2 is dropped).

### 3. Sourced repricing (WP-G, slimmed)
- **Producer** (`preowned.mjs` / `lib/preowned-plan.mjs`): for each row whose `preowned_range` it changes, it writes a field record **keyed by the row's `id`**:

  ```json
  { "method": "derived", "derivation": "cargurus_scaled", "method_version": 1,
    "source_url": "<the vehicle's CarGurus price-trends URL>", "verified_on": "<today>",
    "vehicle": "Kia EV9", "year": 2025, "basis": "model_year",
    "prev_avg": 41711, "new_avg": 40320,
    "evidence": "2025 Kia EV9: $40,320",
    "value": "$38,000 - $45,000" }
  ```

  `evidence` is the exact label and price cell the producer parsed from the CarGurus table: `seen.label: money(avgPrice)`, which it already builds.
- **Contract** (`validate-diff.mjs`) accepts a changed `preowned_range` with such a record **only if all of these hold**:
  - **Same car:** `vehicle` and `year` equal the row's own `vehicle` and `year`.
  - **Same source:** the domain is `cargurus.com`, and it equals the head baseline `provenance.preowned[vehicle].source_url`. The base baseline has that same URL.
  - **Same basis:** `basis` equals the head baseline's basis for that year, and the base's too. A basis change is a restart, not a repricing (the producer already treats it that way).
  - **The averages chain:**
    - base `avg_price == prev_avg`;
    - head `avg_price == new_avg`;
    - the evidence states `new_avg` as a whole token (the existing quote rule).
  - **Within the producer's rules:** `THRESHOLD ≤ |new_avg / prev_avg − 1| ≤ MAX_MOVE`. Both constants are imported from the **base revision's** `preowned-plan.mjs`, along with `scaleRange`. A larger move needs `allowLarge` and is a review item.
  - **The math:** `scaleRange(before, new_avg / prev_avg) === value`, using the base revision's `scaleRange`.
- **Baseline edits are checked together with the rows.** For an existing vehicle and year, a changed `avg_price` is routine **only if** every priced row of that vehicle and year carries a valid `cargurus_scaled` record against it, so the baseline and the prices move as one. `as_of`, `last_repriced` and `last_move_pct` changes are routine. Anything else is a review item, so a bot PR carrying it waits for the owner:
  - an `avg_price` change with no matching row records;
  - a changed `source_url` or `basis`;
  - an added or removed vehicle or year.
- **Unchanged:** moves over the 15% guard are held for the inbox, as today. "No used market yet" ↔ price changes stay review items.
- **Dropped from WP-G:** computing `count_data` / `count_totals` / tables at load. It isn't needed to publish (the `preowned` table is already gone, from step 3).

### 4. One publisher at a time; stale PRs are replaced
- All three publish jobs share `concurrency: { group: data-publish, cancel-in-progress: false }`. Each waits for its PR's outcome (§1) before releasing the group, so the next one branches from the updated master. The Monday times (13:17, 13:47, 14:47 UTC) are kept.
- **Stale PRs, by intent (not by label):**
  - **`auto` PRs** (pricing, Watch, deferrals): at the start of each run, a producer closes its **own** previous open `auto` PR and deletes the branch. The run regenerates the change from fresh data. If an earlier `auto` PR was flagged and is waiting for the owner, the producer skips writing until it's merged or closed.
  - **`owner` PRs** (agent data, or anything flagged): never closed by automation. When one is **behind master**, the next publisher run brings it up to date (`gh pr update-branch`) and re-dispatches both checks on the new head. If GitHub reports a conflict, it leaves the PR alone and notes it in the inbox. The owner never needs to click **Update branch**.
- **A displaced job retries.** GitHub keeps only one *pending* job per concurrency group. If a third publisher arrives while one runs and one waits, the waiting one is cancelled. A cancelled run doesn't count as done (`ran-since.sh` only counts successes), so its next-day backup runs it; for the agent, the inbox also stays open. The Monday times are 30 to 60 minutes apart, so this should be rare.
- **The agent PR:** pricing and Watch keep waiting while an agent data PR is open, as today (it edits the same files).
- **Dropped from WP-I:** `patch_sha256` manifests, the separate proposal/verify/write artifacts, "base moved" re-dispatch, and pause-aware CI. The contract already runs from the trusted base revision on the exact head commit, and the data-only file guard in each workflow stays.

### 5. Kept as is
- **Data Agent containment:** the existing four-job layout. Only one job holds the Claude token; the verify job holds no secret; the publish job runs no npm; the patch only touches data files; and its PR is always human-merged. **WP-H** (containers, egress blocking, canary suite) **is dropped** as out of proportion for this site.
- **The inbox issue** and its lifecycle as they work today. **WP-J.1** (item IDs, outcomes, `inbox.json`) **is dropped.**
- **EPA range auto-fix** (`--fix-ranges`) stays off. WP-J.3 (reviewed EPA mappings) is a possible later plan, and the inbox still reports range mismatches.
- **The backup schedules** (`ran-since.sh`) and the `publication-paused` marker.

### 6. Explicit outcomes (retries, inbox, rollback)
- **What counts as done.** A run **succeeds** only when its outcome is one of:
  - merged;
  - waiting for the owner (an `owner` or flagged PR whose checks passed);
  - nothing to publish;
  - paused (with the existing `publication-paused` marker).

  A failed check, timeout or refused merge **fails the job**, so `ran-since.sh` treats the run as not done and Tuesday's backup retries.
- **Inbox.** The agent closes the inbox issue only once its PR's checks have passed (owner PR open) or its deferral PR has merged. Otherwise the issue stays open for the next run.
- **Rollback** has two levels:
  - **Stop publishing:** set `paused: true` (one PR). Every write and every auto-merge re-reads it first.
  - **Undo published data:** revert the bad data PR, opened on the owner's word. A revert of a **repricing** won't pass `data-contract`: the restored prices have no current source (the restored records describe an older move, or there were none). That's deliberate: the contract can't tell a good undo from a bad edit. So an undo is the one case where the owner merges with the ruleset's **admin bypass** (it shows as a bypassed check in the PR's history). After it, the pricing baseline and the prices agree again, and the next weekly run reprices from there. Undoing is rare and owner-started, so a contract-valid "un-reprice" path isn't worth building now. *Added after Codex's review of the build, which asked for one; see the PR.*

## Things to confirm before relying on this

1. **The ruleset setting `require_extra_approval_for_unattributed_changes: true`** (on `protect-main`'s pull-request rule) might require an approval on PRs whose commits aren't from a person. The rehearsal (below) shows whether a bot PR merges with zero approvals. If it doesn't, the fix is to turn that one setting off, since it guards nothing here that the required checks don't. That is a settings change the owner makes once, or I make with `gh api` on the owner's say-so.
2. **A dispatched `build` run satisfies the required `build` check.** The check name and the app (integration 15368) match; the rehearsal proves it.
3. **No extra click on bot PRs.** GitHub may hold workflow runs on bot-created PRs for approval. We don't depend on `pull_request` runs (both checks are dispatched), and the rehearsal confirms that nothing waits on the owner. *Wrong; see "Rehearsal findings".*

## Rollout

1. **Build PR** (code only: workflows, `publish-pr.sh`, producer, contract, tests). The pause stays on. The owner merges.
2. **Rehearsal**, on the owner's go-ahead to trigger it. Dispatch Data Watch with an input `rehearsal: true`, which bypasses the pause for a **bookkeeping-only** change: it skips the watch and commits only a marker file, `scripts/refresh/state/rehearsal.json` (so no observations move without their inbox alerts). It runs the full §1 path and should merge itself. This confirms items 1 to 3 above against the real ruleset.
3. **Unpause PR:** `publish-control.json` `paused: false`, plus the docs. The owner merges.
4. **First Monday:** I check the three runs and the PRs and report back. If anything misbehaves, the rollback is to set `paused: true` again (one reviewed PR). Every write path checks that flag first.

## Tests

- **Contract:**
  - accepts a correct `cargurus_scaled` record;
  - rejects a wrong ratio, a mismatched `prev_avg` or `new_avg`, a baseline URL that doesn't match, and a non-CarGurus URL;
  - routine baseline fields aren't review items, while URL/basis changes and added or removed years are;
  - rejects a wrong `vehicle` or `year` (a record pointing at another model year), a `basis` mismatch, evidence that doesn't state `new_avg`, and a move under `THRESHOLD` or over `MAX_MOVE`;
  - an `avg_price` change without matching row records is a review item;
  - a bookkeeping-only diff (`watch.json`) passes with 0 review items.
- **Producer:** a fixture run writes one record per changed row whose recomputation matches. This is an end-to-end test: producer output → `validate-diff` passes.
- **`publish-pr.sh`** (bash, with `gh` stubbed by a fake on PATH):
  - merges when the checks pass and there's no label, and passes `--match-head-commit`;
  - a head that changed between the check and the merge is not merged;
  - doesn't merge when the label is set, a check fails, the wait times out, or the intent is `owner`;
  - each failure exits non-zero;
  - writes nothing when paused, including a pause set **while the checks run**;
  - an `owner` PR that is behind is updated and its checks re-dispatched;
  - one with a conflict is left alone;
  - an `auto` PR from an earlier run is closed;
  - refuses files outside the producer's allowlist.
- **Workflows:** `actionlint` (pinned, checksum-verified) in CI for every workflow. *As built:* without its shellcheck pass, which older workflow scripts haven't been checked against.

## Docs
CLAUDE.md ("Pre-owned pricing and provenance"), `.claude/commands/refresh.md` and `refresh-ci.md`, `docs/runbooks/migration.md` (pause/unpause), and a supersession note in BUILD-SPEC for WP-G to WP-J.

## Out of scope
WP-H; WP-J.1, J.2 and J.3; the WP-G derived count tables; WP-K.2 and K.3 (CSP, performance), which are optional and unrelated to publishing.

## Revisions after Codex's critique (2026-11-19)

| Codex finding | Change |
|---|---|
| P0: a repricing record could point at another model year or an unsupported average; the 15% hold wasn't enforced; an average-only edit could reset the baseline | The record names `vehicle`, `year` and `basis`, which must equal the row's and the baseline's. The evidence must quote `new_avg`. `THRESHOLD`/`MAX_MOVE` and `scaleRange` come from the base revision. An `avg_price` change is routine only when every priced row of that year moves with it (§3). |
| P0: the merge wasn't bound to the checked commit | `gh pr merge --match-head-commit "$head"`, and the label and status are read for that head (§1). |
| P1: dispatch needs `actions: write`; the jobs' timeouts are shorter than the wait | Publish jobs get `actions: write` and 40 minutes. The rehearsal checks for any approval-held runs (§1). |
| P1: Watch's provenance refresh writes partial records the contract rejects | Watch publishes only `watch.json` for now; EPA findings stay in the inbox (§2). |
| P1: the stale-PR rule could close an unlabelled agent PR; behind PRs relied on the owner clicking Update branch | Explicit intent (`auto`/`owner`) decides; `owner` PRs are never closed by automation and are brought up to date automatically. Deferral-only agent PRs are `auto` (§1, §4). |
| P1: retry, inbox and rollback outcomes were implicit | §6: failures fail the job (so the backup retries), the pause is re-read right before merging, the inbox closes only on a viable outcome, and rollback is by revert PR. |

## Rehearsal findings (2026-11-20)

Three rehearsals (PRs #67, #68, #69) each opened their PR and passed both required checks; GitHub counted the dispatched `build` and the `data-contract` status as the required ones (item 2 held). The merge was refused every time ("the base branch policy prohibits the merge"), and the PR stayed `BLOCKED`:
- Item 1 was not the cause: the owner turned `require_extra_approval_for_unattributed_changes` off, and #68 was still refused.
- Item 3 was: a PR opened with `GITHUB_TOKEN` *does* get a `ci.yml` `pull_request` run, held as `action_required` (approval needed), as GitHub now documents. No reviews, threads or other rules were involved.

**Fix:** a fine-grained token of the owner's (`DATA_PUBLISH_TOKEN`; this repo only, Contents and Pull requests read/write). `publish-pr.sh` pushes the branch and opens the PR with it, and `tidy-prs.sh` updates behind PRs with it, so the PR's own `ci.yml` and `data-contract.yml` (`pull_request_target`) runs start as on any PR. The merge stays on `GITHUB_TOKEN`, which can't use the admin bypass, so the ruleset still applies to it. A check that hasn't appeared after 4 minutes is dispatched once, as before. Only the steps that open or update PRs get the token; the agent's patch is checked against its allowlist before it is applied in that step. Codex recommended the same split (token to open, `GITHUB_TOKEN` to merge) over a GitHub App, a bypass actor, auto-merge or changing CI's triggers.
