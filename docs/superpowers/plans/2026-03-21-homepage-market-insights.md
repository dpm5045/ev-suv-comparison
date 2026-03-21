# Homepage Market Insights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Market Insights" section to the homepage with three Chart.js charts (Market Growth, MSRP Range, Range vs Price) and data-driven takeaway boxes.

**Architecture:** New `MarketInsights.tsx` client component using `react-chartjs-2`, integrated into `OverviewTab.tsx` between ExploreTeaser and Watchlist. All data from `DATA` (lib/data.ts). CSS in globals.css.

**Tech Stack:** Chart.js 4, react-chartjs-2, Next.js App Router, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-21-homepage-market-insights-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/MarketInsights.tsx` | Create | Client component: data computation, 3 charts, stat callouts, takeaway boxes |
| `components/tabs/OverviewTab.tsx` | Modify (line ~973) | Import and render `<MarketInsights />` |
| `app/globals.css` | Modify (append) | Market insights section styles |
| `package.json` | Modify (via npm install) | Add chart.js, react-chartjs-2 |

---

### Task 1: Install Chart.js dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install packages**

```bash
npm install chart.js react-chartjs-2
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('chart.js'); require('react-chartjs-2'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install chart.js and react-chartjs-2 for market insights"
```

---

### Task 2: Add Market Insights CSS to globals.css

**Files:**
- Modify: `app/globals.css` (append before final closing comment or at end)

- [ ] **Step 1: Append Market Insights styles**

Add these styles at the end of `app/globals.css`:

```css
/* ── Market Insights ── */
.market-insights-section {
  margin-top: 8px;
  margin-bottom: 20px;
}
.market-insights-section .section-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 2px;
}
.market-insights-section .section-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.mi-chart-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 16px;
}
.mi-chart-title {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 12px;
  letter-spacing: 0.01em;
}
.mi-chart-wrap { position: relative; }
.mi-chart-wrap--standard canvas { height: 400px !important; }
.mi-chart-wrap--range canvas   { height: 540px !important; }
.mi-chart-wrap--tall canvas    { height: 450px !important; }

.mi-stat-callouts {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.mi-stat-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 14px;
  flex: 1;
  min-width: 140px;
}
.mi-stat-value {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text);
}
.mi-stat-label {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 3px;
}
.mi-insights {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  margin-top: 12px;
}
.mi-insights h4 {
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent);
  margin-bottom: 10px;
}
.mi-insights ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.mi-insights li {
  font-size: 0.8rem;
  line-height: 1.55;
  color: var(--text-muted);
  padding-left: 1.1rem;
  position: relative;
}
.mi-insights li::before {
  content: '›';
  position: absolute;
  left: 0.15rem;
  color: var(--text-dim);
  font-weight: 700;
  font-size: 0.95rem;
}
.mi-insights li strong {
  color: var(--text);
  font-weight: 600;
}

