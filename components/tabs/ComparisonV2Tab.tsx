'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DATA } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from '../VehicleBadge'
import type { ComparisonFilters } from '../Dashboard'

/* ── Range bucket definitions ── */

interface Bucket { label: string; test: (v: number) => boolean }

const MSRP_BUCKETS: Bucket[] = [
  { label: 'Under $60k', test: (v) => v < 60000 },
  { label: '$60k\u2013$90k', test: (v) => v >= 60000 && v <= 90000 },
  { label: '$90k+', test: (v) => v > 90000 },
]
const HP_BUCKETS: Bucket[] = [
  { label: 'Under 400', test: (v) => v < 400 },
  { label: '400\u2013650', test: (v) => v >= 400 && v <= 650 },
  { label: '650+', test: (v) => v > 650 },
]
const RANGE_BUCKETS: Bucket[] = [
  { label: 'Under 275 mi', test: (v) => v < 275 },
  { label: '275\u2013325 mi', test: (v) => v >= 275 && v <= 325 },
  { label: '325+ mi', test: (v) => v > 325 },
]
const BATTERY_BUCKETS: Bucket[] = [
  { label: 'Under 90', test: (v) => v < 90 },
  { label: '90\u2013110', test: (v) => v >= 90 && v <= 110 },
  { label: '110+', test: (v) => v > 110 },
]
const PREOWNED_BUCKETS: Bucket[] = [
  { label: 'Under $40k', test: (v) => v < 40000 },
  { label: '$40k\u2013$60k', test: (v) => v >= 40000 && v <= 60000 },
  { label: '$60k+', test: (v) => v > 60000 },
]
const TORQUE_BUCKETS: Bucket[] = [
  { label: 'Under 500', test: (v) => v < 500 },
  { label: '500\u2013700', test: (v) => v >= 500 && v <= 700 },
  { label: '700+', test: (v) => v > 700 },
]
const ZERO60_BUCKETS: Bucket[] = [
  { label: 'Under 4s', test: (v) => v < 4 },
  { label: '4\u20136s', test: (v) => v >= 4 && v <= 6 },
  { label: '6s+', test: (v) => v > 6 },
]
const WEIGHT_BUCKETS: Bucket[] = [
  { label: 'Under 5,500', test: (v) => v < 5500 },
  { label: '5,500\u20136,500', test: (v) => v >= 5500 && v <= 6500 },
  { label: '6,500+', test: (v) => v > 6500 },
]
const TOWING_BUCKETS: Bucket[] = [
  { label: 'Under 3,500', test: (v) => v < 3500 },
  { label: '3,500\u20135,000', test: (v) => v >= 3500 && v <= 5000 },
  { label: '5,000+', test: (v) => v >= 5000 },
  { label: '7,000+', test: (v) => v >= 7000 },
]
const DCKW_BUCKETS: Bucket[] = [
  { label: 'Under 200', test: (v) => v < 200 },
  { label: '200\u2013250', test: (v) => v >= 200 && v <= 250 },
  { label: '250+', test: (v) => v > 250 },
]
const DC1080_BUCKETS: Bucket[] = [
  { label: 'Under 25 min', test: (v) => v < 25 },
  { label: '25\u201335 min', test: (v) => v >= 25 && v <= 35 },
  { label: '35+ min', test: (v) => v > 35 },
]
const LENGTH_BUCKETS: Bucket[] = [
  { label: 'Under 198"', test: (v) => v < 198 },
  { label: '198\u2013202"', test: (v) => v >= 198 && v <= 202 },
  { label: '202"+', test: (v) => v > 202 },
]
const WIDTH_BUCKETS: Bucket[] = [
  { label: 'Under 78"', test: (v) => v < 78 },
  { label: '78\u201380"', test: (v) => v >= 78 && v <= 80 },
  { label: '80"+', test: (v) => v > 80 },
]
const HEIGHT_BUCKETS: Bucket[] = [
  { label: 'Under 68"', test: (v) => v < 68 },
  { label: '68\u201372"', test: (v) => v >= 68 && v <= 72 },
  { label: '72"+', test: (v) => v > 72 },
]
const CLEARANCE_BUCKETS: Bucket[] = [
  { label: 'Under 7"', test: (v) => v < 7 },
  { label: '7\u20138"', test: (v) => v >= 7 && v <= 8 },
  { label: '8"+', test: (v) => v > 8 },
]
const LEG3_BUCKETS: Bucket[] = [
  { label: 'Under 31"', test: (v) => v < 31 },
  { label: '31\u201333"', test: (v) => v >= 31 && v <= 33 },
  { label: '33"+', test: (v) => v > 33 },
]
const HEAD3_BUCKETS: Bucket[] = [
  { label: 'Under 37"', test: (v) => v < 37 },
  { label: '37\u201339"', test: (v) => v >= 37 && v <= 39 },
  { label: '39"+', test: (v) => v > 39 },
]
const FRUNK_BUCKETS: Bucket[] = [
  { label: 'Has Frunk', test: (v) => v > 0 },
  { label: 'No Frunk', test: (v) => v === 0 },
]
const CARGO3_BUCKETS: Bucket[] = [
  { label: 'Under 15', test: (v) => v < 15 },
  { label: '15\u201320', test: (v) => v >= 15 && v <= 20 },
  { label: '20+', test: (v) => v > 20 },
]
const CARGO2_BUCKETS: Bucket[] = [
  { label: 'Under 40', test: (v) => v < 40 },
  { label: '40\u201355', test: (v) => v >= 40 && v <= 55 },
  { label: '55+', test: (v) => v > 55 },
]
const CARGO1_BUCKETS: Bucket[] = [
  { label: 'Under 75', test: (v) => v < 75 },
  { label: '75\u2013100', test: (v) => v >= 75 && v <= 100 },
  { label: '100+', test: (v) => v > 100 },
]
const FLOOR_BUCKETS: Bucket[] = [
  { label: 'Under 44"', test: (v) => v < 44 },
  { label: '44\u201350"', test: (v) => v >= 44 && v <= 50 },
  { label: '50"+', test: (v) => v > 50 },
]

