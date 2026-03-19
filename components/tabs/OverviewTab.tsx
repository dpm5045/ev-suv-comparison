'use client'

import { useEffect, useMemo, useState } from 'react'
import { DATA } from '@/lib/data'
import type { InsightFilters } from '../Dashboard'
import Link from 'next/link'
import VehicleBadge from '../VehicleBadge'
import { toSlug } from '@/lib/slugs'

const WATCHLIST_VEHICLES = [
  'Toyota Highlander EV',
  'Subaru 3-Row EV',
  'BMW iX7',
  'Genesis GV90',
  'Tesla Model Y Long (Asia)',
]

/* ── helpers ── */

function parsePrice(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.replace(/[$,]/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

type Row = (typeof DATA.details)[number]
type NumRow<K extends keyof Row> = Row & { [P in K]: number }

function numericRows<K extends keyof Row>(d: Row[], key: K): NumRow<K>[] {
  return d.filter((r) => typeof r[key] === 'number') as NumRow<K>[]
}

function hasPreowned(r: Row): boolean {
  const p = r.preowned_range || ''
  return p.length > 0 && p.indexOf('N/A') < 0 && p.indexOf('No ') < 0
}

/* ── constants ── */

const NEW_BUDGET_BUCKETS = [
  { id: 'all', label: 'All Prices', filter: () => true },
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60to90', label: '$60k\u2013$90k', filter: (v: number) => v >= 60000 && v <= 90000 },
  { id: '90plus', label: '$90k+', filter: (v: number) => v > 90000 },
] as const

const PREOWNED_BUDGET_BUCKETS = [
  { id: 'all', label: 'All Prices', filter: () => true },
  { id: 'under40', label: 'Under $40k', filter: (v: number) => v < 40000 },
  { id: '40to55', label: '$40k\u2013$55k', filter: (v: number) => v >= 40000 && v <= 55000 },
  { id: '55plus', label: '$55k+', filter: (v: number) => v > 55000 },
] as const

const PREFERENCE_OPTIONS = [
  { id: 'range', label: 'Range' },
  { id: 'storage', label: 'Storage' },
  { id: 'power', label: 'Horsepower' },
  { id: 'charging', label: 'Charging Speed' },
  { id: 'selfdriving', label: 'Self-Driving' },
  { id: 'sixseat', label: '6-Seat Options' },
] as const

const STARTER_PREFS = ['range', 'storage', 'charging']

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
    const priced = withPrice.map((r) => ({ ...r, prePrice: parsePrice(r.preowned_range)! })).filter((r) => r.prePrice > 0)
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
  const rows = numericRows(d, 'hp')
  if (rows.length) {
    const leader = rows.reduce((a, b) => (a.hp > b.hp ? a : b))
    tiles.push({ label: 'Most Powerful', value: `${Math.round(leader.hp).toLocaleString()} HP`, detail: `${leader.vehicle} ${leader.trim}` })
  }
  if (isPreowned) {
    const withPrice = rows.filter((r) => hasPreowned(r))
    const priced = withPrice.map((r) => ({ ...r, prePrice: parsePrice(r.preowned_range)! })).filter((r) => r.prePrice > 0)
    if (priced.length) {
      const best = priced.reduce((a, b) => (a.hp / a.prePrice > b.hp / b.prePrice ? a : b))
      tiles.push({ label: 'Best HP Value', value: `${Math.round(best.hp)} HP`, detail: `${best.vehicle} ${best.trim} \u2014 ~$${Math.round(best.prePrice / 1000)}k pre-owned` })
    }
  } else {
    const withMsrp = rows.filter((r) => typeof r.msrp === 'number') as (NumRow<'hp'> & { msrp: number })[]
    if (withMsrp.length) {
      const best = withMsrp.reduce((a, b) => (a.hp / a.msrp > b.hp / b.msrp ? a : b))
      tiles.push({ label: 'Best HP Value', value: `${Math.round(best.hp)} HP`, detail: `${best.vehicle} ${best.trim} \u2014 $${Math.round(best.msrp / 1000)}k MSRP` })
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
    const priced = nacsWithPrice.map((r) => ({ ...r, prePrice: parsePrice(r.preowned_range)! })).filter((r) => r.prePrice > 0)
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
    const priced = withPrice.map((r) => ({ ...r, prePrice: parsePrice(r.preowned_range)! })).filter((r) => r.prePrice > 0)
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

const SELF_DRIVING_TIER_ORDER: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}

function selfDrivingOrdinal(tier: string | null): number {
  return tier ? (SELF_DRIVING_TIER_ORDER[tier] ?? 0) : 0
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
      .map((r) => ({ ...r, prePrice: parsePrice(r.preowned_range)! }))
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

/* ── scoring engine ── */

type VehicleSummary = {
  vehicle: string
  rangeHigh: number | null
  hpHigh: number | null
  cargo3High: number | null
  cargo2High: number | null
  dcChargeMin: number | null
  selfDrivingMax: number
  [key: string]: unknown
}

function extractMetric(s: VehicleSummary, pref: string): number | null {
  switch (pref) {
    case 'range': return s.rangeHigh
    case 'power': return s.hpHigh
    case 'storage': return s.cargo3High ?? s.cargo2High
    case 'charging': return s.dcChargeMin
    case 'selfdriving': return s.selfDrivingMax
    default: return null
  }
}

function normalizeScores(
  summaries: VehicleSummary[],
  pref: string
): Map<string, number> {
  const scores = new Map<string, number>()
  const lowerIsBetter = pref === 'charging'
  const values: number[] = []

  for (const s of summaries) {
    const v = extractMetric(s, pref)
    if (v !== null && v !== 0) values.push(v)
  }

  if (!values.length) return scores

  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = max - min

  for (const s of summaries) {
    const v = extractMetric(s, pref)
    if (v === null || v === 0) {
      scores.set(s.vehicle, 0)
    } else if (spread === 0) {
      scores.set(s.vehicle, 1)
    } else {
      const norm = (v - min) / spread
      scores.set(s.vehicle, lowerIsBetter ? 1 - norm : norm)
    }
  }

  return scores
}

function computeRanks(
  summaries: VehicleSummary[],
  pref1: string,
  pref2: string
): Map<string, number> {
  const ranks = new Map<string, number>()
  if (!pref1 && !pref2) return ranks

  // Determine effective prefs (excluding sixseat which is a filter)
  const effectivePrefs: string[] = []
  if (pref1 && pref1 !== 'sixseat') effectivePrefs.push(pref1)
  if (pref2 && pref2 !== 'sixseat') effectivePrefs.push(pref2)

  if (!effectivePrefs.length) return ranks

  const scores1 = normalizeScores(summaries, effectivePrefs[0])
  const scores2 = effectivePrefs.length > 1 ? normalizeScores(summaries, effectivePrefs[1]) : null

  // Composite score
  const composites: { vehicle: string; score: number }[] = []
  for (const s of summaries) {
    const s1 = scores1.get(s.vehicle) ?? 0
    if (scores2) {
      const s2 = scores2.get(s.vehicle) ?? 0
      composites.push({ vehicle: s.vehicle, score: 0.6 * s1 + 0.4 * s2 })
    } else {
      composites.push({ vehicle: s.vehicle, score: s1 })
    }
  }

  // Sort descending
  composites.sort((a, b) => b.score - a.score)

  // Dense ranking
  let rank = 1
  for (let i = 0; i < composites.length; i++) {
    if (i > 0 && composites[i].score < composites[i - 1].score) rank++
    ranks.set(composites[i].vehicle, rank)
  }

  return ranks
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
    if (!condition) defaults.condition = 'new'
    if (!budget) defaults.budget = 'all'
    if (!pref1 && !pref2) {
      const shuffled = [...STARTER_PREFS].sort(() => Math.random() - 0.5)
      defaults.pref1 = shuffled[0]
      defaults.pref2 = shuffled[1]
    }
    if (Object.keys(defaults).length) {
      onFiltersChange({ condition: condition || 'new', budget: budget || 'all', pref1: pref1 || defaults.pref1 || '', pref2: pref2 || defaults.pref2 || '' }, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeCondition = condition || 'new'
  const isPreowned = activeCondition === 'preowned'
  const activeBudget = budget || 'all'
  const activePref1 = pref1
  const activePref2 = pref2

  const budgetBuckets = isPreowned ? PREOWNED_BUDGET_BUCKETS : NEW_BUDGET_BUCKETS
  const bucketFilter = budgetBuckets.find((b) => b.id === activeBudget)?.filter ?? (() => true)

  /* --- filtered details --- */
  const filteredDetails = useMemo(() => {
    let rows = DATA.details as Row[]
    if (isPreowned) {
      // Only trims with valid pre-owned data
      rows = rows.filter(hasPreowned)
      if (activeBudget !== 'all') {
        rows = rows.filter((r) => {
          const price = parsePrice(r.preowned_range)
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
  }, [activeCondition, activeBudget, bucketFilter, isPreowned, activePref1, activePref2])

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
      const prices = d.map((r) => parsePrice(r.preowned_range)).filter((p): p is number => p !== null && p > 0)
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
  const { vehicleSummaries, vehiclesInBudget } = useMemo(() => {
    const d = DATA.details
    const allVehicles = [...new Set(d.map((r) => r.vehicle))].sort()

    const inBudget = new Set<string>()
    for (const r of filteredDetails) inBudget.add(r.vehicle)

    const vehicleSummaries = allVehicles.map((v) => {
      const rows = d.filter((r) => r.vehicle === v)
      const msrps = rows.map((r) => r.msrp).filter((x) => typeof x === 'number') as number[]
      const ranges = rows.map((r) => r.range_mi).filter((x) => typeof x === 'number') as number[]
      const hps = rows.map((r) => r.hp).filter((x) => typeof x === 'number') as number[]
      const bats = rows.map((r) => r.battery_kwh).filter((x) => typeof x === 'number') as number[]
      const types = [...new Set(rows.map((r) => r.charging_type).filter(Boolean))]
      const preLows = rows.map((r) => parsePrice(r.preowned_range)).filter((x) => x !== null) as number[]
      const preHighs = rows.map((r) => {
        const parts = (r.preowned_range || '').split(/\s*[-\u2013]\s*/)
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
        hasPreowned: rows.some(hasPreowned),
      }
    })

    return { vehicleSummaries, vehiclesInBudget: inBudget }
  }, [filteredDetails])

  /* --- watchlist entries --- */
  const watchlistEntries = useMemo(() => {
    return WATCHLIST_VEHICLES.map((v) => {
      const rows = DATA.details.filter((r) => r.vehicle === v)
      if (!rows.length) return { vehicle: v, summary: 'Details TBD.' }
      const first = rows[0]
      const notes = first.notes || ''
      const summary = notes.split('. ').slice(0, 3).join('. ').replace(/\.?$/, '.')
      return { vehicle: v, summary }
    })
  }, [])

  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null)

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
        <h1 className="overview-hero-title">Find Your Perfect 3-Row EV</h1>
        <p className="overview-hero-sub">Compare specs, pricing, and features</p>
        <div className="overview-hero-image">
          <picture>
            <source media="(max-width: 767px)" srcSet="/hero-sketch-mobile.webp" type="image/webp" />
            <source media="(max-width: 767px)" srcSet="/hero-sketch-mobile.png" type="image/png" />
            <source srcSet="/hero-sketch-dark.webp" type="image/webp" />
            <img src="/hero-sketch-dark.png" alt="3-Row EV concept sketch" width={800} height={450} loading="eager" fetchPriority="high" />
          </picture>
        </div>
      </div>

      <h2 className="section-title">Let&apos;s Go Speed Dating</h2>
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
                  {isPref1 && <span className="pref-badge">①</span>}
                  {isPref2 && <span className="pref-badge">②</span>}
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
        {showBudgetNote && <p className="count-note" style={{ marginBottom: 8 }}>Your best matches are highlighted.</p>}
        {isPreowned && <p className="count-note" style={{ marginBottom: 8 }}>Showing pre-owned pricing. Your best matches are highlighted.</p>}

        {/* Desktop table */}
        <div className="cmp-table-view">
          <div className="table-wrap">
            <table className="glance-table">
              <thead>
                <tr>
                  <th className="col-sticky">Vehicle</th>
                  <th className="num">{isPreowned ? 'Pre-Owned Price' : 'MSRP'}</th>
                  <th className="num">Range (mi)</th>
                  <th className="num">HP</th>
                  <th className="num">Battery (kWh)</th>
                  <th>Charge Tech</th>
                  <th className="num">Behind 3rd Row (cu ft)</th>
                  <th className="num">Behind 2nd Row (cu ft)</th>
                </tr>
              </thead>
              <tbody>
                {vehicleSummaries.filter((s) => !WATCHLIST_VEHICLES.includes(s.vehicle)).map((s) => {
                  const dimmed = isPreowned
                    ? !s.hasPreowned || !vehiclesInBudget.has(s.vehicle)
                    : !vehiclesInBudget.has(s.vehicle)
                  return (
                    <tr key={s.vehicle} className={dimmed ? 'glance-row-dimmed' : ''}>
                      <td className="col-sticky">
                        {onVehicleClick
                          ? <span style={{ cursor: 'pointer' }} onClick={() => onVehicleClick(s.vehicle)}><VehicleBadge vehicle={s.vehicle} /></span>
                          : <Link href={`/vehicles/${toSlug(s.vehicle)}`}><VehicleBadge vehicle={s.vehicle} /></Link>
                        }
                      </td>
                      <td className="num">
                        {isPreowned
                          ? (s.preLow !== null ? `${fmtDollarK(s.preLow)}-${fmtDollarK(s.preHigh!)}` : '\u2014')
                          : (s.msrpLow !== null ? `${fmtDollarK(s.msrpLow)}-${fmtDollarK(s.msrpHigh!)}` : '\u2014')
                        }
                      </td>
                      <td className="num">{rangeStr(s.rangeLow, s.rangeHigh)}</td>
                      <td className="num">{rangeStr(s.hpLow, s.hpHigh)}</td>
                      <td className="num">{s.battery}</td>
                      <td>{s.charging}</td>
                      <td className="num">{rangeStr(s.cargo3Low, s.cargo3High)}</td>
                      <td className="num">{rangeStr(s.cargo2Low, s.cargo2High)}</td>
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
            {vehicleSummaries.filter((s) => !WATCHLIST_VEHICLES.includes(s.vehicle)).map((s) => {
              const dimmed = isPreowned
                ? !s.hasPreowned || !vehiclesInBudget.has(s.vehicle)
                : !vehiclesInBudget.has(s.vehicle)
              const expanded = expandedVehicle === s.vehicle
              return (
                <div key={s.vehicle} className={`cmp-card glance-accordion${dimmed ? ' glance-row-dimmed' : ''}${expanded ? ' expanded' : ''}`}>
                  <div className="cmp-card-header" onClick={() => setExpandedVehicle(expanded ? null : s.vehicle)}>
                    <VehicleBadge vehicle={s.vehicle} />
                    <Link
                      href={`/vehicles/${toSlug(s.vehicle)}`}
                      className="card-page-link"
                      aria-label={`View ${s.vehicle} full page`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span aria-hidden="true">↗</span>
                    </Link>
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
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Watchlist ── */}
      <div className="card watchlist-card">
        <div className="card-title">Watchlist</div>
        <p className="count-note" style={{ marginBottom: 16 }}>
          These 3-row electric SUVs are announced but not yet available in the US market.
        </p>
        <div className="watchlist">
          {watchlistEntries.map((w) => (
            <div key={w.vehicle} className="watchlist-item">
              <VehicleBadge vehicle={w.vehicle} />
              <span className="watchlist-summary">{w.summary}</span>
            </div>
          ))}
        </div>
      </div>

    </>
  )
}
