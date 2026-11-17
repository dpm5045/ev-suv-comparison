/**
 * Speed Dating (home page) ranking. Pure functions over rows passed in; no
 * React and no DATA import.
 *
 * Each eligible configuration (one row: a trim, year and seating) is scored on
 * its own specs. A vehicle is represented by its best-scoring real
 * configuration, so every number shown together belongs to one car you can
 * buy, never the best range of one trim with the 0–60 of another.
 */
import { TIER_RANK, type DetailRow } from './data'
import { budgetPrice, type Condition } from './selection'

export { NEW_BUDGET_BUCKETS, PREOWNED_BUDGET_BUCKETS, hasPreowned } from './selection'

type Row = DetailRow

export const PREFERENCE_OPTIONS = [
  { id: 'range', label: 'Range' },
  { id: 'storage', label: 'Storage' },
  { id: 'power', label: '0 to 60' },
  { id: 'charging', label: 'Charging Speed' },
  { id: 'selfdriving', label: 'Self-Driving' },
  { id: 'sixseat', label: '6-Seat Options' },
] as const

/** Picks that are scored. "sixseat" is a filter, not a metric. */
export const METRIC_PREFS = ['range', 'storage', 'power', 'charging', 'selfdriving'] as const
export type MetricPref = (typeof METRIC_PREFS)[number]

/** Picks where a smaller number is better. */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set(['power', 'charging'])

/** What the home page opens on: most shoppers buy used and under $60k. */
export const SPEED_DATING_DEFAULTS = { condition: 'preowned', budget: 'under60', pref1: 'range', pref2: 'storage' } as const

/** Tier ranks live in lib/data.ts (TIER_RANK) so every view ranks the same way. */
export const SELF_DRIVING_TIER_ORDER: Record<string, number> = TIER_RANK

const positive = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)

/**
 * One configuration's value for a pick, or null when unknown. Storage is the
 * space behind the third row only: the space behind the second row is a
 * different (much larger) measure and is never substituted for it.
 */
export function rowMetric(r: Row, pref: string): number | null {
  switch (pref) {
    case 'range': return positive(r.range_mi)
    case 'power': return positive(r.zero_to_60_sec)
    case 'storage': return positive(r.cargo_behind_3rd_cu_ft)
    case 'charging': return positive(r.dc_fast_charge_10_80_min)
    case 'selfdriving': return positive(r.self_driving_rank)
    default: return null
  }
}

/** The scored picks, in order: known metrics only, duplicates and "sixseat" dropped. */
export function effectivePrefs(pref1: string, pref2: string): MetricPref[] {
  const out: MetricPref[] = []
  for (const p of [pref1, pref2]) {
    if ((METRIC_PREFS as readonly string[]).includes(p) && !out.includes(p as MetricPref)) out.push(p as MetricPref)
  }
  return out
}

/** URL values → valid Speed Dating settings; anything unknown falls back to the defaults. */
export function parseSpeedDatingParams(p: { condition?: string | null; budget?: string | null; pref1?: string | null; pref2?: string | null }, buckets: (c: Condition) => readonly { id: string }[]) {
  const condition: Condition = p.condition === 'new' || p.condition === 'preowned' ? p.condition : SPEED_DATING_DEFAULTS.condition
  const ids = buckets(condition).map((b) => b.id)
  const budget = p.budget && ids.includes(p.budget) ? p.budget : ids.includes(SPEED_DATING_DEFAULTS.budget) ? SPEED_DATING_DEFAULTS.budget : 'all'
  const known = (v?: string | null) => (v && PREFERENCE_OPTIONS.some((o) => o.id === v) ? v : '')
  let pref1 = known(p.pref1)
  let pref2 = known(p.pref2)
  if (pref1 === pref2) pref2 = ''
  if (!pref1 && pref2) [pref1, pref2] = [pref2, '']
  return { condition, budget, pref1, pref2 }
}

