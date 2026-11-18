/**
 * The data contract for lib/ev-data.json (schema_version 2): field catalog and
 * every full-state rule, in one place (WP-F; docs/plans/wp-f-data-contract.md).
 *
 * Plain JS with no dependencies: CI runs it from the trusted base revision in
 * a bare worktree (no node_modules). The site does not import it; types are
 * generated from FIELDS into lib/ev-data.types.ts (scripts/schema/gen-types.mjs).
 *
 * checkState() returns violations as { rule, id, field, msg }. Violations listed
 * in scripts/schema/known-violations.json (debt that WP-F step 3 fixes through
 * the gate) are reported as warnings; a listed violation that no longer occurs
 * is an error, so the list can only shrink.
 */

export const SCHEMA_VERSION = 2

const ENUM = {
  drivetrain: ['AWD', 'RWD', 'AWD (dual motor)'],
  availability: ['new', 'used_only', 'announced', 'needs_review'],
  msrp_status: ['current', 'historical', 'announced', 'unknown'],
  range_basis: ['epa', 'manufacturer_estimate', 'unverified'],
  self_driving_tier: ['Basic L2', 'Advanced L2', 'L2+ Hands-Free', 'L2+ Point-to-Point'],
  adas_hardware_gen: ['current', 'previous', 'mixed'],
  fold_flat: ['Yes', 'No', 'Partial'],
}

/**
 * Field catalog, in stored order. type: string | number | integer | enum.
 * nullable: null allowed. sentinels: extra string values a numeric field may
 * hold (rules below say where). published: shown on the site, so a change
 * needs a sourced provenance record (validate-diff).
 */
export const FIELDS = {
  name: { type: 'string', published: false }, // display label; identity-checked
  id: { type: 'string', published: false },
  vehicle: { type: 'string' },
  year: { type: 'integer' },
  trim: { type: 'string' },
  seats: { type: 'integer' },
  drivetrain: { type: 'enum', values: ENUM.drivetrain },
  msrp: { type: 'number', nullable: true },
  availability: { type: 'enum', values: ENUM.availability },
  msrp_status: { type: 'enum', values: ENUM.msrp_status },
  destination: { type: 'number', nullable: true },
  preowned_range: { type: 'string' },
  self_driving: { type: 'string' },
  sae_level: { type: 'integer', nullable: true },
  self_driving_tier: { type: 'enum', values: ENUM.self_driving_tier, nullable: true },
  adas_hardware: { type: 'string', nullable: true },
  adas_hardware_gen: { type: 'enum', values: ENUM.adas_hardware_gen, nullable: true },
  adas_hardware_note: { type: 'string', nullable: true },
  range_mi: { type: 'number', sentinels: ['TBD'] },
  range_basis: { type: 'enum', values: ENUM.range_basis, nullable: true },
  hp: { type: 'number', sentinels: ['TBD'] },
  battery_kwh: { type: 'number', nullable: true, sentinels: ['TBD'] },
  onboard_ac_kw: { type: 'number', nullable: true },
  l2_10_100: { type: 'number', nullable: true },
  l2_10_80: { type: 'number', nullable: true },
  charging_type: { type: 'string' },
  car_software: { type: 'string' },
  center_display: { type: 'string' },
  gauge_cluster: { type: 'string', nullable: true },
  hud: { type: 'string', nullable: true },
  other_displays: { type: 'string', nullable: true },
  audio: { type: 'string' },
  driver_profiles: { type: 'string' },
  notes: { type: 'string' },
  frunk_cu_ft: { type: 'number', nullable: true },
  cargo_behind_3rd_cu_ft: { type: 'number', nullable: true, sentinels: ['N/A'] },
  cargo_behind_2nd_cu_ft: { type: 'number', nullable: true },
  fold_flat: { type: 'enum', values: ENUM.fold_flat, nullable: true },
  cargo_floor_width_in: { type: 'number', nullable: true },
  cargo_behind_1st_cu_ft: { type: 'number', nullable: true },
  towing_lbs: { type: 'number', nullable: true },
  dc_fast_charge_kw: { type: 'number', nullable: true },
  dc_fast_charge_10_80_min: { type: 'number', nullable: true },
  curb_weight_lbs: { type: 'number', nullable: true },
  length_in: { type: 'number', nullable: true },
  width_in: { type: 'number', nullable: true },
  height_in: { type: 'number', nullable: true },
  third_row_legroom_in: { type: 'number', nullable: true, sentinels: ['N/A'] },
  third_row_headroom_in: { type: 'number', nullable: true, sentinels: ['N/A'] },
  torque_lb_ft: { type: 'number', nullable: true },
  zero_to_60_sec: { type: 'number', nullable: true },
  ground_clearance_in: { type: 'number', nullable: true },
}

