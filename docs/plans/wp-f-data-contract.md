# Plan: WP-F, the enforceable data contract

**Spec:** `docs/BUILD-SPEC.md` v3.1, WP-F (F.1–F.4), with I.1's hashes and E.3's pause.
**Depends on:** WP-E (merged: ids, availability, `msrp_status`, `range_basis`, schema version 2).
**Status:** plan, for Codex critique and owner go-ahead. Nothing built yet.

## Goal

Every change to vehicle data, from a person or a bot, passes the same checks before it can merge:
- the data is well-formed: a full schema, not today's partial checks;
- changed values carry a matching, quoted source;
- protected fields, ids, rows and availability change only with an approval the proposal can't forge.

Today `scripts/validate-data.js` checks structure partially. Nothing compares a PR's data with `master`, so an unsourced price change, a deleted row or an edited seat count passes CI.

## Current state (measured 2026-11-17)

- 165 rows, schema version 2.
- **Text sentinels in numeric fields:**
  - `range_mi`: `TBD`, `TBD (~315 est)`, `TBD (~350-400 est)`;
  - `hp`: `TBD`, `TBD (~570 est)`, …;
  - `battery_kwh`: `TBD`, `TBD (~150+ est)`;
  - `cargo_behind_3rd_cu_ft`, `third_row_legroom_in`, `third_row_headroom_in`: `N/A`.
- **`preowned_range`** has three "no market" phrasings: `No meaningful used market yet`, `No used market yet`, `N/A - No meaningful used market yet`.
- **Provenance:** 272 field records (`range_mi` 140, `adas_hardware` 76, `msrp` 33, `destination` 15, `charging_type` 4, `seats` 4). All are marked `legacy: "name_keyed"`, and none carries a `value`. **Most stored values have no source record**, so the contract can only require sources for values that change (grandfathering, below).
- **CI:** `ci.yml` (`build`) is a required check on `master`, along with PRs only, resolved conversations and up-to-date branches. Publication by the bots is paused (`publish-control.json`), and the agent is disabled.

## Design

### 1. Schema (`scripts/schema/ev-data.schema.mjs`)

Plain JS, used by the validator and the diff validator. The site does not import it.

- **One entry per `details` field:** its type (`number`, `string`, `boolean`, enum), whether it is nullable, and, for numeric fields, an explicit allowed sentinel set:
  - `range_mi`, `hp`, `battery_kwh`: the string `TBD`, or `TBD (<estimate>)` matching `^TBD \(~[0-9][0-9,+\- ]*( est)?[^)]*\)$`, **only on rows whose `availability` is `announced` or `needs_review`**;
  - `cargo_behind_3rd_cu_ft`, `third_row_legroom_in`, `third_row_headroom_in`: `N/A`, only where `seats` ≤ 5 or the note explains it. *(Open question: verify the three current `N/A` rows.)*
  - Every other numeric field: `number | null`.
- **Unknown keys are errors.** Stored computed keys are errors (`otd_new`, `otd_preowned`, `preowned_low`, `preowned_high`, `self_driving_rank`, `adas_downgraded`).
- **Enums:** `availability`, `msrp_status`, `range_basis`, `adas_hardware_gen`, `self_driving_tier`, `drivetrain` (drivetrain enum taken from current values).
- **`preowned_range`:** `$X - $Y` or `$X` with low ≤ high, within $5,000–$250,000, **or** the single sentinel `No used market yet`. A one-off data change normalizes the three current phrasings to it.
- **Top-level keys and the other tables** (`glossary`, `assumptions`, `count_*`, `us_ev_sales*`, `preowned`) get shape checks. The `count_*` and `preowned` tables are derived in WP-G, so here they are only shape-checked.
- **`lib/data.ts`:** JSON imports widen enums to `string`, so `satisfies RawEVData` can't type-check the import. Proposal: keep one cast, in a single `loadEvData()` documented as "validated at build by the schema (prebuild)". That trades a compile-time check for a build-time one, which is enforced on every build. *(The spec said `satisfies`; this is a deliberate deviation, flagged for review.)*
- `scripts/validate-data.js` keeps its non-schema checks (adas consistency, accepted.json ↔ `range_basis`, provenance shape) and calls the schema for the rest.

### 2. Provenance record format (version 3 of the provenance file)

A new or changed record has:
- `source_url`, `verified_on`, `evidence` (quote);
- **`value`**, which must equal the stored value;
- **`method`** (`observed` | `derived`) and `method_version`;
- optional `snapshot: { sha256, run_id, expires_on }`, filled by bots in WP-H/I.

Existing records stay as they are, marked `legacy`, with no backfill of `value`: nothing can verify what they quoted. `provenance.schema_version` becomes 3. The validator accepts legacy records without `value`, and requires `value`/`method` on any record whose `verified_on` or `evidence` changed.

### 3. Diff validator (`scripts/validate-diff.mjs --base <sha> --head <sha>`)

It reads both revisions with `git show <sha>:<path>`, uses immutable SHAs, and fetches the history it needs. It never uses `origin/master`. Rows are matched by `id`. **One mode for every path**: human PRs and bots alike.

