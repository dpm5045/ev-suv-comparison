# Market Insights Chart Polish — Design Spec

**Date:** 2026-03-21
**Scope:** Visual overhaul of the three Market Insights charts in `components/MarketInsights.tsx`
**Goal:** Maximize clarity, readability, and storytelling across all three charts

---

## 1. Global Changes (all charts)

### Lighter chart background
- Chart card background shifts from `var(--surface)` to `var(--surface2)` (`#1c2230`)
- Inner elements (takeaway boxes, stat cards) shift up to `var(--surface3)` (`#242b3a`)
- Chart.js canvas gets an explicit background fill via plugin: `rgba(255,255,255,0.02)`

### Grid lines
- Bump grid opacity from `rgba(255,255,255,0.04)` to `rgba(255,255,255,0.06)`

### Files affected
- `components/MarketInsights.tsx` — chart options and plugins
- `app/globals.css` — `.mi-chart-card`, `.mi-insights` background values

---

## 2. Growth Chart (Chart 1)

### Per-vehicle stacked bars
- Replace single aggregated blue bar with per-vehicle colored stacked segments
- Data source: `count_data` rows — one Chart.js dataset per `count_data.model`
- `count_data.model` values match `VEHICLE_COLORS` keys (both use the `vehicle` display name)
- Use existing `VEHICLE_COLORS` palette; fall back to `#888888` for any unmatched model
- Each year's bar shows which vehicles contributed trims
- Chart.js `stacked: true` on both x and y scales
- Total count labels remain on top of each stacked bar (custom plugin sums all datasets per index)

### Fix dual-axis labeling
- Rename right y-axis title from `"US EV Sales (k)"` to `"US EV Sales"`
- Tick formatter uses consistent format: `"630k"`, `"1.2M"`, etc. (already correct in `fmtEvSales`)

### Show both legends
- Stop filtering out the bar legend entry
- Bottom legend shows: vehicle color swatches (for stacked bars) + dashed line for "US EV Sales"

### 2026 EV sales projection
- Add projected data point: **1,260k** (source: Cox Automotive 2026 Outlook)
- Implementation: create a **second line dataset** containing only the 2025 actual and 2026 projected values, so it draws a dashed connecting segment from the solid line's last point
- Second dataset style: `borderDash: [3, 3]`, hollow point (`pointBackgroundColor: 'transparent'`, `pointBorderColor: 'rgba(255,160,60,0.9)'`, `pointBorderWidth: 2`)
- Hide second dataset from legend (use `legend.labels.filter`)
- Tooltip for projected point: `"2026 est.: ~1.26M (Cox Automotive)"`
- Tick formatter (`fmtEvSales`) will render 1260 as `"1.3M"` — this is acceptable for axis ticks; the tooltip provides the precise value
- Add a final bullet in the takeaway: `"2026 US EV sales projection (~1.26M) from Cox Automotive 2026 Outlook."`

### Data source
- `us_ev_sales` in `lib/ev-data.json`: set `y2026` to `1260` (thousands)
- Add `us_ev_sales_notes` field: `{ "y2026": "Projected — Cox Automotive 2026 Outlook" }`

---

## 3. Price Range Chart (Chart 2)

### Price labels at bar ends
- Custom Chart.js plugin draws min and max dollar values at each end of every bar
- Format: `"$55k"`, `"$74k"`, etc.
- Font: JetBrains Mono, 10px, color matched to bar border color

### Single-price vehicles
- Remove the `+1500` visual buffer hack
- For single-price vehicles: set `min` and `max` to the same value (zero-width bar) and use the custom bar-end label plugin to draw a single price label at that x position
- Additionally, draw a small diamond marker at the price point via the same custom plugin using `ctx.beginPath()` + diamond path, filled with the vehicle color
- This avoids needing a mixed chart type — the bar simply has zero visual width and the plugin handles rendering

### Reference lines
- Add vertical dashed lines at **$60k** and **$100k**
- Subtle labels: `"Mass Market"` below $60k, `"Luxury"` above $100k
- Line style: `borderDash: [4, 4]`, color `rgba(255,255,255,0.12)`

