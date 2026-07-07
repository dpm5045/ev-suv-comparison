# Self-Driving Tier Classification

## Problem

The `self_driving` field in `ev-data.json` is a free-text string containing the OEM's marketing name for their driver-assistance system (e.g., "Tesla Autopilot / Full Self-Driving (optional)"). This makes it impossible to compare self-driving capability across vehicles in the Side-by-Side tab — every value is unique text with no ranking.

## Solution

Add two new structured fields to each vehicle entry and update the Side-by-Side display to show them.

### New data fields


| Field               | Type                                                                          | Description                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `sae_level`         | `2 | 3 | 4 | 5 | null`                                                        | SAE J3016 automation level (official integer values only). Currently all vehicles are 2. Null for TBD vehicles. |
| `self_driving_tier` | `'Basic L2' | 'Advanced L2' | 'L2+ Hands-Free' | 'L2+ Point-to-Point' | null` | Capability tier. Null for TBD.                                                                                  |


The existing `self_driving` field is kept as-is for the OEM system name.

### Tier definitions

1. **Basic L2** (rank 1) — Adaptive cruise control + lane keeping. Driver must keep hands on wheel and eyes on road at all times.
2. **Advanced L2** (rank 2) — Adds automated highway lane changes, on/off-ramp handling, or multi-sensor suites beyond basic. Still hands-on.
3. **L2+ Hands-Free** (rank 3) — Hands-off driving on mapped/geofenced highways. Driver must keep eyes on road.
4. **L2+ Point-to-Point** (rank 4) — City and highway navigation with automated turns, intersections, lane changes. Driver supervises.

### Tier assignments (by vehicle name in data)

Tier is assigned per-trim based on the highest system **included or available as standard** on that trim.


| Vehicle (as in data)                                               | System                        | SAE Level | Tier               |
| ------------------------------------------------------------------ | ----------------------------- | --------- | ------------------ |
| Kia EV9                                                            | HDA 2 / Lane Following Assist | 2         | Basic L2           |
| Hyundai IONIQ 9                                                    | Highway Driving Assist        | 2         | Basic L2           |
| Volvo EX90                                                         | Pilot Assist                  | 2         | Basic L2           |
| Volkswagen ID. Buzz                                                | IQ.DRIVE                      | 2         | Basic L2           |
| Toyota Highlander EV                                               | Safety Sense 4.0              | 2         | Basic L2           |
| Mercedes-Benz EQS SUV                                              | Driver Assistance Pkg         | 2         | Basic L2           |
| VinFast VF 9                                                       | Highway Assist                | 2         | Basic L2           |
| Rivian R1S (trims with `self_driving` = "Driver+ (Gen1 hardware)") | Driver+ Gen1                  | 2         | Advanced L2        |
| Rivian R1S (trims with `self_driving` containing "Autonomy+")      | Autonomy+ capable             | 2         | Advanced L2        |
| Lucid Gravity                                                      | DreamDrive / Pro              | 2         | Advanced L2        |
| Cadillac Escalade IQ                                               | Super Cruise                  | 2         | L2+ Hands-Free     |
| Cadillac VISTIQ                                                    | Super Cruise                  | 2         | L2+ Hands-Free     |
| Tesla Model X                                                      | Autopilot / FSD               | 2         | L2+ Point-to-Point |
| Tesla Model Y (3-Row)                                              | Autopilot / FSD               | 2         | L2+ Point-to-Point |
| BMW iX7                                                            | TBD                           | null      | null               |
| Subaru 3-Row EV                                                    | TBD                           | null      | null               |
| Genesis GV90                                                       | TBD                           | null      | null               |


**Note on Rivian Autonomy+:** The 2025-2026 trims have "Autonomy+ capable hardware" but the software is not yet widely available. These are classified as "Advanced L2" (not "L2+ Point-to-Point") since the tier reflects current active capability, not future potential. This can be upgraded when Autonomy+ software ships broadly.

### Side-by-Side display changes

Replace the single "Self Driving" row in the Technology & Features section with two rows:

1. **Self Driving Tier** — Shows the tier string. Has winner highlighting (higher tier = better). Tier ranking for comparison: Basic L2 (1) < Advanced L2 (2) < L2+ Hands-Free (3) < L2+ Point-to-Point (4).
2. **Self Driving System** — Shows the OEM brand name (existing `self_driving` field). No highlighting, informational only.

### Other display surfaces

The following files also render `self_driving` but will **not** be changed in this initial implementation. They will continue to show the OEM system name only. Adding tier display to these surfaces is a follow-up task.

- `components/DetailPanel.tsx` — slide-in detail sidebar
- `components/VehicleSummaryPanel.tsx` — vehicle summary panel
- `app/vehicles/[slug]/page.tsx` — per-vehicle pages
- `app/compare/[slug]/page.tsx` — head-to-head compare pages

### Files to modify

- `lib/ev-data.json` — Add `sae_level` and `self_driving_tier` to every vehicle entry
- `lib/data.ts` — Add fields to `DetailRow` type (use union type for `self_driving_tier`)
- `components/tabs/SideBySideTab.tsx` — Replace "Self Driving" metric with two new metrics
- `components/tabs/GlossaryTab.tsx` — Add "Self-Driving Levels & Tiers" card as first section
- `lib/ev-data.json` glossary — Add entries explaining the tier hierarchy
- `scripts/lib/data-validator.mjs` — Add new fields to completeness check

### Glossary tab changes

Add a new **"Self-Driving Levels & Tiers"** card as the **first section** in `GlossaryTab.tsx` (before Charging Standards). This card explains the SAE levels and our tier classification system, structured similarly to the Charging Standards card with abbreviation + detail format.

Content:
- SAE Level 0–5 overview (brief, 1-line per level)
- Our 4-tier classification within L2 with descriptions
- Note that all vehicles in our dataset are currently SAE Level 2

Also add glossary entries to `ev-data.json`:

**SAE Level:** SAE J3016 driving automation level (0-5). Level 2 = partial automation where the vehicle controls steering and speed but the driver must supervise at all times.

**Self Driving Tier:** Capability classification within SAE Level 2: Basic L2 (adaptive cruise + lane keep), Advanced L2 (adds lane changes/ramp handling), L2+ Hands-Free (hands-off on mapped highways), L2+ Point-to-Point (city + highway navigation with driver supervision).

### Verification

1. `npm run build` passes
2. Side-by-Side tab shows two self-driving rows with correct tier assignments
3. Tier row highlights the winner (higher tier = green background)
4. System name row has no highlighting
5. All other tabs still render correctly
6. Data validator passes with new fields

