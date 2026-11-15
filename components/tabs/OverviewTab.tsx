'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { DATA, isWatchlistVehicle } from '@/lib/data'
import type { InsightFilters } from '../filter-types'
import Link from 'next/link'
import VehicleBadge from '../VehicleBadge'
import ExploreTeaser from '@/components/ExploreTeaser'
import MarketInsights from '@/components/MarketInsights'
import { toSlug } from '@/lib/slugs'
import {
  NEW_BUDGET_BUCKETS,
  PREOWNED_BUDGET_BUCKETS,
  PREFERENCE_OPTIONS,
  SELF_DRIVING_TIER_ORDER,
  SPEED_DATING_DEFAULTS,
  computeRanks,
  extractMetric,
  formatRawMetric,
  hasPreowned,
  selfDrivingOrdinal,
  summarizeInBudget,
} from '@/lib/speed-dating'


/* ── helpers ── */

type Row = (typeof DATA.details)[number]
type NumRow<K extends keyof Row> = Row & { [P in K]: number }

function numericRows<K extends keyof Row>(d: Row[], key: K): NumRow<K>[] {
  return d.filter((r) => typeof r[key] === 'number') as NumRow<K>[]
}



interface Tile {
  label: string
  value: string
  detail: string
  category?: string
}

/* ── tile generators (2 per preference) ── */

function tilesForRange(d: Row[], isPreowned: boolean): Tile[] {
  const tiles: Tile[] = []
  const rows = numericRows(d, 'range_mi')
  if (rows.length) {
    const leader = rows.reduce((a, b) => (a.range_mi > b.range_mi ? a : b))
    tiles.push({ label: 'Range Leader', value: `${leader.range_mi} mi`, detail: `${leader.vehicle} ${leader.trim}` })
  }
  if (isPreowned) {
    // Best range value using pre-owned price
    const withPrice = rows.filter((r) => hasPreowned(r))
    const priced = withPrice.map((r) => ({ ...r, prePrice: r.preowned_low! })).filter((r) => r.prePrice > 0)
    if (priced.length) {
      const best = priced.reduce((a, b) => (a.range_mi / a.prePrice > b.range_mi / b.prePrice ? a : b))
      tiles.push({ label: 'Best Range Value', value: `${best.range_mi} mi`, detail: `${best.vehicle} ${best.trim} \u2014 ~$${Math.round(best.prePrice / 1000)}k pre-owned` })
    }
  } else {
    const withMsrp = rows.filter((r) => typeof r.msrp === 'number') as (NumRow<'range_mi'> & { msrp: number })[]
    if (withMsrp.length) {
      const best = withMsrp.reduce((a, b) => (a.range_mi / a.msrp > b.range_mi / b.msrp ? a : b))
      tiles.push({ label: 'Best Range Value', value: `${best.range_mi} mi`, detail: `${best.vehicle} ${best.trim} \u2014 $${Math.round(best.msrp / 1000)}k MSRP` })
    }
  }
  return tiles
}

function tilesForStorage(d: Row[]): Tile[] {
  const tiles: Tile[] = []
  const cargo3 = numericRows(d, 'cargo_behind_3rd_cu_ft').filter((r) => (r.cargo_behind_3rd_cu_ft as number) > 0)
  if (cargo3.length) {
    const best = cargo3.reduce((a, b) => ((a.cargo_behind_3rd_cu_ft as number) > (b.cargo_behind_3rd_cu_ft as number) ? a : b))
    tiles.push({ label: 'Most Cargo (3rd Row)', value: `${best.cargo_behind_3rd_cu_ft} cu ft`, detail: `${best.vehicle} \u2014 seats up` })
  }
  const frunk = numericRows(d, 'frunk_cu_ft').filter((r) => (r.frunk_cu_ft as number) > 0)
  if (frunk.length) {
    const best = frunk.reduce((a, b) => ((a.frunk_cu_ft as number) > (b.frunk_cu_ft as number) ? a : b))
    tiles.push({ label: 'Largest Frunk', value: `${best.frunk_cu_ft} cu ft`, detail: best.vehicle })
  } else {
    const cargo2 = numericRows(d, 'cargo_behind_2nd_cu_ft').filter((r) => (r.cargo_behind_2nd_cu_ft as number) > 0)
    if (cargo2.length) {
      const best = cargo2.reduce((a, b) => ((a.cargo_behind_2nd_cu_ft as number) > (b.cargo_behind_2nd_cu_ft as number) ? a : b))
      tiles.push({ label: 'Most Cargo (2nd Row)', value: `${best.cargo_behind_2nd_cu_ft} cu ft`, detail: `${best.vehicle} \u2014 seats folded` })
    }
  }
  return tiles
}

