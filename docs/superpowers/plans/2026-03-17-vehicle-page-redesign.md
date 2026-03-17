# Vehicle Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stacked trim cards on standalone vehicle pages with a trim comparison table (desktop) + accordion cards with trim picker (mobile).

**Architecture:** The vehicle page (`app/vehicles/[slug]/page.tsx`) is an async server component. The desktop comparison table is static HTML rendered server-side. Mobile accordion behavior requires a new `'use client'` component (`VehicleTrimSection.tsx`) for expand/collapse state and smooth-scroll trim picker. Both views use the existing dual-render CSS pattern (`.cmp-table-view` / `.cmp-card-view`).

**Tech Stack:** Next.js 14, TypeScript, CSS

**Spec:** `docs/superpowers/specs/2026-03-17-vehicle-page-redesign.md`

---

### Task 1: Add CSS Styles for Vehicle Page Redesign

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add trim navigator styles**

Add after the existing `.vehicle-hero-actions` styles (search for the `/* ── Cross-link elements ── */` comment block near the end of the file):

```css
/* ── Vehicle page trim comparison ── */
.trim-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 1rem 0;
}
.trim-nav-pill {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.trim-nav-pill:hover {
  border-color: var(--teal);
  color: var(--teal);
}
/* Desktop pills are non-interactive — suppress hover */
.cmp-table-view .trim-nav-pill {
  cursor: default;
}
.cmp-table-view .trim-nav-pill:hover {
  border-color: var(--border);
  color: var(--text-muted);
}

.trim-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.trim-compare-table thead th {
  background: var(--surface2);
  padding: 10px 14px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  min-width: 140px;
}
.trim-compare-table thead th:first-child {
  min-width: auto;
}
.trim-compare-table tbody td {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: top;
}
.trim-compare-table .compare-section-row td {
  background: var(--surface);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent) !important;
  padding: 10px 14px !important;
}
.trim-compare-table .compare-metric-label {
  color: var(--text-muted) !important;
  font-size: 14px;
}
.trim-compare-table .notes-row td {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
}
```

- [ ] **Step 2: Add mobile trim card accordion styles**

```css
/* Mobile trim accordion cards */
.trim-accordion-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
  overflow: hidden;
}
.trim-accordion-header {
  padding: 16px;
}
.trim-accordion-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}
.trim-accordion-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13px;
  color: var(--text-muted);
}
.trim-accordion-stats span {
  white-space: nowrap;
}
.trim-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: var(--surface2);
  border: none;
  border-top: 1px solid var(--border);
  color: var(--accent);
  font-weight: 600;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
}
.trim-section-toggle .chevron {
  transition: transform 0.2s;
}
.trim-section-toggle.open .chevron {
  transform: rotate(180deg);
}
.trim-section-content {
  display: none;
  padding: 0 16px 12px;
}
.trim-section-content.open {
  display: block;
}
.trim-section-content .detail-row {
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}
.trim-section-content .detail-row:last-child {
  border-bottom: none;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Add CSS styles for vehicle page trim comparison table and accordion"
```

---

### Task 2: Create VehicleTrimSection Client Component

**Files:**
- Create: `components/VehicleTrimSection.tsx`

This component handles two things that need client-side JS: the trim navigator pill clicks (smooth-scroll on mobile) and the mobile accordion expand/collapse state.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'

interface TrimSpec {
  label: string
  value: string
}

interface TrimSection {
  title: string
  rows: TrimSpec[]
}

interface TrimData {
  id: string
  year: number
  trim: string
  msrp: string
  range: string
  hp: string
  seats: string
  notes: string
  sections: TrimSection[]
}

interface Props {
  trims: TrimData[]
}

