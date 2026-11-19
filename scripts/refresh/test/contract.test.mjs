// The WP-F data contract (validate-diff.mjs + schema), exercised on real data
// in throwaway git repositories. Failures must fail for the named rule;
// sensitive changes must PASS as review items (the owner's merge approves them).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluate, evidenceSupports, renderReport } from '../../validate-diff.mjs'
import { checkState, applyBaseline } from '../../schema/ev-data.schema.mjs'
import { patchSha256 } from '../lib/hashes.mjs'
import { planPreowned, applyRowChanges } from '../lib/preowned-plan.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const FILES = ['lib/ev-data.json', 'lib/ev-data.provenance.json', 'scripts/refresh/accepted.json', 'scripts/refresh/retired-ids.json', 'scripts/schema/known-violations.json', 'scripts/refresh/source-policy.json']
const git = (repo, ...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim()
const read = (repo, p) => JSON.parse(readFileSync(join(repo, p), 'utf8'))
const write = (repo, p, v) => { mkdirSync(dirname(join(repo, p)), { recursive: true }); writeFileSync(join(repo, p), JSON.stringify(v, null, 2) + '\n') }

/** A temp repo with today's data committed as base; mutate() edits files for the head commit. */
function scenario(mutate, { extraFiles = {}, prep } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'contract-'))
  git(repo, 'init', '-q')
  git(repo, 'config', 'user.email', 't@example.com'); git(repo, 'config', 'user.name', 't')
  const baseFiles = Object.fromEntries(FILES.map((f) => [f, JSON.parse(readFileSync(join(ROOT, f), 'utf8'))]))
  if (prep) prep(baseFiles) // shape the base (e.g. bring back data that today's master no longer has)
  for (const [f, v] of Object.entries(baseFiles)) write(repo, f, v)
  git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'base')
  const base = git(repo, 'rev-parse', 'HEAD')
  const files = Object.fromEntries(FILES.map((f) => [f, read(repo, f)]))
  mutate(files)
  for (const [f, v] of Object.entries(files)) {
    if (v === undefined) continue
    write(repo, f, v)
  }
  for (const [f, text] of Object.entries(extraFiles)) { mkdirSync(dirname(join(repo, f)), { recursive: true }); writeFileSync(join(repo, f), text) }
  git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'head', '--allow-empty')
  const head = git(repo, 'rev-parse', 'HEAD')
  return { repo, base, head, done: () => rmSync(repo, { recursive: true, force: true }) }
}
const run = (mutate, opts = {}) => {
  const s = scenario(mutate, opts)
  try { return { ...evaluate({ repo: s.repo, base: s.base, head: s.head }), base: s.base, head: s.head } } finally { s.done() }
}
const rules = (r) => r.errors.map((e) => e.rule)
const reviewed = (r, id, field) => r.review.some((x) => (id === undefined || x.id === id) && (field === undefined || x.field === field))
const row = (files, id) => files['lib/ev-data.json'].details.find((r) => r.id === id)
const rec = (files, id, field, value, extra = {}) => {
  const p = files['lib/ev-data.provenance.json']
  ;(p.fields[id] ??= {})[field] = { source_url: 'https://www.kia.com/us/en/ev9', verified_on: '2026-11-17', evidence: `Kia lists ${typeof value === 'number' ? value.toLocaleString('en-US') : value}`, value, method: 'observed', method_version: 1, ...extra }
}
const EV9 = 'kia-ev9-2026-gt-line'
const EV9_NEW = 'kia-ev9-2027-gt-line'
const GLB = 'mercedes-benz-glb-electric-2027-glb-250-plus-expected'
const GLB_EST = 'TBD (~315 est)'

/**
 * Base with a parallel preowned table (removed from master in WP-F step 3), in its legacy
 * shape (one entry per display name). Built only from trims whose name belongs to a single
 * id, so seat variants sharing a name never have to be tie-broken.
 */
