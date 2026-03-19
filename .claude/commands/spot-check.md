Verify the specs and pricing of a specific vehicle against live web sources.

**Vehicle to check:** $ARGUMENTS

## Steps

1. Read `lib/ev-data.json` and filter `details` entries matching the vehicle name (partial match is fine — e.g., "Rivian" matches "Rivian R1S"). If no match, list all vehicle names and ask the user to clarify.

2. For each matching trim, research current specs from approved sources in this priority:
   - **OEM site first** (rivian.com, tesla.com, kia.com, hyundaiusa.com, cadillac.com, mbusa.com, volvocars.com, lucidmotors.com, vw.com, subaru.com, toyota.com)
   - **EPA data**: fueleconomy.gov for range
   - **Automotive reference**: edmunds.com, kbb.com for pricing; evkx.net, evspecifications.com for technical specs
   - **Pre-owned pricing**: kbb.com, cars.com, truecar.com

3. Focus on these high-value fields:
   - `msrp` and `destination`
   - `range_mi`
   - `hp` and `torque_lb_ft`
   - `battery_kwh`
   - `dc_fast_charge_kw`
   - `towing_lbs`
   - `preowned_range` (for vehicles with a used market)
   - `charging_type`
   - `zero_to_60_sec`

4. Present a comparison table:

| Field | Current Value | Researched Value | Source | Status |
|-------|---------------|------------------|--------|--------|

Status values:
- **OK** — matches within tolerance
- **WARNING** — minor discrepancy (MSRP within $500, range within 5 mi, etc.)
- **ERROR** — significant mismatch (MSRP off by >$500, range off by >10 mi, HP off by >10)

5. Ask the user: "Apply corrections?" Only proceed with edits after explicit approval.

6. When applying corrections:
   - Edit `lib/ev-data.json` details entries
   - **Never modify these protected fields**: `seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`
   - If `msrp` or `destination` changed, recalculate `otd_new = (msrp + destination) * 1.06 + 905`
   - If `preowned_range` changed, recalculate `otd_preowned` for both low and high: `price * 1.06 + 905`, format as `"$XX,XXX - $XX,XXX"`. Update both the `details` entry and the matching `preowned` entry.

7. Summarize what was changed.

8. Run `npx tsx scripts/sync-sheet.ts` to push updated data to Google Sheets. If sync fails, warn the user but do not roll back data changes.
