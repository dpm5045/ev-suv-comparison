'use client'

import { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { Bar, Scatter } from 'react-chartjs-2'
import { DATA, type DetailRow, type CountRow, type USEVSales } from '@/lib/data'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// ── Global dark theme defaults ──────────────────────────────────────────────
ChartJS.defaults.color = '#777790'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.05)'
ChartJS.defaults.font.family = "'JetBrains Mono', 'SF Mono', monospace"
ChartJS.defaults.font.size = 11
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(19,19,25,0.95)'
ChartJS.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.10)'
ChartJS.defaults.plugins.tooltip.borderWidth = 1
ChartJS.defaults.plugins.tooltip.cornerRadius = 10
ChartJS.defaults.plugins.tooltip.padding = 10
ChartJS.defaults.plugins.tooltip.titleColor = '#c8c8e0'
ChartJS.defaults.plugins.tooltip.bodyColor = '#9898b0'
ChartJS.defaults.plugins.legend.labels.usePointStyle = true
ChartJS.defaults.plugins.legend.labels.pointStyle = 'circle'

// ── Constants ────────────────────────────────────────────────────────────────
const VEHICLE_COLORS: Record<string, string> = {
  'Kia EV9':                '#6bc490',
  'Hyundai IONIQ 9':        '#6b9fd4',
  'Lucid Gravity':          '#9a8cc8',
  'Rivian R1S':             '#d48a56',
  'Tesla Model X':          '#cf6b6b',
  'Tesla Model Y (3-Row)':  '#cf6b6b',
  'Volkswagen ID. Buzz':    '#c8a84e',
  'VinFast VF9':            '#c49340',
  'Volvo EX90':             '#c47a9e',
  'Cadillac Escalade IQ':   '#8a7fba',
  'Cadillac VISTIQ':        '#a98fd4',
  'Mercedes-Benz EQS SUV':  '#9a9aaa',
}

const WATCHLIST = [
  'Subaru 3-Row EV',
  'BMW iX7',
  'Genesis GV90',
  'Toyota Highlander EV',
  'Tesla Model Y Long (Asia)',
]

const YEARS: number[] = [2021, 2022, 2023, 2024, 2025, 2026]
const YEAR_KEYS: (keyof CountRow)[] = ['y2021', 'y2022', 'y2023', 'y2024', 'y2025', 'y2026']

// ── Helpers ──────────────────────────────────────────────────────────────────
function colorAlpha(hex: string, alpha: string): string {
  return hex + alpha
}

