# EV Data Explorer — Design Spec

**Date:** 2026-03-20
**Goal:** A local HTML-based data exploration tool for discovering insights in the 3-row EV dataset, starting with value analysis and expanding across all data dimensions.

## Overview

A single `explore.html` file at the repo root. Opens in any browser with no build step, no dependencies to install, and no accounts to create. Loads Observable Plot and D3 from CDN, fetches `lib/ev-data.json` via relative path, and renders interactive charts into a scrollable dark-themed page.

Desktop-first. Not intended for public deployment (yet) — this is a personal exploration tool.

## File Structure

```
ev-app/
  explore.html          <-- the entire tool (single file)
  lib/ev-data.json      <-- existing data (fetched at runtime)
```

No new dependencies, no build changes, no impact on the Next.js app.

## Data Loading & Preprocessing

On page load, `explore.html` fetches `lib/ev-data.json` and preprocesses the `details` array:

1. **Coerce numeric fields** — fields like `msrp`, `range_mi`, `hp`, `battery_kwh`, etc. that may contain strings (e.g., "TBD", "N/A") are coerced to numbers; non-numeric values become `null`.
2. **Filter out watchlist-only vehicles** — vehicles where most specs are TBD/null (e.g., Subaru 3-Row EV, BMW iX7, Genesis GV90) are excluded from charts to avoid noise. A `WATCHLIST` array defines which vehicles to skip.
3. **Encode self-driving tiers** — the `self_driving_tier` string field is mapped to a numeric `self_driving_score`:

| Tier                  | Numeric | Rationale                                      |
|-----------------------|---------|-------------------------------------------------|
| Basic L2              | 2.1     | Baseline lane-keeping + ACC                     |
| Advanced L2           | 2.2     | More situational awareness features             |
| L2+ Hands-Free        | 2.3     | Hands-off highway driving (BlueCruise, etc.)    |
| L2+ Point-to-Point    | 2.4     | Full route navigation under supervision (FSD)   |

## Page Layout

```
+--sidebar--+--main content-----------------------------------+
| Nav        | [Global Filters: Vehicle ▼  Year ▼]            |
| - Value    |                                                 |
| - Market   | Section 1: Value Analysis                       |
| - Size     |   Chart 1.1 ...                                 |
| - Charging |   Chart 1.2 ...                                 |
|            |   ...                                           |
|            | Section 2: Market Evolution                     |
|            |   ...                                           |
+------------+-------------------------------------------------+
```

- **Sticky sidebar nav** (left) with links to each section.
- **Global filters** (top of main content, sticky) — vehicle multi-select and year dropdown.
- **Main content** — single scrollable column of chart sections.

## Visual Design

- **Dark theme:** dark background (~`#1a1a2e`), light text and gridlines.
- **Vehicle colors:** a consistent color per vehicle across all charts, derived from the existing CSS vehicle classes (`.v-kia`, `.v-tesla`, etc.) in `globals.css`.
- **Typography:** system font stack. Chart titles are brief and descriptive. Each chart gets a one-line insight caption below.
- **Layout:** each chart section has a heading, the chart, and a caption. Charts auto-resize to viewport width.

## Interactivity

### Global Controls
- **Vehicle filter** — multi-select dropdown. Defaults to all vehicles. Selecting specific vehicles highlights them across all charts simultaneously.
- **Year filter** — dropdown: All Years, or a specific year. Filters data across all charts.

### Per-Chart Behavior
- **Tooltips** — hover any dot/bar to see trim name, vehicle, year, and the exact values for that chart's axes.
- **Responsive width** — charts resize to fit the viewport (desktop-optimized, no mobile-specific layout).

## Chart Sections

### Section 1: Value Analysis (Price vs. What You Get)

**Chart 1.1 — MSRP vs. Range**
- Type: Scatter plot
- X-axis: MSRP ($)
- Y-axis: Range (miles)
- Dot color: Vehicle
- Dot size: Battery kWh
- Insight: Who gives you the most miles per dollar?