function tilesForPower(d: Row[], isPreowned: boolean): Tile[] {
  const tiles: Tile[] = []
  const rows = numericRows(d, 'zero_to_60_sec')
  if (rows.length) {
    const fastest = rows.reduce((a, b) => (a.zero_to_60_sec < b.zero_to_60_sec ? a : b))
    tiles.push({ label: 'Fastest 0-60', value: `${fastest.zero_to_60_sec}s`, detail: `${fastest.vehicle} ${fastest.trim}` })
  }
  if (isPreowned) {
    const withPrice = rows.filter((r) => hasPreowned(r))
    const priced = withPrice.map((r) => ({ ...r, prePrice: r.preowned_low! })).filter((r) => r.prePrice > 0)
    if (priced.length) {
      // Best value = lowest (price × 0-60) product — fast AND cheap
      const best = priced.reduce((a, b) => (a.zero_to_60_sec * a.prePrice < b.zero_to_60_sec * b.prePrice ? a : b))
      tiles.push({ label: 'Best Speed Value', value: `${best.zero_to_60_sec}s`, detail: `${best.vehicle} ${best.trim} — ~$${Math.round(best.prePrice / 1000)}k pre-owned` })
    }
  } else {
    const withMsrp = rows.filter((r) => typeof r.msrp === 'number') as (NumRow<'zero_to_60_sec'> & { msrp: number })[]
    if (withMsrp.length) {
      const best = withMsrp.reduce((a, b) => (a.zero_to_60_sec * a.msrp < b.zero_to_60_sec * b.msrp ? a : b))
      tiles.push({ label: 'Best Speed Value', value: `${best.zero_to_60_sec}s`, detail: `${best.vehicle} ${best.trim} — $${Math.round(best.msrp / 1000)}k MSRP` })
    }
  }
  return tiles
}

function tilesForCharging(d: Row[], isPreowned: boolean): Tile[] {
  const tiles: Tile[] = []
  const l2Rows = numericRows(d, 'l2_10_80')
  if (l2Rows.length) {
    const fastest = l2Rows.reduce((a, b) => (a.l2_10_80 < b.l2_10_80 ? a : b))
    tiles.push({ label: 'Fastest L2 (10\u219280%)', value: `${fastest.l2_10_80} hrs`, detail: `${fastest.vehicle} ${fastest.trim}` })
  }
  if (isPreowned) {
    const nacsWithPrice = d.filter((r) => {
      const c = r.charging_type.toLowerCase()
      return c.includes('nacs') && !c.startsWith('ccs') && hasPreowned(r)
    })
    const priced = nacsWithPrice.map((r) => ({ ...r, prePrice: r.preowned_low! })).filter((r) => r.prePrice > 0)
    if (priced.length) {
      const best = priced.reduce((a, b) => (a.prePrice < b.prePrice ? a : b))
      tiles.push({ label: 'Best NACS Value', value: `~$${Math.round(best.prePrice / 1000)}k`, detail: `${best.vehicle} ${best.year} ${best.trim} \u2014 pre-owned` })
    }
  } else {
    const msrpRows = numericRows(d, 'msrp')
    const nacsNative = msrpRows.filter((r) => {
      const c = r.charging_type.toLowerCase()
      return c.includes('nacs') && !c.startsWith('ccs')
    })
    if (nacsNative.length) {
      const best = nacsNative.reduce((a, b) => (a.msrp < b.msrp ? a : b))
      tiles.push({ label: 'Best NACS Value', value: `$${Math.round(best.msrp / 1000)}k`, detail: `${best.vehicle} ${best.year} ${best.trim}` })
    }
  }
  return tiles
}

