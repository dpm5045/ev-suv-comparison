#!/usr/bin/env node
/**
 * Pre-owned pricing refresh — deterministic, no LLM.
 *
 *   node scripts/refresh/preowned.mjs                  # dry run: fetch, report, write nothing
 *   node scripts/refresh/preowned.mjs --apply          # write lib/ev-data.json + provenance
 *   node scripts/refresh/preowned.mjs --report out.md  # also save the Markdown report
 *   node scripts/refresh/preowned.mjs --save-snapshots dir   # keep the fetched HTML
 *   node scripts/refresh/preowned.mjs --from-snapshots dir   # replay offline
 *   node scripts/refresh/preowned.mjs --attention out.md     # moves held for review, as a list
 *   node scripts/refresh/preowned.mjs --apply --allow-large "Kia EV9|2024"
 *        # apply a move over the 15% guard after checking it is real (comma-separate several)
 *
 * Exit code 1 if every source failed (e.g. blocked), so a scheduler shows it.
 * A failed source never changes or removes a stored value. A page that has
 * also failed on an earlier run goes on the --attention list; with --apply,
 * scripts/refresh/state/preowned.json records since when each page has failed.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsePriceTrends } from './lib/cargurus.mjs'
import { planPreowned, applyRowChanges, renderReport, MAX_MOVE } from './lib/preowned-plan.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DATA_PATH = join(ROOT, 'lib/ev-data.json')
const PROVENANCE_PATH = join(ROOT, 'lib/ev-data.provenance.json')
const SOURCES_PATH = join(ROOT, 'scripts/refresh/sources.json')
const STATE_PATH = join(ROOT, 'scripts/refresh/state/preowned.json')

const USER_AGENT = 'data-refresh-script/1.0'
const REQUEST_GAP_MS = 2000
const TIMEOUT_MS = 30000

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)

const apply = flag('--apply')
const reportPath = option('--report')
const saveDir = option('--save-snapshots')
const fromDir = option('--from-snapshots')
const today = option('--today') ?? new Date().toISOString().slice(0, 10)
const attentionPath = option('--attention')
const allowLarge = (option('--allow-large') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

const readJson = (p) => JSON.parse(readFileSync(p, 'utf-8'))
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n')
const snapshotName = (vehicle) => vehicle.replace(/[^A-Za-z0-9]+/g, '-') + '.html'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function assertAllowed(url) {
  const u = new URL(url)
  if (u.protocol !== 'https:' || u.hostname !== 'www.cargurus.com') {
    throw new Error(`URL not on the allowlist: ${url}`)
  }
}

async function fetchPage(url) {
  assertAllowed(url)
  let lastError
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      assertAllowed(res.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.text()
    } catch (e) {
      lastError = e
      if (attempt < 2) await sleep(5000)
    }
  }
  throw lastError
}

const data = readJson(DATA_PATH)

// Refuse data whose schema this code doesn't accept (build spec E.3)
const COMPAT = readJson(join(ROOT, 'scripts/refresh/compat.json'))
if (!COMPAT.accepts_schema.includes(data.schema_version)) {
  console.error(`lib/ev-data.json has schema_version ${data.schema_version}; this code accepts ${JSON.stringify(COMPAT.accepts_schema)}. Not running.`)
  process.exit(1)
}
const provenance = existsSync(PROVENANCE_PATH) ? readJson(PROVENANCE_PATH) : { schema_version: 1, preowned: {}, fields: {} }
const sources = readJson(SOURCES_PATH).cargurus_price_trends
const state = existsSync(STATE_PATH) ? readJson(STATE_PATH) : { schema_version: 1, unavailable: {} }

if (saveDir) mkdirSync(saveDir, { recursive: true })

const observations = {}
let first = true
for (const [vehicle, url] of Object.entries(sources)) {
  try {
    let html
    if (fromDir) {
      html = readFileSync(join(fromDir, snapshotName(vehicle)), 'utf-8')
    } else {
      if (!first) await sleep(REQUEST_GAP_MS)
      first = false
      html = await fetchPage(url)
      if (saveDir) writeFileSync(join(saveDir, snapshotName(vehicle)), html)
    }
    observations[vehicle] = { url, parsed: parsePriceTrends(html) }
  } catch (e) {
    observations[vehicle] = { url, error: e.message }
  }
}

// A page that fails once is a blip; one that has failed since an earlier run is not.
const unavailable = {}
for (const [vehicle, o] of Object.entries(observations)) {
  if (o.error) unavailable[vehicle] = state.unavailable?.[vehicle] ?? today
}
const persistent = Object.entries(unavailable).filter(([, since]) => since < today)

const plan = planPreowned({ data, baselines: provenance.preowned, observations, today, allowLarge })
const report = renderReport({ ...plan, today, mode: apply ? 'apply' : 'dry run' })
process.stdout.write(report)
if (reportPath) writeFileSync(reportPath, report)
if (attentionPath) {
  // Stable wording (no prices) so an item can be deferred in scripts/refresh/state/deferred.json.
  const held = plan.decisions.filter((d) => d.state === 'needs_review')
  const lines = [
    ...held.map((d) => `- Pre-owned ${d.vehicle} ${d.year}: CarGurus average moved more than ${MAX_MOVE * 100}% since the last reprice; not applied (${d.url})`),
    ...persistent.map(([vehicle, since]) => `- CarGurus price trends for ${vehicle} have failed since ${since} (${sources[vehicle]})`),
  ]
  writeFileSync(attentionPath, lines.join('\n') + (lines.length ? '\n' : ''))
}

const failed = Object.values(observations).filter((o) => o.error).length
if (failed === Object.keys(observations).length) {
  console.error('\nEvery source failed — nothing written.')
  process.exit(1)
}

if (apply) {
  const nextData = applyRowChanges(data, plan.rowChanges, today)
  if (nextData !== data) writeJson(DATA_PATH, nextData)
  // The baselines, plus a source record for every row of each repriced group (the data contract checks them)
  const fields = structuredClone(provenance.fields ?? {})
  for (const { id, record } of plan.records) (fields[id] ??= {}).preowned_range = record
  const nextProvenance = { ...provenance, preowned: plan.baselines, fields }
  if (JSON.stringify(nextProvenance) !== JSON.stringify(provenance)) writeJson(PROVENANCE_PATH, nextProvenance)
  const nextState = { schema_version: 1, unavailable }
  const unchanged = JSON.stringify(nextState) === JSON.stringify({ schema_version: 1, unavailable: state.unavailable ?? {} })
  if (!unchanged && (existsSync(STATE_PATH) || Object.keys(unavailable).length)) {
    mkdirSync(dirname(STATE_PATH), { recursive: true })
    writeJson(STATE_PATH, nextState)
  }
  console.error(`\nApplied: ${plan.rowChanges.length} row change(s).`)
} else {
  console.error('\nDry run — nothing written. Re-run with --apply to write.')
}