const withTable = (f) => {
  const d = f['lib/ev-data.json']
  const ids = new Map()
  for (const r of d.details) ids.set(r.name, (ids.get(r.name) ?? 0) + 1)
  d.preowned = d.details.filter((r) => ids.get(r.name) === 1).map((r) => ({ name: r.name, vehicle: r.vehicle, year: r.year, trim: r.trim, preowned_range: r.preowned_range }))
}
/** Base where the GLB still holds its range estimate in range_mi (as before WP-F step 3). */
const withGlbEstimate = (f) => {
  const x = row(f, GLB)
  x.range_mi = GLB_EST
  x.notes = x.notes.replace(` Range: ${GLB_EST}`, '')
  delete f['lib/ev-data.provenance.json'].fields[GLB]?.notes
  f['scripts/schema/known-violations.json'].violations.push(`type|${GLB}|range_mi|${JSON.stringify(GLB_EST)}`)
}
const glbBaseline = (f) => { const kv = f['scripts/schema/known-violations.json']; kv.violations = kv.violations.filter((k) => !k.startsWith(`type|${GLB}|range_mi|`)) }

test('today\'s data passes the full-state contract (known violations are baselined)', () => {
  const j = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
  const { errors } = applyBaseline(checkState({ data: j('lib/ev-data.json'), prov: j('lib/ev-data.provenance.json'), accepted: j('scripts/refresh/accepted.json'), retired: j('scripts/refresh/retired-ids.json') }), j('scripts/schema/known-violations.json'))
  assert.deepEqual(errors, [])
})

test('no change → passes, nothing to judge', () => {
  const r = run(() => {})
  assert.equal(r.dataChanged, false)
  assert.deepEqual(r.errors, [])
})

// ── The audit's six mutations ──
test('audit: a $1 - $2 used price fails', () => {
  assert.ok(rules(run((f) => { row(f, EV9).preowned_range = '$1 - $2' })).includes('preowned-bounds'))
})
test('audit: deleting a preowned table entry is flagged for review', () => {
  const r = run((f) => { f['lib/ev-data.json'].preowned.pop() }, { prep: withTable })
  assert.ok(r.review.some((x) => x.field.startsWith('preowned:')))
})
test('audit: seats 99 is flagged for review and still needs a source', () => {
  const r = run((f) => { row(f, EV9).seats = 99 })
  assert.ok(reviewed(r, EV9, 'seats'))
  assert.ok(rules(r).includes('evidence-missing'))
})
test('audit: removing every provenance evidence string fails', () => {
  const r = run((f) => { for (const fields of Object.values(f['lib/ev-data.provenance.json'].fields)) for (const x of Object.values(fields)) delete x.evidence })
  assert.ok(rules(r).includes('legacy-edited'))
})
test('audit: msrp "banana" fails', () => {
  assert.ok(rules(run((f) => { row(f, EV9).msrp = 'banana' })).includes('type'))
})
test('audit: stored computed fields fail', () => {
  const r = run((f) => { row(f, EV9).preowned_low = 1; row(f, EV9).self_driving_rank = 4 })
  assert.equal(rules(r).filter((x) => x === 'computed-stored').length, 2)
})

