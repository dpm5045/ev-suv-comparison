import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parsePriceTrends } from '../lib/cargurus.mjs'
import { planPreowned, applyRowChanges, scaleRange, parseRange } from '../lib/preowned-plan.mjs'

const fixture = readFileSync(new URL('./fixtures/cargurus-ev9-table.html', import.meta.url), 'utf-8')
const URL_EV9 = 'https://www.cargurus.com/research/price-trends/Kia-EV9-d3322'

const row = (year, trim, range) => ({ id: `kia-ev9-${year}-${trim.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, name: `Kia EV9, ${year}, ${trim}`, vehicle: 'Kia EV9', year, trim, preowned_range: range })
const makeData = () => ({
  last_updated: '2026-01-01',
  details: [
    row(2024, 'Light RWD', '$30,000 - $35,000'),
    row(2024, 'GT-Line', '$40,000 - $46,000'),
    row(2025, 'Wind', '$38,000 - $44,000'),
    row(2027, 'Wind', 'No meaningful used market yet'),
  ],
  preowned: [
    { name: 'Kia EV9, 2024, Light RWD', preowned_range: '$30,000 - $35,000' },
    { name: 'Kia EV9, 2027, Wind', preowned_range: 'No meaningful used market yet' },
  ],
})
const obs = (years, model = { label: 'EV9', avgPrice: 40000, pct30: -1 }) => ({
  'Kia EV9': { url: URL_EV9, parsed: { model, years } },
})
const baseline = (years) => ({ 'Kia EV9': { source_url: URL_EV9, years } })
const b = (avg, basis = 'model_year') => ({ basis, avg_price: avg, as_of: '2026-10-01', last_repriced: null, last_move_pct: null })
const state = (plan, year) => plan.decisions.find((d) => d.year === year).state

test('parses the saved CarGurus table', () => {
  const p = parsePriceTrends(fixture)
  assert.deepEqual(p.model, { label: 'EV9', avgPrice: 41711, pct30: -1.42 })
  assert.deepEqual(Object.keys(p.years), ['2024', '2026'])
  assert.deepEqual(p.years['2024'], { label: '2024 EV9', avgPrice: 41280, pct30: -1.58 })
})

test('parser fails closed on a missing or reshaped table', () => {
  assert.throws(() => parsePriceTrends('<html><body>Access denied</body></html>'), /table not found/)
  assert.throws(() => parsePriceTrends(fixture.replace('Avg Price', 'Price').replace('Avg Price', 'Price')), /unexpected.*header/)
  assert.throws(() => parsePriceTrends(fixture.replace('$41,280', 'n/a')), /unparseable average price/)
})

test('range helpers', () => {
  assert.deepEqual(parseRange('$30,000 - $35,000'), [30000, 35000])
  assert.equal(parseRange('No meaningful used market yet'), null)
  assert.equal(scaleRange('$47,000 - $58,000', 0.95), '$45,000 - $55,000')
  assert.equal(scaleRange('$99,000 - $104,000', 1.04), '$103,000 - $108,000')
})

test('first run records baselines and changes nothing', () => {
  const plan = planPreowned({ data: makeData(), baselines: {}, observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: -1.58 } }), today: '2026-11-15' })
  assert.equal(plan.rowChanges.length, 0)
  assert.equal(state(plan, 2024), 'baseline_set')
  assert.equal(plan.baselines['Kia EV9'].years['2024'].avg_price, 41280)
  assert.equal(plan.baselines['Kia EV9'].years['2025'].basis, 'model') // no 2025 row -> model-wide
  assert.equal(plan.decisions.some((d) => d.year === 2027), false) // unpriced rows are ignored
})

test('a move under 3% changes nothing and keeps the old baseline', () => {
  const baselines = baseline({ 2024: b(42000), 2025: b(40000, 'model') })
  const plan = planPreowned({ data: makeData(), baselines, observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' })
  assert.equal(state(plan, 2024), 'no_change')
  assert.equal(plan.rowChanges.length, 0)
  assert.deepEqual(plan.baselines, baselines)
})

test('a move of 3% or more reprices every row in the group and resets the baseline', () => {
  const data = makeData()
  const plan = planPreowned({ data, baselines: baseline({ 2024: b(43000), 2025: b(40000, 'model') }), observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' })
  assert.equal(state(plan, 2024), 'repriced')
  assert.equal(state(plan, 2025), 'no_change')
  assert.deepEqual(plan.rowChanges.map((c) => c.new), ['$29,000 - $34,000', '$38,000 - $44,000'])
  assert.deepEqual(plan.baselines['Kia EV9'].years['2024'], { basis: 'model_year', avg_price: 41280, as_of: '2026-11-15', last_repriced: '2026-11-15', last_move_pct: -4 })

  const out = applyRowChanges(data, plan.rowChanges, '2026-11-15')
  assert.equal(out.details[0].preowned_range, '$29,000 - $34,000')
  assert.equal(out.preowned[0].preowned_range, '$29,000 - $34,000') // stays in sync
  assert.equal(out.details[2].preowned_range, '$38,000 - $44,000') // 2025 untouched
  assert.equal(out.last_updated, '2026-11-15')
  assert.equal(data.details[0].preowned_range, '$30,000 - $35,000') // input not mutated
})

test('re-running after a reprice proposes nothing', () => {
  const data = makeData()
  const observations = obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } })
  const first = planPreowned({ data, baselines: baseline({ 2024: b(43000), 2025: b(40000, 'model') }), observations, today: '2026-11-15' })
  const second = planPreowned({ data: applyRowChanges(data, first.rowChanges, '2026-11-15'), baselines: first.baselines, observations, today: '2026-11-16' })
  assert.equal(second.rowChanges.length, 0)
  assert.deepEqual(second.baselines, first.baselines)
})

test('a move over 15% is held for review, not applied', () => {
  const baselines = baseline({ 2024: b(60000), 2025: b(40000, 'model') })
  const plan = planPreowned({ data: makeData(), baselines, observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' })
  assert.equal(state(plan, 2024), 'needs_review')
  assert.equal(plan.rowChanges.length, 0)
  assert.deepEqual(plan.baselines, baselines)

  // Once someone has checked it, the same move can be let through for that group only.
  const allowed = planPreowned({ data: makeData(), baselines, observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15', allowLarge: ['Kia EV9|2024'] })
  assert.equal(state(allowed, 2024), 'repriced')
  assert.ok(allowed.rowChanges.length > 0)
  assert.equal(allowed.baselines['Kia EV9'].years['2024'].avg_price, 41280)
})

test('a failed source changes nothing', () => {
  const baselines = baseline({ 2024: b(60000), 2025: b(60000, 'model') })
  const plan = planPreowned({ data: makeData(), baselines, observations: { 'Kia EV9': { url: URL_EV9, error: 'HTTP 403' } }, today: '2026-11-15' })
  assert.deepEqual(plan.decisions.map((d) => d.state), ['source_unavailable', 'source_unavailable'])
  assert.equal(plan.rowChanges.length, 0)
  assert.deepEqual(plan.baselines, baselines)
})

test('switching between model-year and model-wide figures restarts the baseline', () => {
  const plan = planPreowned({ data: makeData(), baselines: baseline({ 2024: b(60000, 'model'), 2025: b(40000, 'model') }), observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' })
  assert.equal(state(plan, 2024), 'baseline_set')
  assert.equal(plan.rowChanges.length, 0)
})

test('an implausible average is rejected', () => {
  const plan = planPreowned({ data: makeData(), baselines: {}, observations: obs({ 2024: { label: '2024 EV9', avgPrice: 412, pct30: 0 } }), today: '2026-11-15' })
  assert.equal(state(plan, 2024), 'rejected')
  assert.equal(plan.baselines['Kia EV9']?.years?.['2024'], undefined)
})

test('rows that share a name but hold different ranges are each repriced', () => {
  const data = makeData()
  data.details.push(row(2024, 'Light RWD', '$50,000 - $60,000')) // same name as details[0]
  const plan = planPreowned({ data, baselines: baseline({ 2024: b(43000), 2025: b(40000, 'model') }), observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' })
  const out = applyRowChanges(data, plan.rowChanges, '2026-11-15')
  assert.equal(out.details[0].preowned_range, '$29,000 - $34,000')
  assert.equal(out.details.at(-1).preowned_range, '$48,000 - $58,000')
})

test('a reprice writes a source record for every priced row of the group, changed or not', () => {
  const data = makeData()
  const plan = planPreowned({ data, baselines: baseline({ 2024: b(43000), 2025: b(40000, 'model') }), observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' })
  const ids = data.details.filter((r) => r.year === 2024).map((r) => r.id)
  assert.deepEqual(plan.records.map((x) => x.id), ids)
  for (const { id, record } of plan.records) {
    assert.deepEqual(record, {
      source_url: URL_EV9, verified_on: '2026-11-15', evidence: '2024 EV9: $41,280',
      value: plan.rowChanges.find((c) => c.id === id)?.new ?? data.details.find((r) => r.id === id).preowned_range,
      method: 'derived', method_version: 1, derivation: 'cargurus_scaled',
      vehicle: 'Kia EV9', year: 2024, basis: 'model_year', prev_avg: 43000, new_avg: 41280,
    })
  }
  // No reprice, no records
  assert.deepEqual(planPreowned({ data, baselines: baseline({ 2024: b(41280) }), observations: obs({ 2024: { label: '2024 EV9', avgPrice: 41280, pct30: 0 } }), today: '2026-11-15' }).records, [])
})

test('a changed CarGurus page restarts the baselines instead of repricing across pages', () => {
  const data = makeData()
  const NEW = 'https://www.cargurus.com/research/price-trends/Kia-EV9-new'
  // 2025 has a baseline from the old page but no row on the new one: it must not survive
  const plan = planPreowned({ data, baselines: baseline({ 2024: b(43000), 2025: b(40000) }), observations: { 'Kia EV9': { url: NEW, parsed: { model: null, years: { 2024: { label: '2024 EV9', avgPrice: 35000, pct30: 0 } } } } }, today: '2026-11-15' })
  assert.equal(state(plan, 2024), 'baseline_set')
  assert.deepEqual(plan.rowChanges, [])
  assert.deepEqual(plan.records, [])
  assert.equal(plan.baselines['Kia EV9'].source_url, NEW)
  assert.equal(plan.baselines['Kia EV9'].years['2024'].avg_price, 35000)
  assert.deepEqual(Object.keys(plan.baselines['Kia EV9'].years), ['2024'])
})
