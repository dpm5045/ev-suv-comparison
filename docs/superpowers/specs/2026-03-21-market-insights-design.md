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

## Sections

### Section 1: Market Growth

**Purpose:** The opening hook — how the 3-row EV segment has exploded.

**Chart: Stacked bar chart**
- X-axis: Model year (2021–2026)
- Y-axis: Number of available trims
- Bars color-coded by vehicle (using existing vehicle color palette)
- Data source: `count_data` / `count_totals` from `ev-data.json`

**Stat callouts** (above chart):
- Number of OEMs in the segment (1 → 10)
- Number of available trims (6 → 48)
- Price range widening ($90k+ only → $45k–$130k+)

### Section 2: Price Landscape

**Purpose:** "What does the market look like if you're shopping by budget?"

**Chart A: Horizontal range chart**
- Each vehicle gets a row
- Horizontal bar spans from lowest-MSRP trim to highest-MSRP trim
- Shows which vehicles compete at which price points, where clusters form, and where gaps exist
- Data source: min/max `msrp` per vehicle from `details` array

**Chart B: Grouped bar chart**
- X-axis: Price segments (Under $60k / $60k–$90k / $90k+)
- Y-axis: Count of trims
- Bars colored by vehicle
- Shows market concentration by price tier and which OEMs occupy each

### Section 3: Capability Evolution

**Purpose:** "Things are getting better" — how market capabilities have improved over time.

**Chart: Normalized multi-line chart**
- X-axis: Model year (2021–2026)
- Y-axis: % improvement from 2021 baseline (so all metrics start at 0% and are directly comparable)
- Lines tracking segment average for:
  - EPA range (mi) — higher is better
  - DC fast charge time 10–80% (min) — inverted so improvement shows as going up
  - Horsepower — higher is better
  - Battery capacity (kWh) — higher is better
- Each line labeled directly or via legend

**Stat callouts**: Headline improvement numbers (e.g., "Average range up X%", "Charge times down Y%") computed dynamically from the data.

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
- X-axis: Model year
- Y-axis: Number of trims
- Stacked segments: Native NACS / CCS with NACS adapter / CCS-only
- Data source: `charging_type` field from `details`

**Chart B: Stacked bar chart — Self-driving tier by year**
- X-axis: Model year
- Y-axis: Number of trims
- Stacked segments: Basic L2 / Advanced L2 / L2+ Hands-Free / L2+ Point-to-Point
- Data source: `self_driving_tier` field from `details`

**Chart C: Simple bar chart — Seat configuration**
- X-axis: Vehicle
- Y-axis or grouped bars showing 6-seat vs. 7-seat trim availability
- Current model year only (2026, or latest available per vehicle)

## Page Structure

```
┌─────────────────────────────────────┐
│  Header: "3-Row EV Market Insights" │
│  Subtitle / intro line              │
├─────────────────────────────────────┤
│  Section 1: Market Growth           │
│  [stat callouts]                    │
│  [stacked bar chart]                │
├─────────────────────────────────────┤
│  Section 2: Price Landscape         │
│  [horizontal range chart]           │
│  [grouped bar chart]                │
├─────────────────────────────────────┤
│  Section 3: Capability Evolution    │
│  [stat callouts]                    │
│  [normalized multi-line chart]      │
├─────────────────────────────────────┤
│  Section 4: Market Trade-offs       │
│  [scatter: range vs price]          │
│  [scatter: cargo vs 0-60]           │
├─────────────────────────────────────┤
│  Section 5: Tech Adoption           │
│  [stacked bar: charging standards]  │
│  [stacked bar: self-driving tiers]  │
│  [bar: seat configs]                │
└─────────────────────────────────────┘
```

## Visual Design

- Dark background (#0a0a0f or similar) matching app/explorer aesthetic
- Vehicle colors from existing `VEHICLE_CLASSES` palette
- Chart.js dark theme configuration (grid lines, tick colors, tooltip styling)
- Section headers with short descriptive subtitles
- Responsive — readable on both desktop and iPad
- No interactivity beyond Chart.js built-in hover tooltips

## Data Dependencies

All data comes from `lib/ev-data.json`:
- `count_data` / `count_totals` → Section 1
- `details` array fields: `msrp`, `range_mi`, `hp`, `battery_kwh`, `dc_fast_charge_10_80_min`, `zero_to_60_sec`, `cargo_behind_3rd_cu_ft`, `charging_type`, `self_driving_tier`, `seats` → Sections 2–5
- Vehicle color mapping from app's existing palette

## Exclusions

- No watchlist vehicles (2027 projections) — only US-available vehicles
- No pre-owned pricing analysis in v1 (could be a future addition)
- No interactivity beyond default Chart.js tooltips
- No narrative prose — chart annotations and stat callouts only
- No integration into the Next.js app yet — standalone HTML page

## Future Considerations

- Integration as a "Market Insights" tab in the main app
- Key growth stats could feed into the About page narrative
- Individual chart sections could be extracted for blog post embeds
- Pre-owned market analysis as a potential Section 6