function tilesForSixSeat(d: Row[], isPreowned: boolean): Tile[] {
  const tiles: Tile[] = []
  const sixSeatRows = d.filter((r) => r.seats === 6)
  const sixSeatVehicles = [...new Set(sixSeatRows.map((r) => r.vehicle))]
  if (sixSeatVehicles.length) {
    tiles.push({ label: '6-Seat Options', value: `${sixSeatVehicles.length}`, detail: `${sixSeatVehicles.length} vehicle${sixSeatVehicles.length === 1 ? '' : 's'} with captain\u2019s chairs` })
  }
  if (isPreowned) {
    const withPrice = sixSeatRows.filter((r) => hasPreowned(r))
    const priced = withPrice.map((r) => ({ ...r, prePrice: r.preowned_low! })).filter((r) => r.prePrice > 0)
    if (priced.length) {
      const cheapest = priced.reduce((a, b) => (a.prePrice < b.prePrice ? a : b))
      tiles.push({ label: 'Cheapest 6-Seat', value: `~$${Math.round(cheapest.prePrice / 1000)}k`, detail: `${cheapest.vehicle} ${cheapest.trim} \u2014 pre-owned` })
    }
  } else {
    const withMsrp = sixSeatRows.filter((r) => typeof r.msrp === 'number') as (Row & { msrp: number })[]
    if (withMsrp.length) {
      const cheapest = withMsrp.reduce((a, b) => (a.msrp < b.msrp ? a : b))
      tiles.push({ label: 'Cheapest 6-Seat', value: `$${Math.round(cheapest.msrp / 1000)}k`, detail: `${cheapest.vehicle} ${cheapest.trim}` })
    }
  }
  return tiles
}


function tilesForSelfDriving(d: Row[], isPreowned: boolean): Tile[] {
  const tiles: Tile[] = []
  const withTier = d.filter((r) => r.self_driving_tier && selfDrivingOrdinal(r.self_driving_tier) > 0)
  if (!withTier.length) return tiles

  // Best Self-Driving — highest tier vehicle
  const best = withTier.reduce((a, b) => selfDrivingOrdinal(a.self_driving_tier) >= selfDrivingOrdinal(b.self_driving_tier) ? a : b)
  tiles.push({ label: 'Best Self-Driving', value: best.self_driving_tier!, detail: best.vehicle })

  // Best Self-Driving Value — highest tier at lowest price
  if (isPreowned) {
    const priced = withTier
      .filter((r) => hasPreowned(r))
      .map((r) => ({ ...r, prePrice: r.preowned_low! }))
      .filter((r) => r.prePrice > 0)
    if (priced.length) {
      const maxTier = Math.max(...priced.map((r) => selfDrivingOrdinal(r.self_driving_tier)))
      const topTier = priced.filter((r) => selfDrivingOrdinal(r.self_driving_tier) === maxTier)
      const cheapest = topTier.reduce((a, b) => a.prePrice < b.prePrice ? a : b)
      tiles.push({ label: 'Best Self-Driving Value', value: cheapest.self_driving_tier!, detail: `${cheapest.vehicle} ${cheapest.trim} \u2014 ~$${Math.round(cheapest.prePrice / 1000)}k pre-owned` })
    }
  } else {
    const withMsrp = withTier.filter((r) => typeof r.msrp === 'number') as (Row & { msrp: number })[]
    if (withMsrp.length) {
      const maxTier = Math.max(...withMsrp.map((r) => selfDrivingOrdinal(r.self_driving_tier)))
      const topTier = withMsrp.filter((r) => selfDrivingOrdinal(r.self_driving_tier) === maxTier)
      const cheapest = topTier.reduce((a, b) => a.msrp < b.msrp ? a : b)
      tiles.push({ label: 'Best Self-Driving Value', value: cheapest.self_driving_tier!, detail: `${cheapest.vehicle} ${cheapest.trim} \u2014 $${Math.round(cheapest.msrp / 1000)}k MSRP` })
    }
  }
  return tiles
}

// Tile generators now receive isPreowned flag
type TileGenerator = (d: Row[], isPreowned: boolean) => Tile[]

const TILE_GENERATORS: Record<string, TileGenerator> = {
  range: tilesForRange,
  storage: (d, _ip) => tilesForStorage(d),
  power: tilesForPower,
  charging: tilesForCharging,
  selfdriving: tilesForSelfDriving,
  sixseat: tilesForSixSeat,
}


/* ── component ── */

interface OverviewTabProps {
  condition: string
  budget: string
  pref1: string
  pref2: string
  onFiltersChange: (f: Partial<InsightFilters>, replace?: boolean) => void
  onVehicleClick?: (vehicle: string) => void
}

