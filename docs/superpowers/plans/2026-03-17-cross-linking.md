# Cross-Linking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bidirectional links between the dashboard and standalone vehicle pages across all card/detail surfaces.

**Architecture:** Import `toSlug` from `lib/slugs.ts` in dashboard components to generate `/vehicles/[slug]` URLs. Use Next.js `<Link>` for all navigation. On standalone pages, use query params to deep-link back to filtered dashboard tabs. No new routes or components needed.

**Tech Stack:** Next.js 14, TypeScript, CSS

**Spec:** `docs/superpowers/specs/2026-03-17-cross-linking-design.md`

---

### Task 1: Add CSS Styles for Cross-Link Elements

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add styles for the DetailPanel "View full page" link**

Add after existing `.detail-trim` styles:

```css
.detail-fullpage-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--teal);
  text-decoration: none;
  margin-top: 4px;
  opacity: 0.85;
  transition: opacity 0.15s;
}
.detail-fullpage-link:hover {
  opacity: 1;
  text-decoration: underline;
}
```

- [ ] **Step 2: Add styles for the card ↗ icon link**

```css
.card-page-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  color: var(--teal);
  text-decoration: none;
  opacity: 0.7;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.card-page-link:hover {
  opacity: 1;
}
```

- [ ] **Step 3: Add styles for the standalone vehicle page CTAs**

```css
/* Header action links on standalone vehicle pages */
.vehicle-hero-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.vehicle-hero-actions a {
  font-size: 13px;
  color: var(--teal);
  text-decoration: none;
  opacity: 0.85;
  transition: opacity 0.15s;
}
.vehicle-hero-actions a:hover {
  opacity: 1;
  text-decoration: underline;
}

/* Bottom "Keep Exploring" CTA section */
.vehicle-cta-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.vehicle-cta-section h2 {
  font-size: 1.1rem;
  margin-bottom: 12px;
}
.vehicle-cta-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.vehicle-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--bg);
  background: var(--teal);
  border-radius: 8px;
  text-decoration: none;
  transition: opacity 0.15s;
}
.vehicle-cta-btn:hover {
  opacity: 0.9;
}
.vehicle-cta-btn.secondary {
  background: transparent;
  color: var(--teal);
  border: 1px solid var(--teal);
}
.vehicle-cta-btn.secondary:hover {
  background: var(--teal);
  color: var(--bg);
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "Add CSS styles for cross-link elements"
```

---

### Task 2: Add "View Full Page" Link to DetailPanel

**Files:**
- Modify: `components/DetailPanel.tsx`

- [ ] **Step 1: Add import for Link and toSlug**

At the top of `DetailPanel.tsx`, add:

```typescript
import Link from 'next/link'
import { toSlug } from '@/lib/slugs'
```

- [ ] **Step 2: Add the link after the vehicle badge**

In the JSX, after the `<div className="detail-vehicle-name">` block (line 35-37) and the `<div className="detail-trim">` (line 38), add:

```tsx
<Link
  href={`/vehicles/${toSlug(r.vehicle)}`}
  className="detail-fullpage-link"
>
  View full page <span aria-hidden="true">↗</span>
</Link>
```

This goes right after the existing `<div className="detail-trim">` line, before the `<div className="detail-grid">`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/DetailPanel.tsx
git commit -m "Add 'View full page' link to DetailPanel header"
```

---

### Task 3: Add ↗ Icon Links to ComparisonV2Tab Mobile Cards

**Files:**
- Modify: `components/tabs/ComparisonV2Tab.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports at the top:

```typescript
import Link from 'next/link'
import { toSlug } from '@/lib/slugs'
```

- [ ] **Step 2: Add icon link next to vehicle badge in mobile cards**

In the mobile card section (around line 496-500), modify the `.cmp-card-header` content. Change from:

```tsx
<div className="cmp-card-header">
  <VehicleBadge vehicle={r.vehicle} />
  <span className="cmp-card-tap-hint">Tap for full specs →</span>
</div>
```

To:

```tsx
<div className="cmp-card-header">
  <VehicleBadge vehicle={r.vehicle} />
  <Link
    href={`/vehicles/${toSlug(r.vehicle)}`}
    className="card-page-link"
    aria-label={`View ${r.vehicle} full page`}
    onClick={(e) => e.stopPropagation()}
  >
    <span aria-hidden="true">↗</span>
  </Link>
  <span className="cmp-card-tap-hint">Tap for full specs →</span>
</div>
```

