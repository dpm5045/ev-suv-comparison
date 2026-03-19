Run the full 5-phase data refresh for `lib/ev-data.json`. All research is done in-session using WebSearch/WebFetch.

## Mode

- **Default (no arguments):** Autonomous mode — run all 5 phases end-to-end without pausing. Apply changes as each phase completes. Present a single consolidated changelog at the end with one approve/reject decision.
- **`--interactive`:** Pause after each phase for individual approval (legacy behavior).

Check `$ARGUMENTS` for the `--interactive` flag. If present, follow the "Ask" prompts in each phase. If absent (default), skip all per-phase "Ask" prompts and continue to the next phase.

Process vehicles in batches of 3–4 to keep each phase manageable.

---

## Phase 1: Pre-owned Pricing

1. Read `lib/ev-data.json`. Extract all `preowned` entries where `preowned_range` is NOT `"No meaningful used market yet"`.

2. For each vehicle, WebSearch for current used market pricing from KBB, TrueCar, Cars.com, CarGurus. Look for fair market value ranges — not outlier listings.

3. Present a comparison table:

| Vehicle/Trim | Current Range | Researched Range | Delta | Source |
|---|---|---|---|---|

Only show rows where the delta is >$2,000.

4. **Interactive mode only — Ask: "Apply pre-owned pricing updates?"** In autonomous mode, apply changes and continue.

5. Update BOTH the `details` and `preowned` arrays (they must stay in sync — matching `name` and `preowned_range`).

---

## Phase 2: TBD Resolution

1. Scan all `details` entries for any field value containing "TBD" (case-insensitive).

2. Group by vehicle and list the TBD fields.

3. For each vehicle with TBD fields, WebSearch OEM sites first, then EPA (fueleconomy.gov), then major auto press (edmunds.com, caranddriver.com). Only resolve fields where you find **confirmed, official specs**.

4. Present findings:

| Vehicle/Trim | Field | Old Value | New Value | Source |
|---|---|---|---|---|

5. **Interactive mode only — Ask: "Apply TBD resolutions?"** In autonomous mode, apply changes and continue.

6. Only fill fields that are currently TBD — never overwrite existing values. Numeric fields must be numbers, not strings.

---

## Phase 3: Spec Corrections

1. For each vehicle, cross-check these high-value fields against OEM sites and EPA:
   - `msrp`, `destination`
   - `range_mi` (EPA-rated, not manufacturer-estimated)
   - `hp`, `battery_kwh`
   - `charging_type`
   - `dc_fast_charge_kw`
   - `towing_lbs`

2. **PROTECTED FIELDS — never change these:**
   `seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`

3. Present discrepancies:

| Vehicle/Trim | Field | Current | Corrected | Source |
|---|---|---|---|---|

Only include HIGH-CONFIDENCE corrections. MSRP must be official, not sale price. Range must be EPA-rated.

4. **Interactive mode only — Ask: "Apply spec corrections?"** In autonomous mode, apply changes and continue.

---

## Phase 4: New Vehicle Detection

1. Get the list of currently tracked vehicles: `[...new Set(data.details.map(r => r.vehicle))]`

2. WebSearch for newly announced or released 3-row fully electric vehicles (RWD/AWD/4WD) in the US market NOT already in the dataset. Check manufacturers like BMW, Ford, Nissan, Honda, Audi, etc.

3. **Only pure BEV — no plug-in hybrids (PHEV).**

4. Present findings:

| Vehicle | Year | Trims | MSRP Range | Range | Confidence | Source |
|---|---|---|---|---|---|---|

Only include vehicles with at least "medium" confidence (officially announced with some specs).

5. **Interactive mode only — Ask: "Add any of these vehicles?"** In autonomous mode, log detected vehicles in the changelog but do NOT auto-add them (adding vehicles requires user judgment on trim selection). Continue to next phase.

---

## Phase 5: Gap Filling