export const DETAIL_FIELDS = Object.keys(FIELDS)
/** Computed at load in lib/data.ts; must never be stored */
export const COMPUTED = ['otd_new', 'otd_preowned', 'preowned_low', 'preowned_high', 'self_driving_rank', 'adas_downgraded']
/** Set per seat configuration; never changed without the owner's approval (and evidence) */
export const PROTECTED = ['seats', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft', 'cargo_behind_1st_cu_ft', 'fold_flat', 'cargo_floor_width_in']
/** What a row is: changing any of these on an existing id is an identity change */
export const IDENTITY = ['name', 'vehicle', 'year', 'trim', 'seats', 'drivetrain']
export const THIRD_ROW = ['cargo_behind_3rd_cu_ft', 'third_row_legroom_in', 'third_row_headroom_in']
export const TBD_FIELDS = ['range_mi', 'hp', 'battery_kwh']
export const NO_MARKET = 'No used market yet'
export const PUBLISHED = DETAIL_FIELDS.filter((f) => FIELDS[f].published !== false)

const TOP_LEVEL = ['schema_version', 'last_updated', 'scope', 'count_note', 'count_data', 'count_totals', 'us_ev_sales', 'us_ev_sales_notes', 'details', 'preowned', 'glossary', 'assumptions']
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026, 2027]
const STATUS_FOR = {
  new: ['current', 'unknown'],
  used_only: ['historical', 'unknown'],
  announced: ['announced', 'unknown'],
  needs_review: ['current', 'historical', 'announced', 'unknown'],
}
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isUrl = (v) => typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v)

/** Parse "$42,000 - $52,000" / "$52,000"; null if not a price string. */
export function parsePrice(s) {
  const m = /^\$(\d{1,3}(?:,\d{3})*)(?: - \$(\d{1,3}(?:,\d{3})*))?$/.exec(s ?? '')
  if (!m) return null
  const low = Number(m[1].replace(/,/g, ''))
  const high = m[2] ? Number(m[2].replace(/,/g, '')) : low
  return { low, high }
}

/** Does a value fit the field's declared type (sentinels and nullability included)? */
export function fitsType(field, v) {
  const spec = FIELDS[field]
  if (!spec) return false
  if (v === null) return !!spec.nullable
  if (typeof v === 'string' && spec.sentinels?.includes(v)) return true
  switch (spec.type) {
    case 'string': return typeof v === 'string'
    case 'number': return typeof v === 'number' && Number.isFinite(v)
    case 'integer': return Number.isInteger(v)
    case 'enum': return spec.values.includes(v)
    default: return false
  }
}

/**
 * Every full-state rule. Inputs are parsed JSON: data (ev-data.json), prov
 * (provenance), accepted (accepted.json), retired (retired-ids.json).
 */
