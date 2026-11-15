/**
 * EPA range check against the fueleconomy.gov bulk vehicle file.
 *
 * EPA lists variants ("EV9 Long Range AWD GT-Line", "R1S Dual Large (22in)"),
 * not the site's trims, so this never rewrites range_mi. It answers a narrower
 * question per row: is the stored range one that EPA publishes for this
 * vehicle, model year and drive type? Rows that fail are flagged for review.
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
    } else {
      const sameDrive = variants.filter((v) => driveMatches(row.drivetrain, v.drive))
      const pool = sameDrive.length ? sameDrive : variants
      const hits = pool.filter((v) => v.range === row.range_mi)
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
    if (r.state === 'mismatch') { g.mismatch.push(r); g.epaRanges = r.epaRanges }
    if (r.state === 'accepted') g.accepted.push(r)
    if (r.state === 'no_stored_range') { g.noStored++; g.epaRanges = r.epaRanges }
    if (r.state === 'not_in_epa') g.notInEpa = true
  }
  const sorted = [...groups.values()].sort((a, b) => a.vehicle.localeCompare(b.vehicle) || a.year - b.year)
  return { rows, groups: sorted }
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
