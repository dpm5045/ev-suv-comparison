'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DATA } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from '../VehicleBadge'
import type { ComparisonFilters } from '../Dashboard'

/* ── MultiSelect dropdown ── */
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
            <button className="multi-select-clear" onClick={() => onChange([])}>Clear all</button>
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

interface Props {
  filters: ComparisonFilters
  onFiltersChange: (f: Partial<ComparisonFilters>) => void
  onRowClick: (idx: number) => void
}

export default function ComparisonV2Tab({ filters, onFiltersChange, onRowClick }: Props) {
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards')

  const vehicles = useMemo(
    () => [...new Set(DATA.details.map((d) => d.vehicle))].sort(),
    [],
  )
  const years = useMemo(
    () => [...new Set(DATA.details.map((d) => d.year).filter(Boolean))].sort() as number[],
    [],
  )

  const selectedVehicles = filters.vehicle ? filters.vehicle.split(',') : []
  const selectedYears = filters.year ? filters.year.split(',') : []

  const filtered = useMemo(() => {
    const sv = filters.vehicle ? filters.vehicle.split(',') : []
    const sy = filters.year ? filters.year.split(',') : []
    let rows = DATA.details
    if (sv.length) rows = rows.filter((r) => sv.includes(r.vehicle))
    if (sy.length) rows = rows.filter((r) => sy.includes(String(r.year)))
    if (filters.q) {
      const q = filters.q.toLowerCase()
      rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
    }
    return rows
  }, [filters])

  const Filters = (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">Vehicle</span>
        <MultiSelect
          label="Vehicle"
          allLabel="All Vehicles"
          options={vehicles}
          selected={selectedVehicles}
          onChange={(vals) => onFiltersChange({ vehicle: vals.join(',') })}
        />
      </div>
      <div className="filter-group">
        <span className="filter-label">Year</span>
        <MultiSelect
          label="Year"
          allLabel="All Years"
          options={years.map(String)}
          selected={selectedYears}
          onChange={(vals) => onFiltersChange({ year: vals.join(',') })}
        />
      </div>
      <div className="filter-group">
        <span className="filter-label">Search</span>
        <input
          className="search-input"
          value={filters.q}
          placeholder="e.g. Plaid, 7-seat, NACS…"
          onChange={(e) => onFiltersChange({ q: e.target.value })}
        />
      </div>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>Detailed Comparison</h2>
        {/* Cards/Table toggle — only visible on mobile via CSS */}
        <div className="mobile-view-toggle">
          <button
            className={`view-toggle-btn${mobileView === 'cards' ? ' active' : ''}`}
            onClick={() => setMobileView('cards')}
          >
            Cards
          </button>
          <button
            className={`view-toggle-btn${mobileView === 'table' ? ' active' : ''}`}
            onClick={() => setMobileView('table')}
          >
            Table
          </button>
        </div>
      </div>
      <p className="section-desc">
        Click any row or card to view complete specs. Use the filters to narrow results.
      </p>

      {Filters}

      {/* ── Desktop: always table. Mobile: respects toggle ── */}
      <div className={mobileView === 'table' ? 'cmp-table-view cmp-table-forced' : 'cmp-table-view'}>
        <div className="table-wrap" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th className="col-sticky">Vehicle</th>
                <th>Year</th>
                <th>Trim</th>
                <th className="num">Seats</th>
                <th className="num">MSRP</th>
                <th>Pre-Owned Price</th>
                <th className="num">Range (mi)</th>
                <th className="num">HP</th>
                <th className="num">Battery</th>
                <th>Charging</th>
                <th className="num">Frunk (cu ft)</th>
                <th className="num">Behind 3rd Row (cu ft)</th>
                <th className="num">Behind 2nd Row (cu ft)</th>
                <th className="num">Behind 1st Row (cu ft)</th>
                <th>Fold Flat</th>
                <th className="num">Floor Width (in)</th>
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
                    <td className="num">{r.seats ?? '—'}</td>
                    <td className="num"><span className={msrp.className}>{msrp.text}</span></td>
                    <td>
                      {r.preowned_range && !r.preowned_range.includes('N/A') && !r.preowned_range.includes('No ')
                        ? <span className="cell-range">{r.preowned_range}</span>
                        : dash}
                    </td>
                    <td className="num"><span className={range.className}>{range.text}</span></td>
                    <td className="num"><span className={hp.className}>{hp.text}</span></td>
                    <td className="num">
                      <span className={bat.className}>
                        {bat.text}{typeof r.battery_kwh === 'number' ? ' kWh' : ''}
                      </span>
                    </td>
                    <td>{r.charging_type || ''}</td>
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

      {/* ── Mobile: card layout (hidden when table toggle active) ── */}
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
                  {r.year} · {r.trim}
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
                    <span className="cmp-stat-label">Battery</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {bat.text}{typeof r.battery_kwh === 'number' ? ' kWh' : ''}
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
