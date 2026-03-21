# Data Explorer Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the standalone data explorer into the Next.js app as `/explore`, add a homepage teaser card, and add a footer link.

**Architecture:** New `/explore` page using the existing info-page pattern. The explorer logic from `explore.html` is ported into a `'use client'` React component (`DataExplorer.tsx`) that dynamically imports Observable Plot and D3. The homepage gets a teaser card next to the "Math Mathing" section. The footer gets a new link.

**Tech Stack:** Next.js 14 App Router, React, Observable Plot v0.6, D3 v7, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-20-explore-integration-design.md`

---

## File Structure

```
ev-app/
  app/explore/page.tsx              <-- CREATE (route page, server component)
  components/DataExplorer.tsx        <-- CREATE (client component, all explorer logic)
  components/ExploreTeaser.tsx       <-- CREATE (SVG teaser card for homepage)
  components/tabs/OverviewTab.tsx    <-- MODIFY (wrap math section with teaser)
  components/Footer.tsx              <-- MODIFY (add Data Explorer link)
  app/globals.css                    <-- MODIFY (add explorer styles)
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Observable Plot and D3**

```bash
cd C:\Users\dpm50\Documents\Claude-Code\ev-app
npm install @observablehq/plot@0.6 d3@7
npm install -D @types/d3@7
```

- [ ] **Step 2: Verify packages installed**

Check `package.json` for `@observablehq/plot`, `d3`, and `@types/d3`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Observable Plot and D3 for data explorer"
```

---

## Task 2: Create DataExplorer Client Component

**Files:**
- Create: `components/DataExplorer.tsx`

This is the largest task — it ports all the logic from `explore.html` into a React component. The key differences from the vanilla JS version:

- Uses `DATA.details` from `lib/data.ts` instead of fetching JSON
- Uses React state instead of DOM queries for filter values
- Dynamically imports Plot and d3 in `useEffect` (browser-only)
- Renders chart by appending Plot's SVG to a ref'd div
- All CSS classes prefixed with `explorer-` to avoid conflicts with app styles

- [ ] **Step 1: Create the component file with constants and preprocessing**

Create `components/DataExplorer.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { DATA } from '@/lib/data'

// ── Constants ──────────────────────────────────────────────────

const VEHICLE_COLORS: Record<string, string> = {
  'Kia EV9': '#4ade80',
  'Hyundai IONIQ 9': '#5ba4f5',
  'Lucid Gravity': '#a78bfa',
  'Rivian R1S': '#fb923c',
  'Tesla Model X': '#f87171',
  'Tesla Model Y (3-Row)': '#f87171',
  'Volkswagen ID. Buzz': '#fbbf24',
  'VinFast VF9': '#f59e0b',
  'Volvo EX90': '#f472b6',
  'Cadillac Escalade IQ': '#a78bfa',
  'Cadillac VISTIQ': '#c084fc',
  'Mercedes-Benz EQS SUV': '#d4d4d8',
}

const WATCHLIST = [
  'Subaru 3-Row EV', 'BMW iX7', 'Genesis GV90',
  'Toyota Highlander EV', 'Tesla Model Y Long (Asia)',
]

const SELF_DRIVING_TIERS: Record<string, number> = {
  'Basic L2': 2.1, 'Advanced L2': 2.2,
  'L2+ Hands-Free': 2.3, 'L2+ Point-to-Point': 2.4,
}

const TIER_SHORT: Record<string, string> = {
  'Basic L2': 'Basic L2', 'Advanced L2': 'Adv. L2',
  'L2+ Hands-Free': 'L2+ HF', 'L2+ Point-to-Point': 'L2+ P2P',
}

const NUMERIC_FIELDS = [
  'msrp', 'otd_new', 'range_mi', 'hp', 'battery_kwh', 'towing_lbs',
  'dc_fast_charge_kw', 'dc_fast_charge_10_80_min', 'curb_weight_lbs',
  'length_in', 'width_in', 'height_in', 'third_row_legroom_in',
  'third_row_headroom_in', 'torque_lb_ft', 'zero_to_60_sec',
  'ground_clearance_in', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft',
  'cargo_behind_1st_cu_ft', 'cargo_floor_width_in', 'frunk_cu_ft',
  'onboard_ac_kw', 'l2_10_100', 'l2_10_80', 'destination',
]

