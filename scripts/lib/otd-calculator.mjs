/**
 * OTD (Out-The-Door) price calculator.
 * Reads tax rate and fees from the assumptions array in ev-data.json.
 */

/**
 * Extract tax rate and fees from assumptions array.
 * @param {Array<{assumption: string, value: string}>} assumptions
 */
export function loadAssumptions(assumptions) {
  const get = (keyword) => {
    const row = assumptions.find((a) => a.assumption.toLowerCase().includes(keyword))
    return row ? parseFloat(row.value) : null
  }
  const taxRate = get('sales tax') ?? 0.06
  const docFee = get('doc fee') ?? 422
  const titleReg = get('title') ?? 233
  const evFee = get('ev') ?? 250
  const totalFees = docFee + titleReg + evFee
  return { taxRate, totalFees }
}

/**
 * Calculate OTD for a new vehicle.
 * @param {number} msrp
 * @param {number|null} destination
 * @param {{taxRate: number, totalFees: number}} params
 * @returns {number}
 */
export function calcOtdNew(msrp, destination, { taxRate, totalFees }) {
  return (msrp + (destination ?? 0)) * (1 + taxRate) + totalFees
}

/**
 * Calculate OTD for a pre-owned price.
 * @param {number} price
 * @param {{taxRate: number, totalFees: number}} params
 * @returns {number}
 */
export function calcOtdPreowned(price, { taxRate, totalFees }) {
  return price * (1 + taxRate) + totalFees
}

/**
 * Parse a preowned_range string like "$52,000 - $56,000" into [low, high].
 * Returns null if the string can't be parsed.
 */
export function parsePreownedRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') return null
  const matches = rangeStr.match(/\$[\d,]+/g)
  if (!matches || matches.length < 2) return null
  return matches.slice(0, 2).map((m) => parseInt(m.replace(/[$,]/g, ''), 10))
}

/**
 * Format a preowned OTD range from two dollar amounts.
 * @param {number} low
 * @param {number} high
 * @returns {string} e.g. "$56,025 - $60,265"
 */
export function formatOtdRange(low, high) {
  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US')
  return `${fmt(low)} - ${fmt(high)}`
}

/**
 * Recalculate all OTD fields across details and preowned arrays.
 * Mutates the data in place.
 */
export function recalculateAllOtd(data) {
  const params = loadAssumptions(data.assumptions)

  for (const row of data.details) {
    // Recalculate otd_new
    if (typeof row.msrp === 'number') {
      const dest = typeof row.destination === 'number' ? row.destination : 0
      row.otd_new = Math.round(calcOtdNew(row.msrp, dest, params) * 100) / 100
    }

    // Recalculate otd_preowned from preowned_range
    const range = parsePreownedRange(row.preowned_range)
    if (range) {
      const [low, high] = range
      row.otd_preowned = formatOtdRange(
        calcOtdPreowned(low, params),
        calcOtdPreowned(high, params),
      )
    }
  }

  // Also recalculate preowned table
  for (const row of data.preowned) {
    const range = parsePreownedRange(row.preowned_range)
    if (range) {
      const [low, high] = range
      row.otd_preowned = formatOtdRange(
        calcOtdPreowned(low, params),
        calcOtdPreowned(high, params),
      )
    }
  }
}