// ── Sources (hard failures) ──
test('an unsourced msrp change fails', () => {
  assert.ok(rules(run((f) => { row(f, EV9).msrp += 1000 })).includes('evidence-missing'))
})
test('an unsourced horsepower edit fails', () => {
  assert.ok(rules(run((f) => { row(f, EV9).hp = 400 })).includes('evidence-missing'))
})
test('a sourced price change from the maker passes with nothing to review', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp) })
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.review, [])
})
test('a record whose value differs from the stored value fails', () => {
  assert.ok(rules(run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp - 1) })).includes('evidence-value'))
})
test('evidence that does not contain the value fails', () => {
  assert.ok(rules(run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp, { evidence: 'Kia lists a new price' }) })).includes('evidence-quote'))
})
test('a disallowed source domain fails', () => {
  assert.ok(rules(run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp, { source_url: 'https://www.edmunds.com/kia/ev9/' }) })).includes('evidence-domain'))
})
test('a manufacturer estimate from a publication that does not quote the maker fails', () => {
  const id = 'lexus-tz-2027-luxury-awd'
  assert.ok(rules(run((f) => { row(f, id).range_mi = 320; rec(f, id, 'range_mi', 320, { source_url: 'https://insideevs.com/news/x', evidence: 'An estimated 320 miles' }) })).includes('evidence-estimate'))
})
test('a URL-only edit of a legacy record fails', () => {
  const r = run((f) => { const [, fields] = Object.entries(f['lib/ev-data.provenance.json'].fields)[0]; fields[Object.keys(fields)[0]].source_url = 'https://example.com/other' })
  assert.ok(rules(r).includes('legacy-edited'))
})
test('deleting a provenance record fails', () => {
  const r = run((f) => { const [, fields] = Object.entries(f['lib/ev-data.provenance.json'].fields)[0]; delete fields[Object.keys(fields)[0]] })
  assert.ok(rules(r).includes('prov-deleted'))
})
test('a source-only edit is checked too: an off-policy URL on an unchanged spec fails', () => {
  assert.ok(rules(run((f) => { rec(f, EV9, 'msrp', row(f, EV9).msrp, { source_url: 'https://www.example.com/kia' }) })).includes('evidence-domain'))
})
test('a new legacy-marked record is rejected', () => {
  const r = run((f) => { f['lib/ev-data.provenance.json'].fields[EV9] = { ...(f['lib/ev-data.provenance.json'].fields[EV9] ?? {}), hp: { source_url: 'https://www.kia.com/x', verified_on: '2026-11-17', evidence: 'x', legacy: 'name_keyed' } } })
  assert.ok(rules(r).includes('legacy-added'))
})
test('clearing a required spec fails', () => {
  assert.ok(run((f) => { row(f, EV9).charging_type = '' }).errors.some((e) => e.rule === 'type' && e.field === 'charging_type'))
})
test('relabelling a range as a manufacturer estimate needs a quoted record', () => {
  const r = run((f) => { row(f, EV9).range_basis = 'manufacturer_estimate'; f['scripts/refresh/accepted.json'].range_mi[EV9] = 'Kia estimate' })
  assert.ok(r.errors.some((e) => ['evidence-missing', 'evidence-stale'].includes(e.rule) && e.field === 'range_mi'))
})
test('a Tesla msrp derived from Car and Driver\'s inclusive price passes; a wrong subtraction fails', () => {
  const id = 'tesla-model-y-l-2026-launch-series'
  const ok = run((f) => {
    const x = row(f, id); x.msrp += 500
    rec(f, id, 'destination', x.destination, { source_url: 'https://www.caranddriver.com/tesla/model-y/specs', evidence: `Destination charge $${x.destination.toLocaleString('en-US')}` })
    rec(f, id, 'msrp', x.msrp, { source_url: 'https://www.caranddriver.com/tesla/model-y/specs/2026/x', method: 'derived', derivation: 'quoted_total_minus_destination', quoted_total: x.msrp + x.destination, evidence: `MSRP $${(x.msrp + x.destination).toLocaleString('en-US')}` })
  })
  assert.deepEqual(ok.errors.filter((e) => e.field === 'msrp'), [])
  const bad = run((f) => {
    const x = row(f, id); x.msrp += 500
    rec(f, id, 'msrp', x.msrp, { source_url: 'https://www.caranddriver.com/tesla/model-y/specs/2026/x', method: 'derived', derivation: 'quoted_total_minus_destination', quoted_total: x.msrp, evidence: `MSRP $${x.msrp.toLocaleString('en-US')}` })
  })
  assert.ok(bad.errors.some((e) => e.rule === 'evidence-derived'))
})

