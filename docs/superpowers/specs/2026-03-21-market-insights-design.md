# Market Insights — Design Spec

**Date:** 2026-03-21
**Status:** Draft
**Goal:** A standalone, chart-driven page that analyzes the 3-Row EV dataset at the market level — drawing conclusions about the overall segment rather than comparing individual vehicles.

## Context

The app already has:
- **Comparison tab** — filterable table/cards for vehicle-to-vehicle comparison
- **Data Explorer** (`explore.html`) — interactive scatter/bubble plots (Observable Plot) for free-form metric exploration
- **Overview tab** — preference-based rankings and a summary glance table

What's missing: a curated, narrative analysis of the 3-row EV market as a whole — market growth, pricing structure, capability trends, trade-offs, and technology adoption.

## Audience

Primarily car shoppers deciding on a 3-row EV, secondarily EV enthusiasts and industry followers. Insights should be practical ("here's what the market offers at your price point") while also being shareable as blog content.

## Approach: Curated Market Story

A standalone HTML page with 5 sequential chart sections that build a narrative arc. Chart-forward — visualizations with short labels/annotations, minimal prose. Dark theme matching the app aesthetic.

**Tech stack:**
- Standalone HTML (local-only for now; future integration as a "Market Insights" tab)
- Chart.js via CDN for all visualizations
- Data loaded from `lib/ev-data.json`
- Dark theme consistent with existing app/explorer pages

## Global Data Filters

All sections apply these filters unless otherwise noted:

**Watchlist exclusion:** Exclude vehicles not yet available in the US. Filter predicate: exclude any trim where `year >= 2027` OR `vehicle` is in the watchlist set: `["BMW iX7", "Genesis GV90", "Subaru 3-Row EV", "Toyota Highlander EV", "Tesla Model Y Long (Asia)"]`. This applies to both `details` array and `count_data`.

**Year range:** 2021–2026 only (ignore `y2027` and any later keys). The `count_data` objects use `y`-prefixed keys (`y2021`…`y2026`); iterate over only these 6 keys and strip the prefix for display labels.

**Null handling:** When computing averages or aggregates, skip rows where the relevant field is `null` or missing. Do not count nulls toward the denominator.

## Vehicle Color Palette

The canonical vehicle color map (hex values) is defined in `explore.html` as the `VEHICLE_COLORS` object (~line 271). Copy this map into the insights page. The `VEHICLE_CLASSES` map in `data.ts` is CSS class names, not colors — do not use it for Chart.js.

## Sections

### Section 1: Market Growth

**Purpose:** The opening hook — how the 3-row EV segment has exploded.

**Chart: Stacked bar chart**
- X-axis: Model year (2021–2026)
- Y-axis: Number of available trims
- Bars color-coded by vehicle (using vehicle color palette)
- Data source: `count_data` from `ev-data.json` — each object has a `model` field (which matches the `vehicle` field in `details`) and `y`-prefixed year keys (`y2021`…`y2026`)
- Exclude watchlist models from the chart

**Stat callouts** (above chart, all computed dynamically at runtime — never hardcode counts):
- Number of distinct models: count unique `vehicle` values per year, show first year → latest year
- Number of available trims: sum non-watchlist counts from `count_totals` keys `y2021` → `y2026`
- Price range: `min(msrp)` → `max(msrp)` for the earliest vs. latest year in `details`

### Section 2: Price Landscape

**Purpose:** "What does the market look like if you're shopping by budget?"

**Chart A: Horizontal floating bar chart**
- Each vehicle gets a row (horizontal bars via Chart.js `type: 'bar'` with `indexAxis: 'y'`)
- Data specified as `[min, max]` tuples per vehicle — Chart.js floating bar syntax
- Shows which vehicles compete at which price points, where clusters form, and where gaps exist
- Data source: min/max `msrp` per vehicle from `details` array, using latest model year per vehicle for a clean current-state view

**Chart B: Grouped bar chart**
- X-axis: Price segments (Under $60k / $60k–$90k / $90k+)
- Y-axis: Count of trims
- Bars colored by vehicle
- Shows market concentration by price tier and which OEMs occupy each
- These breakpoints are fixed and match the existing Overview tab budget filters

### Section 3: Capability Evolution

**Purpose:** "Things are getting better" — how market capabilities have improved over time.

**Baseline caveat:** In 2021–2022, only Tesla Model X existed in this segment. The "segment average" for those years reflects a single vehicle, not a diverse market. Consider adding a subtle annotation or footnote on the chart noting sample size per year (e.g., "n=6" for 2021, "n=48" for 2026). The chart still tells a valid story — it shows what was available to shoppers in each year — but the early years should be interpreted as "the market's only option" rather than "the market average."

**Chart: Normalized multi-line chart**
- X-axis: Model year (2021–2026)
- Y-axis: % change from 2021 baseline (so all metrics start at 0% and are directly comparable)
- Lines tracking segment average (mean of non-null values) for:
  - EPA range (mi) — higher is better
  - DC fast charge time 10–80% (min) — invert the % so improvement shows as going up (i.e., if charge time drops, the line goes up)
  - Horsepower — higher is better
  - Battery capacity (kWh) — higher is better
