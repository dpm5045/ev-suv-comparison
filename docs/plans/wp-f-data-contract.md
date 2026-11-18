# Plan: WP-F, the enforceable data contract (revision 2)

**Spec:** `docs/BUILD-SPEC.md` v3.1, WP-F (F.1–F.4), with I.1's hashes and E.3's pause.
**Depends on:** WP-E (merged: ids, availability, `msrp_status`, `range_basis`, schema version 2).
**Status:** revision 2, after Codex's architect critique (6 × P0, 3 × P1, all accepted; see "Critique and changes"). Waiting for the owner's go-ahead. Nothing built yet.

## Goal

Every change to vehicle data, from a person or a bot, passes the same checks before it can merge, **judged by code and policy the PR cannot change**:
- the data is well-formed;
- every changed published value has a matching, quoted source;
- ids, rows, availability and protected fields change only with the owner's approval, which no proposal can forge.

## Current state (measured 2026-11-17)

- **165 rows, schema version 2.**
- **Text sentinels in numeric fields:**
  - `range_mi`, `hp` and `battery_kwh` hold `TBD` and `TBD (~… est)`;
  - three third-row fields hold `N/A`.
- **`preowned_range`** has three "no market" phrasings.
- **Provenance:** 272 legacy records (`range_mi` 140, `adas_hardware` 76, `msrp` 33, `destination` 15, …). None has a `value`. Most stored values have no record at all.
- **Data errors found during planning** (fixed in step 3, through the gate):
  - 5-seat rows carry third-row legroom and headroom numbers;
  - 6-seat Model X (2021–22) rows say "N/A" for third-row cargo, which is missing data;
  - Maybach EQS 680 (2024–26) is stored as 7 seats but is a two-row car, so it passes Speed Dating's 6+ filter.
- **GitHub:**
  - `protect-main` requires a PR, resolved conversations, an up-to-date branch and the `build` check;
  - the repository owner is `dpm5045`;
  - Codex reviews every PR;
  - bot publication is paused and the agent is disabled. **No data PRs are open.**

## Design

### 1. The gate runs from trusted code (Codex P0-1)

- **Trusted revision.** CI runs the data contract from the **base** revision: it checks out `base_sha` into a separate worktree and runs that worktree's validator, schema, source policy and approval rules against the PR's data files read from `head_sha`. A PR can't loosen the rules that judge it, because those rules come from `master`.
- **Gate and policy files are separated from data changes.** The validator, schema, `source-policy.json`, `accepted.json`, `retired-ids.json`, `compat.json`, `publish-control.json`, `ci.yml` and `approve-data-exception.yml` may change only in a PR that changes **no** data files. A PR touching both fails. Changing a rule is therefore always its own reviewed PR, merged by the owner, before any data relies on it.
- **CODEOWNERS** covers all of those files. *Limitation:* GitHub won't let the owner approve their own PRs, and these PRs are opened under the owner's account, so code-owner review can't be a required rule. The separation above plus the owner's merge is the control. This is recorded, not hidden.
- **Bootstrap.** The first PR that adds the gate can't be judged by a gate that doesn't exist yet. The new checks run from the head revision only when the base revision has no validator, which happens exactly once, and that PR changes no data.

### 2. Schema (`scripts/schema/ev-data.schema.mjs`) and types (Codex P1-2)

- **One entry per `details` field:** type, nullability, enum, and an explicit sentinel set:
  - `TBD` only on `range_mi`, `hp` and `battery_kwh`, and only on `announced` or `needs_review` rows;
  - `N/A`, meaning "no third row", is required on the three third-row fields when `seats` ≤ 5, and forbidden otherwise.
