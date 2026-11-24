/**
 * Data for the chart stories on the Market Insights tab (and the chart teaser on the
 * home page). Pure functions over DATA — no React.
 *
 * Every number is derived from lib/ev-data.json. The only hand-written copy is
 * the "Editorial copy" block at the bottom; review it at each data refresh.
 *
 * Each builder takes the rows to use (the live data by default, fixture rows in
 * tests) and returns null when it has too little to say; the page skips a null story.
 */
import { DATA, type DetailRow, isWatchlistVehicle } from './data'

/** Year of the last data refresh (2026 for a 2026-11-14 refresh). */
export const dataYear = new Date(DATA.last_updated).getUTCFullYear()

type Rows = readonly DetailRow[]
type Priced = DetailRow & { msrp: number }

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Rows for vehicles on the market (watch-list vehicles excluded). */
const baseRows = (rows: Rows): DetailRow[] => rows.filter((r) => !isWatchlistVehicle(r.vehicle))

/** Base rows sold new today, with a price. */
const onSaleRows = (rows: Rows): Priced[] =>
  baseRows(rows).filter((r): r is Priced => r.availability === 'new' && isNum(r.msrp))

/**
 * Editorial: the comparison set's third-row cutoff, in inches (owner decision,
 * 2026-11-23). Our line, not a fit test: charts say "28 in cutoff", never "adult-size".
 * Defined here, not in the editorial block, because labels below are built at load.
 */
export const MIN_THIRD_ROW_LEGROOM_IN = 28

/** AWD, with a published third-row legroom of at least MIN_THIRD_ROW_LEGROOM_IN. */
export function inComparisonSet(r: Pick<DetailRow, 'drivetrain' | 'third_row_legroom_in'>): boolean {
  return r.drivetrain.startsWith('AWD') && isNum(r.third_row_legroom_in) && r.third_row_legroom_in >= MIN_THIRD_ROW_LEGROOM_IN
}

/**
 * A published third row of at least the cutoff, any drivetrain. The Keeps story uses
 * this instead of the comparison set: it compares model years within one model, so
 * the AWD rule (which keeps value comparisons between models fair) isn't needed.
 */
export function hasThirdRow(r: Pick<DetailRow, 'third_row_legroom_in'>): boolean {
  return isNum(r.third_row_legroom_in) && r.third_row_legroom_in >= MIN_THIRD_ROW_LEGROOM_IN
}

/** The rows the price, range and value stories compare: sold new, priced, in the comparison set. */
const comparisonRows = (rows: Rows): Priced[] => onSaleRows(rows).filter(inComparisonSet)

/** "AWD trims with at least 28 in of third-row legroom" */
export const COMPARISON_SET_LABEL = `AWD trims with at least ${MIN_THIRD_ROW_LEGROOM_IN} in of third-row legroom`

/**
 * What the comparison set left out of the on-sale models, and why:
 * "Left out: RWD trims; Tesla Model Y (3-Row), 26.5 in; VinFast VF9, legroom not published."
 */
export function comparisonExclusions(rows: Rows = DATA.details): string {
  const sale = onSaleRows(rows)
  const parts: string[] = []
  if (sale.some((r) => !r.drivetrain.startsWith('AWD'))) parts.push('RWD trims')
  const vehicles = [...new Set(sale.map((r) => r.vehicle))].sort()
  for (const v of vehicles) {
    const awd = sale.filter((r) => r.vehicle === v && r.drivetrain.startsWith('AWD'))
    if (awd.length === 0 || awd.some(inComparisonSet)) continue
    const legroom = awd.map((r) => r.third_row_legroom_in).filter(isNum)
    if (legroom.length) parts.push(`${v}, ${inches(Math.max(...legroom))} in`)
    else if (awd.some((r) => r.third_row_legroom_in === null)) parts.push(`${v}, legroom not published`)
    else parts.push(`${v}, no third row`)
  }
  return parts.length ? `Left out: ${parts.join('; ')}.` : ''
}

