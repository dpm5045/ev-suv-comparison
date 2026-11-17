#!/usr/bin/env node
/**
 * WP-E migration (build spec v3.1): schema_version 1 → 2.
 *
 *   node scripts/migrations/2026-11-ids-availability.mjs            # migrate + write the review table
 *   node scripts/migrations/2026-11-ids-availability.mjs --resolve  # apply approved availability resolutions
 *
 * Migrate:
 *   - id on every details row: <vehicle>-<year>-<trim>, plus -<seats>s only where
 *     needed for uniqueness. Assigned once; never regenerated.
 *   - availability (new | used_only | announced | needs_review), msrp (number | null),
 *     msrp_status (current | historical | announced | unknown), range_basis
 *     (epa | manufacturer_estimate | unverified | null). No row becomes "new":
 *     anything not established is needs_review.
 *   - provenance.fields and accepted.json re-keyed from name to id. Records copied
 *     from a name key are marked legacy: "name_keyed" (they can never make a range
 *     EPA-verified or anchor an automatic EPA update).
 *   - docs/migrations/2026-11-availability-review.md: every row, old → new, with
 *     evidence and a suggested resolution for the owner.
 *
 * Resolve: reads docs/migrations/2026-11-availability-resolutions.json
 * ({ "<id>": "new" | "used_only" | "announced" }), written only after the owner
 * approves the review table, and applies it (msrp_status follows: new → current,
 * used_only → historical if a price is stored, else unknown).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const P = (p) => join(ROOT, p)
const readJson = (p) => JSON.parse(readFileSync(P(p), 'utf8'))
const writeJson = (p, v) => writeFileSync(P(p), JSON.stringify(v, null, 2) + '\n')

const DATA = 'lib/ev-data.json'
const PROV = 'lib/ev-data.provenance.json'
const ACCEPTED = 'scripts/refresh/accepted.json'
const REVIEW = 'docs/migrations/2026-11-availability-review.md'
const RESOLUTIONS = 'docs/migrations/2026-11-availability-resolutions.json'

// Vehicles announced but not on sale (mirrors WATCHLIST_VEHICLES in lib/data.ts)
const WATCHLIST = new Set([
  'Toyota Highlander EV', 'Lexus TZ', 'Subaru Getaway', 'BMW iX7', 'Genesis GV90',
  'Faraday Future FX Super One', 'Mercedes-Benz GLB Electric',
])

export const slug = (s) => String(s).toLowerCase()
  .replace(/\+/g, ' plus ').replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Assign ids: base slug, with a seat suffix only for groups that collide. */
export function assignIds(details) {
  const base = (r) => [slug(r.vehicle), r.year, slug(r.trim)].join('-')
  const groups = new Map()
  for (const r of details) groups.set(base(r), [...(groups.get(base(r)) ?? []), r])
  const ids = details.map((r) => {
    const g = groups.get(base(r))
    return g.length === 1 ? base(r) : `${base(r)}-${r.seats}s`
  })
  const seen = new Set()
  for (const id of ids) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`bad id ${id}`)
    if (seen.has(id)) throw new Error(`duplicate id ${id}: add a disambiguator by hand`)
    seen.add(id)
  }
  return ids
}

/** Insert keys after an anchor key, preserving order. */
function withKeysAfter(row, anchor, add) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    if (k in add) continue
    out[k] = v
    if (k === anchor) Object.assign(out, add)
  }
  return out
}

function classify(r, dataYear) {
  const m = r.msrp
  if (WATCHLIST.has(r.vehicle)) {
    return typeof m === 'number' ? { availability: 'announced', msrp: m, msrp_status: 'announced' } : { availability: 'announced', msrp: null, msrp_status: 'unknown' }
  }
  if (m === 'N/A - Not New') return { availability: 'used_only', msrp: null, msrp_status: 'unknown' }
  if (typeof m === 'number') {
    return r.year >= dataYear - 1
      ? { availability: 'needs_review', msrp: m, msrp_status: 'current', suggest: 'new' }
      : { availability: 'needs_review', msrp: m, msrp_status: 'historical', suggest: 'used_only' }
  }
  return { availability: 'needs_review', msrp: null, msrp_status: 'unknown', suggest: null }
}