function parsePreownedLow(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/[$,]/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

function matchesBuckets(value: number | string | null | undefined, buckets: Bucket[], selectedLabels: string[]): boolean {
  if (selectedLabels.length === 0) return true
  if (typeof value !== 'number') return false
  return selectedLabels.some(label => {
    const bucket = buckets.find(b => b.label === label)
    return bucket ? bucket.test(value) : false
  })
}

/* ── FilterableHeader — renders dropdown via portal to avoid overflow clipping ── */

function FilterableHeader({ label, options, selected, onChange, className, isOpen, onToggle }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
  className?: string
  isOpen: boolean
  onToggle: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const hasFilter = selected.length > 0
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) {
        onToggle()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onToggle()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [isOpen, onToggle])

  function toggle(val: string) {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
    onChange(next)
  }

  return (
    <th className={className}>
      <button ref={btnRef} className="col-filter-btn" onClick={onToggle}>
        <span>{label}</span>
        <span className={`col-filter-icon${hasFilter ? ' active' : ''}`}>{isOpen ? '\u25B4' : '\u25BE'}</span>
      </button>
      {isOpen && createPortal(
        <div
          ref={dropRef}
          className="col-filter-dropdown"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
        >
          {selected.length > 0 && (
            <button className="multi-select-clear" onClick={() => onChange([])}>Select all</button>
          )}
          {options.map(opt => (
            <label key={opt} className="multi-select-option">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </th>
  )
}

/* ── MultiSelect dropdown (for mobile filter bar) ── */

function MultiSelect({ label, allLabel, options, selected, onChange }: {
  label: string
  allLabel: string
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [])

  function toggle(val: string) {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
    onChange(next)
  }

  const btnLabel = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ${label.toLowerCase()}s`

  return (
    <div className="multi-select" ref={ref}>
      <button className="multi-select-btn" onClick={() => setOpen(!open)}>
        <span className="multi-select-text">{btnLabel}</span>
        <span className="multi-select-arrow">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open && (
        <div className="multi-select-dropdown">
          {selected.length > 0 && (
            <button className="multi-select-clear" onClick={() => onChange([])}>Select all</button>
          )}
          {options.map(opt => (
            <label key={opt} className="multi-select-option">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Component ── */

interface Props {
  filters: ComparisonFilters
  onFiltersChange: (f: Partial<ComparisonFilters>) => void
  onRowClick: (idx: number) => void
}

export default function ComparisonV2Tab({ filters, onFiltersChange, onRowClick }: Props) {
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards')
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [bucketFilters, setBucketFilters] = useState<Record<string, string[]>>({})

  const vehicles = useMemo(() => [...new Set(DATA.details.map((d) => d.vehicle))].sort(), [])
  const years = useMemo(() => [...new Set(DATA.details.map((d) => d.year).filter(Boolean))].sort() as number[], [])
  const trimOptions = useMemo(() => [...new Set(DATA.details.map((d) => d.trim).filter(Boolean))].sort(), [])
  const drivetrains = useMemo(() => [...new Set(DATA.details.map((d) => d.drivetrain).filter(Boolean))].sort(), [])
  const seatOptions = useMemo(() => [...new Set(DATA.details.map((d) => d.seats).filter((s): s is number => s != null))].sort((a, b) => a - b).map(String), [])
  const chargingOptions = useMemo(() => [...new Set(DATA.details.map((d) => d.charging_type).filter(Boolean))].sort(), [])
  const foldFlatOptions = useMemo(() => [...new Set(DATA.details.map((d) => d.fold_flat).filter(Boolean))].sort() as string[], [])

  const selectedVehicles = filters.vehicle ? filters.vehicle.split(',') : []
  const selectedYears = filters.year ? filters.year.split(',') : []
  const selectedTrims = filters.trim ? filters.trim.split(',') : []
  const selectedDrivetrains = filters.drivetrain ? filters.drivetrain.split(',') : []
  const selectedSeats = filters.seats ? filters.seats.split(',') : []
  const selectedCharging = filters.charging ? filters.charging.split(',') : []
  const selectedFoldFlat = filters.foldFlat ? filters.foldFlat.split(',') : []

  const updateBucket = useCallback((key: string, vals: string[]) => {
    setBucketFilters(prev => ({ ...prev, [key]: vals }))
  }, [])

  const filtered = useMemo(() => {
    const sv = filters.vehicle ? filters.vehicle.split(',') : []
    const sy = filters.year ? filters.year.split(',') : []
    const st = filters.trim ? filters.trim.split(',') : []
    const sd = filters.drivetrain ? filters.drivetrain.split(',') : []
    const ss = filters.seats ? filters.seats.split(',') : []
    const sc = filters.charging ? filters.charging.split(',') : []
    const sf = filters.foldFlat ? filters.foldFlat.split(',') : []
    let rows = DATA.details
    if (sv.length) rows = rows.filter((r) => sv.includes(r.vehicle))
    if (sy.length) rows = rows.filter((r) => sy.includes(String(r.year)))
    if (st.length) rows = rows.filter((r) => st.includes(r.trim))
    if (sd.length) rows = rows.filter((r) => sd.includes(r.drivetrain))
    if (ss.length) rows = rows.filter((r) => ss.includes(String(r.seats)))
    if (sc.length) rows = rows.filter((r) => sc.includes(r.charging_type))
    if (sf.length) rows = rows.filter((r) => sf.includes(r.fold_flat || ''))
    // Bucket filters (local state)
    if (bucketFilters.msrp?.length) rows = rows.filter((r) => matchesBuckets(r.msrp, MSRP_BUCKETS, bucketFilters.msrp))
    if (bucketFilters.hp?.length) rows = rows.filter((r) => matchesBuckets(r.hp, HP_BUCKETS, bucketFilters.hp))
    if (bucketFilters.range?.length) rows = rows.filter((r) => matchesBuckets(r.range_mi, RANGE_BUCKETS, bucketFilters.range))
    if (bucketFilters.battery?.length) rows = rows.filter((r) => matchesBuckets(r.battery_kwh, BATTERY_BUCKETS, bucketFilters.battery))
    if (bucketFilters.preowned?.length) rows = rows.filter((r) => matchesBuckets(parsePreownedLow(r.preowned_range), PREOWNED_BUCKETS, bucketFilters.preowned))
    if (bucketFilters.torque?.length) rows = rows.filter((r) => matchesBuckets(r.torque_lb_ft, TORQUE_BUCKETS, bucketFilters.torque))
    if (bucketFilters.zero60?.length) rows = rows.filter((r) => matchesBuckets(r.zero_to_60_sec, ZERO60_BUCKETS, bucketFilters.zero60))
    if (bucketFilters.weight?.length) rows = rows.filter((r) => matchesBuckets(r.curb_weight_lbs, WEIGHT_BUCKETS, bucketFilters.weight))
    if (bucketFilters.towing?.length) rows = rows.filter((r) => matchesBuckets(r.towing_lbs, TOWING_BUCKETS, bucketFilters.towing))
    if (bucketFilters.dckw?.length) rows = rows.filter((r) => matchesBuckets(r.dc_fast_charge_kw, DCKW_BUCKETS, bucketFilters.dckw))
    if (bucketFilters.dc1080?.length) rows = rows.filter((r) => matchesBuckets(r.dc_fast_charge_10_80_min, DC1080_BUCKETS, bucketFilters.dc1080))
    if (bucketFilters.length?.length) rows = rows.filter((r) => matchesBuckets(r.length_in, LENGTH_BUCKETS, bucketFilters.length))
    if (bucketFilters.width?.length) rows = rows.filter((r) => matchesBuckets(r.width_in, WIDTH_BUCKETS, bucketFilters.width))
    if (bucketFilters.height?.length) rows = rows.filter((r) => matchesBuckets(r.height_in, HEIGHT_BUCKETS, bucketFilters.height))
    if (bucketFilters.clearance?.length) rows = rows.filter((r) => matchesBuckets(r.ground_clearance_in, CLEARANCE_BUCKETS, bucketFilters.clearance))
    if (bucketFilters.leg3?.length) rows = rows.filter((r) => matchesBuckets(r.third_row_legroom_in, LEG3_BUCKETS, bucketFilters.leg3))
    if (bucketFilters.head3?.length) rows = rows.filter((r) => matchesBuckets(r.third_row_headroom_in, HEAD3_BUCKETS, bucketFilters.head3))
    if (bucketFilters.frunk?.length) rows = rows.filter((r) => matchesBuckets(typeof r.frunk_cu_ft === 'number' ? r.frunk_cu_ft : -1, FRUNK_BUCKETS, bucketFilters.frunk))
    if (bucketFilters.cargo3?.length) rows = rows.filter((r) => matchesBuckets(r.cargo_behind_3rd_cu_ft, CARGO3_BUCKETS, bucketFilters.cargo3))
    if (bucketFilters.cargo2?.length) rows = rows.filter((r) => matchesBuckets(r.cargo_behind_2nd_cu_ft, CARGO2_BUCKETS, bucketFilters.cargo2))
    if (bucketFilters.cargo1?.length) rows = rows.filter((r) => matchesBuckets(r.cargo_behind_1st_cu_ft, CARGO1_BUCKETS, bucketFilters.cargo1))
    if (bucketFilters.floor?.length) rows = rows.filter((r) => matchesBuckets(r.cargo_floor_width_in, FLOOR_BUCKETS, bucketFilters.floor))
    return rows
  }, [filters, bucketFilters])

  const bucketFilterCount = Object.values(bucketFilters).filter(a => a.length > 0).length
  const activeFilterCount = [
    selectedVehicles, selectedYears, selectedTrims, selectedDrivetrains,
    selectedSeats, selectedCharging, selectedFoldFlat
  ].filter(a => a.length > 0).length + bucketFilterCount

  function toggleFilter(id: string) {
    setOpenFilter(openFilter === id ? null : id)
  }

  function clearAllFilters() {
    onFiltersChange({ vehicle: '', year: '', trim: '', drivetrain: '', seats: '', charging: '', foldFlat: '' })
    setBucketFilters({})
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>Detailed Comparison</h2>
        <div className="mobile-view-toggle">
          <button className={`view-toggle-btn${mobileView === 'cards' ? ' active' : ''}`} onClick={() => setMobileView('cards')}>Cards</button>
          <button className={`view-toggle-btn${mobileView === 'table' ? ' active' : ''}`} onClick={() => setMobileView('table')}>Table</button>
        </div>
      </div>
      <p className="section-desc">
        Click any column header to filter. Click any row or card to view complete specs.
      </p>

      {activeFilterCount > 0 && (
        <div className="filters">
          <button className="multi-select-clear" style={{ whiteSpace: 'nowrap' }} onClick={clearAllFilters}>
            Clear all filters
          </button>
        </div>
      )}

      {/* ── Mobile filter bar (hidden on desktop via CSS) ── */}
      <div className="mobile-filters">
        <MultiSelect label="Vehicle" allLabel="All Vehicles" options={vehicles} selected={selectedVehicles} onChange={(vals) => onFiltersChange({ vehicle: vals.join(',') })} />
        <MultiSelect label="Year" allLabel="All Years" options={years.map(String)} selected={selectedYears} onChange={(vals) => onFiltersChange({ year: vals.join(',') })} />
        <MultiSelect label="Drivetrain" allLabel="All DT" options={drivetrains} selected={selectedDrivetrains} onChange={(vals) => onFiltersChange({ drivetrain: vals.join(',') })} />
        <MultiSelect label="Seat" allLabel="All Seats" options={seatOptions} selected={selectedSeats} onChange={(vals) => onFiltersChange({ seats: vals.join(',') })} />
        <MultiSelect label="Charging" allLabel="All Charging" options={chargingOptions} selected={selectedCharging} onChange={(vals) => onFiltersChange({ charging: vals.join(',') })} />
      </div>

      {/* ── Desktop: table with filterable headers ── */}
      <div className={mobileView === 'table' ? 'cmp-table-view cmp-table-forced' : 'cmp-table-view'}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <FilterableHeader label="Vehicle" options={vehicles} selected={selectedVehicles} onChange={(vals) => onFiltersChange({ vehicle: vals.join(',') })} className="col-sticky" isOpen={openFilter === 'vehicle'} onToggle={() => toggleFilter('vehicle')} />
                <FilterableHeader label="Year" options={years.map(String)} selected={selectedYears} onChange={(vals) => onFiltersChange({ year: vals.join(',') })} isOpen={openFilter === 'year'} onToggle={() => toggleFilter('year')} />
                <FilterableHeader label="Trim" options={trimOptions} selected={selectedTrims} onChange={(vals) => onFiltersChange({ trim: vals.join(',') })} isOpen={openFilter === 'trim'} onToggle={() => toggleFilter('trim')} />
                <FilterableHeader label="Drivetrain" options={drivetrains} selected={selectedDrivetrains} onChange={(vals) => onFiltersChange({ drivetrain: vals.join(',') })} isOpen={openFilter === 'drivetrain'} onToggle={() => toggleFilter('drivetrain')} />
                <FilterableHeader label="Seats" options={seatOptions} selected={selectedSeats} onChange={(vals) => onFiltersChange({ seats: vals.join(',') })} className="num" isOpen={openFilter === 'seats'} onToggle={() => toggleFilter('seats')} />
                <FilterableHeader label="MSRP" options={MSRP_BUCKETS.map(b => b.label)} selected={bucketFilters.msrp || []} onChange={(vals) => updateBucket('msrp', vals)} className="num" isOpen={openFilter === 'msrp'} onToggle={() => toggleFilter('msrp')} />
                <FilterableHeader label="Pre-Owned" options={PREOWNED_BUCKETS.map(b => b.label)} selected={bucketFilters.preowned || []} onChange={(vals) => updateBucket('preowned', vals)} className="num" isOpen={openFilter === 'preowned'} onToggle={() => toggleFilter('preowned')} />
                <FilterableHeader label="Range (mi)" options={RANGE_BUCKETS.map(b => b.label)} selected={bucketFilters.range || []} onChange={(vals) => updateBucket('range', vals)} className="num" isOpen={openFilter === 'range'} onToggle={() => toggleFilter('range')} />
                <FilterableHeader label="HP" options={HP_BUCKETS.map(b => b.label)} selected={bucketFilters.hp || []} onChange={(vals) => updateBucket('hp', vals)} className="num" isOpen={openFilter === 'hp'} onToggle={() => toggleFilter('hp')} />
                <FilterableHeader label="Battery (kWh)" options={BATTERY_BUCKETS.map(b => b.label)} selected={bucketFilters.battery || []} onChange={(vals) => updateBucket('battery', vals)} className="num" isOpen={openFilter === 'battery'} onToggle={() => toggleFilter('battery')} />
                <FilterableHeader label="Charging" options={chargingOptions} selected={selectedCharging} onChange={(vals) => onFiltersChange({ charging: vals.join(',') })} isOpen={openFilter === 'charging'} onToggle={() => toggleFilter('charging')} />
                <FilterableHeader label="Torque (lb-ft)" options={TORQUE_BUCKETS.map(b => b.label)} selected={bucketFilters.torque || []} onChange={(vals) => updateBucket('torque', vals)} className="num" isOpen={openFilter === 'torque'} onToggle={() => toggleFilter('torque')} />
                <FilterableHeader label="0–60 (sec)" options={ZERO60_BUCKETS.map(b => b.label)} selected={bucketFilters.zero60 || []} onChange={(vals) => updateBucket('zero60', vals)} className="num" isOpen={openFilter === 'zero60'} onToggle={() => toggleFilter('zero60')} />
                <FilterableHeader label="Curb Wt (lbs)" options={WEIGHT_BUCKETS.map(b => b.label)} selected={bucketFilters.weight || []} onChange={(vals) => updateBucket('weight', vals)} className="num" isOpen={openFilter === 'weight'} onToggle={() => toggleFilter('weight')} />
                <FilterableHeader label="Towing (lbs)" options={TOWING_BUCKETS.map(b => b.label)} selected={bucketFilters.towing || []} onChange={(vals) => updateBucket('towing', vals)} className="num" isOpen={openFilter === 'towing'} onToggle={() => toggleFilter('towing')} />
                <FilterableHeader label="DC kW" options={DCKW_BUCKETS.map(b => b.label)} selected={bucketFilters.dckw || []} onChange={(vals) => updateBucket('dckw', vals)} className="num" isOpen={openFilter === 'dckw'} onToggle={() => toggleFilter('dckw')} />
                <FilterableHeader label="DC 10–80%" options={DC1080_BUCKETS.map(b => b.label)} selected={bucketFilters.dc1080 || []} onChange={(vals) => updateBucket('dc1080', vals)} className="num" isOpen={openFilter === 'dc1080'} onToggle={() => toggleFilter('dc1080')} />
                <FilterableHeader label="Length (in)" options={LENGTH_BUCKETS.map(b => b.label)} selected={bucketFilters.length || []} onChange={(vals) => updateBucket('length', vals)} className="num" isOpen={openFilter === 'length'} onToggle={() => toggleFilter('length')} />
                <FilterableHeader label="Width (in)" options={WIDTH_BUCKETS.map(b => b.label)} selected={bucketFilters.width || []} onChange={(vals) => updateBucket('width', vals)} className="num" isOpen={openFilter === 'width'} onToggle={() => toggleFilter('width')} />
                <FilterableHeader label="Height (in)" options={HEIGHT_BUCKETS.map(b => b.label)} selected={bucketFilters.height || []} onChange={(vals) => updateBucket('height', vals)} className="num" isOpen={openFilter === 'height'} onToggle={() => toggleFilter('height')} />
                <FilterableHeader label="Clearance (in)" options={CLEARANCE_BUCKETS.map(b => b.label)} selected={bucketFilters.clearance || []} onChange={(vals) => updateBucket('clearance', vals)} className="num" isOpen={openFilter === 'clearance'} onToggle={() => toggleFilter('clearance')} />
                <FilterableHeader label="3rd Row Leg (in)" options={LEG3_BUCKETS.map(b => b.label)} selected={bucketFilters.leg3 || []} onChange={(vals) => updateBucket('leg3', vals)} className="num" isOpen={openFilter === 'leg3'} onToggle={() => toggleFilter('leg3')} />
                <FilterableHeader label="3rd Row Head (in)" options={HEAD3_BUCKETS.map(b => b.label)} selected={bucketFilters.head3 || []} onChange={(vals) => updateBucket('head3', vals)} className="num" isOpen={openFilter === 'head3'} onToggle={() => toggleFilter('head3')} />
                <FilterableHeader label="Frunk (cu ft)" options={FRUNK_BUCKETS.map(b => b.label)} selected={bucketFilters.frunk || []} onChange={(vals) => updateBucket('frunk', vals)} className="num" isOpen={openFilter === 'frunk'} onToggle={() => toggleFilter('frunk')} />
                <FilterableHeader label="Behind 3rd (cu ft)" options={CARGO3_BUCKETS.map(b => b.label)} selected={bucketFilters.cargo3 || []} onChange={(vals) => updateBucket('cargo3', vals)} className="num" isOpen={openFilter === 'cargo3'} onToggle={() => toggleFilter('cargo3')} />
                <FilterableHeader label="Behind 2nd (cu ft)" options={CARGO2_BUCKETS.map(b => b.label)} selected={bucketFilters.cargo2 || []} onChange={(vals) => updateBucket('cargo2', vals)} className="num" isOpen={openFilter === 'cargo2'} onToggle={() => toggleFilter('cargo2')} />
                <FilterableHeader label="Behind 1st (cu ft)" options={CARGO1_BUCKETS.map(b => b.label)} selected={bucketFilters.cargo1 || []} onChange={(vals) => updateBucket('cargo1', vals)} className="num" isOpen={openFilter === 'cargo1'} onToggle={() => toggleFilter('cargo1')} />
                <FilterableHeader label="Fold Flat" options={foldFlatOptions} selected={selectedFoldFlat} onChange={(vals) => onFiltersChange({ foldFlat: vals.join(',') })} isOpen={openFilter === 'foldFlat'} onToggle={() => toggleFilter('foldFlat')} />
                <FilterableHeader label="Floor Width (in)" options={FLOOR_BUCKETS.map(b => b.label)} selected={bucketFilters.floor || []} onChange={(vals) => updateBucket('floor', vals)} className="num" isOpen={openFilter === 'floor'} onToggle={() => toggleFilter('floor')} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const origIdx = DATA.details.indexOf(r)
                const msrp = fmtMoney(r.msrp)
                const range = fmtNum(r.range_mi)
                const hp = fmtNum(r.hp)
                const bat = fmtNum(r.battery_kwh)
                const dash = <span className="cell-na">—</span>
                return (
                  <tr key={origIdx} data-clickable="true" onClick={() => onRowClick(origIdx)}>
                    <td className="col-sticky">
                      <VehicleBadge vehicle={r.vehicle} />
                      <div className="sticky-subtitle">
                        {r.year ? `'${String(r.year).slice(-2)}` : ''}
                        {r.year && r.trim ? ' · ' : ''}
                        {r.trim || ''}
                        {r.seats ? ` · ${r.seats}-seat` : ''}
                      </div>
                    </td>
                    <td>{r.year || '—'}</td>
                    <td>{r.trim || ''}</td>
                    <td>{r.drivetrain || '—'}</td>
                    <td className="num">{r.seats ?? '—'}</td>
                    <td className="num"><span className={msrp.className}>{msrp.text}</span></td>
                    <td>
                      {r.preowned_range && !r.preowned_range.includes('N/A') && !r.preowned_range.includes('No ')
                        ? <span className="cell-range">{r.preowned_range}</span>
                        : dash}
                    </td>
                    <td className="num"><span className={range.className}>{range.text}</span></td>
                    <td className="num"><span className={hp.className}>{hp.text}</span></td>
                    <td className="num"><span className={bat.className}>{bat.text}</span></td>
                    <td>{r.charging_type || ''}</td>
                    <td className="num">{typeof r.torque_lb_ft === 'number' ? r.torque_lb_ft.toLocaleString() : dash}</td>
                    <td className="num">{typeof r.zero_to_60_sec === 'number' ? r.zero_to_60_sec : dash}</td>
                    <td className="num">{typeof r.curb_weight_lbs === 'number' ? r.curb_weight_lbs.toLocaleString() : dash}</td>
                    <td className="num">{typeof r.towing_lbs === 'number' ? r.towing_lbs.toLocaleString() : dash}</td>
                    <td className="num">{typeof r.dc_fast_charge_kw === 'number' ? r.dc_fast_charge_kw : dash}</td>
                    <td className="num">{typeof r.dc_fast_charge_10_80_min === 'number' ? `${r.dc_fast_charge_10_80_min}m` : dash}</td>
                    <td className="num">{typeof r.length_in === 'number' ? r.length_in : dash}</td>
                    <td className="num">{typeof r.width_in === 'number' ? r.width_in : dash}</td>
                    <td className="num">{typeof r.height_in === 'number' ? r.height_in : dash}</td>
                    <td className="num">{typeof r.ground_clearance_in === 'number' ? r.ground_clearance_in : dash}</td>
                    <td className="num">{typeof r.third_row_legroom_in === 'number' ? r.third_row_legroom_in : dash}</td>
                    <td className="num">{typeof r.third_row_headroom_in === 'number' ? r.third_row_headroom_in : dash}</td>
                    <td className="num">{r.frunk_cu_ft ?? dash}</td>
                    <td className="num">{r.cargo_behind_3rd_cu_ft ?? dash}</td>
                    <td className="num">{r.cargo_behind_2nd_cu_ft ?? dash}</td>
                    <td className="num">{r.cargo_behind_1st_cu_ft ?? dash}</td>
                    <td>{r.fold_flat || dash}</td>
                    <td className="num">{r.cargo_floor_width_in ?? dash}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile: card layout ── */}
      <div className={mobileView === 'cards' ? 'cmp-card-view' : 'cmp-card-view cmp-card-hidden'}>
        <div className="cmp-cards">
          {filtered.map((r) => {
            const origIdx = DATA.details.indexOf(r)
            const msrp = fmtMoney(r.msrp)
            const range = fmtNum(r.range_mi)
            const bat = fmtNum(r.battery_kwh)
            return (
              <div key={origIdx} className="cmp-card" onClick={() => onRowClick(origIdx)}>
                <div className="cmp-card-header">
                  <VehicleBadge vehicle={r.vehicle} />
                  <span className="cmp-card-tap-hint">Tap for full specs →</span>
                </div>
                <div className="cmp-card-year-trim">
                  {r.year} · {r.trim}{r.drivetrain ? ` · ${r.drivetrain}` : ''}
                </div>
                <div className="cmp-card-stats">
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">MSRP</span>
                    <span className={`cmp-stat-value ${msrp.className}`} style={{ fontFamily: 'var(--mono)' }}>
                      {typeof r.msrp === 'number' ? `$${Math.round(r.msrp / 1000)}k` : msrp.text}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Pre-Owned Price</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {r.preowned_range && !r.preowned_range.includes('N/A') && !r.preowned_range.includes('No ')
                        ? r.preowned_range.replace(/\$[\d,]+/g, (m: string) => `$${Math.round(parseInt(m.replace(/[$,]/g, '')) / 1000)}k`)
                        : '—'}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Range</span>
                    <span className="cmp-stat-value" style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                      {range.text}{typeof r.range_mi === 'number' ? ' mi' : ''}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Battery (kWh)</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {bat.text}
                    </span>
                  </div>
                  {r.charging_type && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Charging</span>
                      <span className="cmp-stat-value">{r.charging_type}</span>
                    </div>
                  )}
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Seats</span>
                    <span className="cmp-stat-value">{r.seats}</span>
                  </div>
                  {typeof r.torque_lb_ft === 'number' && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Torque</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.torque_lb_ft.toLocaleString()} lb-ft</span>
                    </div>
                  )}
                  {typeof r.zero_to_60_sec === 'number' && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">0–60</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.zero_to_60_sec}s</span>
                    </div>
                  )}
                  {typeof r.towing_lbs === 'number' && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Towing</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.towing_lbs.toLocaleString()} lbs</span>
                    </div>
                  )}
                  {typeof r.dc_fast_charge_kw === 'number' && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">DC Fast</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.dc_fast_charge_kw} kW</span>
                    </div>
                  )}
                  {r.frunk_cu_ft != null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Frunk</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.frunk_cu_ft} cu ft</span>
                    </div>
                  )}
                  {r.cargo_behind_3rd_cu_ft != null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Behind 3rd Row</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.cargo_behind_3rd_cu_ft} cu ft</span>
                    </div>
                  )}
                  {r.cargo_behind_2nd_cu_ft != null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Behind 2nd Row</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.cargo_behind_2nd_cu_ft} cu ft</span>
                    </div>
                  )}
                  {r.cargo_behind_1st_cu_ft != null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Behind 1st Row</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.cargo_behind_1st_cu_ft} cu ft</span>
                    </div>
                  )}
                  {r.fold_flat && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Fold Flat</span>
                      <span className="cmp-stat-value">{r.fold_flat}</span>
                    </div>
                  )}
                  {r.cargo_floor_width_in != null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Floor Width</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{r.cargo_floor_width_in}″</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="result-count">{filtered.length} of {DATA.details.length} models shown</p>
    </>
  )
}