// ── Sensitive changes: review items (pass), with real values ──
test('a protected cargo change with a source passes as a review item', () => {
  const r = run((f) => { row(f, EV9).cargo_behind_3rd_cu_ft = 25; rec(f, EV9, 'cargo_behind_3rd_cu_ft', 25) })
  assert.deepEqual(r.errors, [])
  const item = r.review.find((x) => x.id === EV9 && x.field === 'cargo_behind_3rd_cu_ft')
  assert.deepEqual([item.old, item.new], [20.2, 25].map((v, i) => (i === 0 ? row({ 'lib/ev-data.json': JSON.parse(readFileSync(join(ROOT, 'lib/ev-data.json'), 'utf8')) }, EV9).cargo_behind_3rd_cu_ft : v)))
})
test('a protected change without a source still fails', () => {
  assert.ok(rules(run((f) => { row(f, EV9).cargo_behind_3rd_cu_ft = 25 })).includes('evidence-missing'))
})
test('"Allow-Protected" in a note authorizes nothing: still a review item, still needs a source', () => {
  const r = run((f) => { const x = row(f, EV9); x.seats = 7; x.notes += ' Allow-Protected: seats' })
  assert.ok(reviewed(r, EV9, 'seats'))
  assert.ok(rules(r).includes('evidence-missing'))
})
test('an availability change is a review item, not a failure', () => {
  const r = run((f) => { const x = row(f, EV9_NEW); assert.equal(x.availability, 'new'); x.availability = 'used_only'; x.msrp_status = 'historical' })
  assert.deepEqual(r.errors, [])
  assert.ok(reviewed(r, EV9_NEW, 'availability'))
})
test('an identity change is a review item and the published field still needs a source', () => {
  const r = run((f) => { row(f, EV9).drivetrain = 'RWD' })
  assert.ok(reviewed(r, EV9, '@identity'))
  assert.ok(r.errors.some((e) => e.rule === 'evidence-missing' && e.field === 'drivetrain'))
})
test('removing a row is a review item and needs a retired-ids entry', () => {
  const r = run((f) => { f['lib/ev-data.json'].details = f['lib/ev-data.json'].details.filter((x) => x.id !== EV9) })
  assert.ok(reviewed(r, EV9, '@remove'))
  assert.ok(rules(r).includes('remove-not-retired'))
})
test('a retired id can never come back', () => {
  const r = run((f) => { f['scripts/refresh/retired-ids.json'].ids.push({ id: EV9, retired_on: '2026-11-17' }) })
  assert.ok(rules(r).includes('retire-without-remove') || rules(r).includes('id-retired'))
})
test('a new row lists its protected values for review, and every published value needs a source', () => {
  const r = run((f) => { const x = structuredClone(row(f, EV9)); x.id = 'kia-ev9-2026-new-trim'; x.trim = 'New Trim'; x.name = 'Kia EV9, 2026, New Trim'; f['lib/ev-data.json'].details.push(x) })
  for (const fld of ['@add', 'seats', 'cargo_behind_3rd_cu_ft', 'fold_flat']) assert.ok(reviewed(r, 'kia-ev9-2026-new-trim', fld), fld)
  assert.ok(r.errors.filter((e) => e.rule === 'evidence-missing').length > 10)
})
test('withdrawing a value (to null) is a review item; a sourced record can go with it', () => {
  const id = EV9_NEW
  const s = scenario((f) => { rec(f, id, 'battery_kwh', row(f, id).battery_kwh) })
  try {
    const p = (x) => JSON.parse(readFileSync(join(s.repo, x), 'utf8'))
    const data = p('lib/ev-data.json'); const prov = p('lib/ev-data.provenance.json')
    data.details.find((x) => x.id === id).battery_kwh = null
    delete prov.fields[id].battery_kwh
    write(s.repo, 'lib/ev-data.json', data); write(s.repo, 'lib/ev-data.provenance.json', prov)
    git(s.repo, 'add', '-A'); git(s.repo, 'commit', '-qm', 'withdraw')
    const r = evaluate({ repo: s.repo, base: s.head, head: git(s.repo, 'rev-parse', 'HEAD') })
    assert.deepEqual(r.errors, [])
    assert.ok(reviewed(r, id, 'battery_kwh'))
  } finally { s.done() }
})
test('normalizing a no-market phrasing to "No used market yet" is a review item, not an evidence demand', () => {
  const id = 'kia-ev9-2027-light'
  const OLD = 'No meaningful used market yet'
  const r = run((f) => {
    row(f, id).preowned_range = 'No used market yet'
    const kv = f['scripts/schema/known-violations.json']
    kv.violations = kv.violations.filter((k) => k !== `preowned-format|${id}|preowned_range|${JSON.stringify(OLD)}`)
  }, { prep: (f) => { row(f, id).preowned_range = OLD; f['scripts/schema/known-violations.json'].violations.push(`preowned-format|${id}|preowned_range|${JSON.stringify(OLD)}`) } })
  assert.deepEqual(r.errors, [])
  assert.ok(reviewed(r, id, 'preowned_range'))
})
test('moving a TBD estimate into notes passes end to end (withdrawal flagged for review)', () => {
  const r = run((f) => {
    const x = row(f, GLB)
    x.range_mi = 'TBD'
    x.notes = `${x.notes}${x.notes ? ' ' : ''}Range: ${GLB_EST}`
    rec(f, GLB, 'notes', x.notes, { method: 'moved', moved_from: 'range_mi', source_url: f['lib/ev-data.provenance.json'].fields[GLB]?.range_mi?.source_url ?? 'https://www.mbusa.com/en/future-vehicles' })
    glbBaseline(f)
  }, { prep: withGlbEstimate })
  assert.deepEqual(r.errors, [])
  assert.ok(reviewed(r, GLB, 'range_mi'))
})
test('removing the whole preowned table is one review item', () => {
  const r = run((f) => { delete f['lib/ev-data.json'].preowned }, { prep: withTable })
  assert.deepEqual(r.errors, [])
  assert.ok(reviewed(r, '-', 'preowned'))
})
test('top-level changes show the actual entries that changed', () => {
  const r = run((f) => { f['lib/ev-data.json'].assumptions[0].value = 'CHANGED' })
  const item = r.review.find((x) => x.field === 'assumptions[0]')
  assert.ok(item)
  assert.equal(item.new.value, 'CHANGED')
  assert.notEqual(item.old.value, 'CHANGED')
})
test('pre-owned baselines are validated; an average moved on its own is shown for review', () => {
  const bad = run((f) => { const p = f['lib/ev-data.provenance.json'].preowned; const v = Object.keys(p)[0]; const y = Object.keys(p[v].years)[0]; p[v].years[y].avg_price = -5 })
  assert.ok(rules(bad).includes('prov-baseline'))
  const ok = run((f) => { f['lib/ev-data.provenance.json'].preowned['Kia EV9'].years['2024'].avg_price += 100 })
  assert.deepEqual(ok.errors, [])
  assert.ok(ok.review.some((x) => x.field === 'preowned baseline Kia EV9.years.2024.avg_price' && x.old === 41280 && x.new === 41380))
})