The `e.stopPropagation()` prevents the card's `onClick` handler from firing (which would open the DetailPanel).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/tabs/ComparisonV2Tab.tsx
git commit -m "Add vehicle page link to ComparisonV2Tab mobile cards"
```

---

### Task 4: Add ↗ Icon Links to OverviewTab Speed Dating Cards

**Files:**
- Modify: `components/tabs/OverviewTab.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports at the top:

```typescript
import Link from 'next/link'
import { toSlug } from '@/lib/slugs'
```

- [ ] **Step 2: Add icon link next to vehicle badge in Speed Dating mobile cards**

In the mobile card section (around line 548-551), modify the `.cmp-card-header` content inside the accordion. Change from:

```tsx
<div className="cmp-card-header" onClick={() => setExpandedVehicle(expanded ? null : s.vehicle)}>
  <VehicleBadge vehicle={s.vehicle} />
  <span className="accordion-chevron" />
</div>
```

To:

```tsx
<div className="cmp-card-header" onClick={() => setExpandedVehicle(expanded ? null : s.vehicle)}>
  <VehicleBadge vehicle={s.vehicle} />
  <Link
    href={`/vehicles/${toSlug(s.vehicle)}`}
    className="card-page-link"
    aria-label={`View ${s.vehicle} full page`}
    onClick={(e) => e.stopPropagation()}
  >
    <span aria-hidden="true">↗</span>
  </Link>
  <span className="accordion-chevron" />
</div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "Add vehicle page link to OverviewTab Speed Dating cards"
```

---

### Task 5: Update Standalone Vehicle Page with Reverse Links

**Files:**
- Modify: `app/vehicles/[slug]/page.tsx`

- [ ] **Step 1: Add compact links in the hero area**

After the `<p className="vehicle-hero-sub">` line (line 152), add:

```tsx
<div className="vehicle-hero-actions">
  <Link href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`}>
    Compare trims →
  </Link>
  <Link href={`/?tab=sidebyside&v1=${encodeURIComponent(vehicle)}`}>
    Side-by-side →
  </Link>
</div>
```

- [ ] **Step 2: Replace the generic back link with a "Keep Exploring" CTA section**

Replace the existing back link block (lines 278-280):

```tsx
<div style={{ marginTop: '2rem' }}>
  <Link href="/" className="back-link">&larr; Back to comparison tool</Link>
</div>
```

With:

```tsx
<div className="vehicle-cta-section">
  <h2>Keep Exploring</h2>
  <div className="vehicle-cta-buttons">
    <Link
      href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`}
      className="vehicle-cta-btn"
    >
      Compare all {vehicle} trims
    </Link>
    <Link
      href={`/?tab=sidebyside&v1=${encodeURIComponent(vehicle)}`}
      className="vehicle-cta-btn secondary"
    >
      Compare {vehicle} side-by-side
    </Link>
  </div>
</div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Visual verification**

Run: `npm run dev`
Then verify in browser:
- Open a vehicle page (e.g., `/vehicles/kia-ev9`)
- Confirm hero area shows "Compare trims →" and "Side-by-side →" links
- Confirm bottom shows "Keep Exploring" section with two CTA buttons
- Click "Compare trims" → should land on `/?tab=comparison&vehicle=Kia%20EV9`
- Click "Side-by-side" → should land on `/?tab=sidebyside&v1=Kia%20EV9`

- [ ] **Step 5: Commit**

```bash
git add app/vehicles/[slug]/page.tsx
git commit -m "Add contextual dashboard links to standalone vehicle pages"
```

---

### Task 6: Final Build Verification

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings related to cross-linking changes.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev` and test these flows:
1. **DetailPanel link:** Click a row in Comparison tab → DetailPanel opens → "View full page ↗" link visible → click navigates to `/vehicles/[slug]`
2. **Mobile card link:** On mobile viewport, ↗ icon visible next to badge on Comparison cards → click navigates to vehicle page without opening DetailPanel
3. **Overview card link:** On mobile viewport, ↗ icon visible next to badge on Speed Dating cards → click navigates to vehicle page without toggling accordion
4. **Reverse: Compare trims:** On a vehicle page, click "Compare trims" in hero → lands on dashboard with comparison tab filtered to that vehicle
5. **Reverse: Side-by-side:** On a vehicle page, click "Side-by-side" in hero → lands on dashboard with side-by-side tab, vehicle pre-selected in slot 1
6. **Reverse: Bottom CTAs:** Same as 4 and 5 but from the bottom "Keep Exploring" section

- [ ] **Step 3: Final commit (if any fixes needed)**

Only if adjustments were made during smoke testing.