/** "2025–2027": the model years the comparison-set charts actually cover. */
export function recentYearsLabel(rows: Rows = DATA.details): string {
  const years = comparisonRows(rows).map((r) => r.year)
  if (!years.length) return ''
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

/** 26.5 → "26.5", 10.0 → "10" */
const inches = (n: number) => String(Math.round(n * 10) / 10)

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Midpoint of the parsed used-price range, or null. */
const usedMid = (r: DetailRow) => (isNum(r.preowned_low) && isNum(r.preowned_high) ? (r.preowned_low + r.preowned_high) / 2 : null)

/** A trim: seat layouts of the same trim ("Premium (7-seat)", 5/6/7-seat Model X rows) count once. */
const SEAT_SUFFIX = /\s*\(\d-(?:seat|pass)\)/gi
export const trimKey = (r: Pick<DetailRow, 'vehicle' | 'year' | 'trim'>) =>
  `${r.vehicle}|${r.year}|${r.trim.replace(SEAT_SUFFIX, '').trim()}`

/* ── Story 1: choice ── */

export interface YearCount {
  year: number
  trims: number
  models: number
  vehicles: string[]
}

/**
 * Distinct trims and models offered per model year, up to and including the data
 * year: rows sold new or now used-only (announced rows were never offered).
 * Later years are skipped: the next model year is only partly announced and
 * would read as a drop.
 */
export function trimsByYear(rows: Rows = DATA.details): YearCount[] {
  const by = new Map<number, { trims: Set<string>; vehicles: Set<string> }>()
  for (const r of baseRows(rows)) {
    if (r.year > dataYear || (r.availability !== 'new' && r.availability !== 'used_only')) continue
    // A configuration known to have no third row isn't a three-row trim; a trim with a
    // three-row layout still counts through that layout. Unknown legroom (null) stays in.
    if (r.third_row_legroom_in === 'N/A') continue
    const y = by.get(r.year) ?? { trims: new Set(), vehicles: new Set() }
    y.trims.add(trimKey(r))
    y.vehicles.add(r.vehicle)
    by.set(r.year, y)
  }
  return [...by.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, y]) => ({ year, trims: y.trims.size, models: y.vehicles.size, vehicles: [...y.vehicles].sort() }))
}

export function choiceHeadline(rows: Rows = DATA.details): string | null {
  const ys = trimsByYear(rows)
  if (ys.length < 2) return null
  const first = ys[0]
  const last = ys[ys.length - 1]
  return `Model year ${first.year} offered ${numberWord(first.trims)} trim${first.trims === 1 ? '' : 's'}. Model year ${last.year} offered ${numberWord(last.trims)}.`
}

export function choiceDek(rows: Rows = DATA.details): string | null {
  const ys = trimsByYear(rows)
  if (ys.length < 2) return null
  const first = ys[0]
  const lead = first.vehicles.length === 1 ? `In ${first.year} every one of them was a ${first.vehicles[0]}. ` : ''
  return lead + CHOICE_STORY_NOTE
}

/* ── Story 2: price ── */

export interface PriceRange {
  vehicle: string
  low: number
  high: number
}

/** Cheapest and most expensive MSRP per vehicle in the comparison set, sorted by starting price. */
export function priceRanges(rows: Rows = DATA.details): PriceRange[] {
  const by = new Map<string, number[]>()
  for (const r of comparisonRows(rows)) by.set(r.vehicle, [...(by.get(r.vehicle) ?? []), r.msrp])
  return [...by.entries()]
    .map(([vehicle, ps]) => ({ vehicle, low: Math.min(...ps), high: Math.max(...ps) }))
    .sort((a, b) => a.low - b.low)
}

export function priceHeadline(rows: Rows = DATA.details): string | null {
  const ps = priceRanges(rows)
  if (ps.length < 2) return null
  const n = ps.filter((p) => p.low < PRICE_THRESHOLD).length
  return n === 1
    ? `Only one model starts under ${dollars(PRICE_THRESHOLD)}.`
    : `Only ${numberWord(n)} models start under ${dollars(PRICE_THRESHOLD)}.`
}

