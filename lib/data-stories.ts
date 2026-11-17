/**
 * Data for the chart stories on the Market Insights tab (and the chart teaser on the
 * home page). Pure functions over DATA — no React.
 *
 * Every number is derived from lib/ev-data.json. The only hand-written copy is
 * the "Editorial copy" block at the bottom; review it at each data refresh.
 */
import { DATA, type DetailRow, isWatchlistVehicle } from './data'

/** Year of the last data refresh (2026 for a 2026-11-14 refresh). */
export const dataYear = new Date(DATA.last_updated).getUTCFullYear()

/** Rows for vehicles on sale (watch-list vehicles excluded). */
const baseRows = (): DetailRow[] => DATA.details.filter((r) => !isWatchlistVehicle(r.vehicle))

/** Base rows sold new today, with a current MSRP. */
const recentRows = (): (DetailRow & { msrp: number })[] =>
  baseRows().filter((r): r is DetailRow & { msrp: number } => r.availability === 'new' && typeof r.msrp === 'number')

/** "2025–2027": the model years the recent-row charts actually cover. */
export function recentYearsLabel(): string {
  const years = recentRows().map((r) => r.year)
  const lo = Math.min(...years)
  const hi = Math.max(...years)
  return lo === hi ? String(lo) : `${lo}–${hi}`
}

/* ── number formatting ── */

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']

/** Spell out numbers under ten ("six"), digits otherwise ("46"). */
export function numberWord(n: number): string {
  return n >= 0 && n < 10 && Number.isInteger(n) ? WORDS[n] : n.toLocaleString('en-US')
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "$65,000" */
export const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/** "$55k" */
export const dollarsK = (n: number) => `$${Math.round(n / 1000)}k`

/* ── Story 1: choice ── */

export interface YearCount {
  year: number
  trims: number
  models: number
}

/**
 * Trims and models on sale per model year, up to and including the data year.
 * Later years are skipped: the next model year is only partly announced and
 * would read as a drop.
 */
export function trimsByYear(): YearCount[] {
  const rows = DATA.count_data.filter((c) => !isWatchlistVehicle(c.model))
  const yearKeys = Object.keys(rows[0] ?? {})
    .filter((k) => /^y\d{4}$/.test(k))
    .map((k) => Number(k.slice(1)))
    .filter((y) => y <= dataYear)
    .sort((a, b) => a - b)
  return yearKeys.map((year) => {
    const key = `y${year}` as keyof (typeof rows)[number]
    const counts = rows.map((c) => Number(c[key]) || 0)
    return { year, trims: counts.reduce((s, n) => s + n, 0), models: counts.filter((n) => n > 0).length }
  })
}

export function choiceHeadline(): string {
  const ys = trimsByYear()
  const first = ys[0]
  const last = ys[ys.length - 1]
  return `In ${first.year} there were ${numberWord(first.trims)} trims to choose from. Now there are ${numberWord(last.trims)}.`
}

export function choiceDek(): string {
  const first = trimsByYear()[0]
  const onSale = DATA.count_data.filter(
    (c) => !isWatchlistVehicle(c.model) && Number(c[`y${first.year}` as keyof typeof c]) > 0,
  )
  const lead = onSale.length === 1 ? `In ${first.year} every one of them was a ${onSale[0].model}. ` : ''
  return lead + CHOICE_STORY_NOTE
}

/* ── Story 2: price ── */

export interface PriceRange {
  vehicle: string
  low: number
  high: number
}

/** Cheapest and most expensive MSRP per vehicle, sorted by starting price. */
export function priceRanges(): PriceRange[] {
  const by = new Map<string, number[]>()
  for (const r of recentRows()) by.set(r.vehicle, [...(by.get(r.vehicle) ?? []), r.msrp])
  return [...by.entries()]
    .map(([vehicle, ps]) => ({ vehicle, low: Math.min(...ps), high: Math.max(...ps) }))
    .sort((a, b) => a.low - b.low)
}

export function priceHeadline(): string {
  const n = priceRanges().filter((p) => p.low < PRICE_THRESHOLD).length
  return `Only ${numberWord(n)} models start under ${dollars(PRICE_THRESHOLD)}.`
}

export function priceDek(): string {
  const widest = priceRanges().reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a))
  const spread = Math.round((widest.high - widest.low) / 1000) * 1000
  return `Each bar runs from a model's cheapest trim to its most expensive. The ${widest.vehicle} alone spans ${dollars(spread)}.`
}

/* ── Stories 3 & 4: range and value ── */

export interface ValueTrim {
  vehicle: string
  year: number
  trim: string
  msrp: number
  range: number
  perMile: number
}

/** Per vehicle, the trim with the lowest MSRP per mile of range, sorted cheapest first. */
export function bestValueTrims(): ValueTrim[] {
  const best = new Map<string, ValueTrim>()
  for (const r of recentRows()) {
    if (typeof r.range_mi !== 'number' || r.range_mi <= 0) continue
    const perMile = r.msrp / r.range_mi
    const cur = best.get(r.vehicle)
    if (!cur || perMile < cur.msrp / cur.range) {
      best.set(r.vehicle, { vehicle: r.vehicle, year: r.year, trim: r.trim, msrp: r.msrp, range: r.range_mi, perMile })
    }
  }
  return [...best.values()]
    .map((v) => ({ ...v, perMile: Math.round(v.perMile) }))
    .sort((a, b) => a.perMile - b.perMile)
}

export function rangeDek(): string {
  const vs = bestValueTrims()
  const inBand = vs.filter((v) => v.range >= RANGE_BAND[0] && v.range <= RANGE_BAND[1]).length
  const over400 = vs.filter((v) => v.range >= 400).length
  return `${capitalize(numberWord(inBand))} of ${numberWord(vs.length)} models land between ${RANGE_BAND[0]} and ${RANGE_BAND[1]} miles whatever they cost. Only ${numberWord(over400)} break 400.`
}

export function costPerMileHeadline(): string {
  const vs = bestValueTrims()
  const best = vs[0]
  const worst = vs[vs.length - 1]
  return `A mile of range costs $${best.perMile} in the ${best.vehicle}, and $${worst.perMile} in the ${worst.vehicle}.`
}

export const COST_PER_MILE_DEK = "Sticker price per mile of rated range, each model's best-value trim."

/* ── Editorial copy: review at each data refresh ── */

export const PRICE_THRESHOLD = 65000
export const RANGE_BAND: [number, number] = [300, 335]
export const RANGE_STORY_HEADLINE = 'Between $50,000 and $90,000, range barely moves.'
export const CHOICE_STORY_NOTE = 'The jump came in 2024 and 2025, when Kia, Volvo, Cadillac and Volkswagen arrived.'
