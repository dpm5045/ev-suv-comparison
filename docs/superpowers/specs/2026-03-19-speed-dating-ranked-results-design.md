# Speed Dating Ranked Results

## Problem

The Speed Dating Results table sorts vehicles alphabetically, causing Cadillac Escalade IQ to always appear first. Users intuitively read table position as ranking, creating a false impression that the top vehicle is the "winner."

## Solution

Rank-order the Speed Dating Results table based on the user's selected preference priorities. Show explicit rank badges (#1, #2, etc.) so the ordering is clearly intentional and preference-driven.

## Preference Pills

Update the "What Matters Most (pick 2)" section:

**Options (6 total) with programmatic IDs:**
- Range (`range`)
- Storage (`storage`)
- Horsepower (`power`)
- Charging Speed (`charging`)
- Self-Driving (`selfdriving`)
- 6-Seat Options (`sixseat`)

**Priority badges:**
- First selected preference shows `①` badge on the pill (primary — 60% weight), rendered inline to the left of the label text within the pill with a 4px gap
- Second selected preference shows `②` badge (secondary — 40% weight), same placement
- Existing click behavior unchanged: click to select, click again to deselect, third pick bumps the oldest

## Scoring Engine

### Per-vehicle scoring

Group trims by vehicle name before extracting best values (reuse the existing `vehicleSummaries` aggregation pattern). For each vehicle in the filtered set:

1. **Extract best value** — take the best trim-level value for each preference metric:
   - Range: max `range_mi` (higher is better)
   - Horsepower: max `hp` (higher is better)
   - Storage: max `cargo_behind_3rd_cu_ft`, fallback to `cargo_behind_2nd_cu_ft` if all 3rd-row values are 0/null (higher is better)
   - Charging Speed: min `dc_fast_charge_10_80_min` (lower is better)
   - Self-Driving: max `self_driving_tier` ordinal (higher is better)
   - 6-Seat Options: binary filter (not scored — see below)

2. **Normalize to 0–1** — min-max normalization across all vehicles in the filtered set:
   - Higher-is-better metrics: `(value - min) / (max - min)`
   - Lower-is-better metrics (charging): `1 - ((value - min) / (max - min))`
   - Missing/null values: score = 0

3. **Self-Driving tier ordinal mapping:**
   - `null` → 0
   - `Basic L2` → 1
   - `Advanced L2` → 2
   - `L2+ Hands-Free` → 3
   - `L2+ Point-to-Point` → 4

4. **Composite score:**
   - Two prefs selected: `0.6 × pref1_score + 0.4 × pref2_score`
   - One pref selected: `1.0 × pref_score`
   - 6-Seat as a pref: acts as a hard filter (only 6-seat vehicles shown), ranking uses the other pref at 100%. If 6-Seat is the only pref, fall back to alphabetical within the filtered set.
   - No prefs selected: alphabetical sort, no rank badges

5. **Rank assignment** — sort descending by composite score. Assign #1, #2, etc. Ties use dense ranking (1, 1, 2, 3...) for a cleaner look with a small vehicle set.

## UI Changes

### Table subtitle

The "Speed Dating Results" card subtitle dynamically reflects the active preferences:
- `"Ranked by Range (primary) and Storage (secondary)"`
- `"Ranked by Self-Driving"`
- Falls back to existing budget/pre-owned notes when no prefs selected

### Rank badge

- Displayed to the left of the vehicle badge in the first column
- Compact pill: `#1`, `#2`, etc.
- CSS: background `var(--surface3)`, font-size `12px`, padding `2px 8px`, border-radius `10px`, color `var(--text-muted)`, margin-right `8px`
- The sticky column cell uses flex layout to place badge + vehicle badge side by side
- Appears on both desktop table rows and mobile card headers

### Desktop table columns

Replace "Charge Tech" with "DC 10–80%" and "Behind 2nd Row" with "Self-Driving Tier":

| Vehicle | MSRP / Pre-Owned | Range (mi) | HP | Battery (kWh) | DC 10–80% | Self-Driving Tier | Behind 3rd Row (cu ft) |
|---|---|---|---|---|---|---|---|

Note: `vehicleSummaries` computation must be extended to aggregate `dc_fast_charge_10_80_min` (min across trims) and `self_driving_tier` (max ordinal across trims) for display in the table.

### Mobile cards

Same column swap: drop Charge Tech and Behind 2nd Row, add DC 10–80% and Self-Driving Tier.

### Sort order

Both desktop rows and mobile cards render in rank order (descending composite score) instead of alphabetical.

### Self-Driving pill category color

Add CSS for the `selfdriving` data-category:
- Active pill color: `var(--red)` (`#f87171`) — unused among existing preferences
- Insight tile accent: `--stat-color: var(--red)`, `--stat-glow` matching the red theme
- Follows the existing pattern in `globals.css` for `[data-category="range"]`, etc.

## Insight Tiles

### Self-Driving tiles (when Self-Driving pref is selected)

Implement `tilesForSelfDriving(d: Row[], isPreowned: boolean): Tile[]` following the existing generator pattern. Register under key `"selfdriving"` in `TILE_GENERATORS`.

- **Best Self-Driving** — vehicle with the highest tier. Value: tier label. Detail: vehicle name.
- **Best Self-Driving Value** — highest tier at lowest price (MSRP or pre-owned depending on condition). Value: tier label. Detail: vehicle + price.

## Edge Cases

- **All vehicles tie** — all get rank #1 (e.g., all have same range). Unlikely but handled.
- **Single vehicle in filtered set** — gets rank #1.
- **Missing data** — vehicles missing a metric value get score 0 for that metric, pushing them toward the bottom of the ranking.
- **No prefs selected** — alphabetical sort, no rank badges, no ranking subtitle.
- **6-Seat + no other pref** — filter to 6-seat vehicles, alphabetical sort within.

## Files Modified

- `components/tabs/OverviewTab.tsx` — scoring engine, rank badges, updated columns, updated tiles, pill badges, `vehicleSummaries` extended with DC charge time and self-driving tier
- `app/globals.css` — rank badge styling, `selfdriving` category color
- `lib/data.ts` — `self_driving_tier` is already typed on `DetailRow` (no change needed)
