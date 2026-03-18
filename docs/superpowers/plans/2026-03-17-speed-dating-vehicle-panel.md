# Speed Dating Vehicle Summary Panel — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace standalone-page links in the Speed Dating desktop table with a slide-in vehicle summary panel that keeps users on the main page.

**Architecture:** New `VehicleSummaryPanel` component rendered alongside the existing `DetailPanel` in Dashboard. Dashboard manages mutual exclusion via wrapper functions — only one panel open at a time. OverviewTab's desktop Speed Dating table swaps `<Link>` for `onClick` to open the new panel; mobile keeps existing links.

**Tech Stack:** React (Next.js 14 App Router), TypeScript, CSS (globals.css)

**Spec:** `docs/superpowers/specs/2026-03-17-speed-dating-vehicle-panel-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/VehicleSummaryPanel.tsx` | Create | New slide-in panel: vehicle summary + trim selector + trim detail |
| `components/Dashboard.tsx` | Modify | Add `summaryVehicle` state, mutual exclusion wrappers, render new panel |
| `components/tabs/OverviewTab.tsx` | Modify | Accept `onVehicleClick` prop, wire desktop Speed Dating table clicks |
| `app/globals.css` | Modify | Add `.vehicle-summary-panel` styles, summary grid, trim selector |

Existing files **not modified:** `DetailPanel.tsx`, `SpecSection.tsx` (reused as-is), mobile card markup in OverviewTab.

---

## Task 1: CSS for the Vehicle Summary Panel

**Files:**
- Modify: `app/globals.css` (add after line ~692, after `.overlay.open`)

- [ ] **Step 1: Add `.vehicle-summary-panel` base styles**

Add the following CSS after the `.overlay.open` rule (around line 692):

```css
/* ── Vehicle Summary Panel ── */
.vehicle-summary-panel {
  position: fixed;
  top: 0;
  right: -560px;
  z-index: 200;
  width: 540px;
  max-width: 90vw;
  height: 100vh;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
  transition: right 0.3s ease;
  overflow-y: auto;
  padding: 24px;
}
.vehicle-summary-panel.open {
  right: 0;
}
```

- [ ] **Step 2: Add summary grid and trim selector styles**

```css
.vsp-header {
  margin-bottom: 20px;
}
.vsp-fullpage-link {
  display: inline-block;
  font-size: 13px;
  color: var(--teal);
  text-decoration: none;
  margin-top: 6px;
}
.vsp-fullpage-link:hover {
  text-decoration: underline;
}
.vsp-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.vsp-stat {
  background: var(--surface2);
  border-radius: 8px;
  padding: 12px;
}
.vsp-stat-label {
  font-size: 14px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.vsp-stat-value {
  font-size: 18px;
  font-weight: 600;
}
.vsp-trim-selector {
  margin-bottom: 20px;
}
.vsp-trim-selector label {
  display: block;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.vsp-trim-selector select {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
}
.vsp-trim-detail {
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
```

- [ ] **Step 3: Verify CSS parses correctly**

Run: `npm run build`
Expected: Build succeeds with no CSS errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "style: add vehicle summary panel CSS"
```

---

## Task 2: Create VehicleSummaryPanel Component

**Files:**
- Create: `components/VehicleSummaryPanel.tsx`

**References:**
- `components/DetailPanel.tsx` — pattern for overlay, Escape key, close button, SpecSection usage
- `components/SpecSection.tsx` — reused for trim detail sections
- `lib/data.ts` — `DATA.details`, `VEHICLE_CLASSES`
- `lib/slugs.ts` — `toSlug()`
- `lib/utils.ts` — `fmtMoney`, `fmtNum`

- [ ] **Step 1: Create the component file with imports and props**

Create `components/VehicleSummaryPanel.tsx`:

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { DATA, VEHICLE_CLASSES } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Link from 'next/link'
import { toSlug } from '@/lib/slugs'
import VehicleBadge from './VehicleBadge'
import SpecSection from './SpecSection'

interface Props {
  vehicle: string | null
  onClose: () => void
}
```

- [ ] **Step 2: Add the component body — overlay, aside shell, Escape key handler**