- **Unknown keys and stored computed keys are errors.**
- **`preowned_range`** must be a price or range (low ≤ high, $5,000–$250,000) or exactly `No used market yet`.
- **Generated types (no drift).** `scripts/schema/gen-types.mjs` generates `lib/ev-data.types.ts` (`RawDetailRow` and the enums) from the schema. CI fails if the committed file differs from a fresh generation. `lib/data.ts` imports those types, and its single documented cast (`loadEvData()`) is to a type that provably matches the build-time schema.
- **One owner for each rule.** The schema module owns every per-row and cross-field rule:
  - the `availability` × `msrp_status` matrix;
  - `range_mi` versus `range_basis`;
  - `accepted.json` versus `range_basis`;
  - adas consistency;
  - third-row applicability.

  `scripts/validate-data.js` becomes a thin runner over it (plus the report). No rule lives in two places.

### 3. Cross-table consistency until WP-G (Codex P0-4)

- **`count_data` and `count_totals`** must equal counts computed from `details` (vehicle × year), and their arithmetic is checked as today.
- **The `preowned` table.** Every entry must match `details` by `name`, and every details `name` must have exactly one entry. Seat variants share a name, so **all rows sharing a name must have the same `preowned_range`**, which the entry must equal. A changed `preowned_range` therefore has to change in both tables together, carrying a source for the `details` change (§5). A deleted entry fails.
- WP-G later replaces both tables with derived ones and drops these checks.

### 4. Identity and availability (Codex P0-3)

- **Identity fields:** `vehicle`, `year`, `trim`, `seats`, `drivetrain`.
  - Changing them on an existing `id` is an **identity change**. It needs an approval with `field: "@identity"`, and the old and new tuples must both be recorded. Otherwise it fails, which catches in-place reassignment.
- **Retired ids.** `scripts/refresh/retired-ids.json` is append-only (trusted, §1). Removing a row requires an approval (`field: "@remove"`) **and** adding its id there. Any row whose `id` is listed there fails, so a retired id can never come back.
- **Availability:**
  - a new row must start as `needs_review` (or `announced` for a Watch List vehicle);
  - **any** `availability` value other than those on a new row, and **any** change on an existing row, needs an approval;
  - the same goes for `schema_version` changes (`field: "*"`).
- **Approval authority: the repository owner only.** The run's triggering actor must equal the repository's owner login (`dpm5045`, read through the API at validation time), not anyone with admin or maintain access.

### 5. Evidence for every published field (Codex P0-2, P0-5)

- **Default rule.** Every `details` field is published, so any change to any field (new rows included) needs a provenance record for that field. The only exemptions are computed fields and `name`, which is derived from vehicle, year and trim and checked to match.
- **Fields with extra rules:**
  - **`notes`:** a changed note needs a `notes` record, with `evidence` quoting the source of the new claim. A move of existing text (such as a `TBD` estimate) is recorded with `method: "moved"` and `moved_from: "<field>"`, keeping the original record's source.
  - **Protected fields** (`seats`, `cargo_behind_*`, `fold_flat`, `cargo_floor_width_in`): approval **and** evidence, as independent requirements.
  - **`preowned_range`:** a CarGurus `derived` record (WP-G defines the full derivation).
- **What a record holds.** Any new **or edited** record needs:
  - `source_url`, `verified_on` and `evidence`;
  - `value`, which must equal the stored value;
  - `method` (`observed`, `derived` or `moved`) and `method_version`.

  **Only byte-for-byte unchanged legacy records are grandfathered.** A URL-only edit counts as an edit.
- **The quote must support the value (mechanical).** For numeric fields, the evidence must contain the stored value in a recognised format (`315`, `315 mi`, `$62,500`, `62,500`). For text fields, it must contain the value or its key phrase. *Limitation:* the checker can't confirm the quote refers to the right trim. The record's `source_url` and quote are shown in the PR report for the owner, and Codex's AGENTS.md rules make an unsupported quote P0.
- **Source policy** (`scripts/refresh/source-policy.json`, trusted). For each field, it lists the allowed domains:
  - `msrp` and `destination`: the vehicle's manufacturer domain, or Car and Driver per-trim pages for blocked manufacturers (Tesla);
  - `range_mi`: fueleconomy.gov, or for `manufacturer_estimate` the manufacturer's domain, or an allowlisted publication whose evidence quotes the manufacturer (it must name the maker);
  - specs (`hp`, `battery_kwh`, `towing_lbs`, dimensions, charging): the manufacturer, plus the press allowlist from `CLAUDE.md`;
  - `adas_*` and `self_driving_tier`: the manufacturer, plus the allowlist.

