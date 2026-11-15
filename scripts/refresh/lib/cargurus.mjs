/**
 * Parser for CarGurus price-trends pages
 * (https://www.cargurus.com/research/price-trends/<Make>-<Model>-d<id>).
 *
 * The page server-renders one table with a row for the CarGurus index, a row
 * for the model as a whole, and a row per model year that has enough listings.
 * Anything unexpected throws: a template change must surface as a failed
 * source, never as silently wrong numbers.
 */

const TABLE_RE = /<table[^>]*data-testid="price-trends-table-model"[^>]*>([\s\S]*?)<\/table>/

function cellText(html) {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cells(rowHtml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
  return [...rowHtml.matchAll(re)].map((m) => cellText(m[1]))
}

function parseMoney(text) {
  if (!/^\$[\d,]+$/.test(text)) return null
  return Number(text.replace(/[$,]/g, ''))
}

function parsePct(text) {
  if (!/^[+-]?\d+(\.\d+)?%$/.test(text)) return null
  return Number(text.replace('%', ''))
}

/**
 * @param {string} html full page HTML
 * @returns {{ model: {label:string, avgPrice:number, pct30:number|null} | null,
 *             years: Record<string, {label:string, avgPrice:number, pct30:number|null}> }}
 */
export function parsePriceTrends(html) {
  const table = html.match(TABLE_RE)
  if (!table) throw new Error('price-trends table not found (page template changed or blocked)')

  const rows = [...table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1])
  if (rows.length < 2) throw new Error('price-trends table has no data rows')

  const header = cells(rows[0], 'th')
  const col = {
    label: header.findIndex((h) => /Model Year/i.test(h)),
    avg: header.findIndex((h) => /Avg Price/i.test(h)),
    pct30: header.findIndex((h) => /30 days/i.test(h)),
  }
  if (col.label < 0 || col.avg < 0 || col.pct30 < 0) {
    throw new Error(`unexpected price-trends table header: ${JSON.stringify(header)}`)
  }

  const result = { model: null, years: {} }
  for (const rowHtml of rows.slice(1)) {
    const c = cells(rowHtml, 'td')
    const label = c[col.label]
    if (!label || /CarGurus Index/i.test(label)) continue

    const avgPrice = parseMoney(c[col.avg] ?? '')
    if (avgPrice === null) throw new Error(`unparseable average price for "${label}": "${c[col.avg]}"`)
    const entry = { label, avgPrice, pct30: parsePct(c[col.pct30] ?? '') }

    const year = label.match(/^(\d{4})\s+\S/)
    if (year) result.years[year[1]] = entry
    else if (!result.model) result.model = entry
    else throw new Error(`more than one model-wide row: "${result.model.label}" and "${label}"`)
  }

  if (!result.model && Object.keys(result.years).length === 0) {
    throw new Error('price-trends table had no model or model-year rows')
  }
  return result
}
