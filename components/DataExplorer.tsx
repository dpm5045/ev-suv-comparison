'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { DATA } from '@/lib/data'
import type { DetailRow } from '@/lib/data'

// ── Constants ──────────────────────────────────────────────────────

const VEHICLE_COLORS: Record<string, string> = {
  'Kia EV9':               '#4ade80',
  'Hyundai IONIQ 9':       '#5ba4f5',
  'Lucid Gravity':         '#a78bfa',
  'Rivian R1S':            '#fb923c',
  'Tesla Model X':         '#f87171',
  'Tesla Model Y (3-Row)': '#f87171',
  'Volkswagen ID. Buzz':   '#fbbf24',
  'VinFast VF9':           '#f59e0b',
  'Volvo EX90':            '#f472b6',
  'Cadillac Escalade IQ':  '#a78bfa',
  'Cadillac VISTIQ':       '#c084fc',
  'Mercedes-Benz EQS SUV': '#d4d4d8',
}

const WATCHLIST = [
  'Subaru 3-Row EV',
  'BMW iX7',
  'Genesis GV90',
  'Toyota Highlander EV',
  'Tesla Model Y Long (Asia)',
]

const SELF_DRIVING_TIERS: Record<string, number> = {
  'Basic L2':           2.1,
  'Advanced L2':        2.2,
  'L2+ Hands-Free':     2.3,
  'L2+ Point-to-Point': 2.4,
}

const TIER_SHORT: Record<string, string> = {
  'Basic L2':           'Basic L2',
  'Advanced L2':        'Adv. L2',
  'L2+ Hands-Free':     'L2+ HF',
  'L2+ Point-to-Point': 'L2+ P2P',
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
  msrp:                      'MSRP ($)',
  otd_new:                   'OTD New Price ($)',
  range_mi:                  'Range (miles)',
  hp:                        'Horsepower',
  battery_kwh:               'Battery (kWh)',
  towing_lbs:                'Towing Capacity (lbs)',
  dc_fast_charge_kw:         'DC Fast Charge (kW)',
  dc_fast_charge_10_80_min:  'DC Charge 10\u201380% (min)',
  curb_weight_lbs:           'Curb Weight (lbs)',
  length_in:                 'Length (in)',
  width_in:                  'Width (in)',
  height_in:                 'Height (in)',
  third_row_legroom_in:      '3rd Row Legroom (in)',
  third_row_headroom_in:     '3rd Row Headroom (in)',
  torque_lb_ft:              'Torque (lb-ft)',
  zero_to_60_sec:            '0\u201360 mph (sec)',
  ground_clearance_in:       'Ground Clearance (in)',
  cargo_behind_3rd_cu_ft:    'Cargo Behind 3rd Row (cu ft)',
  cargo_behind_2nd_cu_ft:    'Cargo Behind 2nd Row (cu ft)',
  cargo_behind_1st_cu_ft:    'Cargo Behind 1st Row (cu ft)',
  cargo_floor_width_in:      'Cargo Floor Width (in)',
  frunk_cu_ft:               'Frunk (cu ft)',
  onboard_ac_kw:             'Onboard AC Charger (kW)',
  l2_10_100:                 'L2 Charge 10\u2013100% (hrs)',
  l2_10_80:                  'L2 Charge 10\u201380% (hrs)',
  destination:               'Destination Charge ($)',
  self_driving_score:        'Self-Driving Tier',
}

const FIELD_DIRECTION: Record<string, number> = {
  msrp:                      -1,
  otd_new:                   -1,
  range_mi:                   1,
  hp:                         1,
  battery_kwh:                1,
  towing_lbs:                 1,
  dc_fast_charge_kw:          1,
  dc_fast_charge_10_80_min:  -1,
  curb_weight_lbs:           -1,
  length_in:                  0,
  width_in:                   0,
  height_in:                  0,
  third_row_legroom_in:       1,
  third_row_headroom_in:      1,
  torque_lb_ft:               1,
  zero_to_60_sec:            -1,
  ground_clearance_in:        1,
  cargo_behind_3rd_cu_ft:     1,
  cargo_behind_2nd_cu_ft:     1,
  cargo_behind_1st_cu_ft:     1,
  cargo_floor_width_in:       1,
  frunk_cu_ft:                1,
  onboard_ac_kw:              1,
  l2_10_100:                 -1,
  l2_10_80:                  -1,
  destination:               -1,
  self_driving_score:         1,
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
  'self_driving_score',
  'battery_kwh', 'towing_lbs',
  'dc_fast_charge_kw', 'dc_fast_charge_10_80_min',
  'third_row_legroom_in', 'third_row_headroom_in',
  'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft', 'cargo_behind_1st_cu_ft',
  'cargo_floor_width_in', 'frunk_cu_ft',
]