export function checkState({ data, prov, accepted, retired }) {
  const out = []
  const v = (rule, id, field, msg) => out.push({ rule, id: id ?? '-', field: field ?? '-', msg })

  // Top level
  for (const k of Object.keys(data)) if (!TOP_LEVEL.includes(k)) v('top-level-unknown', null, k, `unknown top-level key ${k}`)
  for (const k of TOP_LEVEL) if (!(k in data)) v('top-level-missing', null, k, `missing top-level key ${k}`)
  if (data.schema_version !== SCHEMA_VERSION) v('schema-version', null, 'schema_version', `schema_version must be ${SCHEMA_VERSION}`)
  if (!isDate(data.last_updated)) v('last-updated', null, 'last_updated', 'last_updated must be YYYY-MM-DD')

  const rows = Array.isArray(data.details) ? data.details : []
  const ids = new Map()
  for (const r of rows) {
    const id = r.id
    // Shape
    for (const k of Object.keys(r)) {
      if (COMPUTED.includes(k)) v('computed-stored', id, k, `${k} is computed at load and must not be stored`)
      else if (!FIELDS[k]) v('unknown-field', id, k, `unknown field ${k}`)
    }
    for (const f of DETAIL_FIELDS) {
      if (!(f in r)) { v('missing-field', id, f, `missing field ${f} (use null where allowed)`); continue }
      if (!fitsType(f, r[f])) v('type', id, f, `${f} has an invalid value ${JSON.stringify(r[f])}`)
    }
    // Identity
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) v('id-format', id, 'id', 'id must match ^[a-z0-9-]+$')
    if (ids.has(id)) v('id-duplicate', id, 'id', 'duplicate id')
    ids.set(id, r)
    if ((retired?.ids ?? []).some((x) => x.id === id)) v('id-retired', id, 'id', 'id is retired and may not be reused')

    // Availability and price meaning
    if (ENUM.availability.includes(r.availability) && !STATUS_FOR[r.availability].includes(r.msrp_status)) {
      v('msrp-status-fit', id, 'msrp_status', `msrp_status ${r.msrp_status} does not fit availability ${r.availability}`)
    }
    if ((r.msrp === null) !== (r.msrp_status === 'unknown')) v('msrp-null-unknown', id, 'msrp', 'msrp is null exactly when msrp_status is unknown')

    // Range basis
    const hasRange = typeof r.range_mi === 'number'
    if (hasRange ? !ENUM.range_basis.includes(r.range_basis) : r.range_basis !== null) {
      v('range-basis', id, 'range_basis', 'range_basis is required with a numeric range_mi, and null otherwise')
    }
    if (r.range_basis === 'epa') v('range-basis-epa', id, 'range_basis', 'epa needs a reviewed EPA mapping (WP-J.3)')

    // TBD only on rows not yet on sale
    for (const f of TBD_FIELDS) {
      if (r[f] === 'TBD' && !['announced', 'needs_review'].includes(r.availability)) v('tbd-on-sale', id, f, `${f} is TBD on a row that is ${r.availability}`)
    }

    // Third row: N/A means "no third row" — required with <= 5 seats, forbidden otherwise
    if (Number.isInteger(r.seats)) {
      for (const f of THIRD_ROW) {
        if (r.seats <= 5 && r[f] !== 'N/A') v('third-row-na-required', id, f, `${r.seats}-seat row must have ${f} = "N/A" (no third row)`)
        if (r.seats > 5 && r[f] === 'N/A') v('third-row-na-forbidden', id, f, `${r.seats}-seat row has a third row; ${f} cannot be "N/A" (use null if unknown)`)
      }
    }

    // Pre-owned range
    if (typeof r.preowned_range === 'string' && r.preowned_range !== NO_MARKET) {
      const p = parsePrice(r.preowned_range)
      if (!p) v('preowned-format', id, 'preowned_range', `preowned_range must be "$X - $Y", "$X" or "${NO_MARKET}"`)
      else if (p.low > p.high || p.low < 5000 || p.high > 250000) v('preowned-bounds', id, 'preowned_range', 'preowned_range must have low <= high, within $5,000-$250,000')
    }

    // Driver assist
    if (r.adas_hardware_gen != null && !r.adas_hardware) v('adas-consistency', id, 'adas_hardware', 'adas_hardware_gen is set but adas_hardware is empty')
  }

  // accepted.json (manufacturer range estimates) agrees with range_basis
  const acc = accepted?.range_mi ?? {}
  for (const id of Object.keys(acc)) {
    const r = ids.get(id)
    if (!r) v('accepted-unknown-id', id, 'range_basis', 'accepted.json lists an unknown id')
    else if (r.range_basis !== 'manufacturer_estimate') v('accepted-basis', id, 'range_basis', `accepted.json lists this row but range_basis is ${r.range_basis}`)
  }
  for (const r of rows) if (r.range_basis === 'manufacturer_estimate' && !(r.id in acc)) v('accepted-basis', r.id, 'range_basis', 'manufacturer_estimate without an accepted.json reason')

  // Counts must equal the rows (until WP-G derives them): one row per model,
  // every year that appears in the rows or in any count column
  const counted = {}
  for (const r of rows) counted[`${r.vehicle}|${r.year}`] = (counted[`${r.vehicle}|${r.year}`] ?? 0) + 1
  const models = new Set()
  for (const c of data.count_data ?? []) {
    if (models.has(c.model)) v('count-duplicate', null, `count_data.${c.model}`, 'duplicate count_data row for this model')
    models.add(c.model)
  }
  const yearKeys = (o) => Object.keys(o ?? {}).filter((k) => /^y\d{4}$/.test(k)).map((k) => Number(k.slice(1)))
  const years = [...new Set([...YEARS, ...rows.map((r) => r.year), ...(data.count_data ?? []).flatMap(yearKeys), ...yearKeys(data.count_totals)])].sort()
  for (const c of data.count_data ?? []) {
    let total = 0
    for (const y of years) {
      const want = counted[`${c.model}|${y}`] ?? 0
      if ((c[`y${y}`] ?? 0) !== want) v('count-rows', null, `count_data.${c.model}.y${y}`, `count ${c[`y${y}`] ?? 0} but ${want} rows`)
      total += c[`y${y}`] ?? 0
    }
    if (c.total !== total) v('count-total', null, `count_data.${c.model}.total`, `total ${c.total} is not the sum ${total}`)
  }
  for (const veh of new Set(rows.map((r) => r.vehicle))) if (!models.has(veh)) v('count-rows', null, `count_data.${veh}`, 'vehicle has rows but no count_data entry')
  for (const k of [...years.map((y) => `y${y}`), 'total']) {
    const sum = (data.count_data ?? []).reduce((s, c) => s + (c[k] ?? 0), 0)
    if ((data.count_totals?.[k] ?? 0) !== sum) v('count-total', null, `count_totals.${k}`, `count_totals.${k} is not the column sum ${sum}`)
  }

  // Provenance: version; the CarGurus baselines the pre-owned script reads; records keyed by known ids and fields
  if (prov && prov.schema_version !== 2) v('prov-version', null, 'provenance.schema_version', 'provenance schema_version must be 2 (record fields are additive)')
  const vehicles = new Set(rows.map((r) => r.vehicle))
  for (const [veh, b] of Object.entries(prov?.preowned ?? {})) {
    if (!vehicles.has(veh)) v('prov-baseline', null, `preowned.${veh}`, 'pre-owned baseline for an unknown vehicle')
    if (!isUrl(b.source_url)) v('prov-baseline', null, `preowned.${veh}`, 'pre-owned baseline needs an https source_url')
    for (const [year, x] of Object.entries(b.years ?? {})) {
      if (!/^\d{4}$/.test(year) || typeof x.avg_price !== 'number' || !(x.avg_price > 0) || !isDate(x.as_of) || !['model_year', 'model'].includes(x.basis)) {
        v('prov-baseline', null, `preowned.${veh}.${year}`, 'malformed pre-owned baseline (avg_price > 0, as_of YYYY-MM-DD, basis model_year|model)')
      }
    }
  }
  for (const [id, fields] of Object.entries(prov?.fields ?? {})) {
    if (!ids.has(id)) v('prov-unknown-id', id, '-', 'provenance for an unknown id')
    for (const [f, rec] of Object.entries(fields)) {
      if (!FIELDS[f]) v('prov-unknown-field', id, f, 'provenance for an unknown field')
      if (!isUrl(rec.source_url) || !isDate(rec.verified_on)) v('prov-shape', id, f, 'provenance needs an https source_url and a YYYY-MM-DD verified_on')
      if (!rec.legacy) {
        if (typeof rec.evidence !== 'string' || !rec.evidence.trim()) v('prov-evidence', id, f, 'provenance needs a quoted evidence string')
        if (!('value' in rec)) v('prov-value', id, f, 'a non-legacy provenance record needs value')
        else if (ids.has(id) && JSON.stringify(rec.value) !== JSON.stringify(ids.get(id)[f])) v('prov-value-mismatch', id, f, `provenance value ${JSON.stringify(rec.value)} differs from the stored ${JSON.stringify(ids.get(id)[f])}`)
        if (!['observed', 'derived', 'moved'].includes(rec.method)) v('prov-method', id, f, 'method must be observed, derived or moved')
        if (!Number.isInteger(rec.method_version) || rec.method_version < 1) v('prov-method', id, f, 'method_version must be a positive integer')
      }
    }
  }
  // Each violation carries the offending value (a baseline exemption covers only that value)
  for (const x of out) {
    const r = ids.get(x.id)
    x.value = r && x.field in r ? r[x.field] : null
  }
  return out
}

