/**
 * Generated copy for SEO pages (FAQ, metadata, OG labels), built from
 * structured values so that it never claims more than the data shows:
 *   - no "higher / longer / cheaper" without a strict inequality (ties say so);
 *   - "EPA" only for verified EPA ratings (none until WP-J.3); manufacturer
 *     estimates (range_basis) are labelled as such;
 *   - "starts at … MSRP" only from configurations sold new today.
 * Pure functions over rows passed in.
 */
import type { DetailRow, RangeBasis } from './data'
import { isSoldNew } from './selection'

type Row = DetailRow

export type { RangeBasis }

/**
 * What a row's range is, from the stored range_basis (schema_version 2):
 * 'manufacturer_estimate', 'unverified' (the default: not being an exception
 * is not evidence of an EPA rating), or 'epa' (only with a reviewed EPA
 * mapping, WP-J.3; none yet).
 */
export function rangeBasis(r: Pick<Row, 'range_basis'>): RangeBasis {
  return r.range_basis ?? 'unverified'
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const fmt = (n: number) => n.toLocaleString('en-US')
const money = (n: number) => `$${fmt(n)}`

export type Winner = 'a' | 'b' | 'tie' | null

/** Which side is better: strictly, or a tie; null when either value is unknown. */
export function compareMetric(a: number | null, b: number | null, opts: { lowerIsBetter?: boolean } = {}): Winner {
  if (a === null || b === null) return null
  if (a === b) return 'tie'
  return (opts.lowerIsBetter ? a < b : a > b) ? 'a' : 'b'
}

export interface Faq { q: string; a: string }

/* ── ranges ── */

interface Span { min: number; max: number }
const span = (xs: number[]): Span | null => (xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : null)
const spanText = (s: Span) => (s.min === s.max ? `${fmt(s.max)} miles` : `${fmt(s.min)} to ${fmt(s.max)} miles`)

/** Ranges split by basis. */
export function rangeSpans(rows: Row[]) {
  const epa: number[] = []
  const plain: number[] = []
  const est: number[] = []
  for (const r of rows) {
    const v = num(r.range_mi)
    if (v === null) continue
    const b = rangeBasis(r)
    ;(b === 'epa' ? epa : b === 'manufacturer_estimate' ? est : plain).push(v)
  }
  return { epa: span(epa), plain: span(plain), est: span(est), all: span([...epa, ...plain, ...est]) }
}

/** A stat or column label: "EPA Range" only when every range shown is a verified EPA figure. */
export function rangeLabel(rows: Row[]): string {
  const s = rangeSpans(rows)
  return s.epa && !s.plain && !s.est ? 'EPA Range' : 'Range'
}

const estMark = (r: Row) => (rangeBasis(r) === 'manufacturer_estimate' ? ' (maker est.)' : '')

/** The longest range, marked when it is a manufacturer estimate, e.g. "335 mi" or "315 mi (maker est.)". */
export function maxRangeText(rows: Row[]): string | null {
  let best: Row | null = null
  for (const r of rows) {
    const v = num(r.range_mi)
    if (v === null) continue
    const b = best ? num(best.range_mi)! : -1
    // On a tie, prefer a figure that is not a manufacturer estimate
    if (v > b || (v === b && rangeBasis(r) !== 'manufacturer_estimate')) best = r
  }
  if (!best) return null
  return `${fmt(best.range_mi as number)} mi${estMark(best)}`
}

/** One range value for tables, marked when it is a manufacturer estimate. */
export function rangeCell(r: Row): string | null {
  const v = num(r.range_mi)
  if (v === null) return null
  return `${fmt(v)} mi${estMark(r)}`
}

/**
 * "a range of 253 to 300 miles, and up to 315 miles by the manufacturer's
 * estimate for trims not yet rated". "EPA-estimated" only when every
 * non-estimate figure is a verified EPA rating.
 */
function rangeSentence(rows: Row[]): string | null {
  const s = rangeSpans(rows)
  const rated = span([s.epa, s.plain].flatMap((x) => (x ? [x.min, x.max] : [])))
  const lead = rated ? `${s.epa && !s.plain ? 'an EPA-estimated range' : 'a range'} of ${spanText(rated)}` : null
  if (lead && s.est) {
    const estPart = s.est.max > rated!.max ? `up to ${fmt(s.est.max)} miles` : spanText(s.est)
    return `${lead}, and ${estPart} by the manufacturer's estimate for trims not yet rated`
  }
  if (lead) return lead
  if (s.est) return `a manufacturer-estimated range of ${spanText(s.est)} (not yet independently rated)`
  return null
}

/* ── prices ── */

/**
 * MSRPs by what they mean: current (configurations sold new today), announced
 * (published for a model not yet on sale), and past (the last new price of a
 * configuration no longer sold new).
 */
export function priceSpans(rows: Row[], _dataYear?: number) {
  const current: number[] = []
  const announced: number[] = []
  const past: number[] = []
  for (const r of rows) {
    const v = num(r.msrp)
    if (v === null) continue
    if (isSoldNew(r) && r.msrp_status === 'current') current.push(v)
    else if (r.msrp_status === 'announced') announced.push(v)
    else if (r.msrp_status === 'historical') past.push(v)
  }
  return { current: span(current), announced: span(announced), past: span(past) }
}

const priceRangeText = (s: Span) => (s.min === s.max ? money(s.min) : `${money(s.min)}–${money(s.max)}`)

/** OG/stat price text: current MSRPs, else announced ones; null when the vehicle has neither. */
export function currentPriceText(rows: Row[], dataYear?: number): string | null {
  const p = priceSpans(rows, dataYear)
  const s = p.current ?? p.announced
  return s ? priceRangeText(s) : null
}

/* ── FAQ builders ── */

/** FAQ for a vehicle page. */
export function vehicleFaq(vehicle: string, rows: Row[], dataYear: number): Faq[] {
  const out: Faq[] = []
  const years = (rs: Row[]) => {
    const ys = [...new Set(rs.map((r) => r.year))].sort()
    return ys.length === 1 ? String(ys[0]) : `${ys[0]}–${ys[ys.length - 1]}`
  }

  const current = rows.filter((r) => num(r.msrp) !== null && isSoldNew(r) && r.msrp_status === 'current')
  const announcedRows = rows.filter((r) => num(r.msrp) !== null && r.msrp_status === 'announced')
  const prices = priceSpans(rows, dataYear)
  if (prices.current) {
    const s = prices.current
    out.push({
      q: `How much does the ${vehicle} cost?`,
      a: s.min === s.max
        ? `The ${years(current)} ${vehicle} is priced at ${money(s.min)} MSRP.`
        : `The ${years(current)} ${vehicle} starts at ${money(s.min)} MSRP and goes up to ${money(s.max)} depending on trim and configuration.`,
    })
  } else if (prices.announced) {
    const s = prices.announced
    out.push({
      q: `How much does the ${vehicle} cost?`,
      a: s.min === s.max
        ? `The ${years(announcedRows)} ${vehicle} is not on sale yet; its announced price is ${money(s.min)} MSRP.`
        : `The ${years(announcedRows)} ${vehicle} is not on sale yet; announced prices start at ${money(s.min)} MSRP and go up to ${money(s.max)}.`,
    })
  } else if (prices.past) {
    out.push({
      q: `How much does the ${vehicle} cost?`,
      a: `The ${vehicle} is no longer sold new. When new, it was priced from ${priceRangeText(prices.past)} MSRP; see the pre-owned prices for what it costs today.`,
    })
  }

  const range = rangeSentence(rows)
  if (range) {
    out.push({ q: `What is the range of the ${vehicle}?`, a: `The ${years(rows)} ${vehicle} has ${range}, depending on trim and battery configuration.` })
  }

  const seats = [...new Set(rows.map((r) => r.seats).filter((s): s is number => typeof s === 'number'))].sort((a, b) => a - b)
  if (seats.length) out.push({ q: `How many seats does the ${vehicle} have?`, a: `The ${vehicle} is available in ${seats.join(' and ')}-seat configurations across its trim lineup.` })

  const charging = [...new Set(rows.map((r) => r.charging_type).filter((t): t is string => typeof t === 'string' && t.length > 0))]
  if (charging.length) {
    const nacs = charging.some((t) => t.toLowerCase().includes('nacs')) ? ' NACS provides access to the Tesla Supercharger network.' : ''
    out.push({ q: `What charging connector does the ${vehicle} use?`, a: `The ${vehicle} uses ${charging.join(' or ')}.${nacs}` })
  }

  const cargo = rows.map((r) => num(r.cargo_behind_3rd_cu_ft)).filter((v): v is number => v !== null && v > 0)
  if (cargo.length) out.push({ q: `How much cargo space does the ${vehicle} have?`, a: `The ${vehicle} offers up to ${fmt(Math.max(...cargo))} cubic feet of cargo space behind the third row with all seats upright.` })

  const tow = rows.map((r) => num(r.towing_lbs)).filter((v): v is number => v !== null && v > 0)
  if (tow.length) out.push({ q: `Can the ${vehicle} tow?`, a: `Yes, the ${vehicle} has a maximum towing capacity of ${fmt(Math.max(...tow))} lbs.` })

  return out
}

/** The trim a comparison page compares: the newest model year's lowest-priced trim, else its first. */
export function representativeTrim(trims: Row[]): Row {
  const maxYear = Math.max(...trims.map((t) => t.year))
  const latest = trims.filter((t) => t.year === maxYear)
  const withPrice = latest.filter((t) => num(t.msrp) !== null)
  if (withPrice.length) return [...withPrice].sort((a, b) => (a.msrp as number) - (b.msrp as number))[0]
  return latest[0]
}

/** FAQ for a pairwise comparison page, from each vehicle's representative trim. */
export function comparisonFaq(nameA: string, a: Row, nameB: string, b: Row, dataYear: number): Faq[] {
  const out: Faq[] = []
  const pick = (w: Winner) => (w === 'a' ? nameA : nameB)

  // Price: only when both representative trims are sold new
  const pa = isSoldNew(a) && a.msrp_status === 'current' ? num(a.msrp) : null
  const pb = isSoldNew(b) && b.msrp_status === 'current' ? num(b.msrp) : null
  const wp = compareMetric(pa, pb, { lowerIsBetter: true })
  if (wp === 'tie') {
    out.push({ q: `Which is cheaper, the ${nameA} or ${nameB}?`, a: `Neither: both representative trims start at ${money(pa!)} MSRP.` })
  } else if (wp) {
    out.push({ q: `Which is cheaper, the ${nameA} or ${nameB}?`, a: `The ${pick(wp)} starts at a lower MSRP, approximately ${money(Math.abs(pa! - pb!))} less when comparing representative trims.` })
  }

  // Range: say "EPA-estimated" only when both figures are EPA figures
  const ra = num(a.range_mi)
  const rb = num(b.range_mi)
  const wr = compareMetric(ra, rb)
  if (wr) {
    const bothEpa = rangeBasis(a) === 'epa' && rangeBasis(b) === 'epa'
    const anyEst = rangeBasis(a) === 'manufacturer_estimate' || rangeBasis(b) === 'manufacturer_estimate'
    const kind = bothEpa ? 'EPA-estimated range' : anyEst ? 'range (at least one figure is a manufacturer estimate)' : 'range'
    out.push({
      q: `Which has more range, the ${nameA} or ${nameB}?`,
      a: wr === 'tie'
        ? `Neither: both representative trims have a${bothEpa ? 'n EPA-estimated' : ''} range of ${fmt(ra!)} miles.`
        : `The ${pick(wr)} has a longer ${kind} at ${fmt(Math.max(ra!, rb!))} miles compared to ${fmt(Math.min(ra!, rb!))} miles for representative trims.`,
    })
  }

  const ca = num(a.cargo_behind_3rd_cu_ft)
  const cb = num(b.cargo_behind_3rd_cu_ft)
  const wc = compareMetric(ca && ca > 0 ? ca : null, cb && cb > 0 ? cb : null)
  if (wc) {
    out.push({
      q: `Which has more cargo space, the ${nameA} or ${nameB}?`,
      a: wc === 'tie'
        ? `Neither: both offer ${fmt(ca!)} cu ft behind the third row.`
        : `The ${pick(wc)} offers more cargo space behind the third row (${fmt(Math.max(ca!, cb!))} vs ${fmt(Math.min(ca!, cb!))} cu ft).`,
    })
  }

  const ta = num(a.towing_lbs)
  const tb = num(b.towing_lbs)
  const wt = compareMetric(ta && ta > 0 ? ta : null, tb && tb > 0 ? tb : null)
  if (wt) {
    out.push({
      q: `Which can tow more, the ${nameA} or ${nameB}?`,
      a: wt === 'tie'
        ? `Neither: both are rated to tow ${fmt(ta!)} lbs.`
        : `The ${pick(wt)} has a higher towing capacity at ${fmt(Math.max(ta!, tb!))} lbs compared to ${fmt(Math.min(ta!, tb!))} lbs.`,
    })
  }

  if (typeof a.seats === 'number' && typeof b.seats === 'number') {
    out.push({ q: `How many seats do the ${nameA} and ${nameB} have?`, a: `The ${nameA} seats ${a.seats} and the ${nameB} seats ${b.seats} in the representative configurations compared here.` })
  }

  return out
}

/** FAQPage structured data for a list of entries (null when empty). */
export function faqJsonLd(entries: Faq[]) {
  if (!entries.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}
