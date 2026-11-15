#!/usr/bin/env node
/**
 * Data watch — deterministic, no LLM. Never edits lib/ev-data.json.
 *
 *   1. EPA: checks every stored range_mi against the fueleconomy.gov vehicle
 *      file and reports what EPA added or changed since the last run.
 *   2. Manufacturer pages: checks that stored MSRPs still appear on each
 *      registered page and reports prices that appeared or disappeared.
 *
 *   node scripts/refresh/watch.mjs                  # dry run: report only
 *   node scripts/refresh/watch.mjs --apply          # also save state + range sources
 *   node scripts/refresh/watch.mjs --report out.md
 *   node scripts/refresh/watch.mjs --save-snapshots dir | --from-snapshots dir
 *
 * --apply writes scripts/refresh/state/watch.json (what was seen, for the next
 * run to compare against) and range_mi entries in lib/ev-data.provenance.json.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipFirst } from './lib/zip.mjs'
import { buildEpaIndex, checkRanges, diffEpa, updateRangeProvenance } from './lib/epa.mjs'
import { extractAmounts, storedMsrps, checkPage, extractHeadline, storedPriceSpan, checkHeadline, fmt } from './lib/pages.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DATA_PATH = join(ROOT, 'lib/ev-data.json')
const PROVENANCE_PATH = join(ROOT, 'lib/ev-data.provenance.json')
const SOURCES_PATH = join(ROOT, 'scripts/refresh/sources.json')
const STATE_PATH = join(ROOT, 'scripts/refresh/state/watch.json')
const ACCEPTED_PATH = join(ROOT, 'scripts/refresh/accepted.json')

const USER_AGENT = 'data-refresh-script/1.0'
const REQUEST_GAP_MS = 1500
const TIMEOUT_MS = 60000

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const apply = flag('--apply')
const reportPath = option('--report')
const saveDir = option('--save-snapshots')
const fromDir = option('--from-snapshots')
const today = option('--today') ?? new Date().toISOString().slice(0, 10)

const readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'))
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n')
const snapshotName = (vehicle, kind = 'page') => kind + '-' + vehicle.replace(/[^A-Za-z0-9]+/g, '-') + '.html'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const baseDomain = (host) => host.split('.').slice(-2).join('.')

/** Fetch a registered URL; a redirect may not leave the registered site. */
async function fetchBuffer(url) {
  const start = new URL(url)
  if (start.protocol !== 'https:') throw new Error(`not https: ${url}`)
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  const end = new URL(res.url)
  if (end.protocol !== 'https:' || baseDomain(end.hostname) !== baseDomain(start.hostname)) {
    throw new Error(`redirected off-site to ${end.hostname}`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const data = readJson(DATA_PATH)
const sources = readJson(SOURCES_PATH)
const provenance = existsSync(PROVENANCE_PATH) ? readJson(PROVENANCE_PATH) : { schema_version: 1, preowned: {}, fields: {} }
const state = existsSync(STATE_PATH) ? readJson(STATE_PATH) : { schema_version: 1, epa: null, pages: {} }
const accepted = existsSync(ACCEPTED_PATH) ? readJson(ACCEPTED_PATH).range_mi ?? {} : {}
if (saveDir) mkdirSync(saveDir, { recursive: true })

// ── EPA ─────────────────────────────────────────────────────────────
let epa = null
let epaError = null
try {
  const zip = fromDir ? readFileSync(join(fromDir, 'vehicles.csv.zip')) : await fetchBuffer(sources.epa.download_url)
  if (saveDir) writeFileSync(join(saveDir, 'vehicles.csv.zip'), zip)
  const index = buildEpaIndex(unzipFirst(zip, 'vehicles.csv').toString('utf-8'), sources.epa.models)
  epa = { index, ...checkRanges(data, index, accepted), changes: state.epa ? diffEpa(state.epa, index) : null }
} catch (e) {
  epaError = e.message
}

// ── Manufacturer pages ──────────────────────────────────────────────
const pages = []
let first = true
for (const [vehicle, url] of Object.entries(sources.pricing_pages)) {
  const p = { vehicle, url }
  try {
    let html
    if (fromDir) html = readFileSync(join(fromDir, snapshotName(vehicle)), 'utf-8')
    else {
      if (!first) await sleep(REQUEST_GAP_MS)
      first = false
      html = (await fetchBuffer(url)).toString('utf-8')
      if (saveDir) writeFileSync(join(saveDir, snapshotName(vehicle)), html)
    }
    const stored = storedMsrps(data, vehicle)
    Object.assign(p, { stored }, checkPage(extractAmounts(html), stored, state.pages?.[vehicle]))
  } catch (e) {
    p.error = e.message
  }
  pages.push(p)
}

// ── Third-party tripwires ───────────────────────────────────────────
const tripwires = []
const fetched = new Map() // two vehicles can share one page
for (const [vehicle, url] of Object.entries(sources.third_party_pages ?? {})) {
  const t = { vehicle, url }
  try {
    let html
    if (fromDir) html = readFileSync(join(fromDir, snapshotName(vehicle, 'third')), 'utf-8')
    else {
      if (!fetched.has(url)) {
        await sleep(REQUEST_GAP_MS)
        fetched.set(url, (await fetchBuffer(url)).toString('utf-8'))
      }
      html = fetched.get(url)
      if (saveDir) writeFileSync(join(saveDir, snapshotName(vehicle, 'third')), html)
    }
    t.headline = extractHeadline(html)
    t.flags = checkHeadline(t.headline, state.tripwires?.[vehicle])
    t.firstRun = !state.tripwires?.[vehicle]
    t.stored = t.headline.model_year ? storedPriceSpan(data, vehicle, t.headline.model_year) : null
  } catch (e) {
    t.error = e.message
  }
  tripwires.push(t)
}

// ── Report ──────────────────────────────────────────────────────────
const L = [`# Data watch — ${today}`, '', `Mode: ${apply ? 'apply' : 'dry run'}. This report never changes vehicle data; it lists what to look at.`, '']
const attention = []

if (epaError) attention.push(`EPA file could not be read: ${epaError}`)
if (epa) {
  for (const c of epa.changes ?? []) {
    if (c.kind === 'added') attention.push(`EPA added ${c.year} ${c.model} (${c.range} mi) — ${c.vehicle}`)
    if (c.kind === 'removed') attention.push(`EPA removed ${c.year} ${c.model} (${c.range} mi) — ${c.vehicle}`)
    if (c.kind === 'range_changed') attention.push(`EPA changed ${c.year} ${c.model} from ${c.oldRange} to ${c.range} mi — ${c.vehicle}`)
  }
  for (const g of epa.groups) {
    if (g.mismatch.length) {
      const ours = [...new Set(g.mismatch.map((r) => r.stored))].join(', ')
      attention.push(`${g.vehicle} ${g.year}: stored range ${ours} mi is not an EPA figure for this model year (EPA has ${g.epaRanges.join(', ')}) — ${g.mismatch.length} row(s)`)
    }
  }
}
for (const p of pages) {
  if (p.error) attention.push(`${p.vehicle} page unavailable: ${p.error}`)
  for (const f of p.flags ?? []) attention.push(`${p.vehicle} page: ${f}`)
}

for (const t of tripwires) {
  if (t.error) attention.push(`${t.vehicle} Car and Driver page unavailable: ${t.error}`)
  for (const f of t.flags ?? []) attention.push(`${t.vehicle} on Car and Driver: ${f}`)
}

L.push('## Needs a look', '')
if (attention.length) for (const a of attention) L.push(`- ${a}`)
else L.push('Nothing.')

if (epa) {
  const n = (s) => epa.rows.filter((r) => r.state === s).length
  L.push('', '## EPA range check', '',
    `${epa.rows.length} rows: ${n('consistent')} match an EPA figure, ${n('mismatch')} do not, ${n('accepted')} are accepted manufacturer figures, ${n('not_in_epa')} are for a model year EPA has not listed, ${n('no_stored_range')} have no stored number.`,
    epa.changes === null ? 'First run: EPA snapshot recorded, nothing to compare against yet.' : `EPA changes since the last run: ${epa.changes.length}.`,
    '', '| Vehicle | Year | Rows | Match EPA | Outcome |', '|---|---|---|---|---|')
  for (const g of epa.groups) {
    let outcome = 'ok'
    if (g.notInEpa) outcome = 'not in EPA file' + (g.otherYears?.length ? ` (EPA lists this model for ${g.otherYears.join(', ')})` : '')
    else if (g.mismatch.length) outcome = `**mismatch** — stored ${[...new Set(g.mismatch.map((r) => r.stored))].join(', ')}; EPA has ${g.epaRanges.join(', ')}`
    else if (g.accepted.length) outcome = `ok — ${g.accepted.length} row(s) accepted: ${[...new Set(g.accepted.map((r) => r.reason))].join(' ')}`
    else if (g.noStored) outcome = `no stored number on ${g.noStored} row(s); EPA has ${g.epaRanges.join(', ')}`
    L.push(`| ${g.vehicle} | ${g.year} | ${g.total} | ${g.consistent} | ${outcome} |`)
  }
}

L.push('', '## Manufacturer price pages', '', '| Vehicle | Stored MSRPs on page | Stored MSRPs not on page | Other amounts in the price band | Outcome |', '|---|---|---|---|---|')
for (const p of pages) {
  if (p.error) { L.push(`| [${p.vehicle}](${p.url}) | — | — | — | **unavailable** — ${p.error} |`); continue }
  const list = (a) => (a.length ? a.map(fmt).join(', ') : '—')
  const outcome = !p.watchable ? 'not watchable — no stored MSRP is printed on this page' : p.flags.length ? `**changed** — ${p.flags.join('; ')}` : p.firstRun ? 'first run — recorded' : 'no change'
  L.push(`| [${p.vehicle}](${p.url}) | ${list(p.found)} | ${list(p.missing)} | ${list(p.other)} | ${outcome} |`)
}
L.push('', '## Car and Driver price lines', '', 'These include destination and follow the newest model year. "Stored" is the lowest to highest MSRP plus destination for that model year.', '', '| Vehicle | Model year | Car and Driver MSRP | Stored for that year | Outcome |', '|---|---|---|---|---|')
for (const t of tripwires) {
  if (t.error) { L.push(`| [${t.vehicle}](${t.url}) | — | — | — | **unavailable** — ${t.error} |`); continue }
  const h = t.headline
  const span = (x) => (x.low === x.high ? fmt(x.low) : `${fmt(x.low)}–${fmt(x.high)}`)
  const stored = t.stored ? span(t.stored) : 'no priced rows'
  const agrees = t.stored && !h.estimated ? (t.stored.low === h.low ? 'starting price agrees' : 'starting price differs') : null
  const outcome = t.flags.length ? `**changed** — ${t.flags.join('; ')}` : t.firstRun ? 'first run — recorded' : 'no change'
  L.push(`| [${t.vehicle}](${t.url}) | ${h.model_year ?? '—'} | ${span(h)}${h.estimated ? ' est' : ''} | ${stored} | ${outcome}${agrees ? `; ${agrees}` : ''} |`)
}
const report = L.join('\n') + '\n'
process.stdout.write(report)
if (reportPath) writeFileSync(reportPath, report)

if (!epa && pages.every((p) => p.error) && tripwires.every((t) => t.error)) {
  console.error('\nEvery source failed — nothing written.')
  process.exit(1)
}

// ── Save ────────────────────────────────────────────────────────────
if (apply) {
  // A source that failed keeps its previous state.
  const nextState = {
    schema_version: 1,
    epa: epa ? epa.index : state.epa,
    pages: Object.fromEntries(pages.map((p) => [p.vehicle, p.error ? state.pages?.[p.vehicle] : { url: p.url, ...p.state }]).filter(([, v]) => v)),
    tripwires: Object.fromEntries(tripwires.map((t) => [t.vehicle, t.error ? state.tripwires?.[t.vehicle] : { url: t.url, ...t.headline }]).filter(([, v]) => v)),
  }
  if (JSON.stringify(nextState) !== JSON.stringify(state)) {
    mkdirSync(dirname(STATE_PATH), { recursive: true })
    writeJson(STATE_PATH, nextState)
  }
  if (epa) {
    const nextProvenance = { ...provenance, fields: updateRangeProvenance(provenance.fields, epa.rows, today) }
    if (JSON.stringify(nextProvenance) !== JSON.stringify(provenance)) writeJson(PROVENANCE_PATH, nextProvenance)
  }
  console.error('\nState saved.')
} else {
  console.error('\nDry run — nothing written. Re-run with --apply to save state.')
}