### Clean x-axis ticks
- Force ticks to round intervals: $50k, $75k, $100k, $125k, $150k, $175k
- Use `stepSize` and `min`/`max` overrides on the x-axis scale

### Alternating row shading
- Custom plugin draws subtle alternating background bands behind every other vehicle row
- Fill: `rgba(255,255,255,0.02)`

### Bar saturation bump
- Increase fill alpha from `0x70` (~44%) to `0x99` (~60%)
- Increase border alpha from `0xcc` to `0xee`

---

## 4. Scatter Chart — Range vs. Price (Chart 3)

### Vertical right-side legend
- Move legend from `position: 'bottom'` to a vertical column on the right
- Use Chart.js `position: 'right'` with vertical stacking
- Each vehicle on its own line with color dot

### Deduplicate to latest year
- For each vehicle, keep only trims from the vehicle's most recent model year in the dataset
- Dedup key: `vehicle` field — all trims from the latest `year` for that vehicle are kept
- This is simpler and more correct than matching on trim names (which may change across years)
- Reduces clutter significantly (e.g., Tesla Model X from ~15 to ~5 points, Rivian R1S from ~23 to ~7)

### Bump point visibility
- Increase fill alpha from `0x25` (15%) to `0x60` (~38%)
- Increase `pointRadius` from `4.5` to `5.5`
- Keep `pointHoverRadius` at `6`

### Quadrant annotations
- Calculate median price and median range across all plotted points
- Implementation: custom Chart.js plugin (consistent with existing `barLabelPlugin` pattern)
- Plugin draws two dashed reference lines (vertical at median price, horizontal at median range) using `ctx` in `beforeDatasetsDraw`
- Plugin draws quadrant labels in `afterDatasetsDraw`
- Label quadrants with subtle text:
  - Top-left: `"High Range, Lower Price"`
  - Top-right: `"High Range, Premium"`
  - Bottom-left: `"Lower Range, Lower Price"`
  - Bottom-right: `"Lower Range, Premium"`
- Text style: 9px, `rgba(255,255,255,0.25)`, italic
- Reference line style: `setLineDash([4, 4])`, color `rgba(255,255,255,0.10)`

### Trend line
- Compute linear regression (least squares) across all scatter points
- Implementation: add a hidden line dataset with two points (regression endpoints at x-min and x-max)
- Dataset config: `pointRadius: 0`, `borderDash: [6, 4]`, `borderColor: 'rgba(255,255,255,0.15)'`, `borderWidth: 1.5`
- Hide from legend via `legend.labels.filter`
- No new dependencies required — uses standard Chart.js line dataset

### Fix takeaway text
- Remove bullet about "cargo-vs-speed tradeoff" (not visible on this chart)
- Replace with observation about the weak correlation the trend line reveals
- Suggested: `"The trend line confirms a weak price-range correlation — the segment's priciest trims don't consistently deliver more range."`

---

## 5. CSS Changes

| Selector | Current | New |
|---|---|---|
| `.mi-chart-card` background | `var(--surface)` | `var(--surface2)` |
| `.mi-insights` background | `var(--surface2)` | `var(--surface3)` |

## 6. Chart.js Config Changes

| Property | Chart | Current | New |
|---|---|---|---|
| Grid opacity | All | `rgba(255,255,255,0.04)` | `rgba(255,255,255,0.06)` |
| Price bar fill alpha | Price Range | `0x70` | `0x99` |
| Price bar border alpha | Price Range | `0xcc` | `0xee` |
| Scatter point fill alpha | Scatter | `0x25` | `0x60` |
| Scatter `pointRadius` | Scatter | `4.5` | `5.5` |

## 7. Dependencies

No new npm packages required. All features use custom Chart.js plugins (consistent with existing `barLabelPlugin` pattern) and standard Chart.js datasets.

---

## 8. Data Changes

| Field | File | Change |
|---|---|---|
| `us_ev_sales.y2026` | `lib/ev-data.json` | Set to `1260` (projected, Cox Automotive) |

---

## 9. Out of Scope

- No changes to the takeaway box component structure
- No changes to stat callout / milestone cards
- No changes to mobile breakpoints (existing responsive behavior preserved)
- No new chart types or additional charts
- Light theme adjustments (follow-up if needed)