const FIELD_LABELS: Record<string, string> = {
  msrp: 'MSRP ($)', otd_new: 'OTD New Price ($)', range_mi: 'Range (miles)',
  hp: 'Horsepower', battery_kwh: 'Battery (kWh)', towing_lbs: 'Towing Capacity (lbs)',
  dc_fast_charge_kw: 'DC Fast Charge (kW)', dc_fast_charge_10_80_min: 'DC Charge 10–80% (min)',
  curb_weight_lbs: 'Curb Weight (lbs)', length_in: 'Length (in)', width_in: 'Width (in)',
  height_in: 'Height (in)', third_row_legroom_in: '3rd Row Legroom (in)',
  third_row_headroom_in: '3rd Row Headroom (in)', torque_lb_ft: 'Torque (lb-ft)',
  zero_to_60_sec: '0–60 mph (sec)', ground_clearance_in: 'Ground Clearance (in)',
  cargo_behind_3rd_cu_ft: 'Cargo Behind 3rd Row (cu ft)',
  cargo_behind_2nd_cu_ft: 'Cargo Behind 2nd Row (cu ft)',
  cargo_behind_1st_cu_ft: 'Cargo Behind 1st Row (cu ft)',
  cargo_floor_width_in: 'Cargo Floor Width (in)', frunk_cu_ft: 'Frunk (cu ft)',
  onboard_ac_kw: 'Onboard AC Charger (kW)', l2_10_100: 'L2 Charge 10–100% (hrs)',
  l2_10_80: 'L2 Charge 10–80% (hrs)', destination: 'Destination Charge ($)',
  self_driving_score: 'Self-Driving Tier',
}

const FIELD_DIRECTION: Record<string, number> = {
  msrp: -1, otd_new: -1, range_mi: 1, hp: 1, battery_kwh: 1, towing_lbs: 1,
  dc_fast_charge_kw: 1, dc_fast_charge_10_80_min: -1, curb_weight_lbs: -1,
  length_in: 0, width_in: 0, height_in: 0, third_row_legroom_in: 1,
  third_row_headroom_in: 1, torque_lb_ft: 1, zero_to_60_sec: -1,
  ground_clearance_in: 1, cargo_behind_3rd_cu_ft: 1, cargo_behind_2nd_cu_ft: 1,
  cargo_behind_1st_cu_ft: 1, cargo_floor_width_in: 1, frunk_cu_ft: 1,
  onboard_ac_kw: 1, l2_10_100: -1, l2_10_80: -1, destination: -1, self_driving_score: 1,
}

const SHORT_NAMES: Record<string, string> = {
  msrp: 'Price', otd_new: 'Price', range_mi: 'Range', hp: 'Power',
  battery_kwh: 'Battery', towing_lbs: 'Towing', dc_fast_charge_kw: 'Charge Speed',
  dc_fast_charge_10_80_min: 'Charge Time', curb_weight_lbs: 'Weight',
  third_row_legroom_in: 'Legroom', third_row_headroom_in: 'Headroom',
  torque_lb_ft: 'Torque', zero_to_60_sec: 'Acceleration',
  ground_clearance_in: 'Clearance', cargo_behind_3rd_cu_ft: 'Cargo',
  cargo_behind_2nd_cu_ft: 'Cargo', cargo_behind_1st_cu_ft: 'Cargo',
  cargo_floor_width_in: 'Cargo Width', frunk_cu_ft: 'Frunk',
  onboard_ac_kw: 'AC Charger', l2_10_100: 'L2 Time', l2_10_80: 'L2 Time',
  destination: 'Dest. Fee', self_driving_score: 'Self-Driving',
  length_in: 'Length', width_in: 'Width', height_in: 'Height',
}

