#!/usr/bin/env node
/**
 * WP-F step 3: fix the data the contract's known-violations baseline lists, so
 * the baseline empties (docs/plans/wp-f-data-contract.md, "Step 3").
 *
 *   node scripts/migrations/2026-11-wpf-step3-data-fixes.mjs
 *
 * 1. One phrasing for "no used market": every variant becomes "No used market yet".
 * 2. TBD estimates leave the numeric fields (they hold exactly "TBD"): the Mercedes GLB
 *    Electric range (~315), BMW iX7 range/hp/battery and Faraday FX Super One hp estimates
 *    are WITHDRAWN (flagged for owner review). None had a source record, and the BMW ones
 *    contradicted the row's own notes (notes: ~120 kWh, ~350 mi; fields: ~150+ kWh,
 *    ~350-400 mi). Showing "TBD" until the maker publishes figures is more honest than
 *    keeping an unsourced guess; a sourced figure can come back through a normal PR.
 * 3. Third row: on 5-seat rows, legroom and headroom become "N/A" (no third row).
 * 4. 6-seat Model X (2021-22): third-row cargo "N/A" becomes null: the row has a
 *    third row, the figure is missing (protected field; flagged for owner review).
 * 5. Maybach EQS 680 SUV (2024-26): seats 7 -> 5, each year sourced on its own model-year page:
 *    2026 mbusa.com ("Passenger capacity 5 (4 optional)"), 2024 and 2025 kbb.com
 *    ("Max Seating Capacity 5"); protected, flagged for owner review.
 * 6. The parallel `preowned` table is removed (no page reads it; each row keeps preowned_range).
 * 7. The known-violations baseline is emptied, and last_updated bumped.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const P = (p) => join(ROOT, p)
const readJson = (p) => JSON.parse(readFileSync(P(p), 'utf8'))
const writeJson = (p, v) => writeFileSync(P(p), JSON.stringify(v, null, 2) + '\n')
const TODAY = '2026-11-19'
const NO_MARKET = 'No used market yet'

const data = readJson('lib/ev-data.json')
const prov = readJson('lib/ev-data.provenance.json')
if (!data.preowned) throw new Error('already applied (no preowned table); refusing to run twice')
const byId = new Map(data.details.map((r) => [r.id, r]))
const log = []

// 1. No-market phrasings
for (const r of data.details) {
  if (typeof r.preowned_range === 'string' && !r.preowned_range.startsWith('$') && r.preowned_range !== NO_MARKET) {
    log.push(`${r.id}: preowned_range ${JSON.stringify(r.preowned_range)} -> ${JSON.stringify(NO_MARKET)}`)
    r.preowned_range = NO_MARKET
  }
}

// 2. TBD estimates: withdrawn (unsourced; see the header)
for (const [id, fields] of [
  ['mercedes-benz-glb-electric-2027-glb-250-plus-expected', ['range_mi']],
  ['mercedes-benz-glb-electric-2027-glb-350-4matic-expected', ['range_mi']],
  ['bmw-ix7-2027-xdrive50-expected', ['range_mi', 'hp', 'battery_kwh']],
  ['bmw-ix7-2027-m70-expected', ['range_mi', 'hp', 'battery_kwh']],
  ['faraday-future-fx-super-one-2027-base-expected', ['hp']],
]) {
  const r = byId.get(id)
  for (const f of fields) {
    if (!/^TBD \(.+\)$/.test(r[f])) throw new Error(`${id}: unexpected ${f} ${r[f]}`)
    log.push(`${id}: ${f} ${r[f]} -> "TBD" (unsourced estimate withdrawn)`)
    r[f] = 'TBD'
  }
}

// 3. 5-seat rows: no third row
for (const r of data.details) {
  if (r.seats <= 5) for (const f of ['cargo_behind_3rd_cu_ft', 'third_row_legroom_in', 'third_row_headroom_in']) {
    if (r[f] !== 'N/A') { log.push(`${r.id}: ${f} ${JSON.stringify(r[f])} -> "N/A" (5-seat, no third row)`); r[f] = 'N/A' }
  }
}

// 4. 6-seat Model X third-row cargo: missing, not "not applicable"
for (const id of ['tesla-model-x-2021-long-range-plus-6s', 'tesla-model-x-2021-plaid-6s', 'tesla-model-x-2022-base-6s', 'tesla-model-x-2022-plaid']) {
  const r = byId.get(id)
  if (r.seats !== 6 || r.cargo_behind_3rd_cu_ft !== 'N/A') throw new Error(`${id}: unexpected seats ${r.seats} / cargo ${r.cargo_behind_3rd_cu_ft}`)
  r.cargo_behind_3rd_cu_ft = null
  log.push(`${id}: cargo_behind_3rd_cu_ft "N/A" -> null (6-seat: has a third row; figure missing)`)
}

// 5. Maybach EQS 680 SUV: 5 seats (4 optional), two rows
const MAYBACH_URL = 'https://www.mbusa.com/en/vehicles/model/eqs/suv/eqs680z4'
for (const id of ['mercedes-benz-eqs-suv-2024-maybach-eqs-680-4matic', 'mercedes-benz-eqs-suv-2025-maybach-eqs-680-4matic', 'mercedes-benz-eqs-suv-2026-maybach-eqs-680-4matic']) {
  const r = byId.get(id)
  if (r.seats !== 7) throw new Error(`${id}: unexpected seats ${r.seats}`)
  r.seats = 5
  const year = r.year
  ;(prov.fields[id] ??= {}).seats = {
    source_url: year === 2026 ? MAYBACH_URL : `https://www.kbb.com/mercedes-benz/mercedes-maybach-eqs-suv/${year}/eqs-680-4matic-sport-utility-4d/`,
    verified_on: TODAY,
    evidence: year === 2026 ? 'Interior Dimensions: Passenger capacity 5 (4 optional)' : 'Max Seating Capacity 5',
    value: 5,
    method: 'observed',
    method_version: 1,
  }
  log.push(`${id}: seats 7 -> 5 (${year === 2026 ? 'mbusa.com' : 'kbb.com'})`)
}

// 6. Remove the parallel preowned table
log.push(`preowned table removed (${data.preowned.length} entries)`)
delete data.preowned

data.last_updated = TODAY
writeJson('lib/ev-data.json', data)
writeJson('lib/ev-data.provenance.json', prov)

// 7. Empty the baseline (the contract fails if any listed violation still exists, or a new one does)
const kv = readJson('scripts/schema/known-violations.json')
log.push(`known-violations baseline: ${kv.violations.length} -> 0`)
kv.violations = []
writeJson('scripts/schema/known-violations.json', kv)

console.log(log.join('\n'))
console.log(`\n${log.length} changes`)