const RANGE_BUCKETS = [
  '200\u2013250 mi', '250\u2013300 mi', '300\u2013325 mi',
  '325\u2013350 mi', '350\u2013400 mi', '400+ mi',
]

// ── Data preprocessing ─────────────────────────────────────────────

interface ProcessedRow extends Record<string, unknown> {
  name: string
  vehicle: string
  year: number
  trim: string
  seats: number | null
  drivetrain: string
  range_mi: number | null
  self_driving_tier: string | null
  self_driving_score: number | null
}

function preprocessData(): ProcessedRow[] {
  return (DATA.details as DetailRow[])
    .filter(d => !WATCHLIST.includes(d.vehicle))
    .map(d => {
      const row: Record<string, unknown> = { ...d }
      for (const f of NUMERIC_FIELDS) {
        const v = Number(row[f])
        row[f] = Number.isNaN(v) ? null : v
      }
      row.self_driving_score = SELF_DRIVING_TIERS[d.self_driving_tier ?? ''] ?? null
      return row as ProcessedRow
    })
}

// ── Quadrant label logic ───────────────────────────────────────────

function shortName(field: string): string {
  return SHORT_NAMES[field] || FIELD_LABELS[field] || field
}

interface QuadrantLabels {
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
}

function getQuadrantLabels(xField: string, yField: string): QuadrantLabels | null {
  const xDir = FIELD_DIRECTION[xField] ?? 0
  const yDir = FIELD_DIRECTION[yField] ?? 0
  if (xDir === 0 && yDir === 0) return null

  const xHighGood = xDir === 1
  const xHighBad  = xDir === -1
  const yHighGood = yDir === 1
  const yHighBad  = yDir === -1

  function score(xHigh: boolean, yHigh: boolean): number {
    let s = 0
    if (xDir !== 0) s += (xHigh ? xHighGood : xHighBad) ? 1 : -1
    if (yDir !== 0) s += (yHigh ? yHighGood : yHighBad) ? 1 : -1
    return s
  }

  function label(s: number, xHigh: boolean, yHigh: boolean): string {
    if (s === 2)  return 'Best Value'
    if (s === -2) return 'Worst Value'
    if (s === 0 && xDir !== 0 && yDir !== 0) {
      const xGood = (xHigh && xHighGood) || (!xHigh && xHighBad)
      if (xGood) return 'Good ' + shortName(xField) + ',\nWeak ' + shortName(yField)
      else return 'Good ' + shortName(yField) + ',\nWeak ' + shortName(xField)
    }
    if (xDir === 0) return yHigh ? (yHighGood ? 'Strong' : 'Weak') : (yHighBad ? 'Weak' : 'Strong')
    if (yDir === 0) return xHigh ? (xHighGood ? 'Strong' : 'Weak') : (xHighBad ? 'Weak' : 'Strong')
    return ''
  }

  const tl = score(false, true)
  const tr = score(true, true)
  const bl = score(false, false)
  const br = score(true, false)

  return {
    topLeft:     label(tl, false, true),
    topRight:    label(tr, true, true),
    bottomLeft:  label(bl, false, false),
    bottomRight: label(br, true, false),
  }
}

// ── Range bucket matching ──────────────────────────────────────────

function matchesBucket(range: number | null, selectedBuckets: Set<string>, totalBuckets: number): boolean {
  if (range == null) return selectedBuckets.size === totalBuckets
  if (range >= 200 && range < 250 && selectedBuckets.has('200\u2013250 mi')) return true
  if (range >= 250 && range < 300 && selectedBuckets.has('250\u2013300 mi')) return true
  if (range >= 300 && range < 325 && selectedBuckets.has('300\u2013325 mi')) return true
  if (range >= 325 && range < 350 && selectedBuckets.has('325\u2013350 mi')) return true
  if (range >= 350 && range < 400 && selectedBuckets.has('350\u2013400 mi')) return true
  if (range >= 400 && selectedBuckets.has('400+ mi')) return true
  return false
}

// ── MultiSelectDropdown sub-component ──────────────────────────────