```tsx
export default function VehicleSummaryPanel({ vehicle, onClose }: Props) {
  const open = vehicle !== null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // All trims for this vehicle
  const trims = useMemo(
    () => (vehicle ? DATA.details.filter(d => d.vehicle === vehicle) : []),
    [vehicle]
  )

  // Trim selector state — auto-select if only one trim
  const [selectedTrimIdx, setSelectedTrimIdx] = useState<number | null>(null)

  // Reset selection when vehicle changes; auto-select single-trim vehicles
  useEffect(() => {
    if (trims.length === 1) {
      setSelectedTrimIdx(DATA.details.indexOf(trims[0]))
    } else {
      setSelectedTrimIdx(null)
    }
  }, [vehicle, trims])

  const selectedTrim = selectedTrimIdx !== null ? DATA.details[selectedTrimIdx] : null

  // ... render will be added in next step
```

- [ ] **Step 3: Add the vehicle summary stats computation**

Inside the component, before the return statement:

```tsx
  // Aggregate stats across all trims
  const summary = useMemo(() => {
    if (!trims.length) return null

    const msrps = trims.map(t => t.msrp).filter((v): v is number => typeof v === 'number')
    const ranges = trims.map(t => t.range_mi).filter((v): v is number => typeof v === 'number')
    const hps = trims.map(t => t.hp).filter((v): v is number => typeof v === 'number')
    const batteries = trims.map(t => t.battery_kwh).filter((v): v is number => typeof v === 'number')
    const seats = [...new Set(trims.map(t => t.seats).filter(Boolean))]
    const drivetrains = [...new Set(trims.map(t => t.drivetrain).filter(Boolean))]
    const chargingTypes = [...new Set(trims.map(t => t.charging_type).filter(Boolean))]

    function rangeText(nums: number[], suffix: string) {
      if (!nums.length) return '—'
      const lo = Math.min(...nums)
      const hi = Math.max(...nums)
      return lo === hi
        ? `${lo.toLocaleString()}${suffix}`
        : `${lo.toLocaleString()} – ${hi.toLocaleString()}${suffix}`
    }

    function moneyRange(nums: number[]) {
      if (!nums.length) return '—'
      const lo = Math.min(...nums)
      const hi = Math.max(...nums)
      const fLo = fmtMoney(lo)
      const fHi = fmtMoney(hi)
      return lo === hi ? fLo.text : `${fLo.text} – ${fHi.text}`
    }

    return {
      msrp: moneyRange(msrps),
      range: rangeText(ranges, ' mi'),
      hp: rangeText(hps, ' hp'),
      battery: rangeText(batteries, ' kWh'),
      seats: seats.join(', ') || '—',
      drivetrain: drivetrains.join(', ') || '—',
      charging: chargingTypes.join(', ') || '—',
    }
  }, [trims])
```

- [ ] **Step 4: Add the JSX return — header, summary grid, trim selector, trim detail**

