# Homepage Market Insights Section — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Goal:** Add a "Market Insights" section to the homepage (OverviewTab) with three Chart.js-powered visualizations and prescriptive takeaway boxes, giving users a data-driven overview of the 3-row EV market without requiring any interaction.

## Context

The app has a standalone `market-insights.html` page with 5 chart sections built on Chart.js. Three of those charts are well-suited for the homepage:

1. **Market Growth** — stacked bar chart (trims by year/vehicle) with US EV sales overlay line
2. **MSRP Range by Vehicle** — horizontal floating bar chart showing price ranges
3. **Range vs Price** — scatter plot showing whether paying more gets more range

The homepage currently flows: Hero → Speed Dating filters → Stats → Results table → Math Mathing → ExploreTeaser → Watchlist. The new section slots in between ExploreTeaser and Watchlist.

## Placement

Insert the Market Insights section in `OverviewTab.tsx` **after the `</div>` closing `math-explore-row`** (which contains Math Mathing + ExploreTeaser) and **before the Watchlist card**. The section is **always visible** regardless of filter/preference state.

## Dependencies

- `chart.js` (npm package)
- `react-chartjs-2` (React wrapper for Chart.js)
- No other new dependencies

## Component Architecture

### New file: `components/MarketInsights.tsx`

A `'use client'` component that:
- Imports `DATA` from `lib/data.ts` for all data
- Imports Chart.js components from `react-chartjs-2` (`Bar`, `Scatter`, `Line`)
- Registers required Chart.js modules via `Chart.register(...)`
- Computes all chart data at render time from `DATA.details` and `DATA.count_data`
- Renders three chart cards with takeaway boxes

### Integration point: `OverviewTab.tsx`

Import `MarketInsights` and render it:
```tsx
</div> {/* end math-explore-row */}

<MarketInsights />

{/* Watchlist */}
<div className="card watchlist-card">
```

## Data Flow

All data comes from `DATA` (imported from `lib/data.ts`), which reads `lib/ev-data.json`:

- **Market Growth**: `DATA.counts` (count_data array with `model` + `y2021`–`y2026` keys) + `DATA.count_totals` + `us_ev_sales` from the JSON root
- **MSRP Range**: `DATA.details` filtered to latest year per vehicle, min/max `msrp` (numeric only — filter out `"N/A - Not New"` strings)
- **Range vs Price**: `DATA.details` filtered to non-null `msrp` (numeric) and `range_mi`

### Watchlist exclusion

Same filter as the standalone page — exclude vehicles where `year >= 2027` or vehicle is in: `["BMW iX7", "Genesis GV90", "Subaru 3-Row EV", "Toyota Highlander EV", "Tesla Model Y Long (Asia)"]`.

### Null/string handling

When computing aggregates, skip rows where the relevant field is `null`, missing, or not `typeof 'number'`.

## Vehicle Color Palette

Use the desaturated palette from `market-insights.html`:

```typescript
const VEHICLE_COLORS: Record<string, string> = {
  "Kia EV9":               "#6bc490",
  "Hyundai IONIQ 9":       "#6b9fd4",
  "Lucid Gravity":         "#9a8cc8",
  "Rivian R1S":            "#d48a56",
  "Tesla Model X":         "#cf6b6b",
  "Tesla Model Y (3-Row)": "#cf6b6b",
  "Volkswagen ID. Buzz":   "#c8a84e",
  "VinFast VF9":           "#c49340",
  "Volvo EX90":            "#c47a9e",
  "Cadillac Escalade IQ":  "#8a7fba",
  "Cadillac VISTIQ":       "#a98fd4",
  "Mercedes-Benz EQS SUV": "#9a9aaa",
};
```

## Chart Specifications

### Chart 1: Market Growth (Stacked Bar + Line)

Port directly from `market-insights.html` `renderGrowth()`:

- **Type**: Mixed — stacked `bar` with a `line` overlay
- **X-axis**: Model year (2021–2026)
- **Y-axis (left)**: Number of trims (stacked bars, one dataset per vehicle)
- **Y-axis (right)**: US EV sales in thousands (dashed line from `us_ev_sales`)
- **Bar styling**: `backgroundColor: color + '50'`, `borderColor: color + '99'`, `borderWidth: 1`, `borderRadius: 3`
- **Line styling**: `borderColor: 'rgba(255,107,53,0.6)'`, `borderDash: [6, 4]`, hollow points with dark fill
- **Stat callouts above chart**: Models available (first→latest), Trims analyzed, MSRP range, US EV Sales

### Chart 2: MSRP Range by Vehicle (Horizontal Floating Bar)

Port from `renderPrice()` Chart A:

- **Type**: `bar` with `indexAxis: 'y'`
- **Data**: `[min, max]` tuples per vehicle (latest model year, numeric MSRP only)
- **Sorted**: by min price ascending
- **Bar styling**: `backgroundColor: color + '70'`, `borderColor: color + 'cc'`, `borderRadius: 4`, `borderSkipped: false`
- **X-axis**: MSRP formatted as `$XXk`

### Chart 3: Range vs Price (Scatter)

Port from `renderTradeoffs()` Chart A:

- **Type**: `scatter`
- **Data**: One dataset per vehicle, each point is a trim with `{ x: msrp, y: range_mi }`
- **Point styling**: `backgroundColor: color + '25'`, `borderColor: color`, `borderWidth: 1.5`, `pointRadius: 4.5`, hollow ring aesthetic
- **X-axis**: MSRP formatted as `$XXk`
- **Y-axis**: EPA Range (mi)

### Chart.js Global Theming

Apply once via `Chart.defaults`:

```typescript
Chart.defaults.color = '#777790';
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
Chart.defaults.font.family = "'JetBrains Mono', 'SF Mono', monospace";
Chart.defaults.font.size = 11;
// Tooltip: frosted dark glass
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(19,19,25,0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 10;
// Legend: point style circles
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
```

## Takeaway Boxes

Each chart has a takeaway box below it with 3–4 data-driven bullet points. Content is computed dynamically from `DATA` at render time. The takeaway text is ported from the existing `market-insights.html` insight boxes.

### Takeaway styling

```css
.mi-insights {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  margin-top: 0.75rem;
}
```

Uses JetBrains Mono for the "KEY TAKEAWAYS" header, muted body text, `›` bullet prefix.

## Section Layout

```
<div className="market-insights-section">
  <h2 className="section-title">Market Insights</h2>
  <p className="section-subtitle">A data-driven look at the 3-row electric SUV segment</p>

  <div className="mi-chart-card">
    <div className="mi-stat-callouts">...</div>
    <div className="mi-chart-wrap"><Bar ... /></div>
    <div className="mi-insights">...</div>
  </div>

  <div className="mi-chart-card">
    <h3 className="mi-chart-title">MSRP Range by Vehicle</h3>
    <div className="mi-chart-wrap"><Bar ... /></div>
    <div className="mi-insights">...</div>
  </div>

  <div className="mi-chart-card">
    <h3 className="mi-chart-title">Does Paying More Get You More Range?</h3>
    <div className="mi-chart-wrap"><Scatter ... /></div>
    <div className="mi-insights">...</div>
  </div>
</div>
```

## CSS

Add styles to `globals.css` following existing patterns:

- `.market-insights-section` — margin/padding matching other homepage sections
- `.mi-chart-card` — uses existing `var(--surface)` card pattern with border
- `.mi-chart-wrap` — constrains canvas height (400px standard, 540px for MSRP range)
- `.mi-chart-title` — JetBrains Mono, muted color, small size
- `.mi-stat-callouts` — flex row of stat cards (same pattern as standalone page)
- `.mi-insights` — takeaway box with accent left border
- Responsive: charts and stat cards stack on mobile

## Light/Dark Theme

The app supports theme toggling. Chart.js defaults should respect the current theme:
- Read theme from `html[data-theme]` or use the existing CSS variable system
- For v1, hard-code the dark theme values (matching the existing standalone page). Light theme adaptation can follow later since the app defaults to dark.

## Exclusions

- No "Explore full analysis" link (dropped per user feedback)
- No median capability chart — only the three specified charts
- No interactivity beyond Chart.js hover tooltips
- No price segment chart or trade-offs cargo chart
- Light theme support deferred to a follow-up
