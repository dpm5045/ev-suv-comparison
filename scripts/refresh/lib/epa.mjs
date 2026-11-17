/**
 * EPA range check against the fueleconomy.gov bulk vehicle file.
 *
 * EPA lists variants ("EV9 Long Range AWD GT-Line", "R1S Dual Large (22in)"),
 * not the site's trims. checkRanges answers a narrow question per row: is the
 * stored range one that EPA publishes for this vehicle, model year and drive
 * type? planRangeFixes corrects a failing row only when an earlier EPA match
 * says which variant it is; the rest are flagged for review.
 */

const VEHICLE_URL = (id) => `https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=${id}`

/** Minimal RFC 4180 parser returning only the requested columns. */
export function parseCsv(text, wanted) {
  const rows = []
  let header = null
  let idx = null
  let field = ''
  let record = []
  let quoted = false
  const endRecord = () => {
    record.push(field)
    field = ''
    if (!header) {
      header = record
      idx = wanted.map((w) => header.indexOf(w))
      const missing = wanted.filter((_, i) => idx[i] < 0)
      if (missing.length) throw new Error(`EPA file is missing column(s): ${missing.join(', ')}`)
    } else if (record.length > 1) {
      const o = {}
      wanted.forEach((w, i) => { o[w] = record[idx[i]] })
      rows.push(o)
    }
    record = []
  }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { record.push(field); field = '' }
    else if (ch === '\n') endRecord()
    else if (ch !== '\r') field += ch
  }
  if (field !== '' || record.length) endRecord()
  return rows
}

/**
 * @returns {Record<string, Record<string, {id:number, model:string, drive:string, range:number}[]>>}
 *          vehicle -> model year -> EPA variants, sorted by id
 */
export function buildEpaIndex(csvText, models) {
  const rows = parseCsv(csvText, ['id', 'year', 'make', 'model', 'atvType', 'range', 'drive'])
  if (rows.length < 1000) throw new Error(`EPA file looks truncated (${rows.length} rows)`)
  const matchers = Object.entries(models).map(([vehicle, m]) => ({ vehicle, make: m.make.toLowerCase(), re: new RegExp(m.model, 'i') }))
  const index = {}
  for (const r of rows) {
    if (r.atvType !== 'EV') continue
    const range = Number(r.range)
    if (!Number.isFinite(range) || range <= 0) continue
    for (const m of matchers) {
      if (r.make.toLowerCase() !== m.make || !m.re.test(r.model)) continue
      const list = ((index[m.vehicle] ??= {})[r.year] ??= [])
      list.push({ id: Number(r.id), model: r.model.replace(/\s+/g, ' ').trim(), drive: r.drive, range })
    }
  }
  for (const years of Object.values(index)) for (const list of Object.values(years)) list.sort((a, b) => a.id - b.id)
  return index
}

/**
 * Where EPA rates two- and three-row versions separately (Lucid labels them
 * "(2R)" and "(3R)"), a row only matches the version with its seat count.
 */
function seatsMatch(seats, model) {
  if (typeof seats !== 'number') return true
  if (/\(2R\)/i.test(model)) return seats <= 5
  if (/\(3R\)/i.test(model)) return seats >= 6
  return true
}

/**
 * The EPA variants a row can be: same drive type and compatible seating.
 * Fails closed: when no variant fits the row's drive type or seating, the
 * answer is none (the row is reported as unmatched), never "any variant".
 */
export function candidatesFor(row, variants) {
  return (variants ?? []).filter((v) => driveMatches(row.drivetrain, v.drive) && seatsMatch(row.seats, v.model))
}

function driveMatches(rowDrive, epaDrive) {
  if (/RWD/i.test(rowDrive ?? '')) return /Rear/i.test(epaDrive)
  if (/AWD|4WD/i.test(rowDrive ?? '')) return /All-Wheel|4-Wheel/i.test(epaDrive)
  return true
}

/**
 * @returns {{ rows: object[], groups: object[] }} one result per detail row and
 *          a per vehicle + model year roll-up for the report
 */