**Chart 1.2 — MSRP vs. Horsepower**
- Type: Scatter plot
- X-axis: MSRP ($)
- Y-axis: Horsepower
- Dot color: Vehicle
- Insight: Performance per dollar across the segment.

**Chart 1.3 — MSRP vs. Cargo (behind 2nd row)**
- Type: Scatter plot
- X-axis: MSRP ($)
- Y-axis: Cargo behind 2nd row (cu ft)
- Dot color: Vehicle
- Insight: Practicality per dollar.

**Chart 1.4 — MSRP vs. Self-Driving Tier**
- Type: Scatter plot
- X-axis: MSRP ($)
- Y-axis: Self-driving tier (numeric 2.1–2.4, with tier labels on axis)
- Dot color: Vehicle
- Insight: Does paying more get you better autonomy, or do some vehicles punch above their price class?

**Chart 1.5 — OTD New Price Spread by Vehicle**
- Type: Dot plot (strip plot)
- X-axis: OTD New price ($)
- Y-axis: Vehicle (categorical)
- Each dot is a trim
- Insight: Which models span a wide price range vs. are tightly clustered?

### Section 2: Market Evolution

**Chart 2.1 — Average MSRP by Vehicle Over Model Years**
- Type: Line chart
- X-axis: Model year
- Y-axis: Average MSRP ($)
- Lines: One per vehicle, colored by vehicle
- Insight: Who's getting cheaper? Who's climbing?

**Chart 2.2 — Range Improvement (Earliest vs. Latest Year)**
- Type: Slope chart
- Left anchor: Vehicle's earliest model year average range
- Right anchor: Vehicle's latest model year average range
- Lines: Colored by vehicle
- Insight: Which models have gained the most range over time?

### Section 3: Size & Practicality

**Chart 3.1 — Curb Weight vs. Range**
- Type: Scatter plot
- X-axis: Curb weight (lbs)
- Y-axis: Range (miles)
- Dot color: Vehicle
- Insight: Does heavier = worse range, or do bigger batteries compensate?

**Chart 3.2 — Cargo Behind 3rd Row by Vehicle**
- Type: Bar chart
- X-axis: Vehicle (categorical, sorted by cargo)
- Y-axis: Cargo behind 3rd row (cu ft)
- Bars grouped by trim if multiple values per vehicle
- Insight: How usable is that third row in practice?

**Chart 3.3 — Length vs. Third-Row Legroom**
- Type: Scatter plot
- X-axis: Overall length (inches)
- Y-axis: Third-row legroom (inches)
- Dot color: Vehicle
- Insight: Are bigger vehicles actually giving you more third-row space?

### Section 4: Charging & Efficiency

**Chart 4.1 — Battery kWh vs. DC Fast Charge Speed**
- Type: Scatter plot
- X-axis: Battery capacity (kWh)
- Y-axis: DC fast charge peak (kW)
- Dot color: Vehicle
- Insight: Who charges fastest relative to battery size?

**Chart 4.2 — DC Fast Charge 10–80% Time by Vehicle**
- Type: Bar chart
- X-axis: Vehicle (categorical, sorted by charge time)
- Y-axis: 10–80% charge time (minutes)
- Bars grouped by trim
- Insight: The real-world question — how long am I waiting?

## Technology

- **Observable Plot** (via CDN) — high-level, declarative chart library. Handles bindable axes, color scales, tooltips.
- **D3** (via CDN) — used only for data manipulation (scales, parsing) where Observable Plot doesn't cover it.
- **No build step** — pure HTML + ES modules from CDN.
- **No framework** — vanilla JS in `<script type="module">` blocks.

## Out of Scope

- Mobile-optimized layouts
- Public deployment / hosting
- Integration with the Next.js app
- Data editing or write-back
- Persistent filter state (URL params, localStorage)
