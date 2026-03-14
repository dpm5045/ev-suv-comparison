'use client'

import { useMemo, useState } from 'react'
import { DATA } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import VehicleBadge from '../VehicleBadge'
import type { ComparisonFilters } from '../Dashboard'

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

  const filtered = useMemo(() => {
    let rows = DATA.details
    if (filters.vehicle) rows = rows.filter((r) => r.vehicle === filters.vehicle)
    if (filters.year) rows = rows.filter((r) => String(r.year) === filters.year)
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
        <select value={filters.vehicle} onChange={(e) => onFiltersChange({ vehicle: e.target.value })}>
          <option value="">All Vehicles</option>
          {vehicles.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <span className="filter-label">Year</span>
        <select value={filters.year} onChange={(e) => onFiltersChange({ year: e.target.value })}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>
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
                <th className="num">Est. OTD New</th>
                <th>Pre-Owned Range</th>
                <th className="num">Range (mi)</th>
                <th className="num">HP</th>
                <th className="num">Battery</th>
                <th>Charging</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const origIdx = DATA.details.indexOf(r)
                const otd = fmtMoney(r.otd_new)
                const range = fmtNum(r.range_mi)
                const hp = fmtNum(r.hp)
                const bat = fmtNum(r.battery_kwh)
                return (
                  <tr key={origIdx} data-clickable="true" onClick={() => onRowClick(origIdx)}>
                    <td className="col-sticky"><VehicleBadge vehicle={r.vehicle} /></td>
                    <td>{r.year || '—'}</td>
                    <td>{r.trim || ''}</td>
                    <td className="num">{r.seats ?? '—'}</td>
                    <td className="num"><span className={otd.className}>{otd.text}</span></td>
                    <td>
                      {r.otd_preowned
                        ? <span className="cell-range">{r.otd_preowned}</span>
                        : <span className="cell-na">—</span>}
                    </td>
                    <td className="num"><span className={range.className}>{range.text}</span></td>
                    <td className="num"><span className={hp.className}>{hp.text}</span></td>
                    <td className="num">
                      <span className={bat.className}>
                        {bat.text}{typeof r.battery_kwh === 'number' ? ' kWh' : ''}
                      </span>
                    </td>
                    <td>{r.charging_type || ''}</td>
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
            const otd = fmtMoney(r.otd_new)
            const range = fmtNum(r.range_mi)
            const bat = fmtNum(r.battery_kwh)
            return (
              <div key={origIdx} className="cmp-card" onClick={() => onRowClick(origIdx)}>
                <div className="cmp-card-header">
                  <VehicleBadge vehicle={r.vehicle} />
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{r.seats} seats</span>
                </div>
                <div className="cmp-card-year-trim">
                  {r.year} · {r.trim}
                </div>
                <div className="cmp-card-stats">
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Est. OTD New</span>
                    <span className={`cmp-stat-value ${otd.className}`}>{otd.text}</span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Range</span>
                    <span className="cmp-stat-value" style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {range.text}{typeof r.range_mi === 'number' ? ' mi' : ''}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Battery</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {bat.text}{typeof r.battery_kwh === 'number' ? ' kWh' : ''}
                    </span>
                  </div>
                  {r.charging_type && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Charging</span>
                      <span className="cmp-stat-value">{r.charging_type}</span>
                    </div>
                  )}
                  {r.otd_preowned && (
                    <div className="cmp-stat" style={{ gridColumn: '1 / -1' }}>
                      <span className="cmp-stat-label">Pre-Owned Range</span>
                      <span className="cmp-stat-value cell-range">{r.otd_preowned}</span>
                    </div>
                  )}
                </div>
                <div className="cmp-card-tap-hint">Tap for full specs →</div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="result-count">{filtered.length} of {DATA.details.length} models shown</p>
    </>
  )
}
