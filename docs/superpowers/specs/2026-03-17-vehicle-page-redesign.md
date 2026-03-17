# Standalone Vehicle Page Redesign

## Problem

The current standalone vehicle pages (`/vehicles/[slug]`) are a long wall of stacked trim cards, each repeating the same 5 spec sections. For vehicles with 8+ trims, this creates massive scroll depth with no way to compare trims against each other, heavy repetition, and no navigation aids.

## Goals

- Serve both quick-scan shoppers and deep researchers
- Enable cross-trim comparison on a single page
- Eliminate repetitive content
- Preserve full SEO indexability (all specs in the DOM)
- Maintain usability on mobile

## Solution

Replace stacked trim cards with a **trim comparison table** on desktop and **accordion cards with a trim picker** on mobile, using the existing dual-render pattern (`cmp-table-view` / `cmp-card-view`).

---

## Page Structure (Top to Bottom)

1. **Hero** — vehicle badge, year range, seat configs, action links (unchanged)
2. **Quick Stats Grid** — MSRP range, EPA range, HP, battery (unchanged)
3. **Trim Navigator** — row of trim name pills/buttons
4. **Trim Comparison Table** (desktop) / **Trim Cards** (mobile) — dual-render
5. **Related Comparisons** — unchanged
6. **Keep Exploring CTAs** — unchanged

---

## Trim Navigator

- A horizontally scrollable row of pill buttons, one per trim
- Label format: "{Year} {Trim}" (e.g., "2025 Wind")
- Styled like the existing insight pills on the Overview tab
- **Desktop behavior:** Decorative/informational — shows available trims at a glance. No scroll-to behavior needed since the table shows all trims.
- **Mobile behavior:** Tapping a pill smooth-scrolls to the corresponding trim card below

---

## Desktop: Trim Comparison Table

### Layout

- **First column (sticky):** Spec labels
- **Remaining columns:** One per trim, header shows "{Year} {Trim}"
- Rows grouped by section with section header divider rows

### Sections & Rows

**Key Stats:**
- MSRP
- Pre-Owned Price
- EPA Range
- Horsepower
- Battery
- Seats

**Performance:**
- Torque
- 0–60 mph
- Curb Weight
- Towing Capacity

**Drivetrain & Charging:**
- Drivetrain
- Charging Type
- DC Fast Charge (kW)
- DC 10–80%
- Onboard AC (kW)
- L2 10–80%
- L2 10–100%

**Dimensions:**
- Length
- Width
- Height
- Ground Clearance
- 3rd Row Legroom
- 3rd Row Headroom

**Technology & Features:**
- Self Driving
- Car Software
- Main Display
- Additional Displays
- Audio
- Driver Profiles

**Cargo & Storage:**
- Frunk
- Behind 3rd Row
- Behind 2nd Row
- Behind 1st Row
- Fold Flat
- Floor Width (Wheel Wells)

**Notes:**
- If a trim has a `notes` field, display it as a full-width row spanning all columns at the bottom of that trim's data (desktop), or as a final section in the card (mobile)

### Styling

- Reuse existing comparison table styles (`.compare-table`, `.compare-section-row`, `.compare-metric-label`)
- First column sticky with `.col-sticky` pattern
- Section header rows use `.compare-section-row` styling (uppercase, accent color)
- Standard `var(--border)` grid lines
- Trim columns get a `min-width` (e.g., 140px) to prevent cramped cells on wide tables

### Edge Cases

- **Single-trim vehicles:** Table renders with just two columns (spec label + one trim). Still useful — shows all specs in a clean layout.
- **Many trims (8+):** Table may exceed viewport width. Horizontal scroll with sticky first column handles this gracefully — same pattern as the comparison tab.

### Formatting

Spec values use the same formatting logic as the current trim cards and DetailPanel: `fmtMoney()` for prices, `fmtNum()` for numeric values with units, dash for missing values. This logic is passed into the client component as pre-formatted data or kept in the server component where the table is rendered statically.

---

## Mobile: Trim Cards with Accordion

### Trim Picker

- Same pill row as the Trim Navigator above
- Tapping a pill smooth-scrolls to the corresponding card
- Uses `scrollIntoView({ behavior: 'smooth', block: 'start' })`

### Card Structure (per trim)

- **Card header (always visible):**
  - Year + Trim name
  - Key stats: MSRP, Range, HP, Seats (compact, one line)
- **5 collapsible sections** (all collapsed by default):
  - Performance
  - Drivetrain & Charging
  - Dimensions
  - Technology & Features
  - Cargo & Storage
- Tap section header to expand/collapse
- Each card gets an `id` attribute for the trim picker scroll target

### Accordion Behavior

- Tap a section header to toggle that section open/closed
- Multiple sections can be open simultaneously
- Same expand/collapse pattern as the Speed Dating accordion cards

---

## Dual-Render Pattern

- Desktop table wrapped in `.cmp-table-view` (hidden on mobile via CSS)
- Mobile cards wrapped in `.cmp-card-view` (hidden on desktop via CSS)
- Both contain the full spec data in the DOM — SEO crawlers see everything regardless of viewport
- This is the same pattern used in `ComparisonV2Tab` and `OverviewTab`

---

## What Changes

| Element | Before | After |
|---------|--------|-------|
| Trim display | Stacked full-spec cards | Comparison table (desktop) + accordion cards (mobile) |
| Cross-trim comparison | Not possible | Side-by-side in table columns |
| Navigation | None | Trim pill navigator |
| Spec visibility | All expanded | Table (desktop), collapsed accordion (mobile) |
| Content in DOM | All | All (unchanged for SEO) |

## What Doesn't Change

- Hero section (badge, year range, seats, action links)
- Quick stats grid
- Related comparisons section
- Keep Exploring CTA section
- URL structure, metadata, JSON-LD schemas
- `generateStaticParams()` and static generation

---

## Server Component Constraint

The vehicle page (`app/vehicles/[slug]/page.tsx`) is an `async` server component using `generateStaticParams()` for static generation. The accordion expand/collapse behavior on mobile requires client-side interactivity. Options:

- Extract the trim cards section into a small `'use client'` component (e.g., `TrimAccordion`) that handles expand/collapse state
- The comparison table (desktop) is fully static — no client JS needed
- The trim navigator pill clicks need client JS for smooth-scroll on mobile — can be part of the same client component

---

## Files to Modify

| File | Change |
|------|--------|
| `app/vehicles/[slug]/page.tsx` | Replace trim card rendering with new table + card dual-render layout; extract client component |
| `components/VehicleTrimSection.tsx` | New client component for trim navigator + mobile accordion cards |
| `app/globals.css` | Styles for trim navigator pills, mobile accordion sections, trim comparison table tweaks |