function fmtK(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

// ── Filtered data hook ────────────────────────────────────────────────────────
function useFilteredData() {
  return useMemo(() => {
    const details: DetailRow[] = DATA.details.filter(
      (r) => !WATCHLIST.includes(r.vehicle) && r.year < 2027,
    )
    const count_data: CountRow[] = DATA.count_data.filter(
      (r) => !WATCHLIST.includes(r.model),
    )
    const us_ev_sales: USEVSales = DATA.us_ev_sales
    return { details, count_data, us_ev_sales }
  }, [])
}

// ── Takeaway box helper ───────────────────────────────────────────────────────
function Takeaway({ items }: { items: string[] }) {
  return (
    <ul className="mi-insights">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

// ── 1. GrowthChart ────────────────────────────────────────────────────────────
function GrowthChart() {
  const { details, count_data, us_ev_sales } = useFilteredData()

  // Stat callouts — per-year comparisons matching market-insights.html
  const modelsByYear: Record<number, number> = {}
  const trimsByYear: Record<number, number> = {}
  YEARS.forEach(y => {
    modelsByYear[y] = new Set(details.filter(d => d.year === y).map(d => d.vehicle)).size
    trimsByYear[y] = count_data.reduce((sum, row) => sum + ((row[`y${y}` as keyof typeof row] as number) || 0), 0)
  })
  const firstYearWithData = YEARS.find(y => modelsByYear[y] > 0) ?? 2021
  const latestYear = YEARS[YEARS.length - 1]

  const priceFirstYear = details.filter(d => d.year === firstYearWithData && typeof d.msrp === 'number').map(d => d.msrp as number)
  const priceLatestYear = details.filter(d => d.year === latestYear && typeof d.msrp === 'number').map(d => d.msrp as number)

  const salesFirst = us_ev_sales[`y${firstYearWithData}` as keyof typeof us_ev_sales] as number | null
  const salesLatest = (us_ev_sales[`y${latestYear}` as keyof typeof us_ev_sales] ?? us_ev_sales[`y${latestYear - 1}` as keyof typeof us_ev_sales]) as number | null
  const salesLatestLabel = us_ev_sales[`y${latestYear}` as keyof typeof us_ev_sales] ? latestYear : latestYear - 1

  const evSalesTotal = YEARS.map(y => us_ev_sales[`y${y}` as keyof typeof us_ev_sales] as number | null)

  // Bar datasets — one per vehicle
  const vehicles = count_data.map((r) => r.model)
  const barDatasets = vehicles.map((vehicle) => {
    const row = count_data.find((r) => r.model === vehicle)!
    const color = VEHICLE_COLORS[vehicle] ?? '#888888'
    return {
      type: 'bar' as const,
      label: vehicle,
      data: YEAR_KEYS.map((k) => (row[k] as number) ?? 0),
      backgroundColor: colorAlpha(color, '50'),
      borderColor: colorAlpha(color, '99'),
      borderWidth: 1,
      borderRadius: 3,
      stack: 'trims',
      yAxisID: 'y',
    }
  })

  // Line overlay — US EV sales (right y-axis)
  const lineDataset = {
    type: 'line' as const,
    label: 'US EV Sales',
    data: evSalesTotal.map((v) => (v === null ? null : v)),
    borderColor: 'rgba(255,160,60,0.85)',
    backgroundColor: 'rgba(255,160,60,0.10)',
    borderDash: [5, 4],
    borderWidth: 2,
    pointRadius: 4,
    pointBackgroundColor: 'rgba(255,160,60,0.9)',
    tension: 0.3,
    yAxisID: 'y2',
    fill: false,
    spanGaps: true,
  }

  const chartData = {
    labels: YEARS.map(String),
    datasets: [...barDatasets, lineDataset],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            if (ctx.dataset.label === 'US EV Sales') {
              return ` US EV Sales: ${fmtK(ctx.parsed.y as number)}`
            }
            return ` ${ctx.dataset.label}: ${ctx.parsed.y} trim${(ctx.parsed.y as number) !== 1 ? 's' : ''}`
          },
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: {
        stacked: true,
        position: 'left',
        title: { display: true, text: 'Trims Available' },
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { stepSize: 1 },
      },
      y2: {
        position: 'right',
        title: { display: true, text: 'US EV Sales' },
        grid: { drawOnChartArea: false },
        ticks: { callback: (v: number | string) => fmtK(Number(v)) },
      },
    },
  }

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">Segment Growth by Year</h3>

      <div className="mi-stat-callouts">
        <div className="mi-stat-card">
          <span className="mi-stat-value">{modelsByYear[firstYearWithData]} → {modelsByYear[latestYear]}</span>
          <span className="mi-stat-label">Models Available</span>
        </div>
        <div className="mi-stat-card">
          <span className="mi-stat-value">{trimsByYear[firstYearWithData]} → {trimsByYear[latestYear]}</span>
          <span className="mi-stat-label">Trims Analyzed</span>
        </div>
        {priceFirstYear.length > 0 && priceLatestYear.length > 0 && (
          <div className="mi-stat-card">
            <span className="mi-stat-value">
              ${Math.round(Math.min(...priceFirstYear) / 1000)}k–${Math.round(Math.max(...priceFirstYear) / 1000)}k → ${Math.round(Math.min(...priceLatestYear) / 1000)}k–${Math.round(Math.max(...priceLatestYear) / 1000)}k
            </span>
            <span className="mi-stat-label">MSRP Range</span>
          </div>
        )}
        {salesFirst && salesLatest && (
          <div className="mi-stat-card">
            <span className="mi-stat-value">{fmtK(salesFirst)} → {fmtK(salesLatest)}</span>
            <span className="mi-stat-label">US EV Sales ({firstYearWithData} → {salesLatestLabel})</span>
          </div>
        )}
      </div>

      <div className="mi-chart-wrap" style={{ height: 420 }}>
        {/* @ts-expect-error mixed chart type */}
        <Bar data={chartData} options={options} />
      </div>

      <Takeaway
        items={[
          'Segment grew from a handful of trims in 2021 to a crowded field by 2025–26, with multiple new entrants launching simultaneously.',
          'The biggest year-over-year wave hit 2025–26 as Hyundai IONIQ 9, Cadillac VISTIQ, and Lucid Gravity all entered in the same window.',
          'Newest entrants (IONIQ 9, Lucid Gravity, VISTIQ) are still building out their trim ladders — expect more options in 2026–27.',
          'US EV sales crossed 1M units in 2023 and continued climbing, validating the broader market shift that is drawing all these 3-row launches.',
        ]}
      />
    </div>
  )
}

