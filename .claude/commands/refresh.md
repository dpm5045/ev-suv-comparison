Run the full 5-phase data refresh for `lib/ev-data.json`. All research is done in-session using WebSearch/WebFetch.

## Mode

- **Default (no arguments):** Autonomous mode — run all 5 phases end-to-end without pausing. Apply changes as each phase completes. Present a single consolidated changelog at the end with one approve/reject decision.
- **`--interactive`:** Pause after each phase for individual approval (legacy behavior).

Check `$ARGUMENTS` for the `--interactive` flag. If present, follow the "Ask" prompts in each phase. If absent (default), skip all per-phase "Ask" prompts and continue to the next phase.

Process vehicles in batches of 3–4 to keep each phase manageable. Batching is about pacing the work, **not** about collapsing several vehicles into one broad query — research each vehicle on its own terms. Combining vehicles into a single aggregate search averages away per-vehicle movement and produces false "no change" results.

---

## Phase 1: Pre-owned Pricing

This phase is a script, not research. **Do not WebSearch or WebFetch pricing here.**

1. Run `npm run refresh:preowned` (dry run). It fetches the CarGurus price-trends page for each vehicle listed in `scripts/refresh/sources.json`, compares each model year's average used price with the baseline stored in `lib/ev-data.provenance.json`, and prints a report with a row for every vehicle + model year.

2. Rule the script applies: **reprice when the average has moved 3% or more since that group was last repriced.** Both ends of each stored range are scaled by the move and rounded to the nearest $1,000, and the baseline resets. Smaller moves change nothing and keep the old baseline, so slow drift adds up until it crosses 3%. Moves over 15% are reported as `needs_review` and not applied. A page that fails to load or parse changes nothing.

3. Include the script's report in the changelog as-is.

4. **Interactive mode only — Ask: "Apply pre-owned pricing updates?"** Then (or straight away in autonomous mode) run `npm run refresh:preowned -- --apply`. It updates `details`, `preowned`, `last_updated` and the baselines together.

5. Follow up only on what the report flags:
   - `needs_review` — look at the CarGurus page and decide by hand.
   - `source_unavailable` — the page was blocked or its layout changed; if it is the layout, fix `scripts/refresh/lib/cargurus.mjs` and its test.
   - `no_source` — the vehicle has a used price range but no CarGurus page yet (Lucid Gravity as of Nov 2026). Add the URL to `scripts/refresh/sources.json` once CarGurus publishes one.
   - A vehicle that has gained a real used market — set its first `preowned_range` by hand; the script only scales ranges that already exist.

The same script runs every Monday in GitHub Actions (`.github/workflows/preowned-refresh.yml`) and opens a pull request when something changed. If such a PR is open or was merged recently, this phase will report no change.

### Why CarGurus percentages, not per-trim prices

- **KBB and Edmunds return HTTP 403**, and search-snippet values for them have repeatedly failed sanity checks. Do not write data from a snippet.
- **CarGurus publishes model-year averages only**, with no trim breakdown. Its average is not comparable to a per-trim range, so the script only ever uses the *relative move* of the average, never its level.
- **Each vehicle and model year is measured on its own.** Aggregating across vehicles hid real movement in Aug 2026.

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

**Start from the watch report, not from a blank search.** Run `npm run refresh:watch` (dry run, no LLM). It checks every stored `range_mi` against the EPA vehicle file and checks manufacturer pages for the stored MSRPs. Research only what it lists:

- **Range mismatch** — the stored range is not a figure EPA publishes for that vehicle, model year and drive type. Open the EPA entries, work out which variant the trim is, and correct the row. For three-row rows use the three-row EPA rating where EPA splits by seating (Lucid Gravity). If the stored figure is a legitimate manufacturer estimate for a trim EPA has not rated, say so in the row's `notes` and add the row to `scripts/refresh/accepted.json` with the reason; remove it from that file once EPA rates the trim.
- **Not in EPA file** — nothing to check against yet; leave it.
- **EPA added / changed / removed a variant** — check whether a trim's range, or a new trim, follows from it.
- **Page changed** — a stored MSRP disappeared from the manufacturer page or a new price appeared in its band. Fetch the page and check `msrp` and `destination` for that vehicle.
- **Car and Driver line changed** — the model's headline "MSRP $X–$Y" on caranddriver.com moved, switched from estimated to actual, or rolled to a new model year. It covers the vehicles whose manufacturer sites block scripts (Tesla, Volvo) or print no prices. Treat it as a tip only: confirm on the manufacturer's site before changing `msrp` or `destination`, and never record Car and Driver as the source of a stored price. A roll to a new model year usually means that year's trims need adding (`/add-vehicle`).
- **Starting price differs** (Car and Driver table) — the stored lowest MSRP plus destination for that model year is not what Car and Driver shows. Check `msrp` and `destination` for that vehicle.
- **Stored MSRPs not on page / not watchable / unavailable** — the page does not print those prices or cannot be fetched (Tesla and Volvo block scripts and are not registered). Check `msrp` and `destination` for those vehicles by hand, as before.

