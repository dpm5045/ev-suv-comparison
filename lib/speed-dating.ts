/**
 * Speed Dating (home page) ranking logic. Pure functions, no React.
 *
 * Vehicles are scored only on the trims that fit the chosen condition and
 * budget: each metric is min-max normalized across the vehicles in budget,
 * then the first pick counts 60% and the second 40%.
 */
import type { DetailRow } from './data'

type Row = DetailRow

export function hasPreowned(r: Row): boolean {
  const p = r.preowned_range || ''
  return p.length > 0 && p.indexOf('N/A') < 0 && p.indexOf('No ') < 0
}

/* ── constants ── */

export const NEW_BUDGET_BUCKETS = [
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60to90', label: '$60k–$90k', filter: (v: number) => v >= 60000 && v <= 90000 },
  { id: '90plus', label: '$90k+', filter: (v: number) => v > 90000 },
  { id: 'all', label: 'Any price', filter: () => true },
] as const

export const PREOWNED_BUDGET_BUCKETS = [
  { id: 'under40', label: 'Under $40k', filter: (v: number) => v < 40000 },
  { id: 'under60', label: 'Under $60k', filter: (v: number) => v < 60000 },
  { id: '60plus', label: '$60k+', filter: (v: number) => v >= 60000 },
  { id: 'all', label: 'Any price', filter: () => true },
] as const

export const PREFERENCE_OPTIONS = [
  { id: 'range', label: 'Range' },
  { id: 'storage', label: 'Storage' },
  { id: 'power', label: '0 to 60' },
  { id: 'charging', label: 'Charging Speed' },
  { id: 'selfdriving', label: 'Self-Driving' },
  { id: 'sixseat', label: '6-Seat Options' },
] as const

/** What the home page opens on: most shoppers buy used and under $60k. */
export const SPEED_DATING_DEFAULTS = { condition: 'preowned', budget: 'under60', pref1: 'range', pref2: 'storage' } as const

export const SELF_DRIVING_TIER_ORDER: Record<string, number> = {
  'Basic L2': 1,
  'Advanced L2': 2,
  'L2+ Hands-Free': 3,
  'L2+ Point-to-Point': 4,
}

export function selfDrivingOrdinal(tier: string | null): number {
  return tier ? (SELF_DRIVING_TIER_ORDER[tier] ?? 0) : 0
}

/* ── scoring engine ── */

export interface VehicleScorable {
  vehicle: string
  rangeHigh: number | null
  zeroTo60Best: number | null
  cargo3High: number | null
  cargo2High: number | null
  dcChargeMin: number | null
  selfDrivingMax: number
}

export function extractMetric(s: VehicleScorable, pref: string): number | null {
  switch (pref) {
    case 'range': return s.rangeHigh
    case 'power': return s.zeroTo60Best
    case 'storage': return (s.cargo3High !== null && s.cargo3High > 0) ? s.cargo3High : s.cargo2High
    case 'charging': return s.dcChargeMin
    case 'selfdriving': return s.selfDrivingMax
    default: return null
  }
}

export function normalizeScores(
  summaries: VehicleScorable[],
  pref: string
): Map<string, number> {
  const scores = new Map<string, number>()
  const lowerIsBetter = pref === 'charging' || pref === 'power'
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

export interface RankResult {
  ranks: Map<string, number>
  composites: Map<string, number>
  normalizedByPref: Map<string, Map<string, number>>
  effectivePrefs: string[]
}

export function computeRanks(
  summaries: VehicleScorable[],
  pref1: string,
  pref2: string
): RankResult {
  const ranks = new Map<string, number>()
  const compositeMap = new Map<string, number>()
  const normalizedByPref = new Map<string, Map<string, number>>()
  const empty: RankResult = { ranks, composites: compositeMap, normalizedByPref, effectivePrefs: [] }
  if (!pref1 && !pref2) return empty

  // Determine effective prefs (excluding sixseat which is a filter)
  const effectivePrefs: string[] = []
  if (pref1 && pref1 !== 'sixseat') effectivePrefs.push(pref1)
  if (pref2 && pref2 !== 'sixseat') effectivePrefs.push(pref2)

  if (!effectivePrefs.length) return empty

  const scores1 = normalizeScores(summaries, effectivePrefs[0])
  normalizedByPref.set(effectivePrefs[0], scores1)
  const scores2 = effectivePrefs.length > 1 ? normalizeScores(summaries, effectivePrefs[1]) : null
  if (scores2) normalizedByPref.set(effectivePrefs[1], scores2)

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
    compositeMap.set(composites[i].vehicle, composites[i].score)
  }

  return { ranks, composites: compositeMap, normalizedByPref, effectivePrefs }
}

export function formatRawMetric(pref: string, value: number | null): string {
  if (value === null || value === 0) return '—'
  switch (pref) {
    case 'range': return `${Math.round(value)} mi`
    case 'power': return `${value}s`
    case 'storage': return `${Number(value.toFixed(1))} cu ft`
    case 'charging': return `${Math.round(value)} min`
    case 'selfdriving': {
      const entry = Object.entries(SELF_DRIVING_TIER_ORDER).find(([, ord]) => ord === value)
      return entry ? entry[0] : '—'
    }
    default: return String(value)
  }
}

/* ── in-budget summaries ── */

export interface SpeedDatingMatch extends VehicleScorable {
  trimCount: number // rows in budget for this vehicle
  priceLow: number | null // lowest price in budget: preowned_low when pre-owned, msrp when new
  priceHigh: number | null
  has6Seat: boolean
}

const nums = (vals: unknown[]): number[] =>
  vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
const maxOrNull = (xs: number[]) => (xs.length ? Math.max(...xs) : null)
const minOrNull = (xs: number[]) => (xs.length ? Math.min(...xs) : null)

/**
 * One summary per vehicle, computed ONLY from the rows passed in — the rows
 * already filtered by condition, budget and the six-seat pick. A vehicle is
 * never scored on a trim it can't be bought in at this budget.
 */
export function summarizeInBudget(rows: Row[], isPreowned: boolean): SpeedDatingMatch[] {
  const byVehicle = new Map<string, Row[]>()
  for (const r of rows) byVehicle.set(r.vehicle, [...(byVehicle.get(r.vehicle) ?? []), r])

  return [...byVehicle.entries()].map(([vehicle, rs]) => {
    const lows = isPreowned ? nums(rs.map((r) => r.preowned_low)) : nums(rs.map((r) => r.msrp))
    const highs = isPreowned ? nums(rs.map((r) => r.preowned_high)) : nums(rs.map((r) => r.msrp))
    return {
      vehicle,
      rangeHigh: maxOrNull(nums(rs.map((r) => r.range_mi))),
      zeroTo60Best: minOrNull(nums(rs.map((r) => r.zero_to_60_sec))),
      cargo3High: maxOrNull(nums(rs.map((r) => r.cargo_behind_3rd_cu_ft))),
      cargo2High: maxOrNull(nums(rs.map((r) => r.cargo_behind_2nd_cu_ft))),
      dcChargeMin: minOrNull(nums(rs.map((r) => r.dc_fast_charge_10_80_min))),
      selfDrivingMax: Math.max(0, ...rs.map((r) => selfDrivingOrdinal(r.self_driving_tier))),
      trimCount: rs.length,
      priceLow: minOrNull(lows),
      priceHigh: maxOrNull(highs),
      has6Seat: rs.some((r) => r.seats === 6),
    }
  })
}
