# Mobile Speed Dating Panel Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the mobile speed dating ↗ arrow to open VehicleSummaryPanel (matching desktop) and move the "Compare all trims" link to the bottom of the panel.

**Architecture:** Two surgical edits — swap a `<Link>` for a `<button>` in OverviewTab's mobile card rendering, and relocate an existing `<Link>` within VehicleSummaryPanel. No new components, no new state, no plumbing changes.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, CSS

**Spec:** `docs/superpowers/specs/2026-03-20-mobile-speed-dating-panel-design.md`

---

### Task 1: Replace mobile ↗ Link with button that opens panel

**Files:**
- Modify: `components/tabs/OverviewTab.tsx:809-816`
- Modify: `app/globals.css:2456-2468` (add button reset to `.card-page-link`)

- [ ] **Step 1: Add button reset styles to `.card-page-link`**

In `app/globals.css`, the `.card-page-link` class is used for both the existing `<a>` elements and will be used for the new `<button>`. Add button reset properties so native button chrome is removed:

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
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
```

The added properties (`background`, `border`, `cursor`, `padding`) are no-ops on `<a>` elements so this is safe for any remaining `<a>` usages of this class.

- [ ] **Step 2: Replace `<Link>` with `<button>` in mobile speed dating cards**

In `components/tabs/OverviewTab.tsx`, find the mobile card ↗ arrow (inside the `.cmp-card-view` block, around line 809):

```tsx
// BEFORE (lines 809-816):
<Link
  href={`/vehicles/${toSlug(s.vehicle)}`}
  className="card-page-link"
  aria-label={`View ${s.vehicle} full page`}
  onClick={(e) => e.stopPropagation()}
>
  <span aria-hidden="true">↗</span>
</Link>
```

Replace with:

```tsx
// AFTER:
<button
  className="card-page-link"
  aria-label={`View ${s.vehicle} details`}
  onClick={(e) => { e.stopPropagation(); onVehicleClick?.(s.vehicle) }}
>
  <span aria-hidden="true">↗</span>
</button>
```

**Do NOT remove the `Link` import** — it is still used elsewhere in the file (desktop table fallback path).

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual test on mobile**

Run: `npm run dev`

1. Open http://localhost:3000 on mobile (or Chrome DevTools mobile emulation)
2. Navigate to Overview tab, scroll to speed dating results
3. Tap a card header → accordion should expand/collapse (unchanged)
4. Tap the ↗ arrow → VehicleSummaryPanel should slide in from the right
5. Verify panel shows vehicle summary, trim selector, and specs
6. Tap overlay or × to close → should return to speed dating view on home page
7. Verify desktop still works: click vehicle badge in speed dating table → same panel opens

- [ ] **Step 5: Commit**

```bash
git add components/tabs/OverviewTab.tsx app/globals.css
git commit -m "feat: wire mobile speed dating arrow to open VehicleSummaryPanel"
```

---

### Task 2: Move "Compare all trims" link to bottom of VehicleSummaryPanel

**Files:**
- Modify: `components/VehicleSummaryPanel.tsx:95-102,179`

- [ ] **Step 1: Remove the link from the header**

In `components/VehicleSummaryPanel.tsx`, remove the `<Link>` from the `vsp-header` div (lines 99-101):

```tsx
// BEFORE (lines 95-102):
<div className="vsp-header">
  <div className="detail-vehicle-name">
    <VehicleBadge vehicle={vehicle} style={{ fontSize: 14, padding: '4px 12px' }} />
  </div>
  <Link href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`} className="vsp-fullpage-link">
    Compare all trims <span aria-hidden="true">→</span>
  </Link>
</div>
```

```tsx
// AFTER:
<div className="vsp-header">
  <div className="detail-vehicle-name">
    <VehicleBadge vehicle={vehicle} style={{ fontSize: 14, padding: '4px 12px' }} />
  </div>
</div>
```

- [ ] **Step 2: Add the link at the bottom of the panel content**

Insert the link after the `selectedTrim && (...)` block (after line 179) but before the closing `</>` of the `vehicle && summary && (...)` block (line 180):

```tsx
            {/* end of selectedTrim block at line 179 */}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`} className="vsp-fullpage-link">
                Compare all trims <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>  {/* end of vehicle && summary block */}
```

This ensures the link is always visible regardless of trim selection state.

- [ ] **Step 3: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Manual test**

1. Open VehicleSummaryPanel (via ↗ arrow on mobile, or badge click on desktop)
2. Verify "Compare all trims →" is NOT in the header area
3. Scroll to bottom — link should be visible below the trim selector (when no trim selected) or below all spec sections (when a trim is selected)
4. Click the link — should navigate to Comparison tab filtered to that vehicle

- [ ] **Step 5: Commit**

```bash
git add components/VehicleSummaryPanel.tsx
git commit -m "feat: move Compare all trims link to bottom of VehicleSummaryPanel"
```
