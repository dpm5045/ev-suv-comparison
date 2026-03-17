Research and update watchlist vehicles, then scan for newly announced 3-row EVs.

This skill can be run standalone or as a complement to `/refresh`. It focuses on vehicles not yet available in the US market.

---

## Phase 1: Update Existing Watchlist

1. Read `lib/ev-data.json` and `components/tabs/OverviewTab.tsx`. Extract the `WATCHLIST_VEHICLES` list and their current `details` entries.

2. For each watchlist vehicle, WebSearch OEM sites and auto press for:
   - New spec announcements (range, battery, HP, pricing)
   - Updated availability timeline
   - Trim changes or additions
   - Any cancellation or delay news

3. Present a diff table:

| Vehicle | Field | Current Value | Researched Value | Source |
|---------|-------|---------------|------------------|--------|

Only show rows where something has changed or new info is available.

4. **Ask: "Apply watchlist updates?"** Only proceed after approval.

5. Update `details` entries in `lib/ev-data.json`. Only fill fields that are currently TBD/null — never overwrite confirmed values without explicit approval.

---

## Phase 2: Scan for New 3-Row EVs

1. Get the list of currently tracked vehicles: `[...new Set(data.details.map(r => r.vehicle))]`

2. WebSearch for newly announced 3-row fully-electric SUVs coming to the US market. Check:
   - Major OEMs: BMW, Mercedes, Audi, Ford, GM/Chevrolet, Honda, Nissan, Toyota, Hyundai/Genesis/Kia, Stellantis, VinFast
   - EV startups: Rivian, Lucid, Fisker, Scout, etc.
   - Search terms: "3-row electric SUV 2027 2028 US", "upcoming three-row EV", "new electric SUV announcement"

3. **Only pure BEV — no plug-in hybrids (PHEV).**

4. Cross-reference against existing vehicles. Present any new finds:

| Vehicle | Year | Expected Timeline | Key Specs | Confidence | Source |
|---------|------|-------------------|-----------|------------|--------|

Confidence levels:
- **High**: Official OEM announcement with specs
- **Medium**: Confirmed by OEM but specs incomplete
- **Low**: Rumored or leaked, no official confirmation

Only include vehicles with at least "Medium" confidence.

5. **Ask: "Add any of these to the watchlist?"** If approved:
   - Add skeleton `details` entry to `lib/ev-data.json` (use Subaru 3-Row EV pattern for TBD fields)
   - Add `preowned` entry with `"No meaningful used market yet"`
   - Add `count_data` row with zero counts
   - Update `count_totals`
   - Add to `VEHICLE_CLASSES` in `lib/data.ts` (reuse existing manufacturer class or create new one)
   - Add CSS class in `app/globals.css` if new manufacturer
   - Add vehicle name to `WATCHLIST_VEHICLES` in `components/tabs/OverviewTab.tsx`

---

## Phase 3: Graduation Check

1. For each watchlist vehicle, check if it meets ALL graduation criteria:
   - Available for purchase in the US (on sale at dealerships)
   - Confirmed EPA-rated range (not manufacturer estimate)
   - Official MSRP announced and final
   - At least one trim with complete specs

2. Present graduation candidates:

| Vehicle | Criteria Met | Missing | Recommendation |
|---------|-------------|---------|----------------|

3. If any vehicle is ready to graduate:
   - **Ask: "Graduate [vehicle] from watchlist to main dataset?"**
   - If approved, suggest running `/add-vehicle [name]` for a thorough data fill
   - Remove from `WATCHLIST_VEHICLES` in `OverviewTab.tsx`

---

## Post-Phase Wrap-Up

1. Update `scope` and `count_note` strings in `lib/ev-data.json` if vehicles were added or graduated.

2. Recalculate `count_totals` by summing `count_data` rows.

3. **Run validation** via `/validate`.

4. **Present a changelog summary:**
   - N watchlist specs updated
   - N new vehicles discovered
   - N vehicles graduated to main dataset

5. **Ask: "Commit these changes?"** If yes, create a checkpoint commit.

---

## Guardrails

- Never hardcode model/vehicle counts — always derive from the data.
- Protected fields are NEVER modified: `seats`, `cargo_behind_3rd_cu_ft`, `cargo_behind_2nd_cu_ft`, `cargo_behind_1st_cu_ft`, `fold_flat`, `cargo_floor_width_in`.
- The `preowned` and `details` arrays must always stay in sync.
- Present findings for review BEFORE applying changes in every phase.
- For watchlist vehicles with no used market, keep `preowned_range` as `"No meaningful used market yet"`.
- `WATCHLIST_VEHICLES` in `OverviewTab.tsx` is the single source of truth for which vehicles are on the watchlist.