const PLOTTABLE_FIELDS = [
  'msrp', 'otd_new', 'range_mi', 'hp', 'torque_lb_ft', 'zero_to_60_sec',
  'self_driving_score', 'battery_kwh', 'towing_lbs',
  'dc_fast_charge_kw', 'dc_fast_charge_10_80_min',
  'third_row_legroom_in', 'third_row_headroom_in',
  'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft', 'cargo_behind_1st_cu_ft',
  'cargo_floor_width_in', 'frunk_cu_ft',
]

const RANGE_BUCKETS = ['200–250 mi', '250–300 mi', '300–325 mi', '325–350 mi', '350–400 mi', '400+ mi']

// ── Data preprocessing (run once) ──────────────────────────────

interface ProcessedRow {
  [key: string]: any
  name: string
  vehicle: string
  year: number
  trim: string
  seats: number | null
  drivetrain: string
  self_driving_tier: string | null
  self_driving_score: number | null
}

function preprocessData(): ProcessedRow[] {
  return (DATA.details as any[])
    .filter((d: any) => !WATCHLIST.includes(d.vehicle))
    .map((d: any) => {
      const row: any = { ...d }
      for (const f of NUMERIC_FIELDS) {
        const v = Number(row[f])
        row[f] = Number.isNaN(v) ? null : v
      }
      row.self_driving_score = SELF_DRIVING_TIERS[row.self_driving_tier] ?? null
      return row as ProcessedRow
    })
}
```

This establishes all constants and the preprocessing function. The component itself comes next.

- [ ] **Step 2: Add the quadrant label logic**

Add below `preprocessData` in the same file:

```tsx
function getQuadrantLabels(xField: string, yField: string) {
  const xDir = FIELD_DIRECTION[xField] ?? 0
  const yDir = FIELD_DIRECTION[yField] ?? 0
  if (xDir === 0 && yDir === 0) return null

  const xHighGood = xDir === 1
  const xHighBad = xDir === -1
  const yHighGood = yDir === 1
  const yHighBad = yDir === -1

  function score(xHigh: boolean, yHigh: boolean) {
    let s = 0
    if (xDir !== 0) s += (xHigh ? xHighGood : xHighBad) ? 1 : -1
    if (yDir !== 0) s += (yHigh ? yHighGood : yHighBad) ? 1 : -1
    return s
  }

  function label(s: number, xHigh: boolean, yHigh: boolean) {
    if (s === 2) return 'Best Value'
    if (s === -2) return 'Worst Value'
    if (s === 0 && xDir !== 0 && yDir !== 0) {
      const xGood = (xHigh && xHighGood) || (!xHigh && xHighBad)
      if (xGood) return 'Good ' + (SHORT_NAMES[xField] || xField) + ',\nWeak ' + (SHORT_NAMES[yField] || yField)
      else return 'Good ' + (SHORT_NAMES[yField] || yField) + ',\nWeak ' + (SHORT_NAMES[xField] || xField)
    }
    if (xDir === 0) return yHigh ? (yHighGood ? 'Strong' : 'Weak') : (yHighBad ? 'Weak' : 'Strong')
    if (yDir === 0) return xHigh ? (xHighGood ? 'Strong' : 'Weak') : (xHighBad ? 'Weak' : 'Strong')
    return ''
  }

  return {
    topLeft: label(score(false, true), false, true),
    topRight: label(score(true, true), true, true),
    bottomLeft: label(score(false, false), false, false),
    bottomRight: label(score(true, false), true, false),
  }
}
```

- [ ] **Step 3: Add the MultiSelectDropdown sub-component**

Instead of DOM manipulation, use a small React component for the multi-select dropdowns:

```tsx
function MultiSelectDropdown({ id, label, options, selected, onChange, colorMap }: {
  id: string
  label: string
  options: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
  colorMap?: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const allSelected = selected.size === options.length
  const btnLabel = allSelected ? `All ${label} ▼`
    : selected.size === 0 ? `No ${label} ▼`
    : selected.size <= 2 ? [...selected].join(', ') + ' ▼'
    : `${selected.size} ${label} ▼`

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(options))
  }

  function toggle(val: string) {
    const next = new Set(selected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    onChange(next)
  }

  return (
    <div className="explorer-control-group">
      <label>{label}</label>
      <div className="explorer-dropdown" ref={ref}>
        <button className="explorer-dropdown-btn" onClick={() => setOpen(!open)}>{btnLabel}</button>
        {open && (
          <div className="explorer-dropdown-content">
            <button className="explorer-select-all-btn" onClick={toggleAll}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            {options.map(o => (
              <label key={o} className="explorer-checkbox-label">
                <input type="checkbox" checked={selected.has(o)} onChange={() => toggle(o)} />
                {colorMap?.[o] && <span className="explorer-color-dot" style={{ background: colorMap[o] }} />}
                {o}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the main DataExplorer component with state, filters, and chart rendering**

```tsx
export default function DataExplorer() {
  const chartRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const [libs, setLibs] = useState<{ Plot: any; d3: any } | null>(null)
  const [data] = useState(() => preprocessData())

  // Filter state
  const allVehicles = [...new Set(data.map(d => d.vehicle))].sort()
  const allYears = [...new Set(data.map(d => String(d.year)))].sort()
  const [selectedVehicles, setSelectedVehicles] = useState(() => new Set(allVehicles))
  const [selectedYears, setSelectedYears] = useState(() => new Set(allYears))
  const [selectedRanges, setSelectedRanges] = useState(() => new Set(RANGE_BUCKETS))
  const [seats, setSeats] = useState('all')
  const [drivetrain, setDrivetrain] = useState('all')

  // Axis state
  const [xField, setXField] = useState('msrp')
  const [yField, setYField] = useState('range_mi')
  const [sizeField, setSizeField] = useState('none')

  // Load Plot and d3 dynamically (browser-only)
  useEffect(() => {
    Promise.all([
      import('@observablehq/plot'),
      import('d3'),
    ]).then(([Plot, d3]) => setLibs({ Plot, d3 }))
  }, [])

  // Filter data
  const filtered = data.filter(d => {
    if (!selectedVehicles.has(d.vehicle)) return false
    if (!selectedYears.has(String(d.year))) return false
    if (seats !== 'all' && d.seats !== Number(seats)) return false
    if (drivetrain !== 'all' && d.drivetrain !== drivetrain) return false
    // Range buckets
    const r = d.range_mi as number | null
    if (r == null) return selectedRanges.size === RANGE_BUCKETS.length
    let inBucket = false
    if (r >= 200 && r < 250 && selectedRanges.has('200–250 mi')) inBucket = true
    if (r >= 250 && r < 300 && selectedRanges.has('250–300 mi')) inBucket = true
    if (r >= 300 && r < 325 && selectedRanges.has('300–325 mi')) inBucket = true
    if (r >= 325 && r < 350 && selectedRanges.has('325–350 mi')) inBucket = true
    if (r >= 350 && r < 400 && selectedRanges.has('350–400 mi')) inBucket = true
    if (r >= 400 && selectedRanges.has('400+ mi')) inBucket = true
    return inBucket
  })

  // Render chart
  useEffect(() => {
    if (!libs || !chartRef.current) return
    const { Plot, d3 } = libs
    const container = chartRef.current
    container.innerHTML = ''

    const chartData = filtered.filter(d => d[xField] != null && d[yField] != null)
    if (chartData.length === 0) {
      container.innerHTML = '<p class="explorer-empty">No data for this combination.</p>'
      return
    }

    const vehicles = [...new Set(chartData.map((d: any) => d.vehicle))].sort()
    const isCurrency = (f: string) => ['msrp', 'otd_new', 'destination'].includes(f)
    const tierLabels = Object.entries(SELF_DRIVING_TIERS)

    const makeAxisConfig = (field: string, format: any) =>
      field === 'self_driving_score'
        ? {
            label: FIELD_LABELS[field],
            domain: [2.0, 2.5],
            ticks: tierLabels.map(([, v]) => v),
            tickFormat: (v: number) => { const t = tierLabels.find(([, n]) => n === v); return t ? TIER_SHORT[t[0]] : '' },
          }
        : { label: FIELD_LABELS[field], tickFormat: format }

    const plotConfig: any = {
      width: container.clientWidth || 900,
      height: 560,
      marginTop: 20, marginRight: 20, marginBottom: 45, marginLeft: 60,
      style: { background: 'transparent', color: 'var(--text-muted)', fontSize: '12px' },
      grid: true,
      x: makeAxisConfig(xField, isCurrency(xField) ? d3.format('$,.0f') : undefined),
      y: makeAxisConfig(yField, isCurrency(yField) ? d3.format('$,.0f') : undefined),
      color: { domain: vehicles, range: vehicles.map((v: string) => VEHICLE_COLORS[v] || '#888') },
      marks: [] as any[],
    }

    const dotOpts: any = {
      x: xField, y: yField, fill: 'vehicle',
      fillOpacity: 0.8, stroke: 'var(--surface)', strokeWidth: 1, tip: true,
    }

    if (sizeField !== 'none') {
      const sizeData = chartData.filter((d: any) => d[sizeField] != null)
      dotOpts.r = sizeField
      plotConfig.r = { domain: d3.extent(sizeData, (d: any) => d[sizeField]), range: [4, 20] }
      dotOpts.title = (d: any) => {
        let t = `${d.name}\n${FIELD_LABELS[xField]}: ${isCurrency(xField) ? '$' + d3.format(',')(d[xField]) : d[xField]}`
        t += `\n${FIELD_LABELS[yField]}: ${isCurrency(yField) ? '$' + d3.format(',')(d[yField]) : d[yField]}`
        if (d[sizeField] != null) t += `\n${FIELD_LABELS[sizeField]}: ${d[sizeField]}`
        return t
      }
    } else {
      dotOpts.r = 6
      dotOpts.title = (d: any) => {
        let t = `${d.name}\n${FIELD_LABELS[xField]}: ${isCurrency(xField) ? '$' + d3.format(',')(d[xField]) : d[xField]}`
        t += `\n${FIELD_LABELS[yField]}: ${isCurrency(yField) ? '$' + d3.format(',')(d[yField]) : d[yField]}`
        return t
      }
    }

    // Quadrant lines and labels
    const xMedian = d3.median(chartData, (d: any) => d[xField])
    const yMedian = d3.median(chartData, (d: any) => d[yField])
    if (xMedian != null && yMedian != null) {
      plotConfig.marks.push(
        Plot.ruleX([xMedian], { stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '6,4' }),
        Plot.ruleY([yMedian], { stroke: 'var(--border)', strokeWidth: 1, strokeDasharray: '6,4' }),
      )
      const labels = getQuadrantLabels(xField, yField)
      if (labels) {
        const xMin = d3.min(chartData, (d: any) => d[xField])
        const xMax = d3.max(chartData, (d: any) => d[xField])
        const yMin = d3.min(chartData, (d: any) => d[yField])
        const yMax = d3.max(chartData, (d: any) => d[yField])
        const quadrants = [
          { x: xMedian - (xMedian - xMin) * 0.5, y: yMedian + (yMax - yMedian) * 0.5, text: labels.topLeft },
          { x: xMedian + (xMax - xMedian) * 0.5, y: yMedian + (yMax - yMedian) * 0.5, text: labels.topRight },
          { x: xMedian - (xMedian - xMin) * 0.5, y: yMedian - (yMedian - yMin) * 0.5, text: labels.bottomLeft },
          { x: xMedian + (xMax - xMedian) * 0.5, y: yMedian - (yMedian - yMin) * 0.5, text: labels.bottomRight },
        ].filter(q => q.text)
        plotConfig.marks.push(
          Plot.text(quadrants, {
            x: 'x', y: 'y', text: 'text', textAnchor: 'middle',
            fill: 'var(--text-dim)', fontStyle: 'italic', fontSize: 13, lineAnchor: 'middle', fillOpacity: 0.4,
          })
        )
      }
    }

    plotConfig.marks.push(Plot.dot(chartData, dotOpts))
    const plot = Plot.plot(plotConfig)
    container.appendChild(plot)

    // Legend
    if (legendRef.current) {
      const legendVehicles = [...new Set(filtered.map(d => d.vehicle))].sort()
      legendRef.current.innerHTML = legendVehicles.map(v =>
        `<span class="explorer-legend-item"><span class="explorer-color-dot" style="background:${VEHICLE_COLORS[v] || '#888'}"></span>${v}</span>`
      ).join('')
    }
  }, [libs, filtered, xField, yField, sizeField])

  if (!libs) {
    return <div className="explorer-loading">Loading explorer...</div>
  }

  return (
    <div className="explorer">
      <h1 className="section-title">3-Row Electric Vehicle Explorer</h1>
      <p className="count-note" style={{ marginBottom: 16 }}>Data updated March 2026</p>

      {/* Filter row */}
      <div className="explorer-controls">
        <span className="explorer-controls-label">Filter</span>
        <MultiSelectDropdown id="vehicles" label="Vehicles" options={allVehicles}
          selected={selectedVehicles} onChange={setSelectedVehicles} colorMap={VEHICLE_COLORS} />
        <MultiSelectDropdown id="years" label="Years" options={allYears}
          selected={selectedYears} onChange={setSelectedYears} />
        <div className="explorer-control-group">
          <label>Seats</label>
          <select className="explorer-select" value={seats} onChange={e => setSeats(e.target.value)}>
            <option value="all">All</option>
            <option value="6">6</option>
            <option value="7">7</option>
          </select>
        </div>
        <div className="explorer-control-group">
          <label>Drivetrain</label>
          <select className="explorer-select" value={drivetrain} onChange={e => setDrivetrain(e.target.value)}>
            <option value="all">All</option>
            <option value="AWD">AWD</option>
            <option value="RWD">RWD</option>
          </select>
        </div>
        <MultiSelectDropdown id="range" label="Ranges" options={RANGE_BUCKETS}
          selected={selectedRanges} onChange={setSelectedRanges} />
      </div>

      {/* Axis selector row */}
      <div className="explorer-controls">
        <span className="explorer-controls-label">Plot</span>
        <div className="explorer-control-group">
          <label>X-Axis</label>
          <select className="explorer-select" value={xField} onChange={e => setXField(e.target.value)}>
            {PLOTTABLE_FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
          </select>
        </div>
        <div className="explorer-control-group">
          <label>Y-Axis</label>
          <select className="explorer-select" value={yField} onChange={e => setYField(e.target.value)}>
            {PLOTTABLE_FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
          </select>
        </div>
        <div className="explorer-control-group">
          <label>Bubble Size</label>
          <select className="explorer-select" value={sizeField} onChange={e => setSizeField(e.target.value)}>
            <option value="none">None (fixed size)</option>
            {PLOTTABLE_FIELDS.map(f => <option key={f} value={f}>{FIELD_LABELS[f]}</option>)}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="explorer-chart-area">
        <div ref={chartRef} className="explorer-chart-container" />
        <div ref={legendRef} className="explorer-legend" />
        <p className="explorer-chart-note">
          Dashed lines show the median. Quadrant labels indicate relative value based on whether higher or lower is better for each metric.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify the component compiles**

Run: `cd C:\Users\dpm50\Documents\Claude-Code\ev-app && npx tsc --noEmit`

Fix any TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add components/DataExplorer.tsx
git commit -m "feat(explorer): create DataExplorer client component with filters, axis selectors, and chart rendering"
```

---

## Task 3: Add Explorer CSS to globals.css

**Files:**
- Modify: `app/globals.css`

Add all explorer-specific styles at the end of the file, prefixed with `.explorer-` to avoid conflicts. These styles use the app's existing CSS variables so they work in both light and dark mode.

- [ ] **Step 1: Add explorer styles to globals.css**

Append to the end of `app/globals.css`:

```css
/* ── Data Explorer ── */
.explorer { max-width: 1100px; margin: 0 auto; }
.explorer-loading { text-align: center; padding: 4rem; color: var(--text-muted); }
.explorer-empty { color: var(--text-muted); text-align: center; padding: 3rem; }

.explorer-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 0;
}
.explorer-controls + .explorer-controls {
  border-top: 1px solid var(--border);
}
.explorer-controls-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
  margin-right: 0.25rem;
  white-space: nowrap;
}
.explorer-control-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.explorer-control-group label {
  font-weight: 500;
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.explorer-select {
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--font);
}
.explorer-select:hover { border-color: var(--accent); }
.explorer-select:focus { outline: none; border-color: var(--accent); }

.explorer-dropdown { position: relative; }
.explorer-dropdown-btn {
  background: var(--surface2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--font);
}
.explorer-dropdown-btn:hover { border-color: var(--accent); }
.explorer-dropdown-content {
  position: absolute;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px;
  min-width: 260px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 20;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  margin-top: 4px;
}
.explorer-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px;
  cursor: pointer;
  font-size: 0.82rem;
  border-radius: 4px;
}
.explorer-checkbox-label:hover { background: var(--surface2); }
.explorer-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.explorer-select-all-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.78rem;
  font-family: var(--font);
  padding: 4px 0;
  margin-bottom: 6px;
}
.explorer-select-all-btn:hover { text-decoration: underline; }

.explorer-chart-area {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.5rem;
  margin-top: 1rem;
  border: 1px solid var(--border);
}
.explorer-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.25rem;
  padding: 1rem 0 0;
  margin-top: 0.75rem;
  border-top: 1px solid var(--border);
}
.explorer-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}
.explorer-chart-note {
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-style: italic;
}

/* Observable Plot tooltip overrides for explorer */
.explorer-chart-container [aria-label="tip"] {
  color: #1a1a2e !important;
  font-size: 0.82rem;
}
.explorer-chart-container figure [aria-label="tip"] text {
  fill: #1a1a2e !important;
}
.explorer-chart-container figure text {
  font-family: var(--font) !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat(explorer): add explorer styles to globals.css using app CSS variables"
```

---

## Task 4: Create the /explore Route Page

**Files:**
- Create: `app/explore/page.tsx`

- [ ] **Step 1: Create `app/explore/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/slugs'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import DataExplorer from '@/components/DataExplorer'

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

- [ ] **Step 2: Verify the page loads**

Run: `cd C:\Users\dpm50\Documents\Claude-Code\ev-app && npm run dev`
Open: `http://localhost:3000/explore`
Expected: Page loads with Header, Breadcrumb, and the DataExplorer component. Chart renders after Plot/d3 load.

- [ ] **Step 3: Commit**

```bash
git add app/explore/page.tsx
git commit -m "feat(explorer): add /explore route page"
```

---

## Task 5: Create ExploreTeaser Component and Add to Homepage

**Files:**
- Create: `components/ExploreTeaser.tsx`
- Modify: `components/tabs/OverviewTab.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Create `components/ExploreTeaser.tsx`**

An inline SVG illustration of a scatter plot with a "Plot Your Data" title:

```tsx
import Link from 'next/link'

export default function ExploreTeaser() {
  return (
    <Link href="/explore" className="card explore-teaser">
      <svg viewBox="0 0 160 120" className="explore-teaser-svg" aria-hidden="true">
        {/* Background */}
        <rect x="0" y="0" width="160" height="120" rx="6" fill="var(--surface2)" />
        {/* Dashed crosshair lines */}
        <line x1="80" y1="10" x2="80" y2="110" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,3" />
        <line x1="10" y1="60" x2="150" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="4,3" />
        {/* Scattered dots in quadrants */}
        <circle cx="35" cy="30" r="5" fill="#4ade80" opacity="0.8" />
        <circle cx="55" cy="42" r="7" fill="#5ba4f5" opacity="0.8" />
        <circle cx="45" cy="85" r="4" fill="#fb923c" opacity="0.8" />
        <circle cx="65" cy="95" r="6" fill="#f87171" opacity="0.8" />
        <circle cx="110" cy="25" r="6" fill="#a78bfa" opacity="0.8" />
        <circle cx="130" cy="38" r="4" fill="#fbbf24" opacity="0.8" />
        <circle cx="100" cy="80" r="5" fill="#f472b6" opacity="0.8" />
        <circle cx="125" cy="90" r="7" fill="#f59e0b" opacity="0.8" />
        {/* Subtle quadrant label */}
        <text x="40" y="22" fill="var(--text-dim)" fontSize="7" fontStyle="italic" textAnchor="middle" opacity="0.5">Best Value</text>
      </svg>
      <div className="card-title">Plot Your Data</div>
      <p className="count-note">Visualize any metric, side by side</p>
    </Link>
  )
}
```

- [ ] **Step 2: Add teaser CSS to globals.css**

Append to `app/globals.css`:

```css
/* ── Explore Teaser Card ── */
.math-explore-row {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 16px;
  align-items: stretch;
  margin-top: 16px;
}
@media (max-width: 768px) {
  .math-explore-row { grid-template-columns: 1fr; }
}
.explore-teaser {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  text-decoration: none;
  color: inherit;
  padding: 20px 16px;
  transition: border-color 0.15s;
  cursor: pointer;
}
.explore-teaser:hover {
  border-color: var(--accent);
}
.explore-teaser .card-title { margin-top: 12px; }
.explore-teaser-svg {
  width: 100%;
  max-width: 180px;
  height: auto;
}
```

- [ ] **Step 3: Modify OverviewTab.tsx to wrap Math section with teaser**

In `components/tabs/OverviewTab.tsx`, add the import at the top:

```tsx
import ExploreTeaser from '@/components/ExploreTeaser'
```

Then find the `{/* ── Math Explanation ── */}` comment block (around line 874). The current structure is:

```tsx
{rankResult.effectivePrefs.length > 0 && (() => {
  // ...
  return (
    <div className="card math-section">
      ...
    </div>
  )
})()}
```

Wrap it in a `.math-explore-row` div and add the teaser card:

```tsx
<div className="math-explore-row">
  {rankResult.effectivePrefs.length > 0 && (() => {
    // ... existing logic unchanged ...
    return (
      <div className="card math-section">
        {/* ... existing content unchanged ... */}
      </div>
    )
  })()}
  <ExploreTeaser />
</div>
```

If the math section doesn't render (no prefs selected), the teaser still shows — the grid handles a single child gracefully.

- [ ] **Step 4: Verify on homepage**

Run dev server, go to `http://localhost:3000`. The "Math Mathing" section should now have the teaser card to its right. Click the teaser to verify it navigates to `/explore`.

- [ ] **Step 5: Commit**

```bash
git add components/ExploreTeaser.tsx components/tabs/OverviewTab.tsx app/globals.css
git commit -m "feat(explorer): add teaser card alongside Math Mathing section on homepage"
```

---

## Task 6: Add Footer Link

**Files:**
- Modify: `components/Footer.tsx`

- [ ] **Step 1: Add Data Explorer link**

In `components/Footer.tsx`, find the Site links `<nav>`:

```tsx
<nav className="footer-links">
  <Link href="/">Home</Link>
  <Link href="/about">About</Link>
  <Link href="/privacy">Privacy Policy</Link>
</nav>
```

Add the Data Explorer link between About and Privacy Policy:

```tsx
<nav className="footer-links">
  <Link href="/">Home</Link>
  <Link href="/about">About</Link>
  <Link href="/explore">Data Explorer</Link>
  <Link href="/privacy">Privacy Policy</Link>
</nav>
```

- [ ] **Step 2: Verify footer link**

Open any page. Footer should show "Data Explorer" between "About" and "Privacy Policy". Click to verify it goes to `/explore`.

- [ ] **Step 3: Commit**

```bash
git add components/Footer.tsx
git commit -m "feat(explorer): add Data Explorer link to footer"
```
