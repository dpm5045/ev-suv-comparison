Research and update pre-owned and/or MSRP pricing for vehicles in the dataset.

**Scope:** $ARGUMENTS
(Accepts a vehicle name like "Rivian R1S", a year like "2024", or "all" for the full dataset)

## Steps

1. Read `lib/ev-data.json`. Filter entries based on the scope argument:
   - If a vehicle name: match all trims of that vehicle
   - If "all": process all vehicles that have pre-owned data (where `preowned_range` is not "No meaningful used market yet")
   - If a year: match all entries for that model year

2. Research current pricing via WebSearch for each in-scope vehicle:
   - **Pre-owned**: Search KBB, TrueCar, Cars.com, CarGurus for used market pricing. Look for fair market value ranges, not outlier listings.
   - **MSRP**: Check the OEM site for current MSRP and destination charge. Only flag MSRP changes if they differ from current data.

3. Present a comparison table for user review:

| Vehicle/Trim | Field | Current | Researched | Delta | Source |
|--------------|-------|---------|------------|-------|--------|

Only show rows where the delta is significant:
- Pre-owned: >$2,000 change
- MSRP: any change

4. **Wait for user approval before making any edits.**

5. Apply approved updates to `lib/ev-data.json`:
   - Update `preowned_range` in both the `details` array and the `preowned` array (they must stay in sync)
   - Update `msrp` and/or `destination` if changed
   - Recalculate OTD values for all changed entries:
     - `otd_new = (msrp + destination) * 1.06 + 905` (round to 2 decimal places)
     - `otd_preowned`: parse range, apply `price * 1.06 + 905` to both low and high, format as `"$XX,XXX - $XX,XXX"`

6. Report summary: number of entries updated, average direction of price changes.

## Post-Update

After pricing changes are applied and committed:

1. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets.
2. If sync fails, warn the user but do not roll back data changes.

## Important

- The `preowned` array and `details` array must always stay in sync — same `name` field, same `preowned_range` value.
- Never hardcode vehicle or trim counts. Always derive from the data.
- For brand-new vehicles with no used market yet, leave `preowned_range` as `"No meaningful used market yet"`.
