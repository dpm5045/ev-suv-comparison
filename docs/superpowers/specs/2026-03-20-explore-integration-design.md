# Data Explorer Integration — Design Spec

**Date:** 2026-03-20
**Goal:** Integrate the standalone `explore.html` data explorer into the Next.js app as a proper route, add a teaser card on the homepage, and add a footer link.

## Overview

Three changes:
1. New `/explore` route rendering the data explorer as a client-side React component
2. Teaser card alongside the "Math Mathing" section on the homepage linking to `/explore`
3. Footer link to `/explore`

---

## Piece 1: `/explore` Route

### Files
- Create: `app/explore/page.tsx` — server component (metadata, Header, Breadcrumb)
- Create: `components/DataExplorer.tsx` — `'use client'` component with all explorer logic

### `app/explore/page.tsx`

Follows the existing info-page pattern (`/about`, `/privacy`):

```tsx
export const metadata: Metadata = {
  title: '3-Row EV Data Explorer',
  description: 'Interactive scatter plot for comparing specs across 3-row electric vehicles.',
  alternates: { canonical: `${SITE_URL}/explore` },
}

export default function ExplorePage() {
  return (
    <>
      <Header />
      <main className="info-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Data Explorer' },
        ]} />
        <DataExplorer />
      </main>
    </>
  )
}
```

No tab is active in Header since this page isn't a tab — it's a standalone route accessible via link.

### `components/DataExplorer.tsx`

A `'use client'` component that ports the logic from `explore.html`:

- **Data source:** Imports `DATA` from `lib/data.ts` directly (no fetch needed). Uses `DATA.details` array.
- **Libraries:** Install `@observablehq/plot@0.6` and `d3@7` as npm dependencies. Loaded via dynamic `import()` inside `useEffect` — these are browser-only ESM modules, cannot be imported at module level in Next.js.
- **Preprocessing:** Same as `explore.html` — numeric coercion, watchlist filtering, self-driving tier encoding. Done once on mount.
- **State:** React `useState` for: selected vehicles, selected years, selected seats, selected drivetrain, selected range buckets, x-axis field, y-axis field, bubble-size field.
- **Rendering:** On any state change, clear the chart container div and re-render using `Plot.plot()`, appending the SVG to a ref'd DOM node.
- **Styling:** Uses the app's existing CSS variables (`var(--surface)`, `var(--border)`, `var(--text)`, `var(--text-muted)`, `var(--accent)`) so the explorer matches the current theme and respects light/dark mode. Chart-specific styles (`.explorer-*` prefix) added to `globals.css`.
- **Constants:** `VEHICLE_COLORS`, `WATCHLIST`, `SELF_DRIVING_TIERS`, `NUMERIC_FIELDS`, `FIELD_LABELS`, `FIELD_DIRECTION`, `PLOTTABLE_FIELDS`, `TIER_SHORT` — all defined within the component file.
- **Layout:** Same as `explore.html` — title ("3-Row Electric Vehicle Explorer"), two control rows (Filter + Plot), chart area with legend below, footnote. No sidebar.

### Font

The page title uses the app's existing font (`var(--font)` = DM Sans) with the same weight/letter-spacing as other page titles — not the standalone `explore.html` serif font, since it's now part of the app.

---

## Piece 2: Homepage Teaser Card

### Files
- Modify: `components/tabs/OverviewTab.tsx`
- Modify: `app/globals.css`

### Layout Change

The "How Is The Math Mathing?" `.card` currently takes full width. We wrap it alongside a new teaser card:

```
+-- .math-explore-row (grid: 1fr auto) ──────────────+
| .card .math-section          | .card .explore-card  |
| (existing math content)      | [SVG illustration]   |
|                              | "Plot Your Data"     |
|                              | subtitle              |
+──────────────────────────────+──────────────────────+
```

- `.math-explore-row`: `display: grid; grid-template-columns: 1fr 240px; gap: 16px; align-items: stretch;`
- On mobile (max-width 768px): `grid-template-columns: 1fr;` — cards stack vertically.

### Explore Teaser Card

- A `<Link href="/explore">` wrapping the entire card for clickability
- Card class: `.card .explore-card`
- Contains:
  1. **SVG illustration** — a small stylized scatter plot (inline SVG, ~120×100px). Colored dots in four quadrants with dashed crosshair lines, using a subset of the vehicle colors. Purely decorative, not data-driven.
  2. **Title:** "Plot Your Data" — styled as `.card-title`
  3. **Subtitle:** "Visualize any metric, side by side" — styled as `.count-note`
- Hover state: subtle border-color change or slight scale to indicate clickability
- The card vertically centers its content

### SVG Illustration

An inline SVG that evokes the explorer's scatter plot:
- Dark background rectangle with rounded corners
- Dashed horizontal and vertical lines crossing at center (median crosshairs)
- 8–10 small colored circles scattered across quadrants, using colors from `VEHICLE_COLORS` (greens, blues, oranges, reds)
- Subtle italic quadrant labels ("Best Value" in top-left corner, etc.) at low opacity
- No axes, no real data — just a visual hint

---

## Piece 3: Footer Link

### Files
- Modify: `components/Footer.tsx`

Add "Data Explorer" as a link to the Site Links column, after "About":

Add a `<Link href="/explore">Data Explorer</Link>` between the About and Privacy Policy links, following the existing bare `<Link>` pattern (no `<li>` wrapper — the footer uses `<nav className="footer-links">` with direct `<Link>` children).

---

## Out of Scope

- Mobile-optimized explorer layout (desktop-first, same as standalone)
- Persistent filter state (URL params, localStorage)
- Removing `explore.html` (keep it as a standalone dev tool)
- SEO/Open Graph image for `/explore`
