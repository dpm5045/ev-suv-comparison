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
- Implement mutual exclusion via wrapper functions in Dashboard:
  - `openSummary(vehicle)` — sets `summaryVehicle`, clears `detailIdx`
  - `openDetail(idx)` — sets `detailIdx`, clears `summaryVehicle`
  - `closeSummary()` — sets `summaryVehicle` to null
  - `closeDetail()` — sets `detailIdx` to null
- Pass `openSummary` down to `OverviewTab` as a new prop

### OverviewTab changes (desktop only)
- In the Speed Dating desktop table, replace the `<Link>` wrapper on `<VehicleBadge>` with an `onClick` handler that calls `openSummary(vehicleName)`
- Mobile cards keep the existing `<Link>` to standalone pages — no change

### Trim selection within the panel
- Local state in `VehicleSummaryPanel`: `selectedTrimIdx: number | null`
- Dropdown built from `DATA.details.filter(d => d.name === vehicleName)`, showing `${year} ${trim}` labels
- Default: no trim selected (summary only)
- Auto-select when only one trim exists for the vehicle

## VehicleSummaryPanel Component

**Location:** `components/VehicleSummaryPanel.tsx`

**Props:**
```typescript
interface Props {
  vehicle: string | null   // vehicle name, e.g. "Tesla Model X"
  onClose: () => void      // wired to closeSummary() in Dashboard
}
```

**Rendered in Dashboard JSX:** Alongside `DetailPanel`, outside `<main>`, at the same level in the component tree.

**Panel layout (top to bottom):**

1. **Header** — Vehicle name with `<VehicleBadge>`, close button (x) with `aria-label="Close"`, and a "View full page" link to the standalone page via `toSlug()`
2. **Vehicle Summary Section** — Aggregated stats across all trims, computed internally from `DATA.details.filter(d => d.name === vehicle)`:
   - MSRP range (e.g. "$52,990 – $79,990")
   - EPA range (e.g. "269 – 348 mi")
   - Horsepower range (e.g. "670 – 1,020 hp")
   - Battery capacity (e.g. "100 kWh" or "100 – 131 kWh" if varies)
   - Seating configurations (e.g. "6-seat, 7-seat")
   - Drivetrain / charging standard (e.g. "AWD / NACS")
3. **Trim Selector** — Dropdown: "Select a year & trim for detailed specs" with options like "2026 Long Range Plus (6-seat)"
4. **Trim Detail Section** (conditionally rendered when a trim is selected) — Includes these sections, reusing the `SpecSection` component from DetailPanel:
   - Performance (0-60, hp, torque, curb weight, towing)
   - Drivetrain & Charging
   - Dimensions
   - Cargo & Storage
   - Technology & Features
   - Pricing & OTD
   - Notes (if any)
   - **Excludes:** affiliate accessory links (those belong in the Full Monty DetailPanel context)

**Container element:** `<aside>` (matches DetailPanel pattern).

### Keyboard & scroll behavior
- Escape key closes the panel (matching DetailPanel's `useEffect` keydown listener pattern)
- Body scroll behavior matches DetailPanel (no scroll lock — panel and main content scroll independently)

## CSS & Animation

**New classes in `globals.css`:**
- `.vehicle-summary-panel` — mirrors `.detail-panel` positioning and transition (`right: -540px` → `right: 0` on `.open`, `transition: right 0.3s ease` matching DetailPanel)
- Summary stats rendered as a 2-column grid (label/value pairs)
- Trim detail section gets a subtle top border/divider to separate from summary
- Dropdown styled consistently with existing form elements

**Overlay:** `VehicleSummaryPanel` renders its own overlay element internally (same pattern as DetailPanel, which renders its own `<div className="overlay">` — Dashboard does not manage the overlay). Mutual exclusion in Dashboard state ensures both panels' overlays are never `.open` simultaneously.

**Panel width:** 540px (slightly wider than DetailPanel's 520px for summary stats breathing room).

**No changes to existing DetailPanel CSS.** The two panels are fully independent.

## Scope

### In scope
- New `VehicleSummaryPanel` component
- Dashboard state to manage it (mutual exclusion with DetailPanel via wrapper functions)
- OverviewTab desktop click handler swap (`<Link>` → `onClick`)
- New CSS for the panel

### Out of scope
- No changes to DetailPanel
- No changes to mobile behavior (keeps linking to standalone pages)
- No changes to standalone pages
- No changes to Full Monty tab behavior
- No changes to the data layer or `ev-data.json`