export function checkRanges(data, index, accepted = {}) {
  const rows = []
  for (const row of data.details) {
    const r = { name: row.name, vehicle: row.vehicle, year: row.year, stored: row.range_mi }
    const variants = index[row.vehicle]?.[String(row.year)] ?? []
    if (variants.length === 0) {
      r.state = 'not_in_epa'
      r.otherYears = Object.keys(index[row.vehicle] ?? {}).sort()
    } else if (typeof row.range_mi !== 'number') {
      r.state = 'no_stored_range'
    } else if (candidatesFor(row, variants).length === 0 && !accepted[row.name]) {
      // EPA rates this model year, but no variant has this row's drive type and seating
      r.state = 'unmatched'
    } else {
      const hits = hitsFor(row, variants)
      if (hits.length) {
        r.state = 'consistent'
        r.sourceUrl = VEHICLE_URL(hits[0].id)
        r.evidence = `EPA ${row.year} ${hits[0].model}: ${hits[0].range} mi` + (hits.length > 1 ? ` (and ${hits.length - 1} other EPA variant(s) with the same range)` : '')
      } else if (accepted[row.name]) {
        r.state = 'accepted'
        r.reason = accepted[row.name]
      } else {
        r.state = 'mismatch'
      }
    }
    if (r.state !== 'consistent') r.epaRanges = [...new Set(variants.map((v) => v.range))].sort((a, b) => a - b)
    rows.push(r)
  }

  const groups = new Map()
  for (const r of rows) {
    const key = `${r.vehicle}|${r.year}`
    if (!groups.has(key)) groups.set(key, { vehicle: r.vehicle, year: r.year, total: 0, consistent: 0, mismatch: [], accepted: [], noStored: 0, notInEpa: false, otherYears: r.otherYears, epaRanges: r.epaRanges })
    const g = groups.get(key)
    g.total++
    if (r.state === 'consistent') g.consistent++
    if (r.state === 'mismatch' || r.state === 'unmatched') { g.mismatch.push(r); g.epaRanges = r.epaRanges }
    if (r.state === 'accepted') g.accepted.push(r)
    if (r.state === 'no_stored_range') { g.noStored++; g.epaRanges = r.epaRanges }
    if (r.state === 'not_in_epa') g.notInEpa = true
  }
  const sorted = [...groups.values()].sort((a, b) => a.vehicle.localeCompare(b.vehicle) || a.year - b.year)
  return { rows, groups: sorted }
}

export const MAX_RANGE_FIX = 0.15 // larger corrections are left for review

/** EPA variants of the row's drive type and seating whose range equals the stored range. */
function hitsFor(row, variants) {
  return candidatesFor(row, variants).filter((v) => v.range === row.range_mi)
}

/**
 * Corrections that follow from EPA alone, without interpreting trim names.
 *
 * A mismatched row is fixed only when we already know which EPA variant it
 * is: the same row matched variant(s) M in the previous EPA snapshot (EPA
 * revised M), or the same trim matched M in another model year (EPA rated a
 * carried-over trim). The new range is M's current figure for this model year,
 * and every variant in M must agree on it. Anything else stays flagged.
 *
 * @returns {{ fixes: object[], skipped: object[] }}
 */