// ── 2. PriceRangeChart ────────────────────────────────────────────────────────
function PriceRangeChart() {
  const { details } = useFilteredData()

  // For each vehicle, get [min, max] MSRP across their latest available year
  type VehicleRange = { vehicle: string; min: number; max: number }
  const byVehicle: Record<string, number[]> = {}

  details.forEach((r) => {
    if (typeof r.msrp !== 'number') return
    if (!byVehicle[r.vehicle]) byVehicle[r.vehicle] = []
    byVehicle[r.vehicle].push(r.msrp)
  })

  const ranges: VehicleRange[] = Object.entries(byVehicle)
    .map(([vehicle, prices]) => ({
      vehicle,
      min: Math.min(...prices),
      max: Math.max(...prices),
    }))
    .sort((a, b) => a.min - b.min)

  const chartData = {
    labels: ranges.map((r) => r.vehicle),
    datasets: [
      {
        label: 'MSRP Range',
        data: ranges.map((r) => [r.min, r.max]),
        backgroundColor: ranges.map((r) => colorAlpha(VEHICLE_COLORS[r.vehicle] ?? '#888888', '70')),
        borderColor: ranges.map((r) => colorAlpha(VEHICLE_COLORS[r.vehicle] ?? '#888888', 'cc')),
        borderWidth: 1.5,
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const [lo, hi] = ctx.parsed._custom
              ? [ctx.parsed._custom.min, ctx.parsed._custom.max]
              : [ctx.parsed.x, ctx.parsed.x]
            return ` $${fmtK(lo ?? 0)} – $${fmtK(hi ?? 0)}`
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'MSRP (USD)' },
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          callback: (v: number | string) => `$${fmtK(Number(v))}`,
        },
      },
      y: { grid: { color: 'rgba(255,255,255,0.04)' } },
    },
  }

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">MSRP Range by Vehicle (All Trims)</h3>
      <div className="mi-chart-wrap" style={{ height: `${Math.max(260, ranges.length * 36 + 60)}px` }}>
        <Bar data={chartData} options={options} />
      </div>
      <Takeaway
        items={[
          'The market skews top-heavy: over half the vehicles start above $70k, confirming this is primarily a luxury / near-luxury segment.',
          'Cheapest entry point is the Kia EV9 and VinFast VF9, both accessible below $60k — the only true mass-market options in the segment.',
          'The $60k–$90k sweet spot holds the most competition, with Volvo, Rivian, Hyundai, and Cadillac VISTIQ all clustering here.',
          'Widest trim spread belongs to Rivian R1S, whose range spans from around $70k to well over $100k depending on pack and performance tier.',
        ]}
      />
    </div>
  )
}

// ── 3. RangeVsPriceChart ──────────────────────────────────────────────────────
function RangeVsPriceChart() {
  const { details } = useFilteredData()

  // Group by vehicle, each point is {x: msrp, y: range_mi, name: trim_name}
  const byVehicle: Record<string, Array<{ x: number; y: number; name: string }>> = {}

  details.forEach((r) => {
    if (typeof r.msrp !== 'number') return
    if (typeof r.range_mi !== 'number') return
    if (!byVehicle[r.vehicle]) byVehicle[r.vehicle] = []
    byVehicle[r.vehicle].push({ x: r.msrp, y: r.range_mi, name: r.trim })
  })

  const datasets = Object.entries(byVehicle).map(([vehicle, points]) => {
    const color = VEHICLE_COLORS[vehicle] ?? '#888888'
    return {
      label: vehicle,
      data: points,
      backgroundColor: colorAlpha(color, '25'),
      borderColor: color,
      borderWidth: 1.5,
      pointRadius: 4.5,
      pointHoverRadius: 6,
    }
  })

  const chartData = { datasets }

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'scatter'>) => {
            const raw = ctx.raw as { x: number; y: number; name: string }
            return ` ${raw.name}: $${fmtK(raw.x)}, ${raw.y} mi`
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'MSRP (USD)' },
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { callback: (v: number | string) => `$${fmtK(Number(v))}` },
      },
      y: {
        title: { display: true, text: 'EPA Range (mi)' },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
    },
  }

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">Range vs. Price (All Trims)</h3>
      <div className="mi-chart-wrap" style={{ height: 480 }}>
        <Scatter data={chartData} options={options} />
      </div>
      <Takeaway
        items={[
          'Weak price-range correlation: spending more does not guarantee more range — performance trims often trade range for power.',
          'Best range-per-dollar belongs to the Kia EV9 Standard Range and Hyundai IONIQ 9 entry trims, which offer competitive range at lower price points.',
          'No cargo-vs-speed tradeoff is visible in the data — vehicles with the largest cargo volumes are spread evenly across the range-price scatter.',
        ]}
      />
    </div>
  )
}

// ── Default export ────────────────────────────────────────────────────────────
export default function MarketInsights() {
  return (
    <section className="mi-section">
      <div className="mi-header">
        <h2 className="mi-title">Market Insights</h2>
        <p className="mi-subtitle">
          Segment trends, pricing landscape, and range-value analysis across all
          tracked 3-row AWD electric SUVs.
        </p>
      </div>

      <GrowthChart />
      <PriceRangeChart />
      <RangeVsPriceChart />
    </section>
  )
}