- Each line labeled via legend
- Skip null values when computing yearly averages

**Stat callouts**: Headline improvement numbers (e.g., "Average range up X%", "Charge times down Y%") computed dynamically by comparing the 2021 and 2026 averages.

### Section 4: Market Trade-offs

**Purpose:** "What does the market force you to give up?"

**Chart A: Scatter plot — Range vs. MSRP**
- Each dot is a trim, colored by vehicle
- X-axis: MSRP ($)
- Y-axis: EPA range (mi)
- Shows whether paying more gets proportionally more range, or if the correlation is weaker than expected

**Chart B: Scatter plot — Cargo (behind 3rd row) vs. 0–60 time**
- Each dot is a trim, colored by vehicle
- X-axis: 0–60 time (sec)
- Y-axis: Cargo behind 3rd row (cu ft)
- Shows the "practicality vs. performance" trade-off — whether faster vehicles sacrifice interior space

### Section 5: Tech Adoption

**Purpose:** How key technologies have spread across the segment.

**Chart A: Stacked bar chart — Charging standard by year**
- X-axis: Model year (2021–2026)
- Y-axis: Number of trims
- Data source: `charging_type` field from `details`
- **Category mapping** from raw `charging_type` values to display categories:
  - **Native NACS**: `"NACS"`, `"NACS (+CCS adpt)"`, `"NACS (+CCS incl)"`, `"NACS / GB-T"`, `"Tesla (pre-NACS)"`
  - **CCS (with NACS adapter)**: `"CCS (+NACS adpt)"`, `"CCS1 (+NACS adpt)"`
  - **CCS Only**: `"CCS"`, `"CCS1"`
  - **TBD**: `"TBD"`, `"TBD (NACS likely)"` — group as a 4th small category or omit if count is negligible

**Chart B: Stacked bar chart — Self-driving tier by year**
- X-axis: Model year (2021–2026)
- Y-axis: Number of trims
- Stacked segments: Basic L2 / Advanced L2 / L2+ Hands-Free / L2+ Point-to-Point
- Data source: `self_driving_tier` field from `details`
- Trims with `null` self_driving_tier should be excluded

**Chart C: Simple bar chart — Seat configuration**
- X-axis: Vehicle
- Y-axis or grouped bars showing 6-seat vs. 7-seat trim availability
- Current model year only (2026, or latest available per vehicle)

## Page Structure

```
┌─────────────────────────────────────────┐
│  Header: "3-Row EV Market Insights"     │
│  Subtitle / intro line                  │
│  [sticky section nav: anchor links]     │
├─────────────────────────────────────────┤
│  Section 1: Market Growth               │
│  [stat callouts]                        │
│  [stacked bar chart]                    │
├─────────────────────────────────────────┤
│  Section 2: Price Landscape             │
│  [horizontal floating bar chart]        │
│  [grouped bar chart]                    │
├─────────────────────────────────────────┤
│  Section 3: Capability Evolution        │
│  [stat callouts]                        │
│  [normalized multi-line chart]          │
├─────────────────────────────────────────┤
│  Section 4: Market Trade-offs           │
│  [scatter: range vs price]              │
│  [scatter: cargo vs 0-60]              │
├─────────────────────────────────────────┤
│  Section 5: Tech Adoption               │
│  [stacked bar: charging standards]      │
│  [stacked bar: self-driving tiers]      │
│  [bar: seat configs]                    │
└─────────────────────────────────────────┘
```

## Visual Design

- Dark background (#0a0a0f or similar) matching app/explorer aesthetic
- Vehicle colors from `VEHICLE_COLORS` in `explore.html` (~line 271)
- Chart.js dark theme configuration (grid lines, tick colors, tooltip styling)
- Section headers with short descriptive subtitles
- Sticky section navigation with anchor links (5 sections + 8 charts warrant quick navigation)
- Max width ~1100px (matching `explore.html`)
- Responsive — charts stack vertically, readable on both desktop and iPad (min width ~375px)
- No interactivity beyond Chart.js built-in hover tooltips

## Data Dependencies

All data comes from `lib/ev-data.json`:
- `count_data` (objects with `model` field + `y`-prefixed year keys) / `count_totals` → Section 1
- `details` array fields: `msrp`, `range_mi`, `hp`, `battery_kwh`, `dc_fast_charge_10_80_min`, `zero_to_60_sec`, `cargo_behind_3rd_cu_ft`, `charging_type`, `self_driving_tier`, `seats`, `vehicle`, `year` → Sections 2–5
- Vehicle color mapping from `VEHICLE_COLORS` in `explore.html`

## Exclusions

- No watchlist vehicles — filtered per Global Data Filters section above
- No pre-owned pricing analysis in v1 (could be a future addition)
- No interactivity beyond default Chart.js tooltips
- No narrative prose — chart annotations and stat callouts only
- No integration into the Next.js app yet — standalone HTML page

## Future Considerations

- Integration as a "Market Insights" tab in the main app
- Key growth stats could feed into the About page narrative
- Individual chart sections could be extracted for blog post embeds
- Pre-owned market analysis as a potential Section 6