### 6. Approvals (`.github/workflows/approve-data-exception.yml`)

- **Trigger:** `workflow_dispatch` with inputs `base_sha`, `proposal_sha256`, `id`, `field` (a real field, `@identity`, `@remove` or `*`), `old`, `new` and `reason`. It validates the inputs and uploads `approval.json` (90 days).
- **`validate-diff` accepts an approval** only if all of these hold:
  - the workflow path is exact;
  - the run was `workflow_dispatch` on the default branch, and concluded `success`;
  - the **triggering actor equals the repository owner**;
  - the artifact matches `base_sha`, `proposal_sha256`, `id`, `field`, `old` and `new` exactly.

  A change to the proposal or its base voids it.
- **CI needs `actions: read`.** A PR that needs approvals fails, and its report lists each one with the exact inputs. The owner runs the workflow, then re-runs CI.

### 7. Provenance format: additive, version unchanged (Codex P1-1)

The new record fields (`value`, `method`, `method_version`, `moved_from`, `snapshot`) are **added without bumping** the provenance file's `schema_version`, which stays at 2. The current validator ignores unknown record fields, so rolling back code never strands data. The refresh writers (`watch.mjs` range records, `preowned.mjs`) still emit legacy-shaped records. They are updated in WP-G and WP-I, and publication stays paused until then (E.3). The contract rejects their old shape for any new record, so they can't write it by accident after resuming.

### 8. Hashes (`scripts/refresh/lib/hashes.mjs`)

- `proposal_sha256`: the data files' canonical diff (the approval binding).
- `patch_sha256`: every changed file's path, change type, mode and content hash (WP-I).

## Rollout and order (Codex P0-6)

No data changes until the gate and the approval path both exist.

1. **Gate and approvals, no data changes:**
   - schema, generated types, the `validate-data.js` runner;
   - the cross-table checks;
   - `validate-diff` with trusted-base execution;
   - hashes, source policy, `retired-ids.json` (empty);
   - the approval workflow, CODEOWNERS, and the CI wiring (`actions: read`).

   It bootstraps once (§1). Today's `master` must pass the full-state checks. One PR, or two if Codex review asks for a split: the gate, then approvals.
2. **End-to-end proof on the real repository** (Codex P1-3), before any data PR relies on the gate. Using throwaway PRs against `master`, with real Actions, the real ruleset and the owner's account:
   - an unsourced price change is rejected;
   - a protected change is rejected, then passes after the owner's approval and a CI re-run;
   - the approval is voided when the base or proposal changes;
   - a non-owner approval run is rejected;
   - a PR changing data and the policy together is rejected.

   The PRs are closed afterwards. Results are recorded in this plan.
3. **Data corrections, through the gate, each with evidence and the owner's approvals:**
   - normalize `preowned_range`;
   - `TBD (…)` to `TBD`, with estimates moved to `notes` (`method: "moved"`);
   - 5-seat third-row fields to `N/A`;
   - 6-seat Model X third-row cargo to `null`, missing data (protected: approval);
   - the Maybach seat count, with a quoted mbusa.com source (protected: approval and evidence).

   CI's generated-page checks and Playwright run on the migrated data. A Speed Dating test asserts the Maybach is no longer in 6+ results.
4. **Agent docs** (`refresh.md`, `refresh-ci.md`) updated for the record format and approvals.

**At cutover** (start of step 1): confirm no `data-refresh/*` PRs are open, and none is (2026-11-17). The runbook's PR check covers later cutovers.