interface MultiSelectOption {
  value: string
  color?: string
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  allLabel,
  noneLabel,
  shortLabels,
}: {
  options: MultiSelectOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  allLabel: string
  noneLabel: string
  shortLabels?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const allSelected = selected.size === options.length
  const btnText = allSelected
    ? allLabel + ' \u25BC'
    : selected.size === 0
      ? noneLabel + ' \u25BC'
      : shortLabels && selected.size <= 2
        ? [...selected].map(v => v.split(' ')[0]).join(', ') + ' \u25BC'
        : `${selected.size} Selected \u25BC`

  function toggleAll() {
    if (allSelected) onChange(new Set())
    else onChange(new Set(options.map(o => o.value)))
  }

  function toggle(value: string) {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(next)
  }

  return (
    <div className="explorer-dropdown" ref={ref}>
      <button
        className="explorer-dropdown-btn"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        type="button"
      >
        {btnText}
      </button>
      {open && (
        <div className="explorer-dropdown-content">
          <button className="explorer-select-all-btn" onClick={toggleAll} type="button">
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {options.map(opt => (
            <label key={opt.value} className="explorer-checkbox-label">
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              {opt.color && (
                <span className="explorer-color-dot" style={{ background: opt.color }} />
              )}
              {opt.value}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main DataExplorer component ────────────────────────────────────

export default function DataExplorer() {
  // Preprocess data once
  const [allData] = useState<ProcessedRow[]>(() => preprocessData())
  const vehicles = [...new Set(allData.map(d => d.vehicle))].sort()
  const years = [...new Set(allData.map(d => d.year))].sort((a, b) => a - b)

  // Filter state
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(() => new Set(vehicles))
  const [selectedYears, setSelectedYears] = useState<Set<string>>(() => new Set(years.map(String)))
  const [seats, setSeats] = useState('all')
  const [drivetrain, setDrivetrain] = useState('all')
  const [selectedRanges, setSelectedRanges] = useState<Set<string>>(() => new Set(RANGE_BUCKETS))

  // Axis state
  const [xAxis, setXAxis] = useState('msrp')
  const [yAxis, setYAxis] = useState('range_mi')
  const [bubbleSize, setBubbleSize] = useState('none')

  // Libs loaded dynamically
  const [libs, setLibs] = useState<{ Plot: typeof import('@observablehq/plot'); d3: typeof import('d3') } | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // Load Plot + d3 on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      const [Plot, d3] = await Promise.all([
        import('@observablehq/plot'),
        import('d3'),
      ])
      if (!cancelled) setLibs({ Plot, d3 })
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Filtered data
  const filtered = allData.filter(d => {
    if (!selectedVehicles.has(d.vehicle)) return false
    if (!selectedYears.has(String(d.year))) return false
    if (seats !== 'all' && d.seats !== Number(seats)) return false
    if (drivetrain !== 'all' && d.drivetrain !== drivetrain) return false
    if (!matchesBucket(d.range_mi, selectedRanges, RANGE_BUCKETS.length)) return false
    return true
  })

  // Chart rendering
  const renderChart = useCallback(() => {
    if (!libs || !chartRef.current) return
    const { Plot, d3 } = libs
    const container = chartRef.current
    container.innerHTML = ''

    const plotData = filtered.filter(d => d[xAxis] != null && d[yAxis] != null)

    if (plotData.length === 0) {
      container.innerHTML = '<p class="explorer-empty">No data for this combination.</p>'
      return
    }

    const visibleVehicles = [...new Set(plotData.map(d => d.vehicle))].sort()
    const isCurrency = (f: string) => ['msrp', 'otd_new', 'destination'].includes(f)
    const xFormat = isCurrency(xAxis) ? d3.format('$,.0f') : undefined
    const yFormat = isCurrency(yAxis) ? d3.format('$,.0f') : undefined

    // Read CSS variables from root
    const rootStyle = getComputedStyle(document.documentElement)
    const textMuted = rootStyle.getPropertyValue('--text-muted').trim() || '#8b96ad'
    const surfaceColor = rootStyle.getPropertyValue('--surface').trim() || '#151921'
    const borderColor = rootStyle.getPropertyValue('--border').trim() || '#2a3347'
    const textDim = rootStyle.getPropertyValue('--text-dim').trim() || '#5c6780'

    const tierLabels = Object.entries(SELF_DRIVING_TIERS)

    const buildAxisConfig = (field: string, fmt: ((n: number) => string) | undefined) => {
      if (field === 'self_driving_score') {
        return {
          label: FIELD_LABELS[field],
          domain: [2.0, 2.5] as [number, number],
          ticks: tierLabels.map(([, v]) => v),
          tickFormat: (v: number) => {
            const t = tierLabels.find(([, n]) => n === v)
            return t ? TIER_SHORT[t[0]] : ''
          },
        }
      }
      return { label: FIELD_LABELS[field], tickFormat: fmt }
    }

    const xConfig = buildAxisConfig(xAxis, xFormat)
    const yConfig = buildAxisConfig(yAxis, yFormat)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const marks: any[] = []

    // Quadrant crosshair lines and labels
    const xMedian = d3.median(plotData, d => d[xAxis] as number)
    const yMedian = d3.median(plotData, d => d[yAxis] as number)

    if (xMedian != null && yMedian != null) {
      marks.push(
        Plot.ruleX([xMedian], { stroke: borderColor, strokeWidth: 1, strokeDasharray: '6,4' }),
        Plot.ruleY([yMedian], { stroke: borderColor, strokeWidth: 1, strokeDasharray: '6,4' }),
      )

      const labels = getQuadrantLabels(xAxis, yAxis)
      if (labels) {
        const xMin = d3.min(plotData, d => d[xAxis] as number) ?? 0
        const xMax = d3.max(plotData, d => d[xAxis] as number) ?? 0
        const yMin = d3.min(plotData, d => d[yAxis] as number) ?? 0
        const yMax = d3.max(plotData, d => d[yAxis] as number) ?? 0
        const xLow  = xMedian - (xMedian - xMin) * 0.5
        const xHigh = xMedian + (xMax - xMedian) * 0.5
        const yLow  = yMedian - (yMedian - yMin) * 0.5
        const yHigh = yMedian + (yMax - yMedian) * 0.5

        const quadrants = [
          { x: xLow,  y: yHigh, text: labels.topLeft },
          { x: xHigh, y: yHigh, text: labels.topRight },
          { x: xLow,  y: yLow,  text: labels.bottomLeft },
          { x: xHigh, y: yLow,  text: labels.bottomRight },
        ].filter(q => q.text)

        marks.push(
          Plot.text(quadrants, {
            x: 'x', y: 'y', text: 'text', textAnchor: 'middle',
            fill: textDim, fontStyle: 'italic', fontSize: 13, lineAnchor: 'middle',
          })
        )
      }
    }

    // Dot mark
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dotOpts: Record<string, any> = {
      x: xAxis,
      y: yAxis,
      fill: 'vehicle',
      fillOpacity: 0.8,
      stroke: surfaceColor,
      strokeWidth: 1,
      tip: true,
    }

    const buildTitle = (d: ProcessedRow) => {
      let t = `${d.name}\n${FIELD_LABELS[xAxis]}: ${isCurrency(xAxis) ? '$' + d3.format(',')(d[xAxis] as number) : d[xAxis]}`
      t += `\n${FIELD_LABELS[yAxis]}: ${isCurrency(yAxis) ? '$' + d3.format(',')(d[yAxis] as number) : d[yAxis]}`
      return t
    }

    if (bubbleSize !== 'none') {
      const sizeData = plotData.filter(d => d[bubbleSize] != null)
      dotOpts.r = bubbleSize
      dotOpts.title = (d: ProcessedRow) => {
        let t = buildTitle(d)
        if (d[bubbleSize] != null) t += `\n${FIELD_LABELS[bubbleSize]}: ${d[bubbleSize]}`
        return t
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plotConfig: Record<string, any> = {
        width: container.clientWidth || 900,
        height: 560,
        marginTop: 20,
        marginRight: 20,
        marginBottom: 45,
        marginLeft: 60,
        style: { background: 'transparent', color: textMuted, fontSize: '12px' },
        grid: true,
        x: xConfig,
        y: yConfig,
        color: {
          domain: visibleVehicles,
          range: visibleVehicles.map(v => VEHICLE_COLORS[v] || '#888'),
        },
        r: { domain: d3.extent(sizeData, d => d[bubbleSize] as number), range: [4, 20] },
        marks: [...marks, Plot.dot(plotData, dotOpts)],
      }
      const plot = Plot.plot(plotConfig)
      container.appendChild(plot)
    } else {
      dotOpts.r = 6
      dotOpts.title = buildTitle

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plotConfig: Record<string, any> = {
        width: container.clientWidth || 900,
        height: 560,
        marginTop: 20,
        marginRight: 20,
        marginBottom: 45,
        marginLeft: 60,
        style: { background: 'transparent', color: textMuted, fontSize: '12px' },
        grid: true,
        x: xConfig,
        y: yConfig,
        color: {
          domain: visibleVehicles,
          range: visibleVehicles.map(v => VEHICLE_COLORS[v] || '#888'),
        },
        marks: [...marks, Plot.dot(plotData, dotOpts)],
      }
      const plot = Plot.plot(plotConfig)
      container.appendChild(plot)
    }
  }, [libs, filtered, xAxis, yAxis, bubbleSize])

  // Re-render chart when dependencies change
  useEffect(() => {
    renderChart()
  }, [renderChart])

  // Re-render on resize
  useEffect(() => {
    function handleResize() { renderChart() }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderChart])

  // Visible vehicles for legend
  const legendVehicles = [...new Set(filtered.map(d => d.vehicle))].sort()

  // Vehicle options with colors
  const vehicleOptions: MultiSelectOption[] = vehicles.map(v => ({
    value: v,
    color: VEHICLE_COLORS[v] || '#888',
  }))

  const yearOptions: MultiSelectOption[] = years.map(y => ({ value: String(y) }))
  const rangeOptions: MultiSelectOption[] = RANGE_BUCKETS.map(r => ({ value: r }))

  return (
    <div className="explorer">
      <h1 className="section-title">3-Row Electric Vehicle Explorer</h1>
      <p className="count-note">
        Interactive scatter plot of {allData.length} trims across {vehicles.length} vehicles.
        Use the filters and axis selectors below to explore the data.
      </p>

      {/* Filter row */}
      <div className="explorer-controls">
        <span className="explorer-controls-label">Filter</span>

        <div className="explorer-control-group">
          <label>Vehicles</label>
          <MultiSelectDropdown
            options={vehicleOptions}
            selected={selectedVehicles}
            onChange={setSelectedVehicles}
            allLabel="All Vehicles"
            noneLabel="None Selected"
            shortLabels
          />
        </div>

        <div className="explorer-control-group">
          <label>Years</label>
          <MultiSelectDropdown
            options={yearOptions}
            selected={selectedYears}
            onChange={setSelectedYears}
            allLabel="All Years"
            noneLabel="No Years"
          />
        </div>

        <div className="explorer-control-group">
          <label>Seats</label>
          <select
            className="explorer-select"
            value={seats}
            onChange={e => setSeats(e.target.value)}
          >
            <option value="all">All</option>
            <option value="6">6</option>
            <option value="7">7</option>
          </select>
        </div>

        <div className="explorer-control-group">
          <label>Drivetrain</label>
          <select
            className="explorer-select"
            value={drivetrain}
            onChange={e => setDrivetrain(e.target.value)}
          >
            <option value="all">All</option>
            <option value="AWD">AWD</option>
            <option value="RWD">RWD</option>
          </select>
        </div>

        <div className="explorer-control-group">
          <label>Range</label>
          <MultiSelectDropdown
            options={rangeOptions}
            selected={selectedRanges}
            onChange={setSelectedRanges}
            allLabel="All Ranges"
            noneLabel="No Range"
          />
        </div>
      </div>

      {/* Axis row */}
      <div className="explorer-controls">
        <span className="explorer-controls-label">Plot</span>

        <div className="explorer-control-group">
          <label>X-Axis</label>
          <select
            className="explorer-select"
            value={xAxis}
            onChange={e => setXAxis(e.target.value)}
          >
            {PLOTTABLE_FIELDS.map(f => (
              <option key={f} value={f}>{FIELD_LABELS[f]}</option>
            ))}
          </select>
        </div>

        <div className="explorer-control-group">
          <label>Y-Axis</label>
          <select
            className="explorer-select"
            value={yAxis}
            onChange={e => setYAxis(e.target.value)}
          >
            {PLOTTABLE_FIELDS.map(f => (
              <option key={f} value={f}>{FIELD_LABELS[f]}</option>
            ))}
          </select>
        </div>

        <div className="explorer-control-group">
          <label>Bubble Size</label>
          <select
            className="explorer-select"
            value={bubbleSize}
            onChange={e => setBubbleSize(e.target.value)}
          >
            <option value="none">None (fixed size)</option>
            {PLOTTABLE_FIELDS.map(f => (
              <option key={f} value={f}>{FIELD_LABELS[f]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="explorer-chart-area">
        {!libs ? (
          <p className="explorer-loading">Loading chart engine...</p>
        ) : (
          <div className="explorer-chart-container" ref={chartRef} />
        )}

        {/* Legend */}
        {libs && legendVehicles.length > 0 && (
          <div className="explorer-legend">
            {legendVehicles.map(v => (
              <span key={v} className="explorer-legend-item">
                <span className="explorer-color-dot" style={{ background: VEHICLE_COLORS[v] || '#888' }} />
                {v}
              </span>
            ))}
          </div>
        )}

        <p className="explorer-chart-note">
          Dashed lines show the median. Quadrant labels indicate relative value based on whether higher or lower is better for each metric.
        </p>
      </div>
    </div>
  )
}