export default function OverviewTab({ condition, budget, pref1, pref2, onFiltersChange, onVehicleClick }: OverviewTabProps) {
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    const defaults: Partial<InsightFilters> = {}
    if (!condition) defaults.condition = SPEED_DATING_DEFAULTS.condition
    if (!budget) defaults.budget = SPEED_DATING_DEFAULTS.budget
    if (!pref1 && !pref2) {
      defaults.pref1 = SPEED_DATING_DEFAULTS.pref1
      defaults.pref2 = SPEED_DATING_DEFAULTS.pref2
    }
    if (Object.keys(defaults).length) {
      onFiltersChange({
        condition: condition || SPEED_DATING_DEFAULTS.condition,
        budget: budget || SPEED_DATING_DEFAULTS.budget,
        pref1: pref1 || defaults.pref1 || '',
        pref2: pref2 || defaults.pref2 || '',
      }, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCondition = condition || SPEED_DATING_DEFAULTS.condition
  const isPreowned = activeCondition === 'preowned'
  const activePref1 = pref1
  const activePref2 = pref2

  const budgetBuckets = isPreowned ? PREOWNED_BUDGET_BUCKETS : NEW_BUDGET_BUCKETS
  const requestedBudget = budget || SPEED_DATING_DEFAULTS.budget
  const activeBudget: string = budgetBuckets.some((b) => b.id === requestedBudget) ? requestedBudget : 'all'

  /* --- filtered details --- */
  const filteredDetails = useMemo(() => {
    const bucketFilter = budgetBuckets.find((b) => b.id === activeBudget)?.filter ?? (() => true)
    let rows = (DATA.details as Row[]).filter((r) => !isWatchlistVehicle(r.vehicle))
    if (isPreowned) {
      // Only trims with valid pre-owned data
      rows = rows.filter(hasPreowned)
      if (activeBudget !== 'all') {
        rows = rows.filter((r) => {
          const price = r.preowned_low
          return price !== null && bucketFilter(price)
        })
      }
    } else {
      if (activeBudget !== 'all') {
        rows = rows.filter((r) => typeof r.msrp === 'number' && bucketFilter(r.msrp as number))
      }
    }
    if (activePref1 === 'sixseat' || activePref2 === 'sixseat') {
      rows = rows.filter((r) => r.seats === 6)
    }
    return rows
  }, [activeBudget, budgetBuckets, isPreowned, activePref1, activePref2])

  /* --- dynamic tiles --- */
  const tiles = useMemo(() => {
    const result: Tile[] = []
    const d = filteredDetails
    const vehicles = [...new Set(d.map((r) => r.vehicle))]

    if (isPreowned) {
      result.push({
        label: 'Pre-Owned Trims',
        value: `${d.length}`,
        detail: `across ${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`,
        category: 'count',
      })
      const prices = d.map((r) => r.preowned_low).filter((p): p is number => p !== null && p > 0)
      if (prices.length) {
        result.push({
          label: 'Pre-Owned Price Range',
          value: `$${Math.round(Math.min(...prices) / 1000)}k\u2013$${Math.round(Math.max(...prices) / 1000)}k`,
          detail: 'listing price range',
          category: 'count',
        })
      }
    } else {
      result.push({
        label: 'Trims in Budget',
        value: `${d.length}`,
        detail: `across ${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`,
        category: 'count',
      })
      const msrpNums = numericRows(d, 'msrp')
      if (msrpNums.length) {
        const min = msrpNums.reduce((a, b) => (a.msrp < b.msrp ? a : b))
        const max = msrpNums.reduce((a, b) => (a.msrp > b.msrp ? a : b))
        result.push({
          label: 'MSRP Range',
          value: `$${Math.round(min.msrp / 1000)}k\u2013$${Math.round(max.msrp / 1000)}k`,
          detail: `${min.vehicle} \u2013 ${max.vehicle}`,
          category: 'count',
        })
      }
    }

    for (const pref of [activePref1, activePref2]) {
      if (pref && TILE_GENERATORS[pref]) {
        result.push(...TILE_GENERATORS[pref](d, isPreowned).map((t) => ({ ...t, category: pref })))
      }
    }

    return result
  }, [filteredDetails, activePref1, activePref2, isPreowned])

  /* --- vehicle summaries + budget flags for glance table --- */
  const { vehicleSummaries, vehiclesInBudget, ranks, rankResult } = useMemo(() => {
    const d = DATA.details
    const allVehicles = [...new Set(d.map((r) => r.vehicle))].filter((v) => !isWatchlistVehicle(v)).sort()

    const inBudget = new Set<string>()
    for (const r of filteredDetails) inBudget.add(r.vehicle)

    const rawSummaries = allVehicles.map((v) => {
      const rows = d.filter((r) => r.vehicle === v)
      const msrps = rows.map((r) => r.msrp).filter((x) => typeof x === 'number') as number[]
      const ranges = rows.map((r) => r.range_mi).filter((x) => typeof x === 'number') as number[]
      const accelTimes = rows.map((r) => r.zero_to_60_sec).filter((x) => typeof x === 'number') as number[]
      const bats = rows.map((r) => r.battery_kwh).filter((x) => typeof x === 'number') as number[]
      const preLows = rows.map((r) => r.preowned_low).filter((x) => x !== null) as number[]
      const preHighs = rows.map((r) => r.preowned_high).filter((x) => x !== null) as number[]
      const cargo3s = rows.map((r) => r.cargo_behind_3rd_cu_ft).filter((x) => typeof x === 'number') as number[]
      const cargo2s = rows.map((r) => r.cargo_behind_2nd_cu_ft).filter((x) => typeof x === 'number') as number[]
      const dcChargeTimes = rows.map((r) => r.dc_fast_charge_10_80_min).filter((x) => typeof x === 'number') as number[]
      const sdTiers = rows.map((r) => selfDrivingOrdinal(r.self_driving_tier)).filter((x) => x > 0)
      return {
        vehicle: v,
        msrpLow: msrps.length ? Math.min(...msrps) : null,
        msrpHigh: msrps.length ? Math.max(...msrps) : null,
        rangeLow: ranges.length ? Math.min(...ranges) : null,
        rangeHigh: ranges.length ? Math.max(...ranges) : null,
        zeroTo60Best: accelTimes.length ? Math.min(...accelTimes) : null,
        zeroTo60Slowest: accelTimes.length ? Math.max(...accelTimes) : null,
        battery: bats.length ? `${Math.min(...bats)}${Math.min(...bats) !== Math.max(...bats) ? `\u2013${Math.max(...bats)}` : ''}` : '\u2014',
        preLow: preLows.length ? Math.min(...preLows) : null,
        preHigh: preHighs.length ? Math.max(...preHighs) : null,
        cargo3Low: cargo3s.length ? Math.min(...cargo3s) : null,
        cargo3High: cargo3s.length ? Math.max(...cargo3s) : null,
        cargo2Low: cargo2s.length ? Math.min(...cargo2s) : null,
        cargo2High: cargo2s.length ? Math.max(...cargo2s) : null,
        dcChargeMin: dcChargeTimes.length ? Math.min(...dcChargeTimes) : null,
        selfDrivingMax: sdTiers.length ? Math.max(...sdTiers) : 0,
        selfDrivingLabel: sdTiers.length
          ? Object.entries(SELF_DRIVING_TIER_ORDER).find(([, ord]) => ord === Math.max(...sdTiers))?.[0] ?? '\u2014'
          : '\u2014',
        hasPreowned: rows.some(hasPreowned),
        has6Seat: rows.some((r) => r.seats === 6),
      }
    })

    // Compute ranks only for vehicles in the filtered set (respects budget + 6-seat filter)
    const rankResult = computeRanks(summarizeInBudget(filteredDetails, isPreowned), activePref1, activePref2)
    const ranks = rankResult.ranks

    // Sort by rank (ranked vehicles first, then alphabetical for unranked)
    const vehicleSummaries = [...rawSummaries].sort((a, b) => {
      const ra = ranks.get(a.vehicle)
      const rb = ranks.get(b.vehicle)
      if (ra !== undefined && rb !== undefined) return ra - rb
      if (ra !== undefined) return -1
      if (rb !== undefined) return 1
      return a.vehicle.localeCompare(b.vehicle)
    })

    return { vehicleSummaries, vehiclesInBudget: inBudget, ranks, rankResult }
  }, [filteredDetails, activePref1, activePref2, isPreowned])

  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null)

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    function sync() {
      const t = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
      setTheme(t)
    }
    sync()
    window.addEventListener('theme-change', sync)
    return () => window.removeEventListener('theme-change', sync)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('theme', next)
    localStorage.setItem('theme-unlocked', 'true')
    // Dispatch custom event so Header can pick up the unlock
    window.dispatchEvent(new Event('theme-change'))
  }

  const fmt = (n: number) => Math.round(n).toLocaleString()
  const fmtDollarK = (n: number) => `$${Math.round(n / 1000)}k`
  const rangeStr = (lo: number | null, hi: number | null, unit = '') => {
    if (lo === null) return '\u2014'
    if (lo === hi) return `${fmt(lo!)}${unit}`
    return `${fmt(lo!)}\u2013${fmt(hi!)}${unit}`
  }

  function handleCondition(id: string) {
    onFiltersChange({ condition: id, budget: 'all' })
  }

  function handleBudget(id: string) {
    onFiltersChange({ budget: id })
  }

  function handlePref(id: string) {
    if (id === activePref1) {
      onFiltersChange({ pref1: activePref2, pref2: '' })
    } else if (id === activePref2) {
      onFiltersChange({ pref2: '' })
    } else if (!activePref1) {
      onFiltersChange({ pref1: id })
    } else if (!activePref2) {
      onFiltersChange({ pref2: id })
    } else {
      onFiltersChange({ pref1: activePref2, pref2: id })
    }
  }

  const showBudgetNote = activeBudget !== 'all'

  return (
    <>
      <div className="overview-hero">
        <div className="overview-hero-text">
          <h1 className="overview-hero-title">Find Your Perfect 3-Row EV</h1>
          <p className="overview-hero-sub">Compare specs, pricing, and features</p>
        </div>
        <div className="overview-hero-image" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
          <picture>
            <source media="(max-width: 767px)" srcSet={theme === 'light' ? '/hero-sketch-light-mobile.webp' : '/hero-sketch-mobile.webp'} type="image/webp" />
            <source media="(max-width: 767px)" srcSet={theme === 'light' ? '/hero-sketch-light-mobile.png' : '/hero-sketch-mobile.png'} type="image/png" />
            <source srcSet={theme === 'light' ? '/hero-sketch-light.webp' : '/hero-sketch-dark.webp'} type="image/webp" />
            <img src={theme === 'light' ? '/hero-sketch-light.png' : '/hero-sketch-dark.png'} alt="3-Row EV concept sketch" width={800} height={450} loading="eager" fetchPriority="high" />
          </picture>
        </div>
      </div>

      <h2 className="section-title section-title--hero">Let&apos;s Go Speed Dating</h2>
      <p className="section-desc">
        Results from {filteredDetails.length} configurations
        {activeBudget !== 'all' && ` in your budget`}. Pick what matters most to you.
      </p>

      {/* ── Filters ── */}
      <div className="insight-filters">
        <div className="insight-filter-group">
          <span className="insight-filter-label">Condition</span>
          <div className="insight-pills">
            <button className={`insight-pill${activeCondition === 'new' ? ' active' : ''}`} onClick={() => handleCondition('new')}>New</button>
            <button className={`insight-pill${activeCondition === 'preowned' ? ' active' : ''}`} onClick={() => handleCondition('preowned')}>Pre-Owned</button>
          </div>
        </div>
        <div className="insight-filter-group">
          <span className="insight-filter-label">Budget</span>
          <div className="insight-pills">
            {budgetBuckets.map((b) => (
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
            {PREFERENCE_OPTIONS.map((p) => {
              const isPref1 = activePref1 === p.id
              const isPref2 = activePref2 === p.id
              return (
                <button
                  key={p.id}
                  className={`insight-pill${isPref1 || isPref2 ? ' active' : ''}`}
                  data-category={p.id}
                  onClick={() => handlePref(p.id)}
                >
                  {isPref1 && <span className="pref-badge">1</span>}
                  {isPref2 && <span className="pref-badge">2</span>}
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Dynamic Tiles ── */}
      {tiles.length > 0 ? (
        <div className="overview-stats">
          {tiles.map((t, i) => (
            <div key={i} className="overview-stat" data-category={t.category} style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="overview-stat-label">{t.label}</div>
              <div className="overview-stat-value">{t.value}</div>
              <div className="overview-stat-detail">{t.detail}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ marginBottom: 12 }}>No trims match this {isPreowned ? 'pre-owned price' : 'budget'} range.</p>
          <button className="insight-pill active" onClick={() => handleBudget('all')}>
            Reset to All Prices
          </button>
        </div>
      )}

      {/* ── Vehicle Comparison Summary ── */}
      <div className="card">
        <div className="card-title">Speed Dating Results</div>
        {(activePref1 || activePref2) && (() => {
          const allPrefs: string[] = []
          if (activePref1) allPrefs.push(activePref1)
          if (activePref2) allPrefs.push(activePref2)
          const prefLabel = (id: string) => id === 'sixseat' ? '6-Seat availability' : (PREFERENCE_OPTIONS.find((p) => p.id === id)?.label ?? id)
          if (allPrefs.length === 2) {
            return <p className="count-note" style={{ marginBottom: 8 }}>Ranked by {prefLabel(allPrefs[0])} (primary) and {prefLabel(allPrefs[1])} (secondary)</p>
          } else if (allPrefs.length === 1) {
            return <p className="count-note" style={{ marginBottom: 8 }}>Ranked by {prefLabel(allPrefs[0])}</p>
          }
          return null
        })()}

        {/* Desktop table */}
        <div className="cmp-table-view">
          <div className="table-wrap glance-table-wrap">
            <table className="glance-table">
              <thead>
                <tr>
                  <th className="col-sticky">Vehicle</th>
                  <th className="num">{isPreowned ? 'Pre-Owned Price' : 'MSRP'}</th>
                  <th className="num">Range (mi)</th>
                  <th className="num">0-60 (s)</th>
                  <th className="num">Battery (kWh)</th>
                  <th className="num">DC 10–80%</th>
                  <th>Self-Driving Tier</th>
                  <th className="num">Behind 3rd Row (cu ft)</th>
                  <th>6-Seat</th>
                </tr>
              </thead>
              <tbody>
                {vehicleSummaries.filter((s) => !isWatchlistVehicle(s.vehicle)).map((s) => {
                  const dimmed = isPreowned
                    ? !s.hasPreowned || !vehiclesInBudget.has(s.vehicle)
                    : !vehiclesInBudget.has(s.vehicle)
                  return (
                    <tr key={s.vehicle} className={dimmed ? 'glance-row-dimmed' : ''}>
                      <td className="col-sticky">
                        <div className="col-sticky-ranked">
                          {ranks.get(s.vehicle) !== undefined && (
                            <span className="rank-badge">#{ranks.get(s.vehicle)}</span>
                          )}
                          {onVehicleClick
                            ? <span style={{ cursor: 'pointer' }} onClick={() => onVehicleClick(s.vehicle)}><VehicleBadge vehicle={s.vehicle} /></span>
                            : <Link href={`/vehicles/${toSlug(s.vehicle)}`}><VehicleBadge vehicle={s.vehicle} /></Link>
                          }
                        </div>
                      </td>
                      <td className="num">
                        {isPreowned
                          ? (s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014')
                          : (s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014')
                        }
                      </td>
                      <td className="num">{rangeStr(s.rangeLow, s.rangeHigh)}</td>
                      <td className="num">{s.zeroTo60Best !== null ? `${s.zeroTo60Best}` : '\u2014'}</td>
                      <td className="num">{s.battery}</td>
                      <td className="num">{s.dcChargeMin !== null ? `${s.dcChargeMin} min` : '\u2014'}</td>
                      <td>{s.selfDrivingLabel}</td>
                      <td className="num">{rangeStr(s.cargo3Low, s.cargo3High)}</td>
                      <td>{s.has6Seat ? 'Yes' : 'No'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile card layout */}
        <div className="cmp-card-view">
          <div className="cmp-cards">
            {vehicleSummaries.filter((s) => !isWatchlistVehicle(s.vehicle)).map((s) => {
              const dimmed = isPreowned
                ? !s.hasPreowned || !vehiclesInBudget.has(s.vehicle)
                : !vehiclesInBudget.has(s.vehicle)
              const expanded = expandedVehicle === s.vehicle
              return (
                <div key={s.vehicle} className={`cmp-card glance-accordion${dimmed ? ' glance-row-dimmed' : ''}${expanded ? ' expanded' : ''}`}>
                  <div className="cmp-card-header" onClick={() => setExpandedVehicle(expanded ? null : s.vehicle)}>
                    {ranks.get(s.vehicle) !== undefined && (
                      <span className="rank-badge">#{ranks.get(s.vehicle)}</span>
                    )}
                    <VehicleBadge vehicle={s.vehicle} />
                    <button
                      className="card-page-link"
                      aria-label={`View ${s.vehicle} details`}
                      onClick={(e) => { e.stopPropagation(); onVehicleClick?.(s.vehicle) }}
                    >
                      <span aria-hidden="true">↗</span>
                    </button>
                    <span className="accordion-chevron" />
                  </div>
                  <div className="cmp-card-stats">
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">{isPreowned ? 'Pre-Owned Price' : 'MSRP'}</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                        {isPreowned
                          ? (s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014')
                          : (s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014')
                        }
                      </span>
                    </div>
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Range</span>
                      <span className="cmp-stat-value" style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>
                        {rangeStr(s.rangeLow, s.rangeHigh, ' mi')}
                      </span>
                    </div>
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">0-60 (s)</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                        {s.zeroTo60Best !== null ? `${s.zeroTo60Best}` : '\u2014'}
                      </span>
                    </div>
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Battery</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                        {s.battery} kWh
                      </span>
                    </div>
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">DC 10–80%</span>
                      <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>
                        {s.dcChargeMin !== null ? `${s.dcChargeMin} min` : '\u2014'}
                      </span>
                    </div>
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">Self-Driving</span>
                      <span className="cmp-stat-value">{s.selfDrivingLabel}</span>
                    </div>
                    {s.cargo3Low !== null && (
                      <div className="cmp-stat">
                        <span className="cmp-stat-label">Behind 3rd Row</span>
                        <span className="cmp-stat-value" style={{ fontFamily: 'var(--mono)' }}>{rangeStr(s.cargo3Low, s.cargo3High)} cu ft</span>
                      </div>
                    )}
                    <div className="cmp-stat">
                      <span className="cmp-stat-label">6-Seat</span>
                      <span className="cmp-stat-value">{s.has6Seat ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="math-explore-row">
      {/* ── Math Explanation ── */}
      {rankResult.effectivePrefs.length > 0 && (() => {
        const prefLabel = (id: string) => PREFERENCE_OPTIONS.find((p) => p.id === id)?.label ?? id
        const top3 = vehicleSummaries
          .filter((s) => ranks.get(s.vehicle) !== undefined)
          .slice(0, 3)
        if (!top3.length) return null
        const ep = rankResult.effectivePrefs
        const hasTwoPrefs = ep.length === 2
        return (
          <div className="card math-section">
            <div className="card-title">How Is The Math Mathing?</div>
            <p className="count-note" style={{ marginBottom: 12 }}>
              Each metric is normalized 0&ndash;1 across all vehicles in your budget.
              {hasTwoPrefs
                ? ` Your primary pick (${prefLabel(ep[0])}) counts 60%, secondary (${prefLabel(ep[1])}) counts 40%.`
                : ` Ranked by ${prefLabel(ep[0])} only.`}
              {(activePref1 === 'sixseat' || activePref2 === 'sixseat') && ' Filtered to 6-seat vehicles only.'}
            </p>

            {/* Desktop table */}
            <div className="cmp-table-view">
              <table className="math-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Vehicle</th>
                    {ep.map((p) => (
                      <Fragment key={p}>
                        <th className="num">{prefLabel(p)}</th>
                        <th className="num math-sub">Score</th>
                      </Fragment>
                    ))}
                    <th className="num">Composite</th>
                  </tr>
                </thead>
                <tbody>
                  {top3.map((s) => {
                    const composite = rankResult.composites.get(s.vehicle) ?? 0
                    return (
                      <tr key={s.vehicle}>
                        <td>#{ranks.get(s.vehicle)}</td>
                        <td><VehicleBadge vehicle={s.vehicle} /></td>
                        {ep.map((p) => {
                          const normalized = rankResult.normalizedByPref.get(p)?.get(s.vehicle) ?? 0
                          const raw = extractMetric(s, p)
                          return (
                            <Fragment key={p}>
                              <td className="num" style={{ color: 'var(--text-muted)' }}>{formatRawMetric(p, raw)}</td>
                              <td className="num">{normalized.toFixed(2)}</td>
                            </Fragment>
                          )
                        })}
                        <td className="num math-composite">{composite.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="cmp-card-view">
              <div className="math-cards">
                {top3.map((s) => {
                  const composite = rankResult.composites.get(s.vehicle) ?? 0
                  return (
                    <div key={s.vehicle} className="math-vehicle-card">
                      <div className="math-vehicle-header">
                        <span className="rank-badge">#{ranks.get(s.vehicle)}</span>
                        <VehicleBadge vehicle={s.vehicle} />
                      </div>
                      {ep.map((p, i) => {
                        const normalized = rankResult.normalizedByPref.get(p)?.get(s.vehicle) ?? 0
                        const raw = extractMetric(s, p)
                        const weight = hasTwoPrefs ? (i === 0 ? '60%' : '40%') : '100%'
                        return (
                          <div key={p} className="math-pref-row">
                            <span className="math-pref-label">{prefLabel(p)} ({weight})</span>
                            <span className="math-pref-raw">{formatRawMetric(p, raw)}</span>
                            <span className="math-pref-score">{normalized.toFixed(2)}</span>
                          </div>
                        )
                      })}
                      <div className="math-composite-row">
                        <span>Composite</span>
                        <span className="math-composite">{composite.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
      <ExploreTeaser />
      </div>

      <MarketInsights onVehicleClick={onVehicleClick} />
    </>
  )
}
