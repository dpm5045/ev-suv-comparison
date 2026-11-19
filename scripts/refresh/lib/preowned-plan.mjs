/**
 * Pure repricing logic for pre-owned ranges. No network, no file access.
 *
 * Rule: each vehicle + model year has a baseline — the CarGurus average used
 * price recorded the last time that group was repriced. When the current
 * average has moved by at least THRESHOLD from the baseline, both ends of
 * every stored range in the group are scaled by that move and rounded to the
 * nearest $1,000, and the baseline is reset. Smaller moves change nothing and
 * leave the baseline alone, so slow drift accumulates until it crosses the
 * threshold instead of being lost. This does not depend on how often the
 * script runs.
 */

export const THRESHOLD = 0.03 // reprice at >= 3% move from baseline
export const MAX_MOVE = 0.15 // larger moves are held for human review
const PLAUSIBLE_AVG = [5_000, 300_000]
const RANGE_RE = /^\$([\d,]+) - \$([\d,]+)$/

export function parseRange(text) {
  const m = typeof text === 'string' ? text.match(RANGE_RE) : null
  if (!m) return null
  return [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))]
}

export function formatRange(low, high) {
  return `$${low.toLocaleString('en-US')} - $${high.toLocaleString('en-US')}`
}

export function scaleRange(text, ratio) {
  const r = parseRange(text)
  if (!r) return text
  const round = (n) => Math.round((n * ratio) / 1000) * 1000
  return formatRange(round(r[0]), round(r[1]))
}

