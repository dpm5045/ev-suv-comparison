# Mobile Speed Dating Panel Integration

## Problem

On mobile, tapping the ↗ arrow on speed dating result cards navigates away to a standalone vehicle page (`/vehicles/{slug}`). On desktop, the same action opens a `VehicleSummaryPanel` slide-in panel with vehicle overview, trim selector, and full specs — keeping the user on the home page. Mobile should match this behavior.

## Design

### Change 1: Wire mobile ↗ arrow to open VehicleSummaryPanel

**File:** `components/tabs/OverviewTab.tsx`

In the mobile speed dating cards (`.glance-accordion` inside `.cmp-card-view`), the ↗ arrow is currently a `<Link>` to `/vehicles/{slug}`. Replace it with a `<button>` that calls `onVehicleClick(s.vehicle)` — the same prop already passed from Dashboard and already used by the desktop table.

- Change `<Link>` to a `<button>` with `onClick={() => { e.stopPropagation(); onVehicleClick?.(s.vehicle) }}`
- Use `<button>` (not `<span>`) for keyboard accessibility
- Apply the existing `.card-page-link` class; add minimal reset styles (`background: none; border: none; padding: 0`) if the class has `a`-specific selectors
- Keep `e.stopPropagation()` so it doesn't trigger the accordion expand/collapse
- The `onVehicleClick` prop already exists and calls `Dashboard.openSummary(vehicle)`, which opens the `VehicleSummaryPanel` — no plumbing changes needed

**Mobile badge behavior:** The vehicle badge on mobile cards remains inert (tapping the card header expands/collapses the accordion). This is intentional — on mobile the accordion provides a quick-scan experience, and the ↗ arrow is the explicit "go deeper" action. Desktop uses the badge as the primary click target because it has no accordion.

**Retain `next/link` import:** The `Link` import is still used in the desktop table's fallback path (when `onVehicleClick` is undefined). Do not remove it.

### Change 2: Move "Compare all trims" link to bottom of panel

**File:** `components/VehicleSummaryPanel.tsx`

Move the "Compare all trims →" link from the header area (currently right below the vehicle badge) to the bottom of the panel content. Place it after the `selectedTrim && (...)` block but still inside the `vehicle && summary && (...)` block, so it is **always visible** regardless of whether a trim has been selected. This positions it as a natural next step after exploring the vehicle data.

### Standalone vehicle pages

The `/vehicles/[slug]` pages remain in the codebase. They are linked from other surfaces (ComparisonV2Tab mobile cards, DetailPanel "View full page" link, sitemap, search engine indexing) and serve as SEO landing pages. This change only removes the speed dating ↗ arrow as a navigation path to them — all other paths are preserved.

### What stays the same

- Accordion expand/collapse on card body tap — unchanged
- VehicleSummaryPanel content, trim selector, spec sections — unchanged
- Desktop speed dating behavior — unchanged
- Panel slide-in animation, overlay, escape-to-close — all existing behavior

## Scope

Two files modified:
1. `components/tabs/OverviewTab.tsx` — swap `<Link>` to `<button>` with `onClick` on mobile card ↗ arrow
2. `components/VehicleSummaryPanel.tsx` — relocate "Compare all trims →" link from header to bottom