// ── Repricing (docs/plans/resume-publishing.md §3): the producer's own output must pass ──
const CG = 'https://www.cargurus.com/research/price-trends/Kia-EV9-d3322'
/** Run the real producer logic on the head files, as scripts/refresh/preowned.mjs --apply does. */
const reprice = (f, avgByYear, { allowLarge = [], url = CG } = {}) => {
  const years = Object.fromEntries(Object.entries(avgByYear).map(([y, avg]) => [y, { label: `${y} Kia EV9`, avgPrice: avg, pct30: null }]))
  const prov = f['lib/ev-data.provenance.json']
  const plan = planPreowned({ data: f['lib/ev-data.json'], baselines: prov.preowned, observations: { 'Kia EV9': { url, parsed: { model: null, years } } }, today: '2026-11-23', allowLarge })
  f['lib/ev-data.json'] = applyRowChanges(f['lib/ev-data.json'], plan.rowChanges, '2026-11-23')
  prov.preowned = plan.baselines
  for (const { id, record } of plan.records) (prov.fields[id] ??= {}).preowned_range = record
  return plan
}
const EV9_2024 = (f) => f['lib/ev-data.json'].details.filter((r) => r.vehicle === 'Kia EV9' && r.year === 2024)
const firstRec = (f) => f['lib/ev-data.provenance.json'].fields[EV9_2024(f)[0].id].preowned_range