1. Scan all detail entries for null/empty/"TBD" fields in these fillable columns:
   - Charging: `onboard_ac_kw`, `l2_10_100`, `l2_10_80`, `charging_type`, `dc_fast_charge_kw`, `dc_fast_charge_10_80_min`
   - Cargo: `frunk_cu_ft`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`
   - Tech: `self_driving`, `sae_level`, `self_driving_tier`, `car_software`, `center_display`, `gauge_cluster`, `hud`, `other_displays`, `audio`
   - Performance: `hp`, `battery_kwh`, `range_mi`, `torque_lb_ft`, `zero_to_60_sec`, `curb_weight_lbs`, `towing_lbs`
   - Dimensions: `length_in`, `width_in`, `height_in`, `ground_clearance_in`, `third_row_legroom_in`, `third_row_headroom_in`

2. Skip entries where only `cargo_floor_width_in` is missing (non-critical).

3. WebSearch for missing values from OEM sites, EPA, edmunds, evkx.net, evspecifications.com.

4. Present findings grouped by vehicle. Only fill if currently null/empty/TBD — never overwrite existing values.

5. Special rules:
   - `frunk_cu_ft` = null (not 0) if vehicle has no frunk
   - `cargo_behind_3rd_cu_ft` = "N/A" for 5-seat vehicles with no 3rd row
   - `fold_flat` = "Yes" or "No"
   - `charging_type` format: `"NACS (+CCS adpt)"` or `"CCS1 (+NACS adpt)"`
   - L2 times in hours as decimals

6. **Interactive mode only — Ask: "Apply gap fills?"** In autonomous mode, apply changes and continue.

---

## Post-Phase Wrap-Up

After all 5 phases:

1. **Recalculate OTD values** for all entries:
   - `otd_new = (msrp + destination) * 1.06 + 905` (for entries where msrp is a number)
   - `otd_preowned`: parse `preowned_range`, apply `price * 1.06 + 905` to both low and high, format as `"$XX,XXX - $XX,XXX"`
   - Run: `node -e "import{recalculateAllOtd}from'./scripts/lib/otd-calculator.mjs';import{readFileSync,writeFileSync}from'fs';const d=JSON.parse(readFileSync('lib/ev-data.json','utf-8'));recalculateAllOtd(d);writeFileSync('lib/ev-data.json',JSON.stringify(d,null,2)+'\n');console.log('OTD recalculated')"`

2. **Update count totals** — sum each year column across `count_data` rows, update `count_totals`.

3. **Run validation** via `/project:validate` checks (or `node -e` with the validator).

4. **Present a consolidated changelog:**

```
=== Data Refresh Changelog — YYYY-MM-DD ===

Phase 1 — Pre-owned Pricing: N updates
Phase 2 — TBD Resolution: N fields resolved
Phase 3 — Spec Corrections: N corrections
Phase 4 — New Vehicles: N detected (not auto-added)
Phase 5 — Gap Filling: N fields filled

Post-processing:
  - OTD values recalculated
  - Count totals updated
  - Validation: X errors, Y warnings

[Full details tables for each phase below]
```

Include the detailed comparison tables from each phase below the summary.

All 5 phases are always listed, even if a phase found 0 changes.

5. **Ask: "Apply all changes and commit?"**
   - If approved: create a checkpoint commit with a descriptive message.
   - If rejected: run `git checkout -- lib/ev-data.json` to revert all changes.

**Error handling:** If a phase fails mid-way (network error, ambiguous data), skip that phase, note the failure in the changelog (e.g., "Phase 3 — Spec Corrections: SKIPPED (network error)"), and continue with remaining phases.

---

## Guardrails

- Never hardcode model/vehicle counts — always derive from the data.
- Protected fields are NEVER modified: `seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`.
- The `preowned` and `details` arrays must always stay in sync.
- Present findings for review BEFORE applying changes in every phase.
- For brand-new vehicles with no used market, leave `preowned_range` as `"No meaningful used market yet"`.