Do not re-research `range_mi` for rows the report shows as matching EPA; the script has already recorded their source. The same script runs every Monday in GitHub Actions (`.github/workflows/data-watch.yml`) and opens a PR when something it watches has changed. If one is open, work on that branch: add the data corrections to it and merge the two together.

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

## Sources and the provenance file (Phases 2, 3 and 5)

`lib/ev-data.provenance.json` → `fields` records where a value came from and when it was last checked:

```json
"fields": {
  "Kia EV9, 2026, GT-Line": {
    "msrp": { "source_url": "https://www.kia.com/...", "verified_on": "2026-11-15", "evidence": "GT-Line starting MSRP $71,900" }
  }
}
```

- **Before researching a field, look it up.** Skip it if `verified_on` is within the last 180 days. Exception: `msrp` and `destination` on the two newest model years of each vehicle are checked on every refresh unless the watch report shows the stored price on the manufacturer page with no change. `range_mi` sources are written by the watch script.
- **After checking a field against a page you actually fetched, write or update its entry** — whether the value changed or was confirmed. `evidence` is a short exact quote from the page. Keys are the row `name`; rows that share a name (seat variants) share an entry.
- **No source, no change.** Do not change a value you cannot attach a fetched `source_url` to, and do not record a search-result summary as a source.
- Do not add entries for fields you did not check. The validator rejects entries for unknown rows or fields.

---

## Post-Phase Wrap-Up

After all 5 phases:

1. **OTD values** — no recalculation step. `otd_new`/`otd_preowned` are computed at load in `lib/data.ts` from `msrp`/`destination`/`preowned_range`. Never write `otd_*` fields to `ev-data.json` (the validator errors on stored OTD).

2. **Update count totals** — sum each year column across `count_data` rows, update `count_totals`.

3. **Bump `last_updated`** — set the root-level `last_updated` field in `lib/ev-data.json` to today's date (`YYYY-MM-DD`). This drives the sitemap `lastModified` for SEO.

4. **Review editorial copy** — review the editorial copy at the bottom of `lib/data-stories.ts` (headline, band and threshold constants) and `lib/watchlist.ts` against the refreshed data; update any line the new numbers contradict.

5. **Run validation** via `/project:validate` checks (or `node -e` with the validator).

6. **Present a consolidated changelog:**

```
=== Data Refresh Changelog — YYYY-MM-DD ===

Phase 1 — Pre-owned Pricing: N updates
Phase 2 — TBD Resolution: N fields resolved
Phase 3 — Spec Corrections: N corrections
Phase 4 — New Vehicles: N detected (not auto-added)
Phase 5 — Gap Filling: N fields filled

Post-processing:
  - Count totals updated
  - Validation: X errors, Y warnings

[Full details tables for each phase below]
```

Include the detailed comparison tables from each phase below the summary.

All 5 phases are always listed, even if a phase found 0 changes.

7. **Ask: "Commit these changes?"** (In autonomous mode, changes are already applied to disk — this is the single approval gate.)
   - If approved: create a checkpoint commit with a descriptive message.
   - If rejected: run `git checkout -- lib/ev-data.json` to revert all phase changes.

8. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets. If sync fails, warn the user but do not roll back data changes.

**Error handling:** If a phase fails mid-way (network error, ambiguous data), skip that phase, note the failure in the changelog (e.g., "Phase 3 — Spec Corrections: SKIPPED (network error)"), and continue with remaining phases.

---

## Guardrails

- Never hardcode model/vehicle counts — always derive from the data.
- Protected fields are NEVER overwritten if they already have a confirmed (non-TBD) value: `seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`. Phase 5 may fill these if currently null/empty/TBD.
- The `preowned` and `details` arrays must always stay in sync.
- In interactive mode, present findings for review BEFORE applying changes. In autonomous mode, record findings for the consolidated changelog.
- For brand-new vehicles with no used market, leave `preowned_range` as `"No meaningful used market yet"`.