test('a weekly repricing by the producer passes with no review items (it can merge itself)', () => {
  let plan
  const r = run((f) => { plan = reprice(f, { 2024: 39216 }) }) // -5%
  assert.ok(plan.rowChanges.length > 0)
  assert.deepEqual(r.errors, [])
  assert.deepEqual(r.review, [])
  assert.ok(r.changes.some((c) => c.field === 'preowned_range' && c.source === CG && /39,216/.test(c.quote)))
})
test('a repricing record must match its row, its baseline and the math', () => {
  const cases = {
    'another model year': (f) => { firstRec(f).year = 2025 },
    'another vehicle': (f) => { firstRec(f).vehicle = 'Rivian R1S' },
    'a different page': (f) => { firstRec(f).source_url = 'https://www.cargurus.com/research/price-trends/other' },
    'not CarGurus': (f) => { firstRec(f).source_url = 'https://www.kbb.com/kia/ev9/' },
    'a wrong previous average': (f) => { firstRec(f).prev_avg = 40000 },
    'a basis that differs': (f) => { firstRec(f).basis = 'model' },
    'evidence without the new average': (f) => { firstRec(f).evidence = '2024 Kia EV9: $41,000' },
    'evidence quoting another year\'s row': (f) => { firstRec(f).evidence = '2025 Kia EV9: $39,216' },
    'evidence quoting the model-wide row': (f) => { firstRec(f).evidence = 'Kia EV9: $39,216' },
    'evidence that is not a table row': (f) => { firstRec(f).evidence = 'CarGurus says 2024 Kia EV9 averages $39,216 now' },
    'evidence quoting another model': (f) => { firstRec(f).evidence = '2024 Model X: $39,216' },
    'a range that is not the scaled one': (f) => { const x = EV9_2024(f)[0]; x.preowned_range = '$1,000 - $2,000'; firstRec(f).value = x.preowned_range },
  }
  for (const [name, spoil] of Object.entries(cases)) {
    const r = run((f) => { reprice(f, { 2024: 39216 }); spoil(f) })
    assert.ok(rules(r).includes('evidence-scaled'), `${name}: ${JSON.stringify(r.errors.slice(0, 2))}`)
  }
})
test('a repricing under the 3% threshold is rejected; one over 15% passes only for the owner', () => {
  const small = run((f) => {
    const p = f['lib/ev-data.provenance.json']; p.preowned['Kia EV9'].years['2024'].avg_price = 41500
    for (const x of EV9_2024(f)) (p.fields[x.id] ??= {}).preowned_range = { source_url: CG, verified_on: '2026-11-23', evidence: '2024 Kia EV9: $41,500', value: x.preowned_range, method: 'derived', method_version: 1, derivation: 'cargurus_scaled', vehicle: 'Kia EV9', year: 2024, basis: 'model_year', prev_avg: 41280, new_avg: 41500 }
  })
  assert.ok(rules(small).includes('evidence-scaled'))
  const large = run((f) => { reprice(f, { 2024: 33024 }, { allowLarge: ['Kia EV9|2024'] }) }) // -20%, allowed by the agent
  assert.deepEqual(large.errors, [])
  assert.ok(large.review.some((x) => x.field === 'preowned_range' && /over the 15% automatic limit/.test(x.why)))
})
test('a baseline average moves without review only when every row passed the repricing check', () => {
  // Rows keep their prices with "observed" records that merely carry the repricing fields
  const r = run((f) => {
    const p = f['lib/ev-data.provenance.json']; p.preowned['Kia EV9'].years['2024'].avg_price = 39216
    for (const x of EV9_2024(f)) (p.fields[x.id] ??= {}).preowned_range = { source_url: CG, verified_on: '2026-11-23', evidence: `2024 Kia EV9: ${x.preowned_range}`, value: x.preowned_range, method: 'observed', method_version: 1, derivation: 'cargurus_scaled', vehicle: 'Kia EV9', year: 2024, basis: 'model_year', prev_avg: 41280, new_avg: 39216 }
  })
  assert.ok(r.review.some((x) => x.field === 'preowned baseline Kia EV9.years.2024.avg_price'), JSON.stringify(r.errors.slice(0, 2)))
})
test('a baseline restart (basis change) or a new year is reviewed', () => {
  const basis = run((f) => { reprice(f, { 2025: 45000 }) }) // 2025 was model-wide; a year row restarts the baseline
  assert.deepEqual(basis.errors, [])
  assert.ok(basis.review.some((x) => x.field === 'preowned baseline Kia EV9.years.2025' && /basis changed/.test(x.why)))
  const removed = run((f) => { delete f['lib/ev-data.provenance.json'].preowned['Kia EV9'].years['2024'] })
  assert.ok(removed.review.some((x) => x.field === 'preowned baseline Kia EV9.years.2024' && x.why === 'baseline removed'))
})
test('the report says the PR passed and lists review items, with no forms to fill in', () => {
  const r = run((f) => { row(f, EV9).cargo_behind_3rd_cu_ft = 25; rec(f, EV9, 'cargo_behind_3rd_cu_ft', 25) })
  const md = renderReport(r, { base: r.base, head: r.head })
  assert.match(md, /Passed\. 1 change\(s\) need the owner's review/)
  assert.match(md, /Merging the PR approves them/)
  assert.doesNotMatch(md, /Run workflow|proposal_sha256/)
})

// ── Rules and data never change together ──
test('a PR changing data and the source policy together fails', () => {
  assert.ok(rules(run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp); f['scripts/refresh/source-policy.json'].press.push('example.com') })).includes('gate-and-data'))
})
test('a data PR that edits the validator fails', () => {
  assert.ok(rules(run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp) }, { extraFiles: { 'scripts/validate-diff.mjs': '// loosened\n' } })).includes('gate-and-data'))
})
test('the known-violations list can only shrink', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp); f['scripts/schema/known-violations.json'].violations.push('type|kia-ev9-2026-gt-line|hp|1') })
  assert.ok(rules(r).includes('gate-and-data') || rules(r).includes('baseline-grow'))
})

