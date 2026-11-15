Research and update pre-owned and/or MSRP pricing for vehicles in the dataset.

**Scope:** $ARGUMENTS
(Accepts a vehicle name like "Rivian R1S", a year like "2024", or "all" for the full dataset)

## Steps

1. Read `lib/ev-data.json`. Filter entries based on the scope argument:
   - If a vehicle name: match all trims of that vehicle
   - If "all": process all vehicles that have pre-owned data (where `preowned_range` is not "No meaningful used market yet")
   - If a year: match all entries for that model year

2. Research current pricing for each in-scope vehicle **individually** — never combine vehicles into one broad query, which averages away per-vehicle movement:
   - **Pre-owned**: run `npm run refresh:preowned` (dry run) and use its report. Do not research used prices by hand; the script fetches CarGurus price trends per vehicle and model year. See Phase 1 in `refresh.md`.
   - **MSRP**: Check the OEM site for current MSRP and destination charge. Only flag MSRP changes if they differ from current data.

3. Present a comparison table for user review — include every vehicle researched, including those that didn't move, so a no-op reads as a measurement rather than a skipped step:

| Vehicle | Model Year | Field | Current | Researched | Move | Source |
|---|---|---|---|---|---|---|

Apply only where the change is significant:
- Pre-owned: whatever the script reports as `repriced` (a 3% or larger move since the last reprice). Apply with `npm run refresh:preowned -- --apply`.
- MSRP: any change

4. **Wait for user approval before making any edits.**

5. Apply approved updates to `lib/ev-data.json`:
   - Pre-owned ranges are written by the script (`details` and `preowned` together); do not hand-edit them
   - Update `msrp` and/or `destination` if changed
   - Do NOT write `otd_new`/`otd_preowned` — OTD is computed at load in `lib/data.ts` from `msrp`/`destination`/`preowned_range` (the validator errors on stored OTD)

6. Report summary: number of entries updated, average direction of price changes.

## Post-Update

After pricing changes are applied and committed:

1. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets.
2. If sync fails, warn the user but do not roll back data changes.

## Important

- The `preowned` array and `details` array must always stay in sync — same `name` field, same `preowned_range` value.
- Never hardcode vehicle or trim counts. Always derive from the data.
- For brand-new vehicles with no used market yet, leave `preowned_range` as `"No meaningful used market yet"`.
