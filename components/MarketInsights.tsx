'use client'

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { Bar, Scatter } from 'react-chartjs-2'
import { DATA, WATCHLIST_VEHICLES, type DetailRow, type CountRow, type USEVSales } from '@/lib/data'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// ── Global dark theme defaults ──────────────────────────────────────────────
ChartJS.defaults.color = '#9898b0'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.05)'
ChartJS.defaults.font.family = "'JetBrains Mono', 'SF Mono', monospace"
ChartJS.defaults.font.size = 12
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

const WATCHLIST: readonly string[] = WATCHLIST_VEHICLES

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

/** Format us_ev_sales values (stored in thousands) as 630k or 1.3M */
function fmtEvSales(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}M`
  return `${v}k`
}

// ── Theme-aware colors ──────────────────────────────────────────────────────
function useIsLightTheme() {
  const [light, setLight] = useState(false)
  useEffect(() => {
    function check() {
      setLight(document.documentElement.getAttribute('data-theme') === 'light')
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return light
}

function themeGrid(light: boolean) {
  return light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'
}

function themeBorder(light: boolean) {
  return light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'
}

// ── Shared canvas background plugin ─────────────────────────────────────────
function isLightMode() {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
}

const canvasBgPlugin = {
  id: 'canvasBg',
  beforeDraw(chart: any) {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    ctx.save()
    ctx.fillStyle = isLightMode() ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.02)'
    ctx.fillRect(chartArea.left, chartArea.top, chartArea.width, chartArea.height)
    ctx.restore()
  },
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

// ── Takeaway accordion helper ─────────────────────────────────────────────────
function Takeaway({ items, label }: { items: string[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((o) => !o), [])
  return (
    <div className={`mi-insights-accordion${open ? ' open' : ''}`} onClick={toggle}>
      <div className="mi-insights-toggle">
        <span>{label ?? 'Key Takeaways'}</span>
        <span className={`mi-insights-chevron${open ? ' open' : ''}`}>›</span>
      </div>
      {open && (
        <ul className="mi-insights">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Chart click helper ────────────────────────────────────────────────────────
function useChartClick(onVehicleClick?: (vehicle: string) => void) {
  const chartRef = useRef<any>(null)
  const onClick = useCallback((_event: any, elements: any[]) => {
    if (!onVehicleClick || !elements.length || !chartRef.current) return
    const el = elements[0]
    const ds = chartRef.current.data.datasets[el.datasetIndex]
    const label = ds?.label
    if (label && !label.startsWith('__') && label !== 'US EV Sales') {
      onVehicleClick(label)
    }
  }, [onVehicleClick])
  const onHover = useCallback((event: any, elements: any[]) => {
    const canvas = event?.native?.target as HTMLCanvasElement | undefined
    if (canvas) canvas.style.cursor = elements.length ? 'pointer' : ''
  }, [])
  return { chartRef, onClick, onHover }
}

// ── 1. GrowthChart ────────────────────────────────────────────────────────────
function GrowthChart({ onVehicleClick }: { onVehicleClick?: (vehicle: string) => void }) {
  const { chartRef, onClick, onHover } = useChartClick(onVehicleClick)
  const isLight = useIsLightTheme()
  const gridColor = themeGrid(isLight)
  const { count_data, us_ev_sales } = useFilteredData()

  const evSalesTotal = YEARS.map(y => us_ev_sales[`y${y}` as keyof typeof us_ev_sales] as number | null)

  // Per-year trim totals (for bar labels)
  const trimTotals = YEARS.map((_, yi) =>
    count_data.reduce((sum, row) => sum + ((row[YEAR_KEYS[yi]] as number) || 0), 0)
  )

  // Per-vehicle stacked bar datasets
  const barDatasets = count_data.map((row) => {
    const color = VEHICLE_COLORS[row.model] ?? '#888888'
    return {
      type: 'bar' as const,
      label: row.model,
      data: YEAR_KEYS.map((k) => (row[k] as number) || 0),
      backgroundColor: colorAlpha(color, '70'),
      borderColor: colorAlpha(color, 'cc'),
      borderWidth: 1,
      borderRadius: 0,
      yAxisID: 'y',
      stack: 'trims',
    }
  })

  // Line overlay — US EV sales (right y-axis), actual data only (2026 nulled out)
  const actualLineDataset = {
    type: 'line' as const,
    label: 'US EV Sales',
    data: evSalesTotal.map((v, i) => (i === YEARS.length - 1 ? null : v)),
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

  // Projected line segment (2025 → 2026)
  const lastActual = evSalesTotal[YEARS.length - 2]
  const projected2026 = evSalesTotal[YEARS.length - 1]
  const projectedLineDataset = {
    type: 'line' as const,
    label: '__projected__',
    data: YEARS.map((_, i) => {
      if (i === YEARS.length - 2) return lastActual
      if (i === YEARS.length - 1) return projected2026
      return null
    }),
    borderColor: 'rgba(255,160,60,0.85)',
    borderDash: [3, 3],
    borderWidth: 2,
    pointRadius: YEARS.map((_, i) => (i === YEARS.length - 1 ? 5 : 0)),
    pointBackgroundColor: 'transparent',
    pointBorderColor: 'rgba(255,160,60,0.9)',
    pointBorderWidth: 2,
    tension: 0,
    yAxisID: 'y2',
    fill: false,
    spanGaps: true,
  }

  const chartData = {
    labels: YEARS.map(String),
    datasets: [...barDatasets, actualLineDataset, projectedLineDataset],
  }

  // Custom plugin to draw trim totals on top of stacked bars
  const barLabelPlugin = {
    id: 'barLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart
      ctx.save()
      ctx.font = "700 14px 'JetBrains Mono', monospace"
      ctx.fillStyle = isLightMode() ? '#000' : '#e4e4ec'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      // Find the topmost bar y-position for each index
      YEARS.forEach((_, i) => {
        if (trimTotals[i] <= 0) return
        let minY = Infinity
        let xPos = 0
        for (let d = 0; d < chart.data.datasets.length; d++) {
          const meta = chart.getDatasetMeta(d)
          if (meta.type !== 'bar') continue
          const bar = meta.data[i]
          if (bar && bar.y < minY) {
            minY = bar.y
            xPos = bar.x
          }
        }
        if (minY < Infinity) {
          ctx.fillText(String(trimTotals[i]), xPos, minY - 6)
        }
      })
      ctx.restore()
    },
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick,
    onHover,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          boxWidth: 12, padding: 14,
          filter: (item) => item.text !== '__projected__',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            if (ctx.dataset.label === '__projected__') {
              return ` 2026 est.: ~1.26M (Cox Automotive)`
            }
            if (ctx.dataset.label === 'US EV Sales') {
              return ` US EV Sales: ${fmtEvSales(ctx.parsed.y as number)}`
            }
            if (ctx.parsed.y === 0) return ''
            return ` ${ctx.dataset.label}: ${ctx.parsed.y} trims`
          },
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { color: gridColor }, ticks: { font: { size: 12 } } },
      y: {
        stacked: true,
        position: 'left',
        title: { display: true, text: 'Trims Available', font: { size: 13 } },
        grid: { color: gridColor },
        ticks: { font: { size: 12 } },
      },
      y2: {
        position: 'right',
        title: { display: true, text: 'US EV Sales', font: { size: 13 } },
        grid: { drawOnChartArea: false },
        ticks: { callback: (v: number | string) => fmtEvSales(Number(v)), font: { size: 12 } },
      },
    },
  }

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">3-Row EVs: A Market That (almost) Didn&apos;t Exist 5 Years Ago</h3>
      <p className="mi-chart-subtitle">From a handful of trims in 2021 to nearly 50 by 2026 — the segment exploded as the broader US EV market crossed 1M annual sales.</p>
      <div className="mi-chart-wrap" style={{ height: 440 }}>
        {/* @ts-expect-error mixed chart type */}
        <Bar ref={chartRef} data={chartData} options={options} plugins={[barLabelPlugin, canvasBgPlugin]} />
      </div>

      <Takeaway
        items={[
          'Segment grew from a handful of trims in 2021 to a crowded field by 2025–26, with multiple new entrants launching simultaneously.',
          'The biggest year-over-year wave hit 2025–26 as Hyundai IONIQ 9, Cadillac VISTIQ, and Lucid Gravity all entered in the same window.',
          'Newest entrants (IONIQ 9, Lucid Gravity, VISTIQ) are still building out their trim ladders — expect more options in 2026–27.',
          'US EV sales crossed 1M units in 2023 and continued climbing, validating the broader market shift that is drawing all these 3-row launches.',
          '2026 US EV sales projection (~1.26M) from Cox Automotive 2026 Outlook.',
        ]}
      />
    </div>
  )
}

// ── 2. PriceRangeChart ────────────────────────────────────────────────────────
function PriceRangeChart({ onVehicleClick }: { onVehicleClick?: (vehicle: string) => void }) {
  const priceChartRef = useRef<any>(null)
  const isLight = useIsLightTheme()
  const gridColor = themeGrid(isLight)
  const { details } = useFilteredData()

  type VehicleRange = { vehicle: string; min: number; max: number }
  const byVehicle: Record<string, number[]> = {}

  details.forEach((r) => {
    if (typeof r.msrp !== 'number') return
    if (!byVehicle[r.vehicle]) byVehicle[r.vehicle] = []
    byVehicle[r.vehicle].push(r.msrp)
  })

  const ranges: VehicleRange[] = Object.entries(byVehicle)
    .map(([vehicle, prices]) => {
      const lo = Math.min(...prices)
      const hi = Math.max(...prices)
      return { vehicle, min: lo, max: hi }
    })
    .sort((a, b) => a.min - b.min)

  const chartData = {
    labels: ranges.map((r) => r.vehicle),
    datasets: [
      {
        label: 'MSRP Range',
        data: ranges.map((r) => r.min === r.max ? [r.min - 500, r.max + 500] : [r.min, r.max]),
        backgroundColor: ranges.map((r) => colorAlpha(VEHICLE_COLORS[r.vehicle] ?? '#888888', '99')),
        borderColor: ranges.map((r) => colorAlpha(VEHICLE_COLORS[r.vehicle] ?? '#888888', 'ee')),
        borderWidth: 1.5,
        borderRadius: 3,
        borderSkipped: false,
      },
    ],
  }

  // Plugin: draw min/max price labels at bar ends + diamond for single-price
  const priceEndLabelPlugin = {
    id: 'priceEndLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      if (!meta) return
      ctx.save()
      ctx.font = "500 10px 'JetBrains Mono', monospace"
      ctx.textBaseline = 'middle'

      meta.data.forEach((bar: any, i: number) => {
        const { min: lo, max: hi } = ranges[i]
        const borderColor = chartData.datasets[0].borderColor[i]
        ctx.fillStyle = borderColor

        if (lo === hi) {
          // Single-price: draw diamond marker + single label
          const xPos = chart.scales.x.getPixelForValue(lo)
          const yPos = bar.y
          const s = 5
          ctx.beginPath()
          ctx.moveTo(xPos, yPos - s)
          ctx.lineTo(xPos + s, yPos)
          ctx.lineTo(xPos, yPos + s)
          ctx.lineTo(xPos - s, yPos)
          ctx.closePath()
          ctx.fill()
          ctx.textAlign = 'left'
          ctx.fillText(`$${Math.round(lo / 1000)}k`, xPos + 8, yPos)
        } else {
          // Min label (left of bar)
          ctx.textAlign = 'right'
          ctx.fillText(`$${Math.round(lo / 1000)}k`, bar.base - 4, bar.y)
          // Max label (right of bar)
          ctx.textAlign = 'left'
          ctx.fillText(`$${Math.round(hi / 1000)}k`, bar.x + 4, bar.y)
        }
      })
      ctx.restore()
    },
  }

  // Plugin: alternating row shading
  const rowShadingPlugin = {
    id: 'rowShading',
    beforeDatasetsDraw(chart: any) {
      const { ctx, chartArea, scales: { y } } = chart
      if (!chartArea || !y) return
      ctx.save()
      const tickCount = y.ticks.length
      for (let i = 0; i < tickCount; i++) {
        if (i % 2 !== 0) continue
        const rowHeight = tickCount > 1
          ? Math.abs(y.getPixelForTick(1) - y.getPixelForTick(0))
          : chartArea.height
        const yStart = y.getPixelForTick(i) - rowHeight / 2
        ctx.fillStyle = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.02)'
        ctx.fillRect(chartArea.left, yStart, chartArea.width, rowHeight)
      }
      ctx.restore()
    },
  }

  // Plugin: reference lines at $60k and $100k
  const refLinePlugin = {
    id: 'refLines',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea, scales: { x } } = chart
      if (!chartArea || !x) return
      ctx.save()
      ;[60000, 100000].forEach((val) => {
        const xPos = x.getPixelForValue(val)
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(xPos, chartArea.top)
        ctx.lineTo(xPos, chartArea.bottom)
        ctx.stroke()
      })
      ctx.setLineDash([])
      ctx.font = "9px 'JetBrains Mono', monospace"
      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.25)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('Mass Market', (x.getPixelForValue(40000) + x.getPixelForValue(60000)) / 2, chartArea.bottom + 4)
      ctx.fillText('Luxury', (x.getPixelForValue(100000) + x.getPixelForValue(185000)) / 2, chartArea.bottom + 4)
      ctx.restore()
    },
  }

  const priceBarClick = useCallback((_event: any, elements: any[]) => {
    if (!onVehicleClick || !elements.length) return
    const vehicle = ranges[elements[0].index]?.vehicle
    if (vehicle) onVehicleClick(vehicle)
  }, [onVehicleClick, ranges])

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    onClick: priceBarClick,
    onHover: (event: any, elements: any[]) => {
      const canvas = event?.native?.target as HTMLCanvasElement | undefined
      if (canvas) canvas.style.cursor = elements.length ? 'pointer' : ''
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const { min: lo, max: hi } = ranges[ctx.dataIndex]
            if (lo === hi) return ` $${fmtK(lo)}`
            return ` $${fmtK(lo)} – $${fmtK(hi)}`
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'MSRP (USD)', font: { size: 13 } },
        grid: { color: gridColor },
        min: 40000,
        max: 185000,
        afterBuildTicks: (axis: any) => {
          axis.ticks = [50000, 75000, 100000, 125000, 150000, 175000].map(v => ({ value: v }))
        },
        ticks: {
          callback: (v: number | string) => `$${fmtK(Number(v))}`,
          font: { size: 12 },
        },
      },
      y: { grid: { color: gridColor }, ticks: { font: { size: 12 } } },
    },
  }

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">MSRP Range by Vehicle</h3>
      <p className="mi-chart-subtitle">Most of the segment lives above $70k — only Kia and VinFast offer true mass-market entry points below $60k.</p>
      <div className="mi-chart-wrap" style={{ height: `${Math.max(260, ranges.length * 36 + 60)}px` }}>
        <Bar ref={priceChartRef} data={chartData} options={options} plugins={[rowShadingPlugin, refLinePlugin, priceEndLabelPlugin, canvasBgPlugin]} />
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
function RangeVsPriceChart({ onVehicleClick }: { onVehicleClick?: (vehicle: string) => void }) {
  const { chartRef: scatterRef, onClick: scatterClick, onHover: scatterHover } = useChartClick(onVehicleClick)
  const isLight = useIsLightTheme()
  const gridColor = themeGrid(isLight)
  const { details } = useFilteredData()

  // Deduplicate: keep only trims from each vehicle's latest year
  const latestYearByVehicle: Record<string, number> = {}
  details.forEach((r) => {
    if (typeof r.msrp !== 'number' || typeof r.range_mi !== 'number') return
    latestYearByVehicle[r.vehicle] = Math.max(latestYearByVehicle[r.vehicle] ?? 0, r.year)
  })

  const byVehicle: Record<string, Array<{ x: number; y: number; name: string }>> = {}
  details.forEach((r) => {
    if (typeof r.msrp !== 'number' || typeof r.range_mi !== 'number') return
    if (r.year !== latestYearByVehicle[r.vehicle]) return
    if (!byVehicle[r.vehicle]) byVehicle[r.vehicle] = []
    byVehicle[r.vehicle].push({ x: r.msrp, y: r.range_mi, name: r.trim })
  })

  const scatterDatasets = Object.entries(byVehicle).map(([vehicle, points]) => {
    const color = VEHICLE_COLORS[vehicle] ?? '#888888'
    return {
      label: vehicle,
      data: points,
      backgroundColor: colorAlpha(color, '60'),
      borderColor: color,
      borderWidth: 1.5,
      pointRadius: 5.5,
      pointHoverRadius: 7,
    }
  })

  // Linear regression trend line
  const allPoints = scatterDatasets.flatMap(ds => ds.data)
  const n = allPoints.length
  const sumX = allPoints.reduce((s, p) => s + p.x, 0)
  const sumY = allPoints.reduce((s, p) => s + p.y, 0)
  const sumXY = allPoints.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = allPoints.reduce((s, p) => s + p.x * p.x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const xMin = Math.min(...allPoints.map(p => p.x))
  const xMax = Math.max(...allPoints.map(p => p.x))

  const trendDataset = {
    label: '__trend__',
    type: 'line' as const,
    data: [{ x: xMin, y: slope * xMin + intercept }, { x: xMax, y: slope * xMax + intercept }],
    pointRadius: 0,
    borderDash: [6, 4],
    borderColor: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    fill: false,
  }

  // Median values for quadrant lines
  const sortedPrices = allPoints.map(p => p.x).sort((a, b) => a - b)
  const sortedRanges = allPoints.map(p => p.y).sort((a, b) => a - b)
  const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)]
  const medianRange = sortedRanges[Math.floor(sortedRanges.length / 2)]

  // Plugin: quadrant annotations
  const quadrantPlugin = {
    id: 'quadrants',
    beforeDatasetsDraw(chart: any) {
      const { ctx, chartArea, scales: { x, y } } = chart
      if (!chartArea) return
      const mx = x.getPixelForValue(medianPrice)
      const my = y.getPixelForValue(medianRange)
      ctx.save()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(mx, chartArea.top); ctx.lineTo(mx, chartArea.bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(chartArea.left, my); ctx.lineTo(chartArea.right, my); ctx.stroke()
      ctx.restore()
    },
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea, scales: { x, y } } = chart
      if (!chartArea) return
      const mx = x.getPixelForValue(medianPrice)
      const my = y.getPixelForValue(medianRange)
      ctx.save()
      ctx.font = "italic 9px 'JetBrains Mono', monospace"
      ctx.fillStyle = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'
      ctx.textAlign = 'center'
      const pad = 14
      ctx.fillText('High Range, Lower Price', (chartArea.left + mx) / 2, chartArea.top + pad)
      ctx.fillText('High Range, Premium', (mx + chartArea.right) / 2, chartArea.top + pad)
      ctx.fillText('Lower Range, Lower Price', (chartArea.left + mx) / 2, chartArea.bottom - pad)
      ctx.fillText('Lower Range, Premium', (mx + chartArea.right) / 2, chartArea.bottom - pad)
      ctx.restore()
    },
  }

  const chartData = { datasets: [...scatterDatasets, trendDataset] }

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: scatterClick,
    onHover: scatterHover,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12, padding: 14,
          filter: (item) => item.text !== '__trend__',
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'scatter'>) => {
            if (ctx.dataset.label === '__trend__') return ''
            const raw = ctx.raw as { x: number; y: number; name: string }
            return ` ${raw.name}: $${fmtK(raw.x)}, ${raw.y} mi`
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'MSRP (USD)', font: { size: 13 } },
        grid: { color: gridColor },
        ticks: { callback: (v: number | string) => `$${fmtK(Number(v))}`, font: { size: 12 } },
      },
      y: {
        title: { display: true, text: 'EPA Range (mi)', font: { size: 13 } },
        grid: { color: gridColor },
        ticks: { font: { size: 12 } },
      },
    },
  }

  return (
    <div className="mi-chart-card">
      <h3 className="mi-chart-title">Does Paying More Get You More Range?</h3>
      <p className="mi-chart-subtitle">Not really — the correlation is weak. Performance trims often sacrifice range for power, while value trims punch above their price.</p>
      <div className="mi-chart-wrap" style={{ height: 500 }}>
        {/* @ts-expect-error mixed chart type */}
        <Scatter ref={scatterRef} data={chartData} options={options} plugins={[quadrantPlugin, canvasBgPlugin]} />
      </div>
      <Takeaway
        items={[
          'Weak price-range correlation: spending more does not guarantee more range — performance trims often trade range for power.',
          'Best range-per-dollar belongs to the Kia EV9 Standard Range and Hyundai IONIQ 9 entry trims, which offer competitive range at lower price points.',
          'The trend line confirms a weak price-range correlation — the segment\'s priciest trims don\'t consistently deliver more range.',
        ]}
      />
    </div>
  )
}

// ── Default export ────────────────────────────────────────────────────────────
export default function MarketInsights({ onVehicleClick }: { onVehicleClick?: (vehicle: string) => void } = {}) {
  return (
    <section className="mi-section">
      <div className="mi-header">
        <h2 className="mi-title">Market Insights</h2>
        <p className="mi-intro">Now that you&apos;ve found your match, here&apos;s how the 3-row EV landscape stacks up — growth trends, pricing tiers, and what you really get for your money.</p>
      </div>

      <GrowthChart onVehicleClick={onVehicleClick} />
      <PriceRangeChart onVehicleClick={onVehicleClick} />
      <RangeVsPriceChart onVehicleClick={onVehicleClick} />
    </section>
  )
}