```tsx
  return (
    <>
      <div className={`overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`vehicle-summary-panel${open ? ' open' : ''}`}>
        <button className="detail-close" onClick={onClose} aria-label="Close">×</button>
        {vehicle && summary && (
          <>
            <div className="vsp-header">
              <div className="detail-vehicle-name">
                <VehicleBadge vehicle={vehicle} style={{ fontSize: 14, padding: '4px 12px' }} />
              </div>
              <Link href={`/vehicles/${toSlug(vehicle)}`} className="vsp-fullpage-link">
                View full page <span aria-hidden="true">↗</span>
              </Link>
            </div>

            {/* Vehicle Summary */}
            <div className="vsp-summary-grid">
              {([
                ['MSRP Range', summary.msrp],
                ['EPA Range', summary.range],
                ['Horsepower', summary.hp],
                ['Battery', summary.battery],
                ['Seating', summary.seats],
                ['Drivetrain / Charging', `${summary.drivetrain} / ${summary.charging}`],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="vsp-stat">
                  <div className="vsp-stat-label">{label}</div>
                  <div className="vsp-stat-value">{val}</div>
                </div>
              ))}
            </div>

            {/* Trim Selector */}
            {trims.length > 1 && (
              <div className="vsp-trim-selector">
                <label htmlFor="vsp-trim-select">Select a year &amp; trim for detailed specs</label>
                <select
                  id="vsp-trim-select"
                  value={selectedTrimIdx ?? ''}
                  onChange={e => setSelectedTrimIdx(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">— Choose trim —</option>
                  {trims.map(t => {
                    const idx = DATA.details.indexOf(t)
                    return (
                      <option key={idx} value={idx}>
                        {t.year} {t.trim} ({t.seats})
                      </option>
                    )
                  })}
                </select>
              </div>
            )}

            {/* Trim Detail (inline below summary) */}
            {selectedTrim && (
              <div className="vsp-trim-detail">
                <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {selectedTrim.year} {selectedTrim.trim}
                </div>

                <div className="detail-grid">
                  {([
                    ['MSRP', (() => { const f = fmtMoney(selectedTrim.msrp); return <span className={f.className}>{f.text}</span> })()],
                    ['Pre-Owned', selectedTrim.preowned_range || '—'],
                    ['EPA Range', (() => { const f = fmtNum(selectedTrim.range_mi); return f.text + (typeof selectedTrim.range_mi === 'number' ? ' mi' : '') })()],
                    ['HP', (() => { const f = fmtNum(selectedTrim.hp); return f.text + (typeof selectedTrim.hp === 'number' ? ' hp' : '') })()],
                    ['Battery', (() => { const f = fmtNum(selectedTrim.battery_kwh); return f.text + (typeof selectedTrim.battery_kwh === 'number' ? ' kWh' : '') })()],
                    ['Seats', selectedTrim.seats ?? '—'],
                  ] as [string, React.ReactNode][]).map(([label, val]) => (
                    <div key={label} className="detail-stat">
                      <div className="detail-stat-label">{label}</div>
                      <div className="detail-stat-value">{val}</div>
                    </div>
                  ))}
                </div>

                <SpecSection title="Performance" rows={[
                  ['Torque', typeof selectedTrim.torque_lb_ft === 'number' ? `${selectedTrim.torque_lb_ft} lb-ft` : selectedTrim.torque_lb_ft],
                  ['0–60 mph', typeof selectedTrim.zero_to_60_sec === 'number' ? `${selectedTrim.zero_to_60_sec} sec` : selectedTrim.zero_to_60_sec],
                  ['Curb Weight', typeof selectedTrim.curb_weight_lbs === 'number' ? `${selectedTrim.curb_weight_lbs.toLocaleString()} lbs` : selectedTrim.curb_weight_lbs],
                  ['Towing Capacity', typeof selectedTrim.towing_lbs === 'number' ? `${selectedTrim.towing_lbs.toLocaleString()} lbs` : selectedTrim.towing_lbs],
                ]} />

                <SpecSection title="Drivetrain & Charging" rows={[
                  ['Drivetrain', selectedTrim.drivetrain],
                  ['Charging Type', selectedTrim.charging_type],
                  ['DC Fast Charge', typeof selectedTrim.dc_fast_charge_kw === 'number' ? `${selectedTrim.dc_fast_charge_kw} kW` : selectedTrim.dc_fast_charge_kw],
                  ['DC 10–80%', typeof selectedTrim.dc_fast_charge_10_80_min === 'number' ? `${selectedTrim.dc_fast_charge_10_80_min} min` : selectedTrim.dc_fast_charge_10_80_min],
                  ['Onboard AC', selectedTrim.onboard_ac_kw ? `${selectedTrim.onboard_ac_kw} kW` : '—'],
                  ['L2 10–80%', selectedTrim.l2_10_80 ? `${selectedTrim.l2_10_80} hrs` : '—'],
                  ['L2 10–100%', selectedTrim.l2_10_100 ? `${selectedTrim.l2_10_100} hrs` : '—'],
                ]} />

                <SpecSection title="Dimensions" rows={[
                  ['Length', typeof selectedTrim.length_in === 'number' ? `${selectedTrim.length_in} in` : selectedTrim.length_in],
                  ['Width', typeof selectedTrim.width_in === 'number' ? `${selectedTrim.width_in} in` : selectedTrim.width_in],
                  ['Height', typeof selectedTrim.height_in === 'number' ? `${selectedTrim.height_in} in` : selectedTrim.height_in],
                  ['Ground Clearance', typeof selectedTrim.ground_clearance_in === 'number' ? `${selectedTrim.ground_clearance_in} in` : selectedTrim.ground_clearance_in],
                  ['3rd Row Legroom', typeof selectedTrim.third_row_legroom_in === 'number' ? `${selectedTrim.third_row_legroom_in} in` : selectedTrim.third_row_legroom_in],
                  ['3rd Row Headroom', typeof selectedTrim.third_row_headroom_in === 'number' ? `${selectedTrim.third_row_headroom_in} in` : selectedTrim.third_row_headroom_in],
                ]} />

                <SpecSection title="Technology & Features" rows={[
                  ['Self Driving', selectedTrim.self_driving],
                  ['Car Software', selectedTrim.car_software],
                  ['Main Display', selectedTrim.main_display],
                  ['Additional Displays', selectedTrim.additional_displays],
                  ['Audio', selectedTrim.audio],
                  ['Driver Profiles', selectedTrim.driver_profiles],
                ]} />

                <SpecSection title="Cargo & Storage" rows={[
                  ['Frunk', typeof selectedTrim.frunk_cu_ft === 'number' ? `${selectedTrim.frunk_cu_ft} cu ft` : selectedTrim.frunk_cu_ft],
                  ['Behind 3rd Row', typeof selectedTrim.cargo_behind_3rd_cu_ft === 'number' ? `${selectedTrim.cargo_behind_3rd_cu_ft} cu ft` : selectedTrim.cargo_behind_3rd_cu_ft],
                  ['Behind 2nd Row', typeof selectedTrim.cargo_behind_2nd_cu_ft === 'number' ? `${selectedTrim.cargo_behind_2nd_cu_ft} cu ft` : selectedTrim.cargo_behind_2nd_cu_ft],
                  ['Fold Flat', selectedTrim.fold_flat],
                  ['Floor Width (Wheel Wells)', typeof selectedTrim.cargo_floor_width_in === 'number' ? `${selectedTrim.cargo_floor_width_in} in` : selectedTrim.cargo_floor_width_in],
                ]} />

                <SpecSection title="Pricing & OTD" rows={[
                  ['MSRP', (() => { const f = fmtMoney(selectedTrim.msrp); return f.text })()],
                  ['Destination', typeof selectedTrim.destination === 'number' ? `$${selectedTrim.destination.toLocaleString()}` : selectedTrim.destination],
                  ['OTD (New)', (() => { const f = fmtMoney(selectedTrim.otd_new); return f.text })()],
                  ['Pre-Owned Range', selectedTrim.preowned_range || '—'],
                  ['OTD (Pre-Owned)', (() => { const f = fmtMoney(selectedTrim.otd_preowned); return f.text })()],
                ]} />

                {selectedTrim.notes && (
                  <div className="detail-section">
                    <div className="detail-section-title">Notes</div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedTrim.notes}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}
```

- [ ] **Step 5: Verify the component compiles**

Run: `npx tsc --noEmit`
Expected: No type errors related to `VehicleSummaryPanel.tsx`.

- [ ] **Step 6: Commit**

```bash
git add components/VehicleSummaryPanel.tsx
git commit -m "feat: add VehicleSummaryPanel component"
```

---

## Task 3: Wire Dashboard State and Mutual Exclusion

**Files:**
- Modify: `components/Dashboard.tsx` (lines 1-121)

**References:**
- Current state: `detailIdx` at line 51, `DetailPanel` rendered at line 118
- `OverviewTab` rendered at lines 97-104
- `ComparisonTab` uses `onRowClick={setDetailIdx}` at line 110
- `SpecSelectTab` uses `onRowClick={setDetailIdx}` at line 113

- [ ] **Step 1: Add import for VehicleSummaryPanel**

At line 7 (after `import DetailPanel`), add:

```tsx
import VehicleSummaryPanel from './VehicleSummaryPanel'
```

- [ ] **Step 2: Add `summaryVehicle` state and mutual exclusion wrappers**

After line 51 (`const [detailIdx, setDetailIdx] = ...`), add:

```tsx
  const [summaryVehicle, setSummaryVehicle] = useState<string | null>(null)

  // Mutual exclusion: only one panel open at a time
  const openSummary = useCallback((vehicle: string) => {
    setDetailIdx(null)
    setSummaryVehicle(vehicle)
  }, [])

  const openDetail = useCallback((idx: number) => {
    setSummaryVehicle(null)
    setDetailIdx(idx)
  }, [])
```

- [ ] **Step 3: Update OverviewTab to receive `onVehicleClick` prop**

Change lines 97-104 from:

```tsx
          <OverviewTab
            condition={insightCondition}
            budget={insightBudget}
            pref1={insightPref1}
            pref2={insightPref2}
            onFiltersChange={setInsightFilters}
          />
```

To:

```tsx
          <OverviewTab
            condition={insightCondition}
            budget={insightBudget}
            pref1={insightPref1}
            pref2={insightPref2}
            onFiltersChange={setInsightFilters}
            onVehicleClick={openSummary}
          />
```

- [ ] **Step 4: Replace `setDetailIdx` with `openDetail` for ComparisonTab and SpecSelectTab**

Change line 110 from `onRowClick={setDetailIdx}` to `onRowClick={openDetail}`.
Change line 113 from `<SpecSelectTab onRowClick={setDetailIdx} />` to `<SpecSelectTab onRowClick={openDetail} />`.

- [ ] **Step 5: Render VehicleSummaryPanel alongside DetailPanel**

Change line 118 from:

```tsx
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
```

To:

```tsx
      <DetailPanel idx={detailIdx} onClose={() => setDetailIdx(null)} />
      <VehicleSummaryPanel vehicle={summaryVehicle} onClose={() => setSummaryVehicle(null)} />
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit`
Expected: Error about OverviewTab not accepting `onVehicleClick` prop (expected — fixed in next task).

- [ ] **Step 7: Commit**

```bash
git add components/Dashboard.tsx
git commit -m "feat: wire Dashboard state for vehicle summary panel"
```

---

## Task 4: Update OverviewTab to Open the Panel

**Files:**
- Modify: `components/tabs/OverviewTab.tsx` (lines 211-219 for props, line 520 for click handler)

- [ ] **Step 1: Extend OverviewTabProps interface**

At line 211, change the interface from:

```tsx
interface OverviewTabProps {
  condition: string
  budget: string
  pref1: string
  pref2: string
  onFiltersChange: (f: Partial<InsightFilters>, replace?: boolean) => void
}
```

To:

```tsx
interface OverviewTabProps {
  condition: string
  budget: string
  pref1: string
  pref2: string
  onFiltersChange: (f: Partial<InsightFilters>, replace?: boolean) => void
  onVehicleClick?: (vehicle: string) => void
}
```

- [ ] **Step 2: Destructure the new prop**

At line 219, change:

```tsx
export default function OverviewTab({ condition, budget, pref1, pref2, onFiltersChange }: OverviewTabProps) {
```

To:

```tsx
export default function OverviewTab({ condition, budget, pref1, pref2, onFiltersChange, onVehicleClick }: OverviewTabProps) {
```

- [ ] **Step 3: Replace desktop Speed Dating `<Link>` with `onClick` handler**

At line 520, change:

```tsx
<td className="col-sticky"><Link href={`/vehicles/${toSlug(s.vehicle)}`}><VehicleBadge vehicle={s.vehicle} /></Link></td>
```

To:

```tsx
<td className="col-sticky">
  {onVehicleClick
    ? <span style={{ cursor: 'pointer' }} onClick={() => onVehicleClick(s.vehicle)}><VehicleBadge vehicle={s.vehicle} /></span>
    : <Link href={`/vehicles/${toSlug(s.vehicle)}`}><VehicleBadge vehicle={s.vehicle} /></Link>
  }
</td>
```

This preserves the `<Link>` fallback if `onVehicleClick` is not provided (defensive, but the prop is always passed from Dashboard).

- [ ] **Step 4: Verify full build compiles and runs**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat: wire Speed Dating desktop clicks to vehicle summary panel"
```

---

## Task 5: Manual Smoke Test

No test framework is configured, so this is a manual verification checklist.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test panel opens from Speed Dating**

1. Navigate to `localhost:3000`
2. In the Speed Dating desktop table, click any vehicle name badge
3. Verify: panel slides in from right with overlay
4. Verify: vehicle summary stats are displayed (MSRP range, EPA range, HP, battery, seating, drivetrain)

- [ ] **Step 3: Test trim selector**

1. With panel open, select a trim from the dropdown
2. Verify: trim detail specs appear inline below the summary (Performance, Drivetrain, Dimensions, Tech, Cargo, Pricing)
3. Verify: vehicle summary remains visible above
4. Change dropdown back to "Choose trim" — verify trim details disappear

- [ ] **Step 4: Test single-trim vehicle**

1. Click a vehicle with only one trim
2. Verify: dropdown is hidden, trim detail auto-loads

- [ ] **Step 5: Test panel close behaviors**

1. Click the × button — panel closes
2. Reopen panel, press Escape — panel closes
3. Reopen panel, click overlay — panel closes

- [ ] **Step 6: Test mutual exclusion**

1. Open vehicle summary panel from Speed Dating
2. Switch to Full Monty tab, click a row
3. Verify: DetailPanel opens, VehicleSummaryPanel is closed (not both visible)

- [ ] **Step 7: Test mobile is unchanged**

1. Resize to mobile width (or use dev tools)
2. In Speed Dating mobile cards, click the ↗ icon
3. Verify: still navigates to standalone vehicle page (not the panel)

- [ ] **Step 8: Test "View full page" link in panel**

1. Open vehicle summary panel
2. Click "View full page ↗" link
3. Verify: navigates to `/vehicles/{slug}` standalone page

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: complete speed dating vehicle summary panel"
```