export default function VehicleTrimSection({ trims }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function scrollToTrim(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {/* Trim navigator pills (visible on mobile only via parent .cmp-card-view) */}
      <div className="trim-nav">
        {trims.map(t => (
          <button
            key={t.id}
            className="trim-nav-pill"
            onClick={() => scrollToTrim(t.id)}
          >
            {t.year} {t.trim}
          </button>
        ))}
      </div>

      {/* Accordion cards */}
      <div className="cmp-cards">
        {trims.map(t => (
          <div key={t.id} id={t.id} className="trim-accordion-card">
            <div className="trim-accordion-header">
              <div className="trim-accordion-title">{t.year} {t.trim}</div>
              <div className="trim-accordion-stats">
                <span>{t.msrp}</span>
                <span>{t.range}</span>
                <span>{t.hp}</span>
                <span>{t.seats}</span>
              </div>
            </div>
            {t.sections.map(sec => {
              const key = `${t.id}-${sec.title}`
              const isOpen = openSections[key] ?? false
              return (
                <div key={sec.title}>
                  <button
                    className={`trim-section-toggle${isOpen ? ' open' : ''}`}
                    onClick={() => toggleSection(key)}
                    aria-expanded={isOpen}
                  >
                    {sec.title}
                    <span className="chevron" aria-hidden="true">▾</span>
                  </button>
                  <div className={`trim-section-content${isOpen ? ' open' : ''}`}>
                    {sec.rows.map(row => (
                      <div key={row.label} className="detail-row">
                        <span className="detail-row-label">{row.label}</span>
                        <span className="detail-row-value">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {t.notes && (
              <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                {t.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds (component is created but not imported yet — tree-shaking will not error).

- [ ] **Step 3: Commit**

```bash
git add components/VehicleTrimSection.tsx
git commit -m "Create VehicleTrimSection client component for mobile accordion"
```

---

### Task 3: Rewrite Vehicle Page with Comparison Table + Mobile Cards

**Files:**
- Modify: `app/vehicles/[slug]/page.tsx`

This is the main task. Replace the trim-by-trim card loop (lines 191–265 in the current file) with:
1. A trim navigator (desktop, static — just pills with no JS needed)
2. A comparison table (desktop, static)
3. The `VehicleTrimSection` client component (mobile)

All wrapped in the dual-render pattern.

- [ ] **Step 1: Add VehicleTrimSection import**

At the top of `app/vehicles/[slug]/page.tsx`, add after the existing imports:

```tsx
import { Fragment } from 'react'
import VehicleTrimSection from '@/components/VehicleTrimSection'
```

Also remove the `SpecSection` import since it will no longer be used on this page:

```tsx
// REMOVE: import SpecSection from '@/components/SpecSection'
```

- [ ] **Step 2: Add a helper function for formatting spec values**

Add this helper function inside the `VehiclePage` component, after the existing variable declarations (after `const towing = ...` around line 80) and before the JSON-LD block:

```tsx
  // Formatting helpers for comparison table
  function fv(val: number | string | null | undefined, unit?: string): string {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'number') return unit ? `${val.toLocaleString()} ${unit}` : val.toLocaleString()
    return val || '—'
  }
  function fm(val: number | string | null | undefined): string {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'number') return `$${val.toLocaleString()}`
    return val || '—'
  }
```

- [ ] **Step 3: Define the spec rows data structure**

Add after the formatting helpers:

```tsx
  // Spec sections for comparison table
  const specSections: { title: string; rows: { label: string; values: string[] }[] }[] = [
    {
      title: 'Key Stats',
      rows: [
        { label: 'MSRP', values: trims.map(r => fm(r.msrp)) },
        { label: 'Pre-Owned Price', values: trims.map(r => r.preowned_range || '—') },
        { label: 'EPA Range', values: trims.map(r => fv(r.range_mi, 'mi')) },
        { label: 'Horsepower', values: trims.map(r => fv(r.hp, 'hp')) },
        { label: 'Battery', values: trims.map(r => fv(r.battery_kwh, 'kWh')) },
        { label: 'Seats', values: trims.map(r => r.seats != null ? String(r.seats) : '—') },
      ],
    },
    {
      title: 'Performance',
      rows: [
        { label: 'Torque', values: trims.map(r => fv(r.torque_lb_ft, 'lb-ft')) },
        { label: '0–60 mph', values: trims.map(r => fv(r.zero_to_60_sec, 'sec')) },
        { label: 'Curb Weight', values: trims.map(r => fv(r.curb_weight_lbs, 'lbs')) },
        { label: 'Towing Capacity', values: trims.map(r => fv(r.towing_lbs, 'lbs')) },
      ],
    },
    {
      title: 'Drivetrain & Charging',
      rows: [
        { label: 'Drivetrain', values: trims.map(r => r.drivetrain || '—') },
        { label: 'Charging Type', values: trims.map(r => r.charging_type || '—') },
        { label: 'DC Fast Charge', values: trims.map(r => fv(r.dc_fast_charge_kw, 'kW')) },
        { label: 'DC 10–80%', values: trims.map(r => fv(r.dc_fast_charge_10_80_min, 'min')) },
        { label: 'Onboard AC', values: trims.map(r => r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—') },
        { label: 'L2 10–80%', values: trims.map(r => r.l2_10_80 ? `${r.l2_10_80} hrs` : '—') },
        { label: 'L2 10–100%', values: trims.map(r => r.l2_10_100 ? `${r.l2_10_100} hrs` : '—') },
      ],
    },
    {
      title: 'Dimensions',
      rows: [
        { label: 'Length', values: trims.map(r => fv(r.length_in, 'in')) },
        { label: 'Width', values: trims.map(r => fv(r.width_in, 'in')) },
        { label: 'Height', values: trims.map(r => fv(r.height_in, 'in')) },
        { label: 'Ground Clearance', values: trims.map(r => fv(r.ground_clearance_in, 'in')) },
        { label: '3rd Row Legroom', values: trims.map(r => fv(r.third_row_legroom_in, 'in')) },
        { label: '3rd Row Headroom', values: trims.map(r => fv(r.third_row_headroom_in, 'in')) },
      ],
    },
    {
      title: 'Technology & Features',
      rows: [
        { label: 'Self Driving', values: trims.map(r => r.self_driving || '—') },
        { label: 'Car Software', values: trims.map(r => r.car_software || '—') },
        { label: 'Main Display', values: trims.map(r => r.main_display || '—') },
        { label: 'Additional Displays', values: trims.map(r => r.additional_displays || '—') },
        { label: 'Audio', values: trims.map(r => r.audio || '—') },
        { label: 'Driver Profiles', values: trims.map(r => r.driver_profiles || '—') },
      ],
    },
    {
      title: 'Cargo & Storage',
      rows: [
        { label: 'Frunk', values: trims.map(r => fv(r.frunk_cu_ft, 'cu ft')) },
        { label: 'Behind 3rd Row', values: trims.map(r => fv(r.cargo_behind_3rd_cu_ft, 'cu ft')) },
        { label: 'Behind 2nd Row', values: trims.map(r => fv(r.cargo_behind_2nd_cu_ft, 'cu ft')) },
        { label: 'Behind 1st Row', values: trims.map(r => fv(r.cargo_behind_1st_cu_ft, 'cu ft')) },
        { label: 'Fold Flat', values: trims.map(r => r.fold_flat || '—') },
        { label: 'Floor Width', values: trims.map(r => fv(r.cargo_floor_width_in, 'in')) },
      ],
    },
  ]

  // Pre-format trim data for the mobile client component
  const trimDataForMobile = trims.map((r, i) => ({
    id: `trim-${i}`,
    year: r.year,
    trim: r.trim,
    msrp: fm(r.msrp),
    range: fv(r.range_mi, 'mi'),
    hp: fv(r.hp, 'hp'),
    seats: r.seats != null ? `${r.seats}-seat` : '—',
    notes: r.notes || '',
    sections: specSections.filter(sec => sec.title !== 'Key Stats').map(sec => ({
      title: sec.title,
      rows: sec.rows.map((row, _) => ({
        label: row.label,
        value: row.values[i],
      })),
    })),
  }))
```

- [ ] **Step 4: Replace the trim card rendering block**

Find and replace the entire block from `{/* Trim-by-trim breakdown */}` through the closing of the last trim card (the block from the `<h2>All Trims</h2>` through the `{r.notes && ...}` closing `</div>`)). This is approximately lines 191–265 in the current file.

Replace with:

```tsx
        {/* Trim comparison section */}
        <h2 className="section-title" style={{ marginTop: '2rem' }}>All Trims</h2>

        {/* Desktop: trim navigator + comparison table */}
        <div className="cmp-table-view">
          <div className="trim-nav">
            {trims.map((t, i) => (
              <span key={i} className="trim-nav-pill">
                {t.year} {t.trim}
              </span>
            ))}
          </div>
          <div className="table-wrap">
            <table className="trim-compare-table">
              <thead>
                <tr>
                  <th className="col-sticky">Spec</th>
                  {trims.map((t, i) => (
                    <th key={i}>{t.year} {t.trim}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specSections.map(sec => (
                  <Fragment key={sec.title}>
                    <tr className="compare-section-row">
                      <td colSpan={trims.length + 1}>{sec.title}</td>
                    </tr>
                    {sec.rows.map(row => (
                      <tr key={row.label}>
                        <td className="col-sticky compare-metric-label">{row.label}</td>
                        {row.values.map((val, j) => (
                          <td key={j}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {trims.some(t => t.notes) && (
                  <>
                    <tr className="compare-section-row">
                      <td colSpan={trims.length + 1}>Notes</td>
                    </tr>
                    {trims.map((t, i) => t.notes ? (
                      <tr key={i} className="notes-row">
                        <td className="col-sticky compare-metric-label">{t.year} {t.trim}</td>
                        <td colSpan={trims.length}>{t.notes}</td>
                      </tr>
                    ) : null)}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: trim navigator + accordion cards */}
        <div className="cmp-card-view">
          <VehicleTrimSection trims={trimDataForMobile} />
        </div>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds. All vehicle pages generate correctly.

- [ ] **Step 6: Commit**

```bash
git add app/vehicles/[slug]/page.tsx
git commit -m "Replace trim cards with comparison table (desktop) + accordion (mobile)"
```

---

### Task 4: Clean Up Unused CSS and Imports

**Files:**
- Modify: `app/globals.css`
- Verify: `app/vehicles/[slug]/page.tsx`

- [ ] **Step 1: Check if `.trim-card` styles are still used elsewhere**

Search the codebase for `trim-card` usage. If only used in the vehicle page (which we just replaced), the old styles can be removed. If used elsewhere, leave them.

Run: `grep -r "trim-card" --include="*.tsx" --include="*.ts" --include="*.css" .`

If only in `globals.css` (definitions) and nowhere in `.tsx` files, remove the old `.trim-card`, `.trim-card-header`, `.trim-card-name` CSS rules from `globals.css`.

- [ ] **Step 2: Verify SpecSection import is removed**

Confirm that `import SpecSection from '@/components/SpecSection'` has been removed from `app/vehicles/[slug]/page.tsx`. The `SpecSection` component itself stays (it's used by `DetailPanel.tsx` and the compare pages).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no unused import warnings.

- [ ] **Step 4: Commit (if changes were made)**

```bash
git add app/globals.css app/vehicles/[slug]/page.tsx
git commit -m "Clean up unused trim-card CSS and SpecSection import"
```

---

### Task 5: Final Build Verification and Smoke Test

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: Build succeeds. All vehicle pages (17+) and comparison pages (130+) generate.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev` and test:

1. **Desktop — comparison table:** Visit `/vehicles/kia-ev9`. Verify:
   - Trim navigator pills show all trim names
   - Comparison table shows spec label column + one column per trim
   - Section headers (Key Stats, Performance, etc.) appear as divider rows
   - Sticky first column works on horizontal scroll (if many trims)
   - Notes row appears at bottom if any trim has notes

2. **Desktop — single-trim vehicle:** Visit a vehicle with only 1 trim. Verify table renders with 2 columns (spec label + 1 trim).

3. **Mobile — accordion cards:** Resize browser to mobile width. Verify:
   - Comparison table is hidden, accordion cards are visible
   - Trim navigator pills appear above cards
   - Each card shows year, trim, MSRP, range, HP, seats in the header
   - All spec sections are collapsed by default
   - Tapping a section header expands/collapses it
   - Multiple sections can be open at once
   - Tapping a trim pill scrolls to that card

4. **SEO check:** View page source. Confirm all spec data appears in the HTML (both table and card markup present in DOM).

5. **Unchanged sections:** Verify hero, quick stats, related comparisons, and Keep Exploring CTAs are unchanged.

- [ ] **Step 3: Commit if any fixes needed**
