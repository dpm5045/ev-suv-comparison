# Speed Dating Vehicle Summary Panel

## Problem

On the desktop version of the Overview tab, clicking a vehicle name in the Speed Dating section navigates to a standalone vehicle page. This whisks users away from the main page, which is counterproductive for "speed dating" — users should be able to quickly click through several vehicles before committing. The standalone pages are meant for SEO, not for users who came through the front door.

## Solution

Replace the standalone page links in the Speed Dating desktop table with a slide-in panel (similar to the Full Monty tab's DetailPanel) that shows a vehicle-level summary with an optional trim drill-down. Mobile behavior stays unchanged (keeps linking to standalone pages).

## Approach

**Approach C — New VehicleSummaryPanel, parallel to DetailPanel.** Create a new independent component alongside the existing DetailPanel. No refactoring of DetailPanel needed. Dashboard manages which panel is open (only one at a time). Minimal CSS duplication.

## Data & State Management

### Dashboard state changes
- Add `summaryVehicle: string | null` state alongside existing `detailIdx`
- When `summaryVehicle` is set, `detailIdx` is cleared (and vice versa) — only one panel open at a time
- Pass `setSummaryVehicle` down to `OverviewTab` as a new prop

### OverviewTab changes (desktop only)
- In the Speed Dating desktop table, replace the `<Link>` wrapper on `<VehicleBadge>` with an `onClick` handler that calls `setSummaryVehicle(vehicleName)`
- Mobile cards keep the existing `<Link>` to standalone pages — no change

### Trim selection within the panel
- Local state in `VehicleSummaryPanel`: `selectedTrimIdx: number | null`
- Dropdown built from `DATA.details.filter(d => d.name === vehicleName)`, showing `${year} ${trim}` labels
- Default: no trim selected (summary only)

## VehicleSummaryPanel Component

**Location:** `components/VehicleSummaryPanel.tsx`

**Props:**
```typescript
interface Props {
  vehicle: string | null   // vehicle name, e.g. "Tesla Model X"
  onClose: () => void
}
```

**Panel layout (top to bottom):**

1. **Header** — Vehicle name with `<VehicleBadge>`, close button (x), and a "View full page" link to the standalone page
2. **Vehicle Summary Section** — Aggregated stats across all trims:
   - MSRP range (min-max across trims)
   - EPA range (min-max)
   - Horsepower range
   - Battery capacity
   - Seating configurations available
   - Drivetrain / charging standard
3. **Trim Selector** — Dropdown: "Select a year & trim for detailed specs" with options like "2026 Long Range Plus (6-seat)"
4. **Trim Detail Section** (conditionally rendered when a trim is selected) — Same spec breakdown as the current DetailPanel: performance, dimensions, cargo, technology, pricing/OTD. Rendered inline below the dropdown; summary stays visible above.

## CSS & Animation

**New classes in `globals.css`:**
- `.vehicle-summary-panel` — mirrors `.detail-panel` positioning and transition (`right: -540px` to `right: 0` on `.open`)
- `.overlay` reused as-is from DetailPanel (Dashboard already renders it; ensure only one overlay active at a time)
- Summary stats rendered as a 2-column grid (label/value pairs)
- Trim detail section gets a subtle top border/divider to separate from summary
- Dropdown styled consistently with existing form elements

**Panel width:** 540px (slightly wider than DetailPanel's 520px for summary stats breathing room)

**No changes to existing DetailPanel CSS.** The two panels are fully independent.

## Scope

### In scope
- New `VehicleSummaryPanel` component
- Dashboard state to manage it (mutual exclusion with DetailPanel)
- OverviewTab desktop click handler swap (`<Link>` to `onClick`)
- New CSS for the panel

### Out of scope
- No changes to DetailPanel
- No changes to mobile behavior (keeps linking to standalone pages)
- No changes to standalone pages
- No changes to Full Monty tab behavior
- No changes to the data layer or `ev-data.json`
