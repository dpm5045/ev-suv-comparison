'use client'

import { useEffect, useMemo, useState } from 'react'
import { DATA } from '@/lib/data'
import type { InsightFilters } from '../Dashboard'
import VehicleBadge from '../VehicleBadge'

const GLANCE_EXCLUDED = ['Tesla Model Y Long (Asia)', 'Toyota Highlander EV']

/* ── helpers ── */

function parsePrice(s: string): number | null {
  const m = s.replace(/[$,]/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

type Row = (typeof DATA.details)[number]
type NumRow<K extends keyof Row> = Row & { [P in K]: number }

function numericRows<K extends keyof Row>(d: Row[], key: K): NumRow<K>[] {
  return d.filter((r) => typeof r[key] === 'number') as NumRow<K>[]
}

/* ── constants ── */

const BUDGET_BUCKETS = [
  { id: 'all', label: 'All Prices', filter: () => true },
  { id: 'under60', label: 'Under $60k', filter: (msrp: number) => msrp < 60000 },
  { id: '60to90', label: '$60k\u2013$90k', filter: (msrp: number) => msrp >= 60000 && msrp <= 90000 },
  { id: '90plus', label: '$90k+', filter: (msrp: number) => msrp > 90000 },
] as const

const PREFERENCE_OPTIONS = [
  { id: 'range', label: 'Range' },
  { id: 'storage', label: 'Storage' },
  { id: 'power', label: 'Horsepower' },
  { id: 'charging', label: 'Charging Speed' },
  { id: 'drivetrain', label: 'Drivetrain' },
] as const

const STARTER_PREFS = ['range', 'storage', 'charging']

interface Tile {
  label: string
  value: string
  detail: string
}

/* ── tile generators (2 per preference) ── */

function tilesForRange(d: Row[]): Tile[] {
  const tiles: Tile[] = []
  const rows = numericRows(d, 'range_mi')
  if (rows.length) {
    const leader = rows.reduce((a, b) => (a.range_mi > b.range_mi ? a : b))
    tiles.push({ label: 'Range Leader', value: `${leader.range_mi} mi`, detail: `${leader.vehicle} ${leader.trim}` })
  }
  const withMsrp = rows.filter((r) => typeof r.msrp === 'number') as (NumRow<'range_mi'> & { msrp: number })[]
  if (withMsrp.length) {
    const best = withMsrp.reduce((a, b) => (a.range_mi / a.msrp > b.range_mi / b.msrp ? a : b))
    tiles.push({ label: 'Best Range per Dollar', value: `${(best.range_mi / best.msrp * 1000).toFixed(1)} mi/$1k`, detail: `${best.vehicle} ${best.trim}` })
  }
  return tiles
}

function tilesForStorage(d: Row[]): Tile[] {
  const tiles: Tile[] = []
  const cargo3 = numericRows(d, 'cargo_behind_3rd_cu_ft').filter((r) => (r.cargo_behind_3rd_cu_ft as number) > 0)
  if (cargo3.length) {
    const best = cargo3.reduce((a, b) => ((a.cargo_behind_3rd_cu_ft as number) > (b.cargo_behind_3rd_cu_ft as number) ? a : b))
    tiles.push({ label: 'Most Cargo (3rd Row)', value: `${best.cargo_behind_3rd_cu_ft} cu ft`, detail: `${best.vehicle} — seats up` })
  }
  const frunk = numericRows(d, 'frunk_cu_ft').filter((r) => (r.frunk_cu_ft as number) > 0)
  if (frunk.length) {
    const best = frunk.reduce((a, b) => ((a.frunk_cu_ft as number) > (b.frunk_cu_ft as number) ? a : b))
    tiles.push({ label: 'Largest Frunk', value: `${best.frunk_cu_ft} cu ft`, detail: best.vehicle })
  } else {
    const cargo2 = numericRows(d, 'cargo_behind_2nd_cu_ft').filter((r) => (r.cargo_behind_2nd_cu_ft as number) > 0)
    if (cargo2.length) {
      const best = cargo2.reduce((a, b) => ((a.cargo_behind_2nd_cu_ft as number) > (b.cargo_behind_2nd_cu_ft as number) ? a : b))
      tiles.push({ label: 'Most Cargo (2nd Row)', value: `${best.cargo_behind_2nd_cu_ft} cu ft`, detail: `${best.vehicle} — seats folded` })
    }
  }
  return tiles
}

function tilesForPower(d: Row[]): Tile[] {
  const tiles: Tile[] = []
  const rows = numericRows(d, 'hp')
  if (rows.length) {
    const leader = rows.reduce((a, b) => (a.hp > b.hp ? a : b))
    tiles.push({ label: 'Most Powerful', value: `${Math.round(leader.hp).toLocaleString()} HP`, detail: `${leader.vehicle} ${leader.trim}` })
  }
  const withMsrp = rows.filter((r) => typeof r.msrp === 'number') as (NumRow<'hp'> & { msrp: number })[]
  if (withMsrp.length) {
    const best = withMsrp.reduce((a, b) => (a.hp / a.msrp > b.hp / b.msrp ? a : b))
    tiles.push({ label: 'Best HP per Dollar', value: `${(best.hp / best.msrp * 1000).toFixed(1)} HP/$1k`, detail: `${best.vehicle} ${best.trim}` })
  }
  return tiles
}

function tilesForCharging(d: Row[]): Tile[] {
  const tiles: Tile[] = []
  const l2Rows = numericRows(d, 'l2_10_80')
  if (l2Rows.length) {
    const fastest = l2Rows.reduce((a, b) => (a.l2_10_80 < b.l2_10_80 ? a : b))
    tiles.push({ label: 'Fastest L2 (10\u219280%)', value: `${fastest.l2_10_80} hrs`, detail: `${fastest.vehicle} ${fastest.trim}` })
  }
  const msrpRows = numericRows(d, 'msrp')
  const nacsNative = msrpRows.filter((r) => {
    const c = r.charging_type.toLowerCase()
    return c.includes('nacs') && !c.startsWith('ccs')
  })
  if (nacsNative.length) {
    const best = nacsNative.reduce((a, b) => (a.msrp < b.msrp ? a : b))
    tiles.push({ label: 'Best NACS Value', value: `$${Math.round(best.msrp / 1000)}k`, detail: `${best.vehicle} ${best.year} ${best.trim}` })
  }
  return tiles
}

function tilesForDrivetrain(d: Row[]): Tile[] {
  const tiles: Tile[] = []
  const drivetrains = d.reduce<Record<string, Set<string>>>((acc, r) => {
    const dt = r.drivetrain || 'Unknown'
    if (!acc[dt]) acc[dt] = new Set()
    acc[dt].add(r.vehicle)
    return acc
  }, {})
  const awdCount = drivetrains['AWD']?.size ?? 0
  if (awdCount > 0) {
    tiles.push({ label: 'AWD Options', value: `${awdCount}`, detail: `${awdCount} vehicle${awdCount === 1 ? '' : 's'} with AWD trims` })
  }
  const parts = Object.entries(drivetrains).map(([dt, vs]) => `${vs.size} ${dt}`).join(' / ')
  if (parts) {
    tiles.push({ label: 'Drivetrain Breakdown', value: parts, detail: `across ${d.length} trims` })
  }
  return tiles
}

const TILE_GENERATORS: Record<string, (d: Row[]) => Tile[]> = {
  range: tilesForRange,
  storage: tilesForStorage,
  power: tilesForPower,
  charging: tilesForCharging,
  drivetrain: tilesForDrivetrain,
}

/* ── component ── */

interface OverviewTabProps {
  budget: string
  pref1: string
  pref2: string
  onFiltersChange: (f: Partial<InsightFilters>, replace?: boolean) => void
}

export default function OverviewTab({ budget, pref1, pref2, onFiltersChange }: OverviewTabProps) {
  // Set random defaults on first load if no prefs in URL
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    if (!pref1 && !pref2) {
      const shuffled = [...STARTER_PREFS].sort(() => Math.random() - 0.5)
      onFiltersChange({ budget: budget || 'all', pref1: shuffled[0], pref2: shuffled[1] }, true)
    } else if (!budget) {
      onFiltersChange({ budget: 'all' }, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeBudget = budget || 'all'
  const activePref1 = pref1
  const activePref2 = pref2

  /* --- budget filtering --- */
  const bucketFilter = BUDGET_BUCKETS.find((b) => b.id === activeBudget)?.filter ?? (() => true)

  const filteredDetails = useMemo(() => {
    if (activeBudget === 'all') return DATA.details
    return DATA.details.filter((r) => typeof r.msrp === 'number' && bucketFilter(r.msrp as number))
  }, [activeBudget, bucketFilter])

  /* --- dynamic tiles --- */
  const tiles = useMemo(() => {
    const result: Tile[] = []
    const d = filteredDetails

    // General tiles (always shown)
    const vehicles = [...new Set(d.map((r) => r.vehicle))]
    result.push({
      label: 'Trims in Budget',
      value: `${d.length}`,
      detail: `across ${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`,
    })
    const msrpNums = numericRows(d, 'msrp')
    if (msrpNums.length) {
      const min = msrpNums.reduce((a, b) => (a.msrp < b.msrp ? a : b))
      const max = msrpNums.reduce((a, b) => (a.msrp > b.msrp ? a : b))
      result.push({
        label: 'MSRP Range',
        value: `$${Math.round(min.msrp / 1000)}k\u2013$${Math.round(max.msrp / 1000)}k`,
        detail: `${min.vehicle} \u2013 ${max.vehicle}`,
      })
    }

    // Preference tiles
    for (const pref of [activePref1, activePref2]) {
      if (pref && TILE_GENERATORS[pref]) {
        result.push(...TILE_GENERATORS[pref](d))
      }
    }

    return result
  }, [filteredDetails, activePref1, activePref2])

  /* --- vehicle summaries + budget flags for glance table --- */
  const { vehicleSummaries, vehiclesInBudget, chargingMap } = useMemo(() => {
    const d = DATA.details
    const vehicles = [...new Set(d.map((r) => r.vehicle))].sort()

    // Which vehicles have at least one trim in budget?
    const inBudget = new Set<string>()
    for (const r of filteredDetails) inBudget.add(r.vehicle)

    const vehicleSummaries = vehicles.map((v) => {
      const rows = d.filter((r) => r.vehicle === v)
      const msrps = rows.map((r) => r.msrp).filter((x) => typeof x === 'number') as number[]
      const ranges = rows.map((r) => r.range_mi).filter((x) => typeof x === 'number') as number[]
      const hps = rows.map((r) => r.hp).filter((x) => typeof x === 'number') as number[]
      const bats = rows.map((r) => r.battery_kwh).filter((x) => typeof x === 'number') as number[]
      const types = [...new Set(rows.map((r) => r.charging_type).filter(Boolean))]
      const preLows = rows.map((r) => parsePrice(r.preowned_range)).filter((x) => x !== null) as number[]
      const preHighs = rows.map((r) => {
        const parts = r.preowned_range.split(/\s*[-–]\s*/)
        return parts.length > 1 ? parsePrice(parts[1]) : parsePrice(r.preowned_range)
      }).filter((x) => x !== null) as number[]
      const cargo3s = rows.map((r) => r.cargo_behind_3rd_cu_ft).filter((x) => typeof x === 'number') as number[]
      const cargo2s = rows.map((r) => r.cargo_behind_2nd_cu_ft).filter((x) => typeof x === 'number') as number[]
      return {
        vehicle: v,
        msrpLow: msrps.length ? Math.min(...msrps) : null,
        msrpHigh: msrps.length ? Math.max(...msrps) : null,
        rangeLow: ranges.length ? Math.min(...ranges) : null,
        rangeHigh: ranges.length ? Math.max(...ranges) : null,
        hpLow: hps.length ? Math.min(...hps) : null,
        hpHigh: hps.length ? Math.max(...hps) : null,
        battery: bats.length ? `${Math.min(...bats)}${Math.min(...bats) !== Math.max(...bats) ? `\u2013${Math.max(...bats)}` : ''}` : '\u2014',
        charging: types.join(' / ') || '\u2014',
        preLow: preLows.length ? Math.min(...preLows) : null,
        preHigh: preHighs.length ? Math.max(...preHighs) : null,
        cargo3Low: cargo3s.length ? Math.min(...cargo3s) : null,
        cargo3High: cargo3s.length ? Math.max(...cargo3s) : null,
        cargo2Low: cargo2s.length ? Math.min(...cargo2s) : null,
        cargo2High: cargo2s.length ? Math.max(...cargo2s) : null,
      }
    })

    // Charging landscape
    const chargingMap = new Map<string, string[]>()
    for (const s of vehicleSummaries) {
      const rows = d.filter((r) => r.vehicle === s.vehicle)
      const types = rows.map((r) => r.charging_type.toLowerCase())
      const hasNacsNative = types.some((t) => t.startsWith('nacs'))
      const hasCcsNative = types.some((t) => t.startsWith('ccs'))
      let category: string
      if (s.charging === '\u2014' || types.every((t) => t === 'tbd')) category = 'TBD'
      else if (hasNacsNative && hasCcsNative) category = 'CCS1 + NACS (transitioning)'
      else if (hasNacsNative) {
        const mentionsCcsAdapter = types.some((t) => t.includes('ccs adapter'))
        category = mentionsCcsAdapter ? 'CCS1 + NACS (transitioning)' : 'NACS'
      }
      else if (hasCcsNative) category = 'CCS1'
      else category = s.charging
      if (!chargingMap.has(category)) chargingMap.set(category, [])
      chargingMap.get(category)!.push(s.vehicle)
    }

    return { vehicleSummaries, vehiclesInBudget: inBudget, chargingMap }
  }, [filteredDetails])

  const [glanceView, setGlanceView] = useState<'cards' | 'table'>('cards')

  const fmt = (n: number) => Math.round(n).toLocaleString()
  const fmtDollarK = (n: number) => `$${Math.round(n / 1000)}k`
  const rangeStr = (lo: number | null, hi: number | null, unit = '') => {
    if (lo === null) return '\u2014'
    if (lo === hi) return `${fmt(lo!)}${unit}`
    return `${fmt(lo!)}\u2013${fmt(hi!)}${unit}`
  }

  /* --- filter handlers --- */
  function handleBudget(id: string) {
    onFiltersChange({ budget: id })
  }

  function handlePref(id: string) {
    if (id === activePref1) {
      // Deselect pref1 — shift pref2 up
      onFiltersChange({ pref1: activePref2, pref2: '' })
    } else if (id === activePref2) {
      // Deselect pref2
      onFiltersChange({ pref2: '' })
    } else if (!activePref1) {
      onFiltersChange({ pref1: id })
    } else if (!activePref2) {
      onFiltersChange({ pref2: id })
    } else {
      // Both filled — FIFO: drop pref1, shift pref2 to pref1, new goes to pref2
      onFiltersChange({ pref1: activePref2, pref2: id })
    }
  }

  const showBudgetNote = activeBudget !== 'all'

  return (
    <>
      <h2 className="section-title">Key Insights</h2>
      <p className="section-desc">
        Personalized insights from {filteredDetails.length} configurations
        {activeBudget !== 'all' && ` in your budget`}. Pick what matters most to you.
      </p>

      {/* ── Filters ── */}
      <div className="insight-filters">
        <div className="insight-filter-group">
          <span className="insight-filter-label">Budget</span>
          <div className="insight-pills">
            {BUDGET_BUCKETS.map((b) => (
              <button
                key={b.id}
                className={`insight-pill${activeBudget === b.id ? ' active' : ''}`}
                onClick={() => handleBudget(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
        <div className="insight-filter-group">
          <span className="insight-filter-label">What Matters Most <span className="insight-filter-hint">(pick 2)</span></span>
          <div className="insight-pills">
            {PREFERENCE_OPTIONS.map((p) => (
              <button
                key={p.id}
                className={`insight-pill${activePref1 === p.id || activePref2 === p.id ? ' active' : ''}`}
                onClick={() => handlePref(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dynamic Tiles ── */}
      {tiles.length > 0 ? (
        <div className="overview-stats">
          {tiles.map((t, i) => (
            <div key={i} className="overview-stat">
              <div className="overview-stat-label">{t.label}</div>
              <div className="overview-stat-value">{t.value}</div>
              <div className="overview-stat-detail">{t.detail}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ marginBottom: 12 }}>No trims match this budget range.</p>
          <button className="insight-pill active" onClick={() => handleBudget('all')}>
            Reset to All Prices
          </button>
        </div>
      )}

      {/* ── Vehicle Comparison Summary ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Vehicle Comparison at a Glance</div>
          <div className="mobile-view-toggle">
            <button className={`view-toggle-btn${glanceView === 'cards' ? ' active' : ''}`} onClick={() => setGlanceView('cards')}>Cards</button>
            <button className={`view-toggle-btn${glanceView === 'table' ? ' active' : ''}`} onClick={() => setGlanceView('table')}>Table</button>
          </div>
        </div>
        {showBudgetNote && <p className="count-note" style={{ marginBottom: 8 }}>Vehicles outside your budget are dimmed.</p>}

        {/* Desktop table (+ mobile when Table toggled) */}
        <div className={glanceView === 'table' ? 'cmp-table-view cmp-table-forced' : 'cmp-table-view'}>
          <div className="table-wrap">
            <table className="glance-table">
              <thead>
                <tr>
                  <th className="col-sticky">Vehicle</th>
                  <th className="num">MSRP</th>
                  <th className="num">Pre-Owned Price</th>
                  <th className="num">Range (mi)</th>
                  <th className="num">HP</th>
                  <th className="num">Battery (kWh)</th>
                  <th>Charge Tech</th>
                  <th className="num">Behind 3rd Row (cu ft)</th>
                  <th className="num">Behind 2nd Row (cu ft)</th>
                </tr>
              </thead>
              <tbody>
                {vehicleSummaries.filter((s) => !GLANCE_EXCLUDED.includes(s.vehicle)).map((s) => (
                  <tr key={s.vehicle} className={!vehiclesInBudget.has(s.vehicle) ? 'glance-row-dimmed' : ''}>
                    <td className="col-sticky"><VehicleBadge vehicle={s.vehicle} /></td>
                    <td className="num">{s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014'}</td>
                    <td className="num">{s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014'}</td>
                    <td className="num">{rangeStr(s.rangeLow, s.rangeHigh)}</td>
                    <td className="num">{rangeStr(s.hpLow, s.hpHigh)}</td>
                    <td className="num">{s.battery}</td>
                    <td>{s.charging}</td>
                    <td className="num">{rangeStr(s.cargo3Low, s.cargo3High)}</td>
                    <td className="num">{rangeStr(s.cargo2Low, s.cargo2High)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card layout */}
        <div className={glanceView === 'cards' ? 'cmp-card-view' : 'cmp-card-view cmp-card-hidden'}>
          <div className="cmp-cards">
            {vehicleSummaries.filter((s) => !GLANCE_EXCLUDED.includes(s.vehicle)).map((s) => (
              <div key={s.vehicle} className={`cmp-card${!vehiclesInBudget.has(s.vehicle) ? ' glance-row-dimmed' : ''}`}>
                <div className="cmp-card-header">
                  <VehicleBadge vehicle={s.vehicle} />
                </div>
                <div className="cmp-card-stats">
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">MSRP</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014'}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Pre-Owned Price</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014'}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Range</span>
                    <span className="cmp-stat-value" style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                      {rangeStr(s.rangeLow, s.rangeHigh, ' mi')}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">HP</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {rangeStr(s.hpLow, s.hpHigh)}
                    </span>
                  </div>
                  <div className="cmp-stat">
                    <span className="cmp-stat-label">Battery</span>
                    <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                      {s.battery} kWh
                    </span>
                  </div>
                  <div className="cmp-stat" style={{ gridColumn: '1 / -1' }}>
                    <span className="cmp-stat-label">Charging</span>
                    <span className="cmp-stat-value">{s.charging}</span>
                  </div>
                  {s.cargo3Low !== null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Behind 3rd Row</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{rangeStr(s.cargo3Low, s.cargo3High)} cu ft</span>
                    </div>
                  )}
                  {s.cargo2Low !== null && (
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Behind 2nd Row</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{rangeStr(s.cargo2Low, s.cargo2High)} cu ft</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="count-note">The Tesla Model Y Long (Asia) and Toyota Highlander EV are not yet on the US market.</p>
      </div>

      {/* ── Charging Landscape ── */}
      <div className="card">
        <div className="card-title">Charging Standards</div>
        <div className="charging-cards">
          {[...chargingMap.entries()].map(([standard, vehicles]) => (
            <div key={standard} className="charging-card">
              <div className="charging-card-label">{standard}</div>
              <div className="charging-card-vehicles">
                {vehicles.map((v) => (
                  <VehicleBadge key={v} vehicle={v} />
                ))}
              </div>
              <div className="charging-card-count">{vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}</div>
            </div>
          ))}
        </div>
      </div>

    </>
  )
}