// ── Tables, counts, baseline ──
test('a count that disagrees with the rows fails', () => {
  const r = run((f) => { const c = f['lib/ev-data.json'].count_data[0]; c.y2026 += 1; c.total += 1; f['lib/ev-data.json'].count_totals.y2026 += 1; f['lib/ev-data.json'].count_totals.total += 1 })
  assert.ok(rules(r).includes('count-rows'))
})
test('a duplicate count row fails, and later years are counted', () => {
  const dup = run((f) => { const d = f['lib/ev-data.json']; d.count_data.push({ ...d.count_data[0] }); for (const k of Object.keys(d.count_totals)) d.count_totals[k] += d.count_data[0][k] ?? 0 })
  assert.ok(dup.errors.some((e) => e.rule === 'count-duplicate'))
  const y2028 = run((f) => { const d = f['lib/ev-data.json']; d.count_data[0].y2028 = 3; d.count_data[0].total += 3; d.count_totals.y2028 = 3; d.count_totals.total += 3 })
  assert.ok(y2028.errors.some((e) => e.rule === 'count-rows' && /y2028/.test(e.field)))
})
test('a baseline exemption covers only the original bad value', () => {
  const id = 'bmw-ix7-2027-xdrive50-expected'
  // Base: the old estimate is baselined; head swaps it for a different bad value
  const prep = (f) => { row(f, id).hp = 'TBD (~570 est)'; f['scripts/schema/known-violations.json'].violations.push(`type|${id}|hp|"TBD (~570 est)"`) }
  assert.ok(run((f) => { row(f, id).hp = 'TBD (~580 est)' }, { prep }).errors.some((e) => e.rule === 'type' && e.id === id && e.field === 'hp'))
})
test('a preowned table entry that matches no details row fails while the table exists', () => {
  const r = run((f) => { f['lib/ev-data.json'].preowned[0].preowned_range = '$41,000 - $47,000' }, { prep: withTable })
  assert.ok(rules(r).includes('preowned-table-mismatch'))
})
test('a details used-price change must keep the preowned table in agreement', () => {
  const r = run((f) => {
    const d = f['lib/ev-data.json']
    const entry = d.preowned.find((p) => d.details.filter((x) => x.name === p.name).length === 1 && d.details.find((x) => x.name === p.name).preowned_range === p.preowned_range)
    d.details.find((y) => y.name === entry.name).preowned_range = '$40,000 - $48,000'
  }, { prep: withTable })
  assert.ok(rules(r).includes('preowned-table-disagree'))
})
test('a duplicated preowned table name cannot hide an entry', () => {
  const r = run((f) => { const d = f['lib/ev-data.json']; d.preowned.unshift({ ...d.preowned[0], preowned_range: '$1 - $2' }) }, { prep: withTable })
  assert.ok(rules(r).includes('preowned-table-duplicate'))
})
test('an unsupported schema version fails (rules first, then data); the change is listed for review', () => {
  const r = run((f) => { f['lib/ev-data.json'].schema_version = 3 })
  assert.ok(reviewed(r, '-', 'schema_version'))
  assert.ok(r.errors.some((e) => e.rule === 'schema-version' && /rules-only PR/.test(e.msg)))
})