export function priceDek(rows: Rows = DATA.details): string | null {
  const ps = priceRanges(rows)
  if (ps.length < 2) return null
  const widest = ps.reduce((a, b) => (b.high - b.low > a.high - a.low ? b : a), ps[0])
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

/** Per vehicle, the comparison-set trim with the lowest MSRP per mile of range, sorted cheapest first. */
export function bestValueTrims(rows: Rows = DATA.details): ValueTrim[] {
  const best = new Map<string, ValueTrim>()
  for (const r of comparisonRows(rows)) {
    if (!isNum(r.range_mi) || r.range_mi <= 0) continue
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

export function rangeDek(rows: Rows = DATA.details): string | null {
  const vs = bestValueTrims(rows)
  if (vs.length < 2) return null
  const inBand = vs.filter((v) => v.range >= RANGE_BAND[0] && v.range <= RANGE_BAND[1]).length
  const over400 = vs.filter((v) => v.range >= 400).length
  return `${capitalize(numberWord(inBand))} of ${numberWord(vs.length)} models land between ${RANGE_BAND[0]} and ${RANGE_BAND[1]} miles. Only ${numberWord(over400)} break 400.`
}

/**
 * "Under $90,000, no model's best-value trim tops 325 miles. Above it, each one gets at least 410."
 * Scoped to best-value trims (one per model): other trims can contradict it, and the
 * headline also appears on the home page without the chart's source note.
 * when every model above RANGE_PRICE_SPLIT out-ranges every model below it;
 * otherwise names the longest range.
 */
export function rangeHeadline(rows: Rows = DATA.details): string | null {
  const vs = bestValueTrims(rows)
  if (vs.length < 2) return null
  const below = vs.filter((v) => v.msrp < RANGE_PRICE_SPLIT).map((v) => v.range)
  const above = vs.filter((v) => v.msrp >= RANGE_PRICE_SPLIT).map((v) => v.range)
  if (below.length && above.length && Math.min(...above) > Math.max(...below)) {
    return `Under ${dollars(RANGE_PRICE_SPLIT)}, no model's best-value trim tops ${Math.max(...below)} miles. Above it, each one gets at least ${Math.min(...above)}.`
  }
  const longest = vs.reduce((a, b) => (b.range > a.range ? b : a), vs[0])
  return `Among each model's best-value trim, the longest range is ${longest.range} miles, in the ${longest.vehicle}.`
}

export function costPerMileHeadline(rows: Rows = DATA.details): string | null {
  const vs = bestValueTrims(rows)
  if (vs.length < 2) return null
  const best = vs[0]
  const worst = vs[vs.length - 1]
  return `A mile of range costs $${best.perMile} in the ${best.vehicle}, and $${worst.perMile} in the ${worst.vehicle}.`
}

export const COST_PER_MILE_DEK = `Sticker price per mile of rated range, each model's best-value trim. ${capitalize(COMPARISON_SET_LABEL)}.`

/* ── Story 5: the used market ── */

export interface UsedVsNew {
  vehicle: string
  used: { year: number; trim: string; price: number; range: number; perMile: number }
  newBest: ValueTrim | null
  /** Why there is no new figure; null when there is one. */
  newLabel: 'no longer sold new' | 'no new trim in this comparison' | null
}

/** Per model: its best-value used trim (midpoint of the used range) against its best-value new trim, sorted by used cost. */
export function usedVsNew(rows: Rows = DATA.details): UsedVsNew[] {
  const newBest = new Map(bestValueTrims(rows).map((v) => [v.vehicle, v]))
  const base = baseRows(rows)
  const best = new Map<string, UsedVsNew['used']>()
  for (const r of base) {
    const mid = usedMid(r)
    if (mid === null || !inComparisonSet(r) || !isNum(r.range_mi) || r.range_mi <= 0) continue
    const perMile = mid / r.range_mi
    const cur = best.get(r.vehicle)
    if (!cur || perMile < cur.price / cur.range) best.set(r.vehicle, { year: r.year, trim: r.trim, price: mid, range: r.range_mi, perMile })
  }
  return [...best.entries()]
    .map(([vehicle, u]) => {
      const nb = newBest.get(vehicle) ?? null
      const soldNew = base.some((r) => r.vehicle === vehicle && r.availability === 'new')
      return {
        vehicle,
        used: { ...u, perMile: Math.round(u.perMile) },
        newBest: nb,
        newLabel: nb ? null : soldNew ? ('no new trim in this comparison' as const) : ('no longer sold new' as const),
      }
    })
    .sort((a, b) => a.used.perMile - b.used.perMile || a.vehicle.localeCompare(b.vehicle))
}

/** The model the used headline names and the chart highlights: the biggest new-minus-used gap per mile. */
export function usedHighlight(rows: Rows = DATA.details): (UsedVsNew & { newBest: ValueTrim }) | null {
  const both = usedVsNew(rows).filter((u): u is UsedVsNew & { newBest: ValueTrim } => u.newBest !== null)
  if (!both.length) return null
  return both.reduce((a, b) => (b.newBest.perMile - b.used.perMile > a.newBest.perMile - a.used.perMile ? b : a), both[0])
}

export function usedHeadline(rows: Rows = DATA.details): string | null {
  const top = usedHighlight(rows)
  if (!top) return null
  return `The best-value used ${top.vehicle} costs $${top.used.perMile} per mile of range. The best-value new one, $${top.newBest.perMile}.`
}

export const USED_DEK = "Cost per mile of rated range, each model's best-value new trim against its best-value used trim."

/* ── Story 6: what a car keeps ── */

export interface KeepsPoint {
  year: number
  /** Median over trims of used price as a share of the MSRP on record, in percent */
  pct: number
  /** Trims behind the point */
  n: number
}

export interface KeepsData {
  panels: { vehicle: string; points: KeepsPoint[] }[]
  strip: ({ vehicle: string } & KeepsPoint)[]
  axisMax: number
  /** Used trims with a sourced MSRP, of all used trims with a third row */
  covered: number
  total: number
}

/**
 * Used price as a share of the sourced MSRP on record for that model year, per model.
 * The record is the maker's published price; it is not proven to be the launch price
 * (a price revised during the year shows the revised price), so copy never says "original".
 * `hasSourcedMsrp` says whether a row's stored MSRP has a matching source record
 * (lib/msrp-sources.ts; passed in so this module never imports the provenance file).
 */
export function keepsData(rows: Rows, hasSourcedMsrp: (r: DetailRow) => boolean): KeepsData | null {
  const isEligible = (r: DetailRow) =>
    (r.msrp_status === 'historical' || r.msrp_status === 'current') && isNum(r.msrp) && r.msrp > 0 && hasSourcedMsrp(r)
  // Every distinct used trim counts toward coverage; each trim's observation comes
  // from its first eligible seat layout (by id), so an unsourced sibling can't hide it.
  const usedTrims = new Set<string>()
  const chosen = new Map<string, DetailRow>()
  for (const r of [...baseRows(rows)].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!hasThirdRow(r) || usedMid(r) === null) continue
    usedTrims.add(trimKey(r))
    if (isEligible(r) && !chosen.has(trimKey(r))) chosen.set(trimKey(r), r)
  }
  const eligible = [...chosen.values()]
  const by = new Map<string, Map<number, number[]>>()
  for (const r of eligible) {
    const years = by.get(r.vehicle) ?? new Map<number, number[]>()
    years.set(r.year, [...(years.get(r.year) ?? []), usedMid(r)! / (r.msrp as number)])
    by.set(r.vehicle, years)
  }
  const models = [...by.entries()]
    .map(([vehicle, years]) => ({
      vehicle,
      points: [...years.entries()]
        .sort(([a], [b]) => a - b)
        .map(([year, ratios]) => ({ year, pct: Math.round(median(ratios) * 100), n: ratios.length })),
    }))
    .sort((a, b) => b.points.length - a.points.length || a.vehicle.localeCompare(b.vehicle))
  const panels = models.filter((m) => m.points.length >= 2)
  if (!panels.length) return null
  const strip = models.filter((m) => m.points.length === 1).map((m) => ({ vehicle: m.vehicle, ...m.points[0] }))
  const top = Math.max(...models.flatMap((m) => m.points.map((p) => p.pct)))
  return { panels, strip, axisMax: Math.max(100, Math.ceil(top / 25) * 25), covered: eligible.length, total: usedTrims.size }
}

export function keepsHeadline(k: KeepsData): string {
  const m = k.panels[0]
  const p = m.points[0]
  return `Used, a ${p.year} ${m.vehicle} is estimated at about ${p.pct}% of its MSRP on record for that model year (median of ${numberWord(p.n)} trim${p.n === 1 ? '' : 's'}).`
}

/* ── Story 7: the third row ── */

export interface ThirdRowPoint {
  vehicle: string
  year: number
  trim: string
  legroom: number
  cargo: number
}

export interface ThirdRowData {
  points: ThirdRowPoint[]
  /** Models whose third-row legroom or cargo isn't published */
  notPublished: string[]
  /** Models with no third row in the configurations sold */
  noThirdRow: string[]
}

/**
 * One dot per model sold new: its newest model year with a new row; within it,
 * the rows with numeric legroom and cargo; of those, the lowest MSRP, then id.
 */
export function thirdRowData(rows: Rows = DATA.details): ThirdRowData | null {
  const sale = baseRows(rows).filter((r) => r.availability === 'new')
  const points: ThirdRowPoint[] = []
  const notPublished: string[] = []
  const noThirdRow: string[] = []
  for (const v of [...new Set(sale.map((r) => r.vehicle))].sort()) {
    const mine = sale.filter((r) => r.vehicle === v)
    const year = Math.max(...mine.map((r) => r.year))
    const inYear = mine.filter((r) => r.year === year)
    const ok = inYear
      .filter((r) => isNum(r.third_row_legroom_in) && isNum(r.cargo_behind_3rd_cu_ft))
      .sort((a, b) => (isNum(a.msrp) ? a.msrp : Infinity) - (isNum(b.msrp) ? b.msrp : Infinity) || a.id.localeCompare(b.id))
    if (ok.length) {
      const r = ok[0]
      points.push({ vehicle: v, year, trim: r.trim, legroom: r.third_row_legroom_in as number, cargo: r.cargo_behind_3rd_cu_ft as number })
    } else if (inYear.every((r) => r.third_row_legroom_in === 'N/A')) noThirdRow.push(v)
    else notPublished.push(v)
  }
  return points.length >= 3 ? { points, notPublished, noThirdRow } : null
}

export function thirdRowHeadline(t: ThirdRowData): string {
  const byLeg = [...t.points].sort((a, b) => b.legroom - a.legroom)
  const leastCargo = t.points.reduce((a, b) => (b.cargo < a.cargo ? b : a), t.points[0])
  return `Of the models we plot, the ${byLeg[0].vehicle} has the most third-row legroom, ${inches(byLeg[0].legroom - byLeg[1].legroom)} in more than the next. The ${leastCargo.vehicle} has the least cargo space behind its third row.`
}

export const THIRD_ROW_DEK = 'Legroom in the third row against the cargo space left behind it, one dot per model at its cheapest current trim.'

/* ── Editorial copy: review at each data refresh ── */

export const PRICE_THRESHOLD = 65000
export const RANGE_BAND: [number, number] = [300, 335]
/** Price where the range headline splits the models (see rangeHeadline). */
export const RANGE_PRICE_SPLIT = 90000
export const CHOICE_STORY_NOTE = 'The jump came in 2024 and 2025, when Kia, Volvo, Cadillac and Volkswagen arrived.'