| Rule | Result |
|---|---|
| Protected field changed (`seats`, `cargo_behind_*`, `fold_flat`, `cargo_floor_width_in`) | Error unless a trusted approval matches (§4) |
| Row removed, or `id` changed | Error unless approved |
| Any `availability` change, or a `schema_version` change | Error unless approved; a migration uses `field: "*"` |
| Sourced field changed (`msrp`, `destination`, `range_mi`, `preowned_range`, `adas_*`, `self_driving_tier`), or a new row added, without a provenance record whose `value` equals the stored value | Error |
| Source domain not allowed for that field and vehicle (`scripts/refresh/source-policy.json`) | Error |
| Provenance record deleted; `value` mismatch; a legacy record re-labelled as verified; `range_basis` set to `epa` (needs WP-J mapping) | Error |
| Same-day re-verification (`verified_on` unchanged, new `value`/`evidence`) | Allowed |
| `source-policy.json`, `accepted.json`, `compat.json` or `publish-control.json` changed in the same PR as data | Warning in the report (CODEOWNERS covers who may change them) |

- **Output:** a Markdown report listing each changed row and field, the rule outcome, and for exceptions the exact `base_sha`, `proposal_sha256`, `id`, `field`, `old` and `new` an approval must match. CI prints it to the job summary.
- **Hashes:** `proposal_sha256` is the data files' canonical diff (approvals bind to it). `patch_sha256` covers every changed file: path, change type, mode and content hash. The functions live in `scripts/refresh/lib/hashes.mjs`, shared with WP-I.

### 4. Trusted approvals (`.github/workflows/approve-data-exception.yml`)

- **Trigger:** `workflow_dispatch` with inputs `base_sha`, `proposal_sha256`, `id`, `field`, `old`, `new`, `reason`. It only validates the inputs and uploads `approval.json` as an artifact (90 days).
- **Verification by `validate-diff`** through the API. An approval counts only if:
  - the run's workflow path is exactly that file;
  - the event is `workflow_dispatch`, from the default branch;
  - the run concluded `success`;
  - the triggering actor has `admin` or `maintain` permission **at validation time**;
  - the artifact fields equal the exception exactly.
- **In CI,** a PR that needs an exception fails with the report. After the owner runs the approval, re-running CI passes. For a human PR, no other bypass is needed.
- **CI permissions:** `ci.yml` needs `actions: read`, to list runs and download artifacts.

### 5. CI wiring

`ci.yml` runs `validate-diff` on every PR (base = `github.event.pull_request.base.sha`, head = the PR head), and as a no-op on pushes to `master`. WP-I adds the `workflow_dispatch` path for bot PRs.

### 6. Source policy (`scripts/refresh/source-policy.json`)

Built from `sources.json` (the manufacturer pricing domain per vehicle) plus:
- `blocked_manufacturers: ["Tesla"]` (Car and Driver per-trim pages are allowed for `msrp` and `destination`);
- `range_mi` → fueleconomy.gov, or any domain when `range_basis` is `manufacturer_estimate` (the record must quote the maker);
- `preowned_range` → cargurus.com, `derived` (WP-G);
- `adas_*`, `self_driving_tier` → manufacturer domains plus an allowlist of the press domains in `CLAUDE.md`.

## Rollout and order

1. Schema plus the `lib/data.ts` loader, and the data normalization (`preowned_range` sentinel). One PR.
2. Provenance v3 format, the diff validator, the hashes library and the source policy, plus CI wiring. One PR.
3. The approval workflow and its verification. One PR.

Publication stays paused throughout, so no bot is affected. Human data PRs are affected from step 2: any changed value needs a source record with `value`. The agent instructions (`refresh.md`, `refresh-ci.md`) are updated in step 2.

**Rollback:** each PR reverts on its own. Step 2 can be disabled by removing the CI step without touching data, because no data format changes except the record fields, which old code ignores.

## Tests

- **Mutation fixtures**, each failing with the named rule (base/head pairs built in a temp git repo):
  - the audit's six (`$1 - $2` used price, deleted pre-owned row, seats 99, removed evidence, `banana` msrp, stored computed fields);
  - an unsourced msrp change;
  - an unauthorized cargo edit;
  - a row deletion;
  - an availability change;
  - a `value` mismatch;
  - a legacy record re-labelled as verified;
  - a disallowed source domain.
- **Positive cases:** a sourced price change passes; same-day re-verification passes; today's `master` passes.
- **Approvals** (with a mocked GitHub API):
  - a matching approval passes;
  - wrong workflow path, branch run, non-maintainer actor, a different `proposal_sha256` and an agent PR body containing `Allow-Protected` each fail.
- **Hashes:** stable across runs; any extra file, mode or content change alters `patch_sha256`.

## Out of scope

- Deriving the count and pre-owned tables (WP-G).
- Bot publication flow (WP-I).
- Agent containment (WP-H).
- Reviewed EPA mappings (WP-J).

## Open questions

1. The three `N/A` cargo and legroom rows: are they truly not applicable (five-seat), or missing data?
2. Is the `lib/data.ts` single-cast loader acceptable instead of `satisfies`?
3. Is `TBD (<estimate>)` acceptable as a pattern, or should the estimates move to `notes`, leaving plain `TBD`?
