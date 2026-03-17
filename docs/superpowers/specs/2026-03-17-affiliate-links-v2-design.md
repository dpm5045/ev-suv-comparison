# Amazon Affiliate Links V2 — Vehicle Pages & Side-by-Side

**Date:** 2026-03-17
**Status:** Approved
**Depends on:** `2026-03-17-amazon-affiliate-links-design.md` (V1, already implemented)

## Overview

Add Amazon Associates affiliate links to two additional high-traffic locations:
1. **Vehicle pages** (`/vehicles/[slug]`) — "Shop Accessories" CTA in the Keep Exploring section
2. **Side-by-Side tab** — per-vehicle "Shop Accessories" link in each column header

**Approach:** One clean link per vehicle. No conditional adapter logic — just `{vehicle} EV accessories` search on Amazon. Keeps the experience subtle and tasteful.

---

## 1. Vehicle Pages

### Location

Inside the existing "Keep Exploring" section at the bottom of the page (`div.vehicle-cta-section`), alongside the existing "Compare all {vehicle} trims" and "Compare {vehicle} side-by-side" buttons.

### Implementation

Add a third button/link after the two existing CTA buttons:

```tsx
<a
  href={amazonSearchUrl(`${vehicle} EV accessories`)}
  target="_blank"
  rel="noopener noreferrer sponsored"
  className="vehicle-cta-btn affiliate"
>
  <span className="affiliate-link-amazon">Amazon</span> Shop {vehicle} Accessories <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
</a>
```

### Styling

- Uses existing `vehicle-cta-btn` class with an additional `affiliate` modifier
- Visually distinct from internal navigation buttons (muted/secondary styling to differentiate from the site's own CTAs)
- Same border-radius and padding as other CTA buttons for visual consistency

### Disclosure

Add disclosure text below the CTA buttons section:

```tsx
<p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
```

---

## 2. Side-by-Side Tab

### Location

Inside each `sbs-col-header` div, below the vehicle badge and year/trim line. Only shown when a vehicle slot is fully selected (all 4 dropdowns filled, i.e., `row` is not null).

### Implementation

After the `sbs-col-year-trim` span, add:

```tsx
<a
  href={amazonSearchUrl(`${slots[i].vehicle} EV accessories`)}
  target="_blank"
  rel="noopener noreferrer sponsored"
  className="affiliate-link sbs-affiliate-link"
>
  <span className="affiliate-link-amazon">Amazon</span> Shop Accessories <span className="affiliate-link-arrow" aria-hidden="true">↗</span>
</a>
```

This renders one affiliate pill per populated vehicle column (up to 3).

### Disclosure

Add a single disclosure instance after both the desktop table and mobile view (they are siblings in the same fragment, CSS controls which is visible). Place it after the `sbs-mobile-view` closing div:

```tsx
<p className="affiliate-disclosure">{AFFILIATE_DISCLOSURE}</p>
```

---

## 3. Shared Config

Reuses the existing `lib/affiliate.ts` module — only `amazonSearchUrl` and `AFFILIATE_DISCLOSURE` are needed. No new exports required.

---

## 4. Styling

### New CSS

```css
.vehicle-cta-btn.affiliate {
  background: var(--surface2);
  border-color: var(--border);
  color: var(--text-muted);
}
.vehicle-cta-btn.affiliate:hover {
  background: var(--surface3);
  color: var(--text);
}
.sbs-affiliate-link {
  margin-top: 6px;
}
```

All other styles reuse existing `.affiliate-link`, `.affiliate-link-amazon`, `.affiliate-link-arrow`, `.affiliate-disclosure` classes from V1.

### Imports

- `app/vehicles/[slug]/page.tsx` (server component): `import { amazonSearchUrl, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'`
- `components/tabs/SideBySideTab.tsx` (client component): `import { amazonSearchUrl, AFFILIATE_DISCLOSURE } from '@/lib/affiliate'`

---

## 5. What Does NOT Change

- `lib/affiliate.ts` — no new exports needed
- `ev-data.json` — no schema changes
- Existing affiliate placements (GlossaryTab, DetailPanel) — untouched
- URL routing / filter state — unaffected

---

## 6. Files Affected

| File | Change |
|------|--------|
| `app/vehicles/[slug]/page.tsx` | Add Amazon CTA button + disclosure in Keep Exploring section |
| `components/tabs/SideBySideTab.tsx` | Add per-vehicle affiliate pill in column headers + disclosure |
| `app/globals.css` | Add `.vehicle-cta-btn.affiliate` styles |
