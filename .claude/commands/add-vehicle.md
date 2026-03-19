Add a new 3-row electric vehicle to the dataset.

**Vehicle to add:** $ARGUMENTS

## Pre-flight

1. Read `lib/ev-data.json` and `lib/data.ts`. Verify the vehicle does NOT already exist in `details`. If it does, abort and tell the user.

2. Read `app/globals.css` to understand the vehicle CSS class pattern.

## Research

3. Research ALL available trims, years, and seat configurations via WebSearch and WebFetch:
   - **Primary**: The OEM's official website (configurator / specs page)
   - **Secondary**: edmunds.com, kbb.com, caranddriver.com for trim breakdowns
   - **Specs**: evkx.net, evspecifications.com, fueleconomy.gov for detailed technical specs

4. For each trim, gather ALL fields from the `DetailRow` interface in `lib/data.ts`:
   - **Required**: name, vehicle, year, trim, seats, drivetrain, msrp, destination, range_mi, hp, battery_kwh, charging_type
   - **Performance**: torque_lb_ft, zero_to_60_sec, curb_weight_lbs, towing_lbs
   - **Charging**: onboard_ac_kw, l2_10_100, l2_10_80, dc_fast_charge_kw, dc_fast_charge_10_80_min
   - **Dimensions**: length_in, width_in, height_in, ground_clearance_in, third_row_legroom_in, third_row_headroom_in
   - **Cargo**: frunk_cu_ft, cargo_behind_3rd_cu_ft, cargo_behind_2nd_cu_ft, cargo_behind_1st_cu_ft, fold_flat, cargo_floor_width_in
   - **Tech**: self_driving, sae_level, self_driving_tier, car_software, center_display, gauge_cluster, hud, other_displays, audio, driver_profiles
   - **Pricing**: preowned_range (research used market; use "No meaningful used market yet" for unreleased/new vehicles)
   - **Notes**: anything distinctive about the trim

5. The `name` field MUST follow the convention: `"Vehicle Name, YYYY, Trim"` — add `(N-seat)` suffix only when the same trim has multiple seat configurations.

## Present for Review

6. Show the user a summary table of all trims found:

| Trim | Year | Seats | MSRP | Range | HP | Battery | Charging |
|------|------|-------|------|-------|-----|---------|----------|

7. **Wait for user approval before making any edits.** Ask if any trims should be excluded or if data needs correction.

## Apply Changes (4 files)

8. **`lib/ev-data.json`** — Add to these sections:
   - `details` array: One entry per trim with all fields. Use `null` for genuinely unknown values, `"TBD"` for values that should be available but weren't found.
   - `preowned` array: One entry per trim with fields: `name`, `vehicle`, `year`, `trim`, `preowned_range`, `otd_preowned`.
   - `count_data`: Add a new row for this vehicle with year columns (`y2021`–`y2026`). Set count to the number of trims available for each year.
   - `count_totals`: Recalculate all year totals and the grand total by summing the `count_data` rows.

9. **`lib/data.ts`** — Add an entry to `VEHICLE_CLASSES`:
   - Key = the exact vehicle name (e.g., `'BMW iX3'`)
   - Value = CSS class following the `v-{manufacturer}` pattern (e.g., `'v-bmw'`)
   - If the manufacturer already has a class (e.g., `v-cadillac` for Escalade IQ and VISTIQ), reuse it.

10. **`app/globals.css`** — If a NEW CSS class is needed (manufacturer not yet in the stylesheet), add it near the other `.v-*` classes:
    ```css
    .v-manufacturer { background: #XXXXXX; color: #XXXXXX; }
    ```
    Use a dark tinted background with a bright accent color, consistent with the existing dark-theme pattern.

11. **`lib/ev-data.json` glossary** — Add entries ONLY if this vehicle introduces fields not already defined.

## Calculate OTD

12. For each new detail entry:
    - If `msrp` is a number: `otd_new = (msrp + destination) * 1.06 + 905` (round to 2 decimals)
    - If `preowned_range` is parseable: `otd_preowned = "$low_otd - $high_otd"` where each = `price * 1.06 + 905`

## Validate

13. After all edits, run the validation checks:
    - No duplicate names
    - All required fields present
    - OTD values consistent
    - Count totals correct
    - VEHICLE_CLASSES has the new entry
    - `npm run build` succeeds

14. Summarize: number of trims added, files modified, any fields left as TBD.

## Guardrails

- Never hardcode model/vehicle counts — always derive from the data at runtime.
- Never change existing entries — this command only ADDS new data.
- The `name` field must exactly follow the `"Vehicle Name, YYYY, Trim"` convention.
- All numeric fields must be numbers, not strings (except when the value is genuinely "TBD" or "N/A").