**Rollback:**
- Steps 1–2 revert as code only: no data format changed (§7).
- Step 3's data PRs revert individually through the gate.
- Reverting a gate PR after data changes doesn't touch provenance records added since, because the format is additive.

## Tests

- **Mutation fixtures** (temporary git repos), each failing with the named rule:
  - the audit's six;
  - an unsourced msrp change, and an **unsourced horsepower edit**;
  - an **approved cargo edit without evidence**;
  - an unauthorized cargo edit, and a row deletion;
  - an **id reassignment**, and a **retired-id reuse**;
  - a **new row with `availability: new`**, and an availability change;
  - a `value` mismatch;
  - a **URL-only legacy edit**, and a legacy record re-labelled as verified;
  - a disallowed domain, and an estimate from a non-quoting publication;
  - **evidence that doesn't contain the value**;
  - a `preowned` entry changed without `details`, a deleted `preowned` entry, and a count that disagrees with `details`;
  - **data plus policy in one PR**, and a validator change in a data PR;
  - generated types out of date.
- **Positive cases:**
  - a sourced price change;
  - same-day re-verification;
  - a moved note;
  - an approved protected change with evidence;
  - today's `master`.
- **Approvals** (mocked API): an owner's approval passes; a non-owner, branch run, wrong path, wrong hash, and `Allow-Protected` in a PR body all fail.
- **Real repository:** step 2 above.

## Out of scope

Deriving tables and writer records (WP-G), bot publication (WP-I), agent containment (WP-H), and EPA mappings (WP-J).

## Decisions (owner delegated, 2026-11-17)

1. **Third-row `N/A`** means "no third row": required and allowed only where `seats` ≤ 5. The corrections listed under Current state are made in step 3.
2. **Typing:** validate at build time, with types **generated** from the schema and a CI drift check. That is the standard "validate at the boundary" pattern, with Codex's conformance fix.
3. **`TBD` estimates** move to `notes`, and numeric fields hold `TBD` only.

## Critique and changes (Codex `codex exec`, 2026-11-17)

| Codex finding | Change |
|---|---|
| P0-1 The PR can change the code and policy that judge it; CODEOWNERS gaps | §1: the contract runs from the **base** revision; gate and policy files can't change in a data PR; CODEOWNERS extended; one-time bootstrap. Code-owner review can't be required (owner can't self-approve): stated as a limitation |
| P0-2 Many published fields unsourced; approval ≠ evidence; notes outside the gate | §5: every published field needs evidence when changed; protected fields need approval **and** evidence; `notes` records, with `method: "moved"` for relocated text |
| P0-3 ID reassignment and reuse; initial availability; approver too broad | §4: identity-field changes need an `@identity` approval; append-only `retired-ids.json` blocks reuse; new rows start `needs_review`; approver = repository owner only |
| P0-4 Pre-owned table and counts can contradict `details` | §3: counts must equal `details` counts; `preowned` matched by name, with shared-name rows forced equal; deletions fail |
| P0-5 URL-only edits skip re-verification; any domain for estimates; quote vs value | §5: any edited record needs full fields, and only unchanged legacy records are grandfathered; estimate sources must be the maker or a publication quoting it; evidence must contain the value (mechanical; the trim match is a stated limitation) |
| P0-6 Protected data changes before the approval gate exists; open PRs at cutover | Rollout: gate and approvals first, real-repo proof second, data corrections last; cutover PR check (none open today) |
| P1-1 Rollback incompatible with a provenance version bump; writers emit legacy records | §7: record fields are additive and the version is unchanged, so rollback is safe; writers updated in G and I while paused |
| P1-2 Schema and TS types can drift; rule ownership unclear | §2: types generated from the schema plus a CI drift check; the schema owns every cross-field rule |
| P1-3 Fixtures don't prove the real merge-time behaviour | Rollout step 2: end-to-end proof with real Actions and the ruleset; page and Playwright checks on migrated data |