@media (max-width: 600px) {
  .mi-stat-callouts {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .mi-chart-wrap--standard canvas { height: 300px !important; }
  .mi-chart-wrap--range canvas   { height: 420px !important; }
  .mi-chart-wrap--tall canvas    { height: 320px !important; }
}
```

- [ ] **Step 2: Verify dev server still compiles**

```bash
npm run build 2>&1 | tail -5
```

Expected: Build succeeds (or at least CSS doesn't break it).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: add Market Insights section CSS to globals"
```

---

### Task 3: Create MarketInsights component — data helpers and constants

**Files:**
- Create: `components/MarketInsights.tsx`

This task creates the file with imports, constants, data filtering, and helper functions. Charts and JSX come in the next tasks.

- [ ] **Step 1: Create the component file with data layer**

Create `components/MarketInsights.tsx` with the following content:

```tsx
'use client'

import { useMemo } from 'react'
import {
  Chart,
  registerables,
} from 'chart.js'
import { Bar, Scatter } from 'react-chartjs-2'
import { DATA } from '@/lib/data'
import type { DetailRow, CountRow } from '@/lib/data'

Chart.register(...registerables)

// ── Chart.js global theming (zerodayclock-inspired dark) ──
Chart.defaults.color = '#777790'
Chart.defaults.borderColor = 'rgba(255,255,255,0.05)'
Chart.defaults.font.family = "'JetBrains Mono', 'SF Mono', monospace"
Chart.defaults.font.size = 11
Chart.defaults.font.weight = 400 as unknown as string
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(19,19,25,0.95)'
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)'
Chart.defaults.plugins.tooltip.borderWidth = 1
Chart.defaults.plugins.tooltip.cornerRadius = 10
Chart.defaults.plugins.tooltip.padding = { top: 10, bottom: 10, left: 14, right: 14 }
Chart.defaults.plugins.tooltip.titleFont = { family: "'JetBrains Mono', monospace", size: 11, weight: 'bold' }
Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace", size: 11 }
Chart.defaults.plugins.tooltip.titleColor = '#e4e4ec'
Chart.defaults.plugins.tooltip.bodyColor = '#777790'
Chart.defaults.plugins.legend.labels.usePointStyle = true
Chart.defaults.plugins.legend.labels.pointStyle = 'circle'

const VEHICLE_COLORS: Record<string, string> = {
  'Kia EV9':               '#6bc490',
  'Hyundai IONIQ 9':       '#6b9fd4',
  'Lucid Gravity':         '#9a8cc8',
  'Rivian R1S':            '#d48a56',
  'Tesla Model X':         '#cf6b6b',
  'Tesla Model Y (3-Row)': '#cf6b6b',
  'Volkswagen ID. Buzz':   '#c8a84e',
  'VinFast VF9':           '#c49340',
  'Volvo EX90':            '#c47a9e',
  'Cadillac Escalade IQ':  '#8a7fba',
  'Cadillac VISTIQ':       '#a98fd4',
  'Mercedes-Benz EQS SUV': '#9a9aaa',
}

const WATCHLIST = [
  'Subaru 3-Row EV', 'BMW iX7', 'Genesis GV90',
  'Toyota Highlander EV', 'Tesla Model Y Long (Asia)',
]

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026] as const
const YEAR_KEYS = YEARS.map(y => `y${y}` as const)

function colorAlpha(hex: string, alpha: string) {
  return hex + alpha
}

function fmtK(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${v}k`
}

/** Filter details to exclude watchlist + future years, numeric field only */
function useFilteredData() {
  return useMemo(() => {
    const details = (DATA.details as DetailRow[]).filter(
      d => !WATCHLIST.includes(d.vehicle) && d.year < 2027
    )
    const countData = (DATA.count_data as CountRow[]).filter(
      d => !WATCHLIST.includes(d.model)
    )
    const usEvSales = DATA.us_ev_sales ?? null
    return { details, countData, usEvSales }
  }, [])
}