function migrate() {
  const data = readJson(DATA)
  if (data.schema_version === 2 || 'id' in (data.details[0] ?? {})) throw new Error('already at schema_version 2; refusing to run twice')
  const prov = readJson(PROV)
  const accepted = readJson(ACCEPTED)
  const dataYear = new Date(data.last_updated).getUTCFullYear()

  const ids = assignIds(data.details)
  const byName = new Map()
  data.details.forEach((r, i) => byName.set(r.name, [...(byName.get(r.name) ?? []), ids[i]]))

  const review = []
  data.details = data.details.map((r, i) => {
    const c = classify(r, dataYear)
    const estimate = accepted.range_mi?.[r.name]
    const range_basis = typeof r.range_mi !== 'number' ? null : estimate ? 'manufacturer_estimate' : 'unverified'
    review.push({ id: ids[i], r, c, evidence: prov.fields?.[r.name]?.msrp })
    let row = withKeysAfter(r, 'name', { id: ids[i] })
    row = withKeysAfter(row, 'msrp', { availability: c.availability, msrp_status: c.msrp_status })
    row.msrp = c.msrp
    row = withKeysAfter(row, 'range_mi', { range_basis })
    return row
  })

  // Re-key provenance and accepted estimates by id
  const fields = {}
  for (const [name, rec] of Object.entries(prov.fields ?? {})) {
    const targets = byName.get(name)
    if (!targets) throw new Error(`provenance for unknown row: ${name}`)
    for (const id of targets) {
      fields[id] = {}
      for (const [field, entry] of Object.entries(rec)) fields[id][field] = { ...entry, legacy: 'name_keyed' }
    }
  }
  prov.fields = fields
  prov.schema_version = 2
  const acc = {}
  for (const [name, reason] of Object.entries(accepted.range_mi ?? {})) {
    for (const id of byName.get(name) ?? []) acc[id] = reason
  }
  accepted.range_mi = acc
  accepted._about = accepted._about.replace('Rows whose', 'Rows (by id) whose')

  const out = { schema_version: 2, ...data }
  writeJson(DATA, out)
  writeJson(PROV, prov)
  writeJson(ACCEPTED, accepted)
  writeReview(review, dataYear)
  console.log(`migrated ${ids.length} rows; ${review.filter((x) => x.c.availability === 'needs_review').length} need review → ${REVIEW}`)
}

function writeReview(review, dataYear) {
  mkdirSync(dirname(P(REVIEW)), { recursive: true })
  const L = [
    '# Availability review (WP-E migration, 2026-11)',
    '',
    `Every configuration's proposed availability. **No row is marked "sold new" automatically.** Rows marked \`needs_review\` stay out of the New results until the owner approves a resolution. A **suggestion** is given where the evidence supports one: a ${dataYear - 1}+ model year with a sourced current MSRP suggests \`new\`; an older model year with a stored price suggests \`used_only\` (its price is kept as \`historical\`).`,
    '',
    'To approve: confirm or change the suggestions, and the resolutions are written to `docs/migrations/2026-11-availability-resolutions.json` and applied with `--resolve`.',
    '',
  ]
  const byVehicle = new Map()
  for (const x of review) byVehicle.set(x.r.vehicle, [...(byVehicle.get(x.r.vehicle) ?? []), x])
  for (const [vehicle, xs] of byVehicle) {
    L.push(`## ${vehicle}`, '', '| id | Year | Trim | Seats | Old msrp | Availability | msrp_status | Suggested | MSRP evidence |', '|---|---|---|---|---|---|---|---|---|')
    for (const { id, r, c, evidence } of xs) {
      const ev = evidence ? `[${new URL(evidence.source_url).hostname}](${evidence.source_url}), ${evidence.verified_on}` : '—'
      const old = typeof r.msrp === 'number' ? `$${r.msrp.toLocaleString('en-US')}` : r.msrp ?? '—'
      L.push(`| \`${id}\` | ${r.year} | ${r.trim} | ${r.seats ?? '—'} | ${old} | ${c.availability} | ${c.msrp_status} | ${c.suggest ?? (c.availability === 'needs_review' ? '**owner**' : '—')} | ${ev} |`)
    }
    L.push('')
  }
  writeFileSync(P(REVIEW), L.join('\n'))
}

function resolveAvailability() {
  if (!existsSync(P(RESOLUTIONS))) throw new Error(`${RESOLUTIONS} not found: write it from the approved review table first`)
  const { _about, ...res } = readJson(RESOLUTIONS)
  const data = readJson(DATA)
  const ids = new Set(data.details.map((r) => r.id))
  for (const id of Object.keys(res)) if (!ids.has(id)) throw new Error(`resolution for unknown id ${id}`)
  let n = 0
  for (const r of data.details) {
    const to = res[r.id]
    if (!to) continue
    if (!['new', 'used_only', 'announced'].includes(to)) throw new Error(`bad availability ${to} for ${r.id}`)
    r.availability = to
    if (to === 'new') r.msrp_status = typeof r.msrp === 'number' ? 'current' : 'unknown'
    if (to === 'used_only') r.msrp_status = typeof r.msrp === 'number' ? 'historical' : 'unknown'
    if (to === 'announced') r.msrp_status = typeof r.msrp === 'number' ? 'announced' : 'unknown'
    n++
  }
  writeJson(DATA, data)
  const left = data.details.filter((r) => r.availability === 'needs_review').length
  console.log(`resolved ${n} rows; ${left} still need review`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--resolve')) resolveAvailability()
  else migrate()
}