export interface ScoredConfig {
  vehicle: string
  /** The configuration that represents the vehicle: every spec shown comes from it */
  row: Row
  rank: number
  /** 0–1: 60% first pick + 40% second (or the one pick) */
  composite: number
  /** Per pick: this configuration's value and its share of the best value among eligible configurations */
  metrics: { pref: MetricPref; value: number | null; share: number }[]
  /** Model-level context: how many of the vehicle's configurations fit, and the span of their budget prices (pre-owned: starting prices) */
  trimCount: number
  priceLow: number | null
  priceHigh: number | null
}

const EPS = 1e-9

/**
 * Rank vehicles by their best real configuration.
 *
 * Each pick is scored as a share of the best value among all eligible
 * configurations (best ÷ value where lower is better); unknown scores 0.
 * Ties within a vehicle go to the lower price, then the newer model year,
 * then input order. Vehicles get dense ranks by score.
 */
export function rankConfigurations(rows: Row[], pref1: string, pref2: string, condition: Condition): ScoredConfig[] {
  const prefs = effectivePrefs(pref1, pref2)
  if (!prefs.length || !rows.length) return []
  const weights = prefs.length === 2 ? [0.6, 0.4] : [1]

  const best = new Map<MetricPref, number>()
  for (const p of prefs) {
    const vals = rows.map((r) => rowMetric(r, p)).filter((v): v is number => v !== null)
    if (vals.length) best.set(p, LOWER_IS_BETTER.has(p) ? Math.min(...vals) : Math.max(...vals))
  }

  const scored = rows.map((row, index) => {
    const metrics = prefs.map((pref) => {
      const value = rowMetric(row, pref)
      const b = best.get(pref)
      const share = value === null || b === undefined ? 0 : LOWER_IS_BETTER.has(pref) ? b / value : value / b
      return { pref, value, share }
    })
    const composite = metrics.reduce((s, m, i) => s + weights[i] * m.share, 0)
    return { row, index, metrics, composite, price: budgetPrice(row, condition) }
  })

  const byVehicle = new Map<string, typeof scored>()
  for (const s of scored) byVehicle.set(s.row.vehicle, [...(byVehicle.get(s.row.vehicle) ?? []), s])

  const picks = [...byVehicle.entries()].map(([vehicle, list]) => {
    const chosen = [...list].sort((a, b) =>
      b.composite - a.composite > EPS ? 1 : a.composite - b.composite > EPS ? -1
        : (a.price ?? Infinity) - (b.price ?? Infinity) || b.row.year - a.row.year || a.index - b.index)[0]
    // Span of the prices the budget applies to (pre-owned: each trim's lowest price)
    const prices = list.map((s) => s.price).filter((v): v is number => v !== null)
    return {
      vehicle,
      row: chosen.row,
      rank: 0,
      composite: chosen.composite,
      metrics: chosen.metrics,
      trimCount: list.length,
      priceLow: prices.length ? Math.min(...prices) : null,
      priceHigh: prices.length ? Math.max(...prices) : null,
    }
  })

  picks.sort((a, b) => b.composite - a.composite || a.vehicle.localeCompare(b.vehicle))
  let rank = 0
  let prev = Infinity
  for (const p of picks) {
    if (prev - p.composite > EPS) rank++
    prev = p.composite
    p.rank = rank
  }
  return picks
}

/** Display text for a pick's value on one configuration. */
export function formatMetric(pref: string, value: number | null, row?: Row): string {
  if (value === null) return '—'
  switch (pref) {
    case 'range': return `${Math.round(value)} mi`
    case 'power': return `${value}s`
    case 'storage': return `${Number(value.toFixed(1))} cu ft`
    case 'charging': return `${Math.round(value)} min`
    case 'selfdriving':
      if (row?.self_driving_tier) return row.self_driving_tier + (row.adas_downgraded ? ' (older hardware)' : '')
      return Object.entries(SELF_DRIVING_TIER_ORDER).find(([, ord]) => ord === value)?.[0] ?? '—'
    default: return String(value)
  }
}