const pct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`
const money = (n) => `$${n.toLocaleString('en-US')}`

/**
 * @param {object} args
 * @param {object} args.data          parsed ev-data.json (not mutated)
 * @param {object} args.baselines     provenance.preowned (not mutated)
 * @param {object} args.observations  vehicle -> { url, parsed } | { url, error }
 * @param {string} args.today         YYYY-MM-DD
 * @param {string[]} [args.allowLarge] "Vehicle|Year" groups whose move over MAX_MOVE was
 *                                    checked by a person or the agent and may be applied
 * @returns {{ decisions: object[], rowChanges: object[], records: object[], baselines: object }}
 *   records: one source record per priced row of every repriced group (changed or not), for
 *   lib/ev-data.provenance.json `fields[id].preowned_range` (method derived, cargurus_scaled).
 *   The data contract recomputes each one (scripts/validate-diff.mjs, checkScaled).
 */
export function planPreowned({ data, baselines, observations, today, allowLarge = [] }) {
  const next = structuredClone(baselines ?? {})
  const decisions = []
  const rowChanges = []
  const records = []

  // Group priced detail rows by vehicle + model year.
  const groups = new Map()
  for (const row of data.details) {
    if (!parseRange(row.preowned_range)) continue
    const key = `${row.vehicle}|${row.year}`
    if (!groups.has(key)) groups.set(key, { vehicle: row.vehicle, year: row.year, rows: [] })
    groups.get(key).rows.push(row)
  }

  for (const g of groups.values()) {
    const d = { vehicle: g.vehicle, year: g.year, rows: g.rows.length }
    const obs = observations[g.vehicle]

    if (!obs) {
      decisions.push({ ...d, state: 'no_source', reason: 'No CarGurus page registered in sources.json' })
      continue
    }
    d.url = obs.url
    if (obs.error) {
      decisions.push({ ...d, state: 'source_unavailable', reason: obs.error })
      continue
    }

    const yearRow = obs.parsed.years[String(g.year)]
    const seen = yearRow ?? obs.parsed.model
    if (!seen) {
      decisions.push({ ...d, state: 'source_unavailable', reason: 'Page has no row for this model year or the model' })
      continue
    }
    const basis = yearRow ? 'model_year' : 'model'
    Object.assign(d, { basis, avgPrice: seen.avgPrice, pct30: seen.pct30, evidence: `${seen.label}: ${money(seen.avgPrice)}` })

    if (seen.avgPrice < PLAUSIBLE_AVG[0] || seen.avgPrice > PLAUSIBLE_AVG[1]) {
      decisions.push({ ...d, state: 'rejected', reason: `Implausible average price ${money(seen.avgPrice)}` })
      continue
    }

    const vehicleBase = (next[g.vehicle] ??= { source_url: obs.url, years: {} })
    vehicleBase.source_url = obs.url
    const base = vehicleBase.years[String(g.year)]

    if (!base || base.basis !== basis) {
      vehicleBase.years[String(g.year)] = {
        basis,
        avg_price: seen.avgPrice,
        as_of: today,
        last_repriced: base?.last_repriced ?? null,
        last_move_pct: base?.last_move_pct ?? null,
      }
      decisions.push({
        ...d,
        state: 'baseline_set',
        reason: base ? `Basis changed from ${base.basis} to ${basis}; baseline restarted` : 'First observation; baseline recorded',
      })
      continue
    }

    const move = seen.avgPrice / base.avg_price - 1
    Object.assign(d, { baselineAvg: base.avg_price, baselineDate: base.as_of, move })

    if (Math.abs(move) < THRESHOLD) {
      decisions.push({ ...d, state: 'no_change', reason: `${pct(move)} since ${base.as_of}, under ${THRESHOLD * 100}%` })
      continue
    }
    if (Math.abs(move) > MAX_MOVE && !allowLarge.includes(`${g.vehicle}|${g.year}`)) {
      decisions.push({ ...d, state: 'needs_review', reason: `${pct(move)} since ${base.as_of} exceeds ${MAX_MOVE * 100}% — not applied` })
      continue
    }

    let changed = 0
    for (const row of g.rows) {
      const proposed = scaleRange(row.preowned_range, 1 + move)
      records.push({
        id: row.id,
        record: {
          source_url: obs.url,
          verified_on: today,
          evidence: d.evidence,
          value: proposed,
          method: 'derived',
          method_version: 1,
          derivation: 'cargurus_scaled',
          vehicle: g.vehicle,
          year: g.year,
          basis,
          prev_avg: base.avg_price,
          new_avg: seen.avgPrice,
        },
      })
      if (proposed === row.preowned_range) continue
      rowChanges.push({ id: row.id, name: row.name, vehicle: g.vehicle, year: g.year, old: row.preowned_range, new: proposed })
      changed++
    }
    vehicleBase.years[String(g.year)] = {
      basis,
      avg_price: seen.avgPrice,
      as_of: today,
      last_repriced: today,
      last_move_pct: Number((move * 100).toFixed(2)),
    }
    decisions.push({ ...d, state: 'repriced', rowsChanged: changed, reason: `${pct(move)} since ${base.as_of}` })
  }

  return { decisions, rowChanges, records, baselines: next }
}

/** Apply row changes to a copy of the data: details and preowned stay in sync. */
export function applyRowChanges(data, rowChanges, today) {
  if (rowChanges.length === 0) return data
  const out = structuredClone(data)
  // Details: keyed by configuration id + old value. The parallel `preowned`
  // table has no ids (WP-G derives it from details), so it still matches by
  // display name + old value.
  const key = (k, range) => `${k}\u0000${range}`
  const byId = new Map(rowChanges.map((c) => [key(c.id, c.old), c.new]))
  const byName = new Map(rowChanges.map((c) => [key(c.name, c.old), c.new]))
  for (const row of out.details) {
    const next = byId.get(key(row.id, row.preowned_range))
    if (next) row.preowned_range = next
  }
  for (const row of out.preowned ?? []) {
    const next = byName.get(key(row.name, row.preowned_range))
    if (next) row.preowned_range = next
  }
  out.last_updated = today
  return out
}

export function renderReport({ decisions, rowChanges, today, mode }) {
  const count = (s) => decisions.filter((d) => d.state === s).length
  const lines = [
    `# Pre-owned pricing refresh — ${today}`,
    '',
    `Mode: ${mode}. Source: CarGurus price trends. Rule: reprice when the average used price has moved ${THRESHOLD * 100}% or more since the last reprice.`,
    '',
    `- Groups checked (vehicle + model year): ${decisions.length}`,
    `- Repriced: ${count('repriced')} (${rowChanges.length} rows)`,
    `- No change: ${count('no_change')}`,
    `- Baseline recorded: ${count('baseline_set')}`,
    `- Needs review: ${count('needs_review')}`,
    `- Source unavailable / not registered / rejected: ${count('source_unavailable')} / ${count('no_source')} / ${count('rejected')}`,
    '',
    '| Vehicle | Year | Avg used price | Basis | Baseline | Move | CarGurus 30-day | Outcome |',
    '|---|---|---|---|---|---|---|---|',
  ]
  for (const d of decisions) {
    lines.push(
      `| ${d.url ? `[${d.vehicle}](${d.url})` : d.vehicle} | ${d.year} | ${d.avgPrice ? money(d.avgPrice) : '—'} | ${d.basis === 'model' ? 'model-wide' : d.basis === 'model_year' ? 'model year' : '—'} | ${
        d.baselineAvg ? `${money(d.baselineAvg)} (${d.baselineDate})` : '—'
      } | ${d.move === undefined ? '—' : pct(d.move)} | ${d.pct30 == null ? '—' : `${d.pct30}%`} | **${d.state}** — ${d.reason} |`,
    )
  }
  if (rowChanges.length) {
    lines.push('', '## Row changes', '', '| Row | Old | New |', '|---|---|---|')
    for (const c of rowChanges) lines.push(`| ${c.name} | ${c.old} | ${c.new} |`)
  }
  return lines.join('\n') + '\n'
}
