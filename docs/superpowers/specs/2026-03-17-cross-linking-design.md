# Cross-Linking Between Dashboard and Standalone Vehicle Pages

## Problem

The main dashboard and standalone vehicle pages (`/vehicles/[slug]`) are isolated. The dashboard uses a modal sidebar (DetailPanel) for specs but never links to standalone pages. Standalone pages have only a generic "Back to comparison tool" link to `/`. This limits SEO value (no internal link flow) and user navigation (no contextual pathways between the two experiences).

## Solution

Add bidirectional links between the dashboard and standalone vehicle pages across all card/detail surfaces.

---

## Forward Direction: Dashboard → Standalone Pages

### 1. DetailPanel Header Link

- **Location:** Header area of the slide-in DetailPanel, next to the vehicle name/badge
- **Label:** "View full page" with ↗ icon
- **Target:** `/vehicles/[slug]`
- **Styling:** Subtle secondary link; must not compete with the close button
- **Behavior:** Standard `<a>` navigation (leaves the dashboard)

### 2. ComparisonV2Tab Mobile Cards

- **Location:** Next to the vehicle badge in each `.cmp-card`
- **Element:** Small ↗ icon link
- **Target:** `/vehicles/[slug]`
- **Tap target:** Must be visually and spatially distinct from the card's main tap area (which opens DetailPanel)
- **Behavior:** `e.stopPropagation()` to prevent the card click handler from also firing
- **Accessibility:** `aria-label="View {vehicle name} full page"`, icon marked `aria-hidden="true"`

### 3. OverviewTab Speed Dating Cards

- **Location:** Next to the vehicle badge in each Speed Dating result card
- **Element:** Small ↗ icon link (same pattern as ComparisonV2Tab cards)
- **Target:** `/vehicles/[slug]`
- **Behavior:** `e.stopPropagation()` to prevent accordion toggle from firing
- **Accessibility:** Same `aria-label` pattern as ComparisonV2Tab

### 4. SpecSelectTab — Intentionally Excluded

SpecSelectTab shares the same `onRowClick` handler but is a niche power-user surface. Cross-links can be added later if needed but are out of scope for this iteration.

---

## Reverse Direction: Standalone Pages → Dashboard

### 1. Header Area (Compact Links)

- **Location:** In the hero/header section of `/vehicles/[slug]` pages, near the breadcrumb area
- **Links:**
  - "Compare trims" → `/?tab=comparison&vehicle={URL-encoded vehicle name}`
  - "Side-by-side" → `/?tab=sidebyside&v1={URL-encoded vehicle name}`
- **Styling:** Inline text links, secondary style, compact

### 2. Bottom Section (Prominent CTAs)

- **Location:** New section at the bottom of the vehicle page, after all spec content
- **Section heading:** "Keep Exploring" or similar
- **CTAs:**
  - "Compare all {Vehicle} trims" → `/?tab=comparison&vehicle={URL-encoded vehicle name}`
  - "Compare {Vehicle} side-by-side" → `/?tab=sidebyside&v1={URL-encoded vehicle name}`
- **Styling:** Styled CTA buttons, visually prominent

### 3. Replace Generic Back Link

- Remove or replace the existing generic "Back to comparison tool" link to `/`
- The new header and bottom CTAs provide more useful, contextual navigation

---

## Dashboard Changes for Deep Linking

### Side-by-Side Pre-Selection

- `SideBySideTab` already reads `v1` from URL params (its existing scheme uses `v1`, `y1`, `s1`, `t1` for slot 1)
- The reverse link uses `/?tab=sidebyside&v1={vehicle name}` which maps directly to the existing param scheme
- No code changes needed in `SideBySideTab` — it will auto-populate slot 1 from the `v1` param on mount

### Comparison Tab (Already Supported)

- The comparison tab already reads `?vehicle=` from URL params, so deep links from standalone pages will work with no changes needed

---

## Slug Utility

- Use existing `toSlug()` from `lib/slugs.ts` to generate `/vehicles/[slug]` URLs
- Import and use in `DetailPanel`, `ComparisonV2Tab`, and `OverviewTab` components

---

## What Doesn't Change

- DetailPanel open/close behavior (still controlled by `detailIdx` state)
- Mobile card tap behavior (still opens DetailPanel)
- Standalone page content and layout (only adding links, not restructuring)
- No new routes or pages created
- Sitemap configuration (already includes all vehicle pages)

---

## Files to Modify

| File | Change |
|------|--------|
| `components/DetailPanel.tsx` | Add "View full page ↗" link in header |
| `components/tabs/ComparisonV2Tab.tsx` | Add ↗ icon link next to badge in mobile cards |
| `components/tabs/OverviewTab.tsx` | Add ↗ icon link next to badge in Speed Dating cards |
| `app/vehicles/[slug]/page.tsx` | Add header links + bottom CTA section, remove generic back link |
| `components/tabs/SideBySideTab.tsx` | No changes — already reads `v1` from URL params |
| `app/globals.css` | Styles for new link elements and CTA section |