export function planRangeFixes(data, index, previousIndex, accepted = {}) {
  const { rows } = checkRanges(data, index, accepted)
  const mismatched = new Map()
  for (const r of rows) if (r.state === 'mismatch') mismatched.set(`${r.name}|${r.stored}`, r)

  const fixes = []
  const skipped = []
  const seen = new Set()
  for (const row of data.details) {
    const key = `${row.name}|${row.range_mi}`
    if (!mismatched.has(key) || seen.has(key)) continue
    seen.add(key)
    const current = index[row.vehicle]?.[String(row.year)] ?? []

    // Anchors, most direct first: previous snapshot of the same year, then
    // the same trim in the nearest other model years.
    const anchors = []
    const prevHits = hitsFor(row, previousIndex?.[row.vehicle]?.[String(row.year)])
    if (prevHits.length) anchors.push({ desc: `matched EPA ${row.year} ${prevHits[0].model} before EPA revised it`, models: prevHits.map((v) => v.model) })
    const siblings = data.details
      .filter((o) => o.vehicle === row.vehicle && o.trim === row.trim && o.drivetrain === row.drivetrain && o.year !== row.year && typeof o.range_mi === 'number')
      .sort((a, b) => Math.abs(a.year - row.year) - Math.abs(b.year - row.year) || b.year - a.year)
    for (const o of siblings) {
      const hits = hitsFor(o, index[o.vehicle]?.[String(o.year)])
      if (hits.length) anchors.push({ desc: `same EPA variant as the ${o.year} ${o.trim}`, models: hits.map((v) => v.model) })
    }

    let result = null
    for (const a of anchors) {
      const candidates = candidatesFor(row, current).filter((v) => a.models.includes(v.model))
      if (!candidates.length) continue
      const ranges = [...new Set(candidates.map((v) => v.range))]
      result = ranges.length === 1 ? { anchor: a, variant: candidates[0], range: ranges[0] } : { reason: `${a.desc}, but those EPA variants now differ (${ranges.join(', ')} mi)` }
      break
    }

    const base = { name: row.name, vehicle: row.vehicle, year: row.year, trim: row.trim, old: row.range_mi }
    if (!result) {
      const known = [...new Set(anchors.flatMap((a) => a.models))]
      skipped.push({ ...base, reason: known.length ? `EPA has no ${row.year} rating for the variant this trim matched before (${known.join(', ')})` : 'no earlier EPA match to carry forward' })
      continue
    }
    if (result.reason) { skipped.push({ ...base, reason: result.reason }); continue }
    const move = Math.abs(result.range / row.range_mi - 1)
    if (move > MAX_RANGE_FIX) {
      skipped.push({ ...base, reason: `EPA ${result.variant.model} is ${result.range} mi, a ${(move * 100).toFixed(0)}% change; over ${MAX_RANGE_FIX * 100}%, left for review` })
      continue
    }
    fixes.push({
      ...base,
      new: result.range,
      sourceUrl: VEHICLE_URL(result.variant.id),
      evidence: `EPA ${row.year} ${result.variant.model}: ${result.range} mi (${result.anchor.desc})`,
      notesMentionOld: typeof row.notes === 'string' && new RegExp(`\\b${row.range_mi}\\b`).test(row.notes),
    })
  }
  return { fixes, skipped }
}

/** Apply range fixes to a copy of the data. Rows sharing a name (seat variants) move together. */
export function applyRangeFixes(data, fixes, today) {
  if (!fixes.length) return data
  const out = structuredClone(data)
  const byKey = new Map(fixes.map((f) => [`${f.name}|${f.old}`, f.new]))
  for (const row of out.details) {
    const next = byKey.get(`${row.name}|${row.range_mi}`)
    if (next !== undefined) row.range_mi = next
  }
  out.last_updated = today
  return out
}

/** What EPA added, removed or changed since the stored snapshot. */
export function diffEpa(previous, current) {
  const changes = []
  const flat = (idx) => {
    const m = new Map()
    for (const [vehicle, years] of Object.entries(idx ?? {})) {
      for (const [year, list] of Object.entries(years)) for (const v of list) m.set(v.id, { vehicle, year, ...v })
    }
    return m
  }
  const a = flat(previous)
  const b = flat(current)
  for (const [id, v] of b) {
    const old = a.get(id)
    if (!old) changes.push({ kind: 'added', ...v })
    else if (old.range !== v.range) changes.push({ kind: 'range_changed', ...v, oldRange: old.range })
  }
  for (const [id, v] of a) if (!b.has(id)) changes.push({ kind: 'removed', ...v })
  return changes
}

/**
 * Record a source for every consistent row's range_mi. An existing entry is
 * only rewritten when its evidence changed or it is more than 90 days old, so
 * an unchanged run leaves the file untouched.
 */
export function updateRangeProvenance(fields, rows, today) {
  const next = structuredClone(fields ?? {})
  const age = (d) => (Date.parse(today) - Date.parse(d)) / 86400000
  for (const r of rows) {
    if (r.state !== 'consistent') continue
    const cur = next[r.name]?.range_mi
    if (cur && cur.evidence === r.evidence && cur.source_url === r.sourceUrl && age(cur.verified_on) <= 90) continue
    ;(next[r.name] ??= {}).range_mi = { source_url: r.sourceUrl, verified_on: today, evidence: r.evidence }
  }
  return next
}