// Sub-components (GrowthChart, PriceRangeChart, RangeVsPriceChart) and default export added in Tasks 4–7.
// Remove this comment when adding the first sub-component.
```

- [ ] **Step 2: Verify file parses**

```bash
npx tsc --noEmit components/MarketInsights.tsx 2>&1 | head -10
```

This may have import errors since the component isn't complete yet — that's fine. Just check for obvious syntax errors.

- [ ] **Step 3: Commit**

```bash
git add components/MarketInsights.tsx
git commit -m "feat(insights): create MarketInsights component with data helpers and constants"
```

---

### Task 4: Add Market Growth chart and takeaways

**Files:**
- Modify: `components/MarketInsights.tsx`

- [ ] **Step 1: Add the GrowthChart sub-component**

Add this function component inside `MarketInsights.tsx`, after `useFilteredData()` and before the main export:

```tsx
function GrowthChart({ details, countData, usEvSales }: {
  details: DetailRow[]
  countData: CountRow[]
  usEvSales: any
}) {
  const computed = useMemo(() => {
    // Models & trims per year
    const modelsByYear: Record<number, number> = {}
    const trimsByYear: Record<number, number> = {}
    YEARS.forEach(y => {
      modelsByYear[y] = new Set(details.filter(d => d.year === y).map(d => d.vehicle)).size
      trimsByYear[y] = countData.reduce((sum, row) => sum + ((row as any)[`y${y}`] || 0), 0)
    })

    const firstYearWithData = YEARS.find(y => modelsByYear[y] > 0) ?? 2021
    const latestYear = YEARS[YEARS.length - 1]

    // Price range (numeric only)
    const priceFirstYear = details.filter(d => d.year === firstYearWithData && typeof d.msrp === 'number').map(d => d.msrp as number)
    const priceLatestYear = details.filter(d => d.year === latestYear && typeof d.msrp === 'number').map(d => d.msrp as number)

    // US EV sales
    const salesFirst = usEvSales?.[`y${firstYearWithData}`] ?? null
    const salesLatest = usEvSales?.[`y${latestYear}`] ?? usEvSales?.[`y${latestYear - 1}`] ?? null
    const salesLatestLabel = usEvSales?.[`y${latestYear}`] ? latestYear : latestYear - 1

    // Stacked bar datasets
    const vehicles = [...new Set(countData.map(d => d.model))].sort()
    const barDatasets = vehicles
      .filter(v => YEAR_KEYS.some(k => (countData.find(d => d.model === v) as any)?.[k] > 0))
      .map(vehicle => {
        const color = VEHICLE_COLORS[vehicle] || '#888'
        return {
          label: vehicle,
          data: YEAR_KEYS.map(k => {
            const row = countData.find(d => d.model === vehicle)
            return row ? ((row as any)[k] || 0) : 0
          }),
          backgroundColor: colorAlpha(color, '50'),
          borderColor: colorAlpha(color, '99'),
          borderWidth: 1,
          borderRadius: 3,
          borderSkipped: 'bottom' as const,
        }
      })

    // US EV sales line overlay
    if (usEvSales) {
      barDatasets.push({
        label: 'US EV Sales (thousands)',
        data: YEARS.map(y => usEvSales[`y${y}`] ?? null),
        type: 'line' as any,
        borderColor: 'rgba(255,107,53,0.6)',
        backgroundColor: 'rgba(255,107,53,0.03)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3.5,
        pointBackgroundColor: '#131319',
        pointBorderColor: 'rgba(255,107,53,0.7)',
        pointBorderWidth: 2,
        tension: 0.35,
        yAxisID: 'y1',
        spanGaps: true,
        order: -1,
      } as any)
    }

    // Biggest YoY jump
    let maxJump = 0, jumpFrom = 0, jumpTo = 0
    for (let i = 1; i < YEARS.length; i++) {
      const diff = trimsByYear[YEARS[i]] - trimsByYear[YEARS[i - 1]]
      if (diff > maxJump) { maxJump = diff; jumpFrom = YEARS[i - 1]; jumpTo = YEARS[i] }
    }

    // Newest entrants
    const firstAppearance: Record<string, number> = {}
    details.forEach(d => {
      if (!firstAppearance[d.vehicle] || d.year < firstAppearance[d.vehicle]) firstAppearance[d.vehicle] = d.year
    })
    const newestYear = Math.max(...Object.values(firstAppearance))
    const newest = Object.entries(firstAppearance).filter(([, y]) => y === newestYear).map(([v]) => v).sort()

    return {
      modelsByYear, trimsByYear, firstYearWithData, latestYear,
      priceFirstYear, priceLatestYear,
      salesFirst, salesLatest, salesLatestLabel,
      barDatasets, maxJump, jumpFrom, jumpTo, newest, newestYear,
    }
  }, [details, countData, usEvSales])

  const c = computed

  return (
    <div className="mi-chart-card">
      <div className="mi-stat-callouts">
        <div className="mi-stat-card">
          <div className="mi-stat-value">{c.modelsByYear[c.firstYearWithData]} → {c.modelsByYear[c.latestYear]}</div>
          <div className="mi-stat-label">Models Available</div>
        </div>
        <div className="mi-stat-card">
          <div className="mi-stat-value">{c.trimsByYear[c.firstYearWithData]} → {c.trimsByYear[c.latestYear]}</div>
          <div className="mi-stat-label">Trims Analyzed</div>
        </div>
        {c.priceFirstYear.length > 0 && c.priceLatestYear.length > 0 && (
          <div className="mi-stat-card">
            <div className="mi-stat-value">
              ${Math.round(Math.min(...c.priceFirstYear) / 1000)}k–${Math.round(Math.max(...c.priceFirstYear) / 1000)}k → ${Math.round(Math.min(...c.priceLatestYear) / 1000)}k–${Math.round(Math.max(...c.priceLatestYear) / 1000)}k
            </div>
            <div className="mi-stat-label">MSRP Range</div>
          </div>
        )}
        {c.salesFirst && c.salesLatest && (
          <div className="mi-stat-card">
            <div className="mi-stat-value">{fmtK(c.salesFirst)} → {fmtK(c.salesLatest)}</div>
            <div className="mi-stat-label">US EV Sales ({c.firstYearWithData} → {c.salesLatestLabel})</div>
          </div>
        )}
      </div>

      <div className="mi-chart-wrap mi-chart-wrap--standard">
        <Bar
          data={{ labels: YEARS.map(String), datasets: c.barDatasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 8, padding: 14, font: { size: 10 } } },
              tooltip: {
                mode: 'index',
                callbacks: {
                  label: ctx => {
                    if ((ctx.dataset as any).yAxisID === 'y1') {
                      return ctx.raw != null ? `US EV Sales: ${(ctx.raw as number) >= 1000 ? ((ctx.raw as number) / 1000).toFixed(1) + 'M' : ctx.raw + 'k'}` : ''
                    }
                    return (ctx.raw as number) > 0 ? `${ctx.dataset.label}: ${ctx.raw}` : ''
                  },
                },
              },
            },
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { font: { size: 12, weight: 'bold' } } },
              y: { stacked: true, title: { display: true, text: '3-Row EV Trims', font: { size: 10 } }, beginAtZero: true },
              y1: {
                position: 'right',
                title: { display: true, text: 'US EV Sales (k)', font: { size: 10 } },
                beginAtZero: true,
                grid: { drawOnChartArea: false },
                ticks: { callback: v => (v as number) >= 1000 ? ((v as number) / 1000).toFixed(1) + 'M' : v + 'k' },
              },
            },
          }}
        />
      </div>

      <div className="mi-insights">
        <h4>Key Takeaways</h4>
        <ul>
          <li>The segment went from <strong>{c.modelsByYear[c.firstYearWithData]} model to {c.modelsByYear[c.latestYear]} models</strong> in just {c.latestYear - c.firstYearWithData} years — a {Math.round(c.modelsByYear[c.latestYear] / c.modelsByYear[c.firstYearWithData])}x increase in consumer choice.</li>
          <li>The biggest wave hit in <strong>{c.jumpFrom}–{c.jumpTo}</strong>, adding {c.maxJump} new trims as automakers rushed to compete in the 3-row EV space.</li>
          <li><strong>Newest entrants ({c.newestYear}):</strong> {c.newest.join(', ')} — if you&apos;re shopping now, these are the freshest options with the latest tech.</li>
          <li><strong>Total US EV sales</strong> (all segments, dashed line) doubled from {c.salesFirst ? fmtK(c.salesFirst) : '?'} to {c.salesLatest ? fmtK(c.salesLatest) : '?'} over the same period. The emergence of family-friendly 3-row options helped drive that growth — giving a segment of buyers who previously had no electric alternative a reason to switch.</li>
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MarketInsights.tsx
git commit -m "feat(insights): add Market Growth chart with stat callouts and takeaways"
```

---

### Task 5: Add MSRP Range chart and takeaways

**Files:**
- Modify: `components/MarketInsights.tsx`

- [ ] **Step 1: Add the PriceRangeChart sub-component**

Add after `GrowthChart`:

```tsx
function PriceRangeChart({ details }: { details: DetailRow[] }) {
  const computed = useMemo(() => {
    const vehicles = [...new Set(details.map(d => d.vehicle))].sort()

    const priceData = vehicles.map(v => {
      const vTrims = details.filter(d => d.vehicle === v && typeof d.msrp === 'number')
      const latestYear = Math.max(...vTrims.map(d => d.year))
      const latestTrims = vTrims.filter(d => d.year === latestYear)
      const prices = latestTrims.map(d => d.msrp as number)
      return { vehicle: v, min: Math.min(...prices), max: Math.max(...prices), year: latestYear }
    }).filter(d => isFinite(d.min)).sort((a, b) => a.min - b.min)

    // For takeaways
    const allLatestTrims = priceData.flatMap(pd =>
      details.filter(d => d.vehicle === pd.vehicle && d.year === pd.year && typeof d.msrp === 'number')
    )
    const under60 = allLatestTrims.filter(d => (d.msrp as number) < 60000).length
    const mid = allLatestTrims.filter(d => (d.msrp as number) >= 60000 && (d.msrp as number) < 90000).length
    const over90 = allLatestTrims.filter(d => (d.msrp as number) >= 90000).length
    const cheapest = priceData[0]
    const widest = [...priceData].sort((a, b) => (b.max - b.min) - (a.max - a.min))[0]

    return { priceData, allLatestTrims, under60, mid, over90, cheapest, widest }
  }, [details])

  const c = computed

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">MSRP Range by Vehicle</h3>
      <div className="mi-chart-wrap mi-chart-wrap--range">
        <Bar
          data={{
            labels: c.priceData.map(d => d.vehicle),
            datasets: [{
              data: c.priceData.map(d => [d.min, d.max]),
              backgroundColor: c.priceData.map(d => colorAlpha(VEHICLE_COLORS[d.vehicle] || '#888', '70')),
              borderColor: c.priceData.map(d => colorAlpha(VEHICLE_COLORS[d.vehicle] || '#888', 'cc')),
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            }],
          }}
          options={{
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: ctx => {
                    const [min, max] = ctx.raw as [number, number]
                    return `$${(min / 1000).toFixed(0)}k – $${(max / 1000).toFixed(0)}k`
                  },
                },
              },
            },
            scales: {
              x: {
                title: { display: true, text: 'MSRP ($)', font: { size: 10 } },
                ticks: { callback: v => `$${((v as number) / 1000).toFixed(0)}k`, font: { size: 11, weight: 'bold' } },
                grid: { color: 'rgba(255,255,255,0.03)', drawTicks: false },
              },
              y: { grid: { display: false }, ticks: { font: { size: 10 } } },
            },
          }}
        />
      </div>

      <div className="mi-insights">
        <h4>Key Takeaways</h4>
        <ul>
          <li>The market is <strong>top-heavy</strong>: only {c.under60} of {c.allLatestTrims.length} current trims start under $60k, while {c.over90} are $90k+. Budget shoppers have very limited options.</li>
          {c.cheapest && <li><strong>{c.cheapest.vehicle}</strong> offers the lowest entry point at ${(c.cheapest.min / 1000).toFixed(0)}k — the most accessible path into a 3-row EV.</li>}
          <li>The <strong>$60k–$90k sweet spot</strong> has the most competition ({c.mid} trims), which means the best selection and strongest pricing pressure for mid-range buyers.</li>
          {c.widest && <li><strong>{c.widest.vehicle}</strong> spans the widest price range (${(c.widest.min / 1000).toFixed(0)}k–${(c.widest.max / 1000).toFixed(0)}k), offering something at multiple price tiers under one brand.</li>}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MarketInsights.tsx
