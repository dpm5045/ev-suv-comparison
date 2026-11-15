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
