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
   - **Required**: name, id, vehicle, year, trim, seats, drivetrain, availability, msrp_status, msrp (number or null), destination, range_mi, range_basis, hp, battery_kwh, charging_type
   - **`id`**: `<vehicle>-<year>-<trim>` lowercased, every run of non-alphanumerics replaced by `-` (`+` reads "plus", `&` "and"); append `-<seats>s` only when another row would get the same id. Assigned once, never changed (`scripts/migrations/2026-11-ids-availability.mjs` has the `slug`/`assignIds` helpers).
   - **`availability`**: `needs_review` for a new row (the owner resolves it to `new`, `used_only` or `announced`); `announced` for a Watch List vehicle. `msrp_status` follows: `current` (or `announced`) with a price, `unknown` without one.
   - **`range_basis`**: `unverified` for a range, `manufacturer_estimate` if the row is added to `scripts/refresh/accepted.json` (keyed by `id`), `null` with no range
   - **Performance**: torque_lb_ft, zero_to_60_sec, curb_weight_lbs, towing_lbs
   - **Charging**: onboard_ac_kw, l2_10_100, l2_10_80, dc_fast_charge_kw, dc_fast_charge_10_80_min
   - **Dimensions**: length_in, width_in, height_in, ground_clearance_in, third_row_legroom_in, third_row_headroom_in
   - **Cargo**: frunk_cu_ft, cargo_behind_3rd_cu_ft, cargo_behind_2nd_cu_ft, cargo_behind_1st_cu_ft, fold_flat, cargo_floor_width_in
   - **Tech**: self_driving, sae_level, self_driving_tier, car_software, center_display, gauge_cluster, hud, other_displays, audio, driver_profiles
   - **Driver-assist hardware**: adas_hardware, adas_hardware_gen, adas_hardware_note — set only where the hardware generation changes capability (see refresh.md Phase 5); otherwise null. Copied rows of a new model year usually keep the previous year's values; a new generation means the older rows become `previous`.
   - **Pricing**: preowned_range (research used market; use "No used market yet" for unreleased/new vehicles)
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
   - Never store `otd_new`/`otd_preowned`: they are computed at load in `lib/data.ts`. (There is no separate `preowned` array any more; each row's `preowned_range` is the used price.)
   - `count_data`: Add a new row for this vehicle with year columns (`y2021`–`y2026`). Set count to the number of trims available for each year.
   - `count_totals`: Recalculate all year totals and the grand total by summing the `count_data` rows.

9. **`lib/vehicle-theme.ts`** — Add an entry to `VEHICLE_CLASSES`:
   - Key = the exact vehicle name (e.g., `'BMW iX3'`)
   - Value = CSS class following the `v-{manufacturer}` pattern (e.g., `'v-bmw'`)
   - If the manufacturer already has a class (e.g., `v-cadillac` for Escalade IQ and VISTIQ), reuse it.
   - If the class is NEW, also add a `CLASS_THEMES` entry (badge bg/fg + chart hex for dark and light themes).

10. **`app/globals.css`** — If a NEW CSS class was added, add matching `.v-manufacturer` badge styles near the other `.v-*` classes. Colors must match the `CLASS_THEMES` entry for both themes.

11. **`lib/ev-data.json` glossary** — Add entries ONLY if this vehicle introduces fields not already defined.

## Validate

12. After all edits, run `npm run validate` (checks required fields, duplicate names, no stored OTD, count totals), confirm `VEHICLE_CLASSES` has the new entry, and verify `npm run build` succeeds. OTD prices need no manual step — they are computed at load from `msrp`/`destination`/`preowned_range`.

13. Summarize: number of trims added, files modified, any fields left as TBD.

## Post-Add

After the new vehicle is added and committed:

1. Run `/sync-sheet` to refresh the backup Claude Sheet. It needs the Claude Docs connector; if that isn't available, skip it (the data in git is the source of truth).
2. If sync fails, warn the user but do not roll back data changes.

## Guardrails

- Never hardcode model/vehicle counts — always derive from the data at runtime.
- Never change existing entries — this command only ADDS new data.
- The `name` field must exactly follow the `"Vehicle Name, YYYY, Trim"` convention.
- All numeric fields must be numbers, not strings (except when the value is genuinely "TBD" or "N/A").