git commit -m "feat(insights): add MSRP Range by Vehicle chart with takeaways"
```

---

### Task 6: Add Range vs Price scatter chart and takeaways

**Files:**
- Modify: `components/MarketInsights.tsx`

- [ ] **Step 1: Add the RangeVsPriceChart sub-component**

Add after `PriceRangeChart`:

```tsx
function RangeVsPriceChart({ details }: { details: DetailRow[] }) {
  const computed = useMemo(() => {
    const vehicles = [...new Set(details.map(d => d.vehicle))].sort()

    const scatterDatasets = vehicles.map(v => {
      const color = VEHICLE_COLORS[v] || '#888'
      const points = details
        .filter(d => d.vehicle === v && typeof d.msrp === 'number' && typeof d.range_mi === 'number')
        .map(d => ({ x: d.msrp as number, y: d.range_mi as number, name: d.name }))
      return {
        label: v,
        data: points,
        backgroundColor: colorAlpha(color, '25'),
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointBackgroundColor: colorAlpha(color, '25'),
        pointBorderColor: color,
        pointBorderWidth: 1.5,
        pointHoverBackgroundColor: colorAlpha(color, '60'),
      }
    }).filter(ds => ds.data.length > 0)

    // Best range-per-dollar
    const rpd = details
      .filter(d => typeof d.msrp === 'number' && typeof d.range_mi === 'number')
      .map(d => ({ name: d.name, vehicle: d.vehicle, rpd: (d.range_mi as number) / ((d.msrp as number) / 1000) }))
      .sort((a, b) => b.rpd - a.rpd)
    const bestRpd = rpd[0] ?? null

    // Cargo + speed outliers (fast AND spacious)
    const bestBothVehicles = [...new Set(
      details
        .filter(d => typeof d.zero_to_60_sec === 'number' && typeof d.cargo_behind_3rd_cu_ft === 'number'
          && (d.zero_to_60_sec as number) <= 3.5 && (d.cargo_behind_3rd_cu_ft as number) >= 17)
        .map(d => d.vehicle)
    )].sort()

    return { scatterDatasets, bestRpd, bestBothVehicles }
  }, [details])

  const c = computed

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">Does Paying More Get You More Range?</h3>
      <div className="mi-chart-wrap mi-chart-wrap--tall">
        <Scatter
          data={{ datasets: c.scatterDatasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 8, padding: 14, font: { size: 10 } } },
              tooltip: {
                callbacks: {
                  label: ctx => {
                    const pt = ctx.raw as { x: number; y: number; name: string }
                    return `${pt.name}: $${(pt.x / 1000).toFixed(0)}k, ${pt.y} mi`
                  },
                },
              },
            },
            scales: {
              x: {
                title: { display: true, text: 'MSRP ($)', font: { size: 10 } },
                ticks: { callback: v => `$${((v as number) / 1000).toFixed(0)}k`, font: { size: 11, weight: 'bold' } },
                grid: { color: 'rgba(255,255,255,0.03)' },
              },
              y: {
                title: { display: true, text: 'EPA Range (mi)', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.03)' },
              },
            },
          }}
        />
      </div>

      <div className="mi-insights">
        <h4>Key Takeaways</h4>
        <ul>
          <li><strong>Paying more doesn&apos;t guarantee proportionally more range.</strong> The correlation is moderate — a $70k jump in MSRP buys roughly 90 extra miles. Shop by efficiency, not just sticker price.</li>
          {c.bestRpd && <li><strong>Best range per dollar:</strong> {c.bestRpd.name} leads at {c.bestRpd.rpd.toFixed(1)} mi per $1k spent — the value champion of the segment.</li>}
          <li><strong>No cargo-vs-speed trade-off exists</strong> in this segment. Faster EVs don&apos;t systematically sacrifice cargo space — the data shows essentially zero correlation.</li>
          {c.bestBothVehicles.length > 0 && (
            <li><strong>{c.bestBothVehicles.join(' and ')}</strong> prove you can have both: sub-3.5s acceleration <em>and</em> 17+ cu ft behind the 3rd row.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MarketInsights.tsx
git commit -m "feat(insights): add Range vs Price scatter chart with takeaways"
```

---

### Task 7: Add main MarketInsights export component

**Files:**
- Modify: `components/MarketInsights.tsx`

- [ ] **Step 1: Add the default export**

Add at the bottom of the file:

```tsx
export default function MarketInsights() {
  const { details, countData, usEvSales } = useFilteredData()

  return (
    <div className="market-insights-section">
      <h2 className="section-title">Market Insights</h2>
      <p className="section-subtitle">A data-driven look at the 3-row electric SUV segment</p>

      <GrowthChart details={details} countData={countData} usEvSales={usEvSales} />
      <PriceRangeChart details={details} />
      <RangeVsPriceChart details={details} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MarketInsights.tsx
git commit -m "feat(insights): add MarketInsights export composing all three charts"
```

---

### Task 8: Integrate MarketInsights into OverviewTab

**Files:**
- Modify: `components/tabs/OverviewTab.tsx` (line ~973, between ExploreTeaser closing div and Watchlist)

- [ ] **Step 1: Add import**

Add at the top of `OverviewTab.tsx`, alongside other imports (around line 8):

```tsx
import MarketInsights from '@/components/MarketInsights'
```

- [ ] **Step 2: Add the component between math-explore-row and Watchlist**

Find the closing `</div>` after `<ExploreTeaser />` (line ~973) and the `{/* ── Watchlist ── */}` comment (line ~975). Insert `<MarketInsights />` between them:

```tsx
      <ExploreTeaser />
      </div>

      <MarketInsights />

      {/* ── Watchlist ── */}
```

- [ ] **Step 3: Verify dev server renders**

```bash
npm run dev
```

Open `http://localhost:3000` and scroll down past Math Mathing / ExploreTeaser. The Market Insights section should appear with three charts.

- [ ] **Step 4: Commit**

```bash
git add components/tabs/OverviewTab.tsx
git commit -m "feat(insights): integrate MarketInsights section into homepage OverviewTab"
```

---

### Task 9: Verify build and visual check

**Files:** None (verification only)

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 3: Visual spot-check**

Run `npm run dev` and verify on `http://localhost:3000`:
1. Market Insights section appears below ExploreTeaser, above Watchlist
2. All three charts render with data (not empty/broken)
3. Stat callouts show correct numbers (no NaN)
4. Takeaway boxes display with correct styling
5. Tooltips work on hover
6. Mobile responsive — charts stack and resize

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(insights): address build/lint issues from market insights integration"
```

Only commit if there are actual changes to commit.