/**
 * Advisories: plausibility and completeness signals that are worth a look but
 * are not contract violations. Returns { warnings: string[], info: string[] }.
 */
export function advisories({ data, prov }) {
  const warnings = []
  const info = []
  const rows = data.details ?? []
  const plaus = [['range_mi', 150, 500], ['hp', 200, 1200], ['battery_kwh', 50, 250], ['msrp', 30000, 250000]]
  for (const r of rows) {
    for (const [f, lo, hi] of plaus) if (typeof r[f] === 'number' && (r[f] < lo || r[f] > hi)) warnings.push(`${f} ${r[f]} outside ${lo}-${hi}: ${r.id}`)
    if ((r.adas_hardware_gen === 'previous' || r.adas_hardware_gen === 'mixed') && !rows.some((o) => o.vehicle === r.vehicle && o.adas_hardware_gen === 'current')) {
      warnings.push(`older driver-assist hardware but no "current" row for the vehicle: ${r.id}`)
    }
    for (const f of TBD_FIELDS) if (r[f] === 'TBD' || (typeof r[f] === 'string' && r[f].startsWith('TBD'))) info.push(`${f} TBD on ${r.availability} row: ${r.id}`)
  }
  const needsReview = rows.filter((r) => r.availability === 'needs_review').length
  if (needsReview) warnings.push(`${needsReview} configuration(s) have availability needs_review and are excluded from new-car results`)
  const names = new Set(rows.map((r) => r.name))
  for (const p of data.preowned ?? []) if (!names.has(p.name)) warnings.push(`preowned table entry with no details row: ${p.name}`)
  const shared = Object.values(rows.reduce((m, r) => ((m[r.name] = (m[r.name] ?? 0) + 1), m), {})).filter((n) => n > 1).length
  if (shared) info.push(`${shared} display name(s) shared by seat variants (expected; ids are unique)`)
  const recs = Object.values(prov?.fields ?? {}).flatMap((f) => Object.values(f))
  info.push(`Provenance: ${recs.length} field record(s) (${recs.filter((x) => x.legacy).length} legacy), ${Object.keys(prov?.preowned ?? {}).length} vehicle(s) with pre-owned baselines`)
  const complete = ['onboard_ac_kw', 'l2_10_100', 'l2_10_80', 'charging_type', 'frunk_cu_ft', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft', 'cargo_behind_1st_cu_ft', 'fold_flat', 'hp', 'battery_kwh', 'range_mi', 'self_driving', 'car_software', 'center_display']
  let full = 0
  for (const r of rows) {
    const missing = complete.filter((f) => r[f] === null || r[f] === '' || (typeof r[f] === 'string' && r[f].toLowerCase().startsWith('tbd')))
    if (!missing.length) full++
    else if (missing.length >= 5) info.push(`Low completeness (${missing.length} missing) [${missing.join(',')}]: ${r.id}`)
  }
  info.push(`Data completeness: ${full}/${rows.length} entries fully populated`)
  return { warnings, info }
}

/** Split violations into baseline-known (warnings) and new (errors); stale baseline entries are errors. */
export function applyBaseline(violations, baseline) {
  // An exemption names the rule, row, field AND the original value: a different bad value is a new violation
  const key = (x) => `${x.rule}|${x.id}|${x.field}|${JSON.stringify(x.value ?? null)}`
  const known = new Set(baseline?.violations ?? [])
  const seen = new Set(violations.map(key))
  const errors = violations.filter((x) => !known.has(key(x)))
  const warnings = violations.filter((x) => known.has(key(x)))
  for (const k of known) if (!seen.has(k)) errors.push({ rule: 'baseline-stale', id: '-', field: '-', msg: `known-violations.json lists "${k}", which no longer occurs: remove it` })
  return { errors, warnings }
}
