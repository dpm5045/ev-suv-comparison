/**
 * Price watcher for manufacturer pages.
 *
 * It does not try to read which trim a price belongs to. It collects the
 * dollar amounts printed in the page and asks two things:
 *   1. Are the MSRPs stored for the vehicle's two newest model years on it?
 *   2. Since the last run, did a stored MSRP disappear, or did a new amount
 *      appear inside the vehicle's price band?
 * Either answer is a prompt to look at the page, never a data change.
 */

const BAND = [0.9, 1.1]

export function extractAmounts(html) {
  const out = new Set()
  for (const m of html.matchAll(/\$\s?(\d{2,3},\d{3})(?![\d,])/g)) {
    const n = Number(m[1].replace(',', ''))
    if (n >= 20000 && n <= 400000) out.add(n)
  }
  return [...out].sort((a, b) => a - b)
}

/** MSRPs stored for the two newest model years of a vehicle that have a numeric MSRP. */
export function storedMsrps(data, vehicle) {
  const priced = data.details.filter((r) => r.vehicle === vehicle && typeof r.msrp === 'number')
  const years = [...new Set(priced.map((r) => r.year))].sort((a, b) => b - a).slice(0, 2)
  return [...new Set(priced.filter((r) => years.includes(r.year)).map((r) => r.msrp))].sort((a, b) => a - b)
}

/**
 * @param {number[]} amounts  dollar amounts on the page
 * @param {number[]} stored   stored MSRPs to look for
 * @param {object|undefined} previous  last run's state for this page
 */
export function checkPage(amounts, stored, previous) {
  const onPage = new Set(amounts)
  const found = stored.filter((m) => onPage.has(m))
  const missing = stored.filter((m) => !onPage.has(m))
  const lo = stored.length ? stored[0] * BAND[0] : 0
  const hi = stored.length ? stored.at(-1) * BAND[1] : 0
  const other = amounts.filter((a) => a >= lo && a <= hi && !stored.includes(a))
  const state = { found, other_in_band: other }

  const flags = []
  if (found.length === 0) {
    return { state, found, missing, other, watchable: false, flags }
  }
  if (previous) {
    const gone = (previous.found ?? []).filter((m) => stored.includes(m) && !onPage.has(m))
    const fresh = other.filter((a) => !(previous.other_in_band ?? []).includes(a) && !(previous.found ?? []).includes(a))
    if (gone.length) flags.push(`stored MSRP no longer on the page: ${gone.map(fmt).join(', ')}`)
    if (fresh.length) flags.push(`new amount(s) in the price band: ${fresh.map(fmt).join(', ')}`)
  }
  return { state, found, missing, other, watchable: true, firstRun: !previous, flags }
}

export const fmt = (n) => `$${n.toLocaleString('en-US')}`

/**
 * Third-party tripwire (Car and Driver model pages). These print one headline
 * line, "MSRP $56,635–$73,635", which includes destination and follows the
 * newest model year. A change in that line is a prompt to check the
 * manufacturer; it is never a source for a stored value.
 */
export function extractHeadline(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
  const m = text.match(/MSRP\s+\$([\d,]+)(?:\s?[–-]\s?\$([\d,]+))?(\s+est)?/)
  if (!m) throw new Error('MSRP headline not found (page layout changed or blocked)')
  const title = html.match(/<title[^>]*>\s*(20\d\d)\b/)
  const low = Number(m[1].replace(/,/g, ''))
  return { model_year: title ? Number(title[1]) : null, low, high: m[2] ? Number(m[2].replace(/,/g, '')) : low, estimated: Boolean(m[3]) }
}

/** Lowest and highest stored MSRP plus destination for one model year, or null. */
export function storedPriceSpan(data, vehicle, year) {
  const totals = data.details
    .filter((r) => r.vehicle === vehicle && r.year === year && typeof r.msrp === 'number')
    .map((r) => r.msrp + (typeof r.destination === 'number' ? r.destination : 0))
  return totals.length ? { low: Math.min(...totals), high: Math.max(...totals) } : null
}

export function checkHeadline(headline, previous) {
  const flags = []
  if (previous) {
    const span = (h) => (h.low === h.high ? fmt(h.low) : `${fmt(h.low)}–${fmt(h.high)}`) + (h.estimated ? ' est' : '')
    if (previous.model_year !== headline.model_year) flags.push(`page moved from model year ${previous.model_year} to ${headline.model_year}`)
    if (previous.estimated && !headline.estimated) flags.push(`estimated pricing became actual pricing: ${span(headline)}`)
    else if (previous.low !== headline.low || previous.high !== headline.high || previous.estimated !== headline.estimated) {
      flags.push(`MSRP line changed from ${span(previous)} to ${span(headline)}`)
    }
  }
  return flags
}

/**
 * Standing differences between Car and Driver's headline price and ours, for
 * the inbox. Unlike checkHeadline (what changed since the last run), these
 * repeat every week until someone fixes the data or defers them, which is the
 * point: a gap that existed on the first run is never a "change".
 *
 * Only actual prices count, not estimates. Wording carries the numbers, so a
 * deferral holds until either side moves.
 *
 * @param {{vehicle:string, headline:{model_year:number|null, low:number, high:number, estimated:boolean}, stored:{low:number, high:number}|null}[]} lines
 * @param {Record<string,string>} skip  vehicle -> why its Car and Driver page can't be compared
 */
export function priceGaps(lines, skip = {}) {
  const gaps = []
  for (const t of lines) {
    const h = t.headline
    if (!h || h.estimated || !h.model_year || skip[t.vehicle]) continue
    const span = h.low === h.high ? fmt(h.low) : `${fmt(h.low)}–${fmt(h.high)}`
    if (!t.stored) gaps.push(`${t.vehicle}: Car and Driver lists ${h.model_year} prices (${span}, including destination) but no ${h.model_year} rows have prices`)
    else if (t.stored.low !== h.low) gaps.push(`${t.vehicle} ${h.model_year}: stored starting price ${fmt(t.stored.low)} (MSRP + destination) differs from Car and Driver's ${fmt(h.low)}`)
  }
  return gaps
}