// ── Moves ──
test('a moved record cannot target a numeric field or rewrite the old text', () => {
  const id = GLB
  assert.ok(run((f) => { row(f, id).hp = 300; rec(f, id, 'hp', 300, { method: 'moved', moved_from: 'range_mi' }) }, { prep: withGlbEstimate }).errors.some((e) => e.rule === 'evidence-moved'))
  const rewrite = run((f) => { const x = row(f, id); x.notes = 'Mercedes estimates ~315 mi.'; rec(f, id, 'notes', x.notes, { method: 'moved', moved_from: 'range_mi' }) }, { prep: withGlbEstimate })
  assert.ok(rewrite.errors.some((e) => e.rule === 'evidence-moved' && /keep its old text/.test(e.msg)))
})
test('a moved record cannot bring a new claim along', () => {
  const id = GLB
  const r = run((f) => { const x = row(f, id); x.range_mi = 'TBD'; x.notes = `${x.notes} Range: ${GLB_EST}, 0-60 in 5.9 s`; rec(f, id, 'notes', x.notes, { method: 'moved', moved_from: 'range_mi' }); glbBaseline(f) }, { prep: withGlbEstimate })
  assert.ok(r.errors.some((e) => e.rule === 'evidence-moved' && /new claim/.test(e.msg)))
})

// ── Regressions for Codex's review of the simplification ──
test('"No used market yet" is a blank only for the used price: on another spec it needs a source', () => {
  const r = run((f) => { row(f, EV9).charging_type = 'No used market yet' })
  assert.ok(r.errors.some((e) => e.rule === 'evidence-missing' && e.field === 'charging_type'))
})
test('a changed pre-owned baseline source URL is flagged for review', () => {
  const r = run((f) => { const p = f['lib/ev-data.provenance.json'].preowned; const v = Object.keys(p)[0]; p[v].source_url = 'https://www.cargurus.com/research/other' })
  assert.ok(r.review.some((x) => x.field.startsWith('preowned baseline') && x.field.endsWith('.source_url')))
})

// ── Helpers ──
test('evidence matching accepts the usual number formats, as whole tokens', () => {
  assert.ok(evidenceSupports(62500, 'Starting MSRP $62,500'))
  assert.ok(evidenceSupports(315, 'up to 315 miles'))
  assert.ok(evidenceSupports(4.5, '0-60 in 4.5 seconds'))
  assert.ok(!evidenceSupports(62500, 'Starting MSRP $62,000'))
  assert.ok(!evidenceSupports(35, 'EPA range 350 miles'))
  assert.ok(!evidenceSupports(4.5, 'from 14.5 seconds'))
})
test('long text without numbers still needs most of its words in the quote', () => {
  const claim = 'Executive rear seating package with heated and ventilated captain chairs'
  assert.ok(!evidenceSupports(claim, 'A great SUV.'))
  assert.ok(evidenceSupports(claim, 'The executive rear seating package adds heated, ventilated captain chairs'))
})
test('patch_sha256 changes with any extra file, mode or content', () => {
  const s = scenario((f) => { row(f, EV9).hp = 400 })
  try {
    const h1 = patchSha256(s.repo, s.base, s.head)
    assert.equal(h1, patchSha256(s.repo, s.base, s.head))
    writeFileSync(join(s.repo, 'extra.txt'), 'x'); git(s.repo, 'add', '-A'); git(s.repo, 'commit', '-qm', 'extra')
    assert.notEqual(h1, patchSha256(s.repo, s.base, git(s.repo, 'rev-parse', 'HEAD')))
  } finally { s.done() }
})
