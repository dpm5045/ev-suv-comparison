// The WP-F data contract (validate-diff.mjs + schema), exercised on real data
// in throwaway git repositories: each mutation must fail for the named rule.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluate, evidenceSupports } from '../../validate-diff.mjs'
import { checkState, applyBaseline } from '../../schema/ev-data.schema.mjs'
import { patchSha256 } from '../lib/hashes.mjs'
import { matches } from '../../schema/approvals.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const FILES = ['lib/ev-data.json', 'lib/ev-data.provenance.json', 'scripts/refresh/accepted.json', 'scripts/refresh/retired-ids.json', 'scripts/schema/known-violations.json', 'scripts/refresh/source-policy.json']
const git = (repo, ...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8' }).trim()
const read = (repo, p) => JSON.parse(readFileSync(join(repo, p), 'utf8'))
const write = (repo, p, v) => { mkdirSync(dirname(join(repo, p)), { recursive: true }); writeFileSync(join(repo, p), JSON.stringify(v, null, 2) + '\n') }

/** A temp repo with today's data committed as base; mutate() edits files for the head commit. */
function scenario(mutate, { extraFiles = {} } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'contract-'))
  git(repo, 'init', '-q')
  git(repo, 'config', 'user.email', 't@example.com'); git(repo, 'config', 'user.name', 't')
  for (const f of FILES) write(repo, f, JSON.parse(readFileSync(join(ROOT, f), 'utf8')))
  git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'base')
  const base = git(repo, 'rev-parse', 'HEAD')
  const files = Object.fromEntries(FILES.map((f) => [f, read(repo, f)]))
  mutate(files)
  for (const [f, v] of Object.entries(files)) write(repo, f, v)
  for (const [f, text] of Object.entries(extraFiles)) { mkdirSync(dirname(join(repo, f)), { recursive: true }); writeFileSync(join(repo, f), text) }
  git(repo, 'add', '-A'); git(repo, 'commit', '-qm', 'head', '--allow-empty')
  const head = git(repo, 'rev-parse', 'HEAD')
  return { repo, base, head, done: () => rmSync(repo, { recursive: true, force: true }) }
}
const run = (mutate, opts = {}) => {
  const s = scenario(mutate, opts)
  try { return { ...evaluate({ repo: s.repo, base: s.base, head: s.head, approvals: opts.approvals?.(s) ?? [] }), base: s.base, head: s.head } } finally { s.done() }
}
const rules = (r) => r.errors.map((e) => e.rule)
const row = (files, id) => files['lib/ev-data.json'].details.find((r) => r.id === id)
const rec = (files, id, field, value, extra = {}) => {
  const p = files['lib/ev-data.provenance.json']
  ;(p.fields[id] ??= {})[field] = { source_url: 'https://www.kia.com/us/en/ev9', verified_on: '2026-11-17', evidence: `Kia lists ${typeof value === 'number' ? value.toLocaleString('en-US') : value}`, value, method: 'observed', method_version: 1, ...extra }
}
const EV9 = 'kia-ev9-2026-gt-line'

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

// The audit's six mutations
test('audit: a $1 - $2 used price fails', () => {
  const r = run((f) => { row(f, EV9).preowned_range = '$1 - $2' })
  assert.ok(rules(r).includes('preowned-bounds'))
})
test('audit: deleting a preowned table row fails (table frozen)', () => {
  const r = run((f) => { f['lib/ev-data.json'].preowned.pop() })
  assert.ok(r.errors.some((e) => e.field === '@preowned-table'))
})
test('audit: seats 99 fails (protected, needs approval and evidence)', () => {
  const r = run((f) => { row(f, EV9).seats = 99 })
  assert.ok(r.errors.some((e) => e.rule === 'approval-needed' && e.field === 'seats'))
  assert.ok(rules(r).includes('evidence-missing'))
})
test('audit: removing every provenance evidence string fails', () => {
  const r = run((f) => { for (const fields of Object.values(f['lib/ev-data.provenance.json'].fields)) for (const x of Object.values(fields)) delete x.evidence })
  assert.ok(rules(r).includes('legacy-edited'))
})
test('audit: msrp "banana" fails', () => {
  const r = run((f) => { row(f, EV9).msrp = 'banana' })
  assert.ok(rules(r).includes('type'))
})
test('audit: stored computed fields fail', () => {
  const r = run((f) => { row(f, EV9).preowned_low = 1; row(f, EV9).self_driving_rank = 4 })
  assert.equal(rules(r).filter((x) => x === 'computed-stored').length, 2)
})

// Evidence
test('an unsourced msrp change fails', () => {
  const r = run((f) => { row(f, EV9).msrp += 1000 })
  assert.ok(rules(r).includes('evidence-missing'))
})
test('an unsourced horsepower edit fails', () => {
  const r = run((f) => { row(f, EV9).hp = 400 })
  assert.ok(rules(r).includes('evidence-missing'))
})
test('a sourced price change from the maker passes', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp) })
  assert.deepEqual(r.errors, [])
})
test('a record whose value differs from the stored value fails', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp - 1) })
  assert.ok(rules(r).includes('evidence-value'))
})
test('evidence that does not contain the value fails', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp, { evidence: 'Kia lists a new price' }) })
  assert.ok(rules(r).includes('evidence-quote'))
})
test('a disallowed source domain fails', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp, { source_url: 'https://www.edmunds.com/kia/ev9/' }) })
  assert.ok(rules(r).includes('evidence-domain'))
})
test('a manufacturer estimate from a publication that does not quote the maker fails', () => {
  const id = 'lexus-tz-2027-luxury-awd'
  const r = run((f) => { const x = row(f, id); x.range_mi = 320; rec(f, id, 'range_mi', 320, { source_url: 'https://insideevs.com/news/x', evidence: 'An estimated 320 miles' }) })
  assert.ok(rules(r).includes('evidence-estimate'))
})
test('a URL-only edit of a legacy record fails', () => {
  const r = run((f) => { const p = f['lib/ev-data.provenance.json'].fields; const [id, fields] = Object.entries(p)[0]; const k = Object.keys(fields)[0]; fields[k].source_url = 'https://example.com/other' })
  assert.ok(rules(r).includes('legacy-edited'))
})
test('deleting a provenance record fails', () => {
  const r = run((f) => { const p = f['lib/ev-data.provenance.json'].fields; const [id, fields] = Object.entries(p)[0]; delete fields[Object.keys(fields)[0]] })
  assert.ok(rules(r).includes('prov-deleted'))
})
test('moving a TBD estimate into notes passes end to end with its approval', () => {
  const id = 'mercedes-benz-glb-electric-2027-glb-250-plus-expected'
  const mutate = (f) => {
    const x = row(f, id)
    const est = x.range_mi // "TBD (~315 est)"
    assert.match(est, /315/)
    x.range_mi = 'TBD'
    x.notes = `${x.notes}${x.notes ? ' ' : ''}Range: ${est}`
    rec(f, id, 'notes', x.notes, { method: 'moved', moved_from: 'range_mi', source_url: f['lib/ev-data.provenance.json'].fields[id]?.range_mi?.source_url ?? 'https://www.mbusa.com/en/future-vehicles' })
    const kv = f['scripts/schema/known-violations.json']
    kv.violations = kv.violations.filter((k) => !k.startsWith(`type|${id}|range_mi|`))
  }
  const r = run(mutate, { approvals: (s) => evaluate({ repo: s.repo, base: s.base, head: s.head }).exceptions.map((x) => ({ ...x, run_id: 1, approver: 'owner' })) })
  assert.ok(r.satisfied.some((x) => x.id === id && x.field === 'range_mi'))
  assert.deepEqual(r.errors, [])
})

// Approvals
test('an approved cargo edit without evidence still fails', () => {
  let ex
  const r = run((f) => { row(f, EV9).cargo_behind_3rd_cu_ft = 25 }, {
    approvals: (s) => {
      const probe = evaluate({ repo: s.repo, base: s.base, head: s.head })
      ex = probe.exceptions.find((x) => x.field === 'cargo_behind_3rd_cu_ft')
      return [{ ...ex, run_id: 1, approver: 'owner' }]
    },
  })
  assert.ok(ex)
  assert.ok(r.satisfied.some((x) => x.field === 'cargo_behind_3rd_cu_ft'))
  assert.ok(rules(r).includes('evidence-missing'))
})
test('an approved cargo edit with evidence passes', () => {
  const r = run((f) => { row(f, EV9).cargo_behind_3rd_cu_ft = 25; rec(f, EV9, 'cargo_behind_3rd_cu_ft', 25) }, {
    approvals: (s) => evaluate({ repo: s.repo, base: s.base, head: s.head }).exceptions.map((x) => ({ ...x, run_id: 1, approver: 'owner' })),
  })
  assert.deepEqual(r.errors, [])
})
test('an approval for a different proposal does not count', () => {
  const r = run((f) => { row(f, EV9).cargo_behind_3rd_cu_ft = 25; rec(f, EV9, 'cargo_behind_3rd_cu_ft', 25) }, {
    approvals: (s) => evaluate({ repo: s.repo, base: s.base, head: s.head }).exceptions.map((x) => ({ ...x, proposal_sha256: 'f'.repeat(64) })),
  })
  assert.ok(rules(r).includes('approval-needed'))
})
test('"Allow-Protected" anywhere in the data or notes does not authorize anything', () => {
  const r = run((f) => { const x = row(f, EV9); x.seats = 7; x.notes += ' Allow-Protected: seats' })
  assert.ok(r.errors.some((e) => e.rule === 'approval-needed' && e.field === 'seats'))
})
test('approval matching is exact on base, hash, id, field, old and new', () => {
  const x = { base_sha: 'a', proposal_sha256: 'b', id: 'c', field: 'd', old: '1', new: '2' }
  assert.ok(matches({ ...x }, x))
  for (const k of Object.keys(x)) assert.ok(!matches({ ...x, [k]: 'zzz' }, x), k)
})

// Identity and availability
test('reassigning an id to a different trim needs an identity approval', () => {
  const r = run((f) => { row(f, EV9).trim = 'Something Else'; row(f, EV9).name = 'Kia EV9, 2026, Something Else' })
  assert.ok(r.errors.some((e) => e.rule === 'approval-needed' && e.field === '@identity'))
})
test('removing a row needs approval and a retired-ids entry', () => {
  const r = run((f) => { f['lib/ev-data.json'].details = f['lib/ev-data.json'].details.filter((x) => x.id !== EV9) })
  assert.ok(r.errors.some((e) => e.field === '@remove'))
  assert.ok(rules(r).includes('remove-not-retired'))
})
test('a retired id can never come back', () => {
  const r = run((f) => { f['scripts/refresh/retired-ids.json'].ids.push({ id: EV9, retired_on: '2026-11-17' }) })
  assert.ok(rules(r).includes('retire-without-remove') || rules(r).includes('id-retired'))
})
test('a new row starting as "new" needs approval; every published value needs a source', () => {
  const r = run((f) => { const x = structuredClone(row(f, EV9)); x.id = 'kia-ev9-2026-new-trim'; x.trim = 'New Trim'; x.name = 'Kia EV9, 2026, New Trim'; f['lib/ev-data.json'].details.push(x) })
  assert.ok(r.errors.some((e) => e.field === 'availability' && e.rule === 'approval-needed'))
  assert.ok(r.errors.filter((e) => e.rule === 'evidence-missing').length > 10)
})
test('an availability change needs approval', () => {
  const r = run((f) => { const x = row(f, 'kia-ev9-2027-gt-line'); assert.equal(x.availability, 'new'); x.availability = 'used_only'; x.msrp_status = 'historical' })
  assert.ok(r.errors.some((e) => e.field === 'availability' && e.rule === 'approval-needed'))
})

// Rules and data never change together
test('a PR changing data and the source policy together fails', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp); f['scripts/refresh/source-policy.json'].press.push('example.com') })
  assert.ok(rules(r).includes('gate-and-data'))
})
test('a data PR that edits the validator fails', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp) }, { extraFiles: { 'scripts/validate-diff.mjs': '// loosened\n' } })
  assert.ok(rules(r).includes('gate-and-data'))
})
test('the known-violations list can only shrink', () => {
  const r = run((f) => { const x = row(f, EV9); x.msrp += 1000; rec(f, EV9, 'msrp', x.msrp); f['scripts/schema/known-violations.json'].violations.push('type|kia-ev9-2026-gt-line|hp') })
  assert.ok(rules(r).includes('gate-and-data') || rules(r).includes('baseline-grow'))
})

// Cross-table consistency
test('a count that disagrees with the rows fails', () => {
  const r = run((f) => { const c = f['lib/ev-data.json'].count_data[0]; c.y2026 += 1; c.total += 1; f['lib/ev-data.json'].count_totals.y2026 += 1; f['lib/ev-data.json'].count_totals.total += 1 })
  assert.ok(rules(r).includes('count-rows'))
})

// Helpers
test('evidence matching accepts the usual number formats', () => {
  assert.ok(evidenceSupports(62500, 'Starting MSRP $62,500'))
  assert.ok(evidenceSupports(315, 'up to 315 miles'))
  assert.ok(evidenceSupports(4.5, '0-60 in 4.5 seconds'))
  assert.ok(!evidenceSupports(62500, 'Starting MSRP $62,000'))
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

// Approval provenance through the (mocked) GitHub API
import { deflateRawSync } from 'node:zlib'
import { loadApprovals } from '../../schema/approvals.mjs'

function zipOne(name, content) {
  const data = deflateRawSync(Buffer.from(content))
  const n = Buffer.from(name)
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(n.length, 26)
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(0, 42)
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(46 + n.length, 12); eocd.writeUInt32LE(30 + n.length + data.length, 16)
  return Buffer.concat([local, n, data, central, n, eocd])
}
function fakeGitHub(runs) {
  const approval = { base_sha: 'a'.repeat(40), proposal_sha256: 'b'.repeat(64), id: 'x', field: 'seats', old: '6', new: '5' }
  return async (url) => {
    const path = url.replace('https://api.github.com/', '')
    const json = (v) => ({ ok: true, json: async () => v, arrayBuffer: async () => v })
    if (path === 'repos/o/r') return json({ owner: { login: 'owner' }, default_branch: 'master' })
    if (path.startsWith('repos/o/r/actions/workflows/')) return json({ workflow_runs: runs })
    const m = /actions\/runs\/(\d+)\/artifacts/.exec(path)
    if (m) return json({ artifacts: [{ id: Number(m[1]) * 10, name: 'approval', expired: false }] })
    if (/actions\/artifacts\/\d+\/zip/.test(path)) {
      const z = zipOne('approval.json', JSON.stringify(approval))
      return { ok: true, arrayBuffer: async () => z.buffer.slice(z.byteOffset, z.byteOffset + z.length) }
    }
    return { ok: false, status: 404 }
  }
}
const goodRun = { id: 1, path: '.github/workflows/approve-data-exception.yml', event: 'workflow_dispatch', head_branch: 'master', conclusion: 'success', triggering_actor: { login: 'owner' } }

test('approvals: only owner-triggered default-branch runs of the approval workflow count', async () => {
  const runs = [
    goodRun,
    { ...goodRun, id: 2, triggering_actor: { login: 'someone-else' } },
    { ...goodRun, id: 3, head_branch: 'feature/x' },
    { ...goodRun, id: 4, path: '.github/workflows/other.yml' },
    { ...goodRun, id: 5, conclusion: 'failure' },
  ]
  const { approvals, rejected } = await loadApprovals({ repo: 'o/r', token: 't', fetchImpl: fakeGitHub(runs) })
  assert.deepEqual(approvals.map((a) => a.run_id), [1])
  assert.equal(approvals[0].approver, 'owner')
  assert.equal(rejected.length, 4)
  assert.match(rejected.join('\n'), /not the repository owner/)
  assert.match(rejected.join('\n'), /branch feature\/x/)
  assert.match(rejected.join('\n'), /workflow path/)
})

// Regressions for Codex's review of step 1
test('a quote of 350 miles does not support 35 miles; whole tokens only', () => {
  assert.ok(!evidenceSupports(35, 'EPA range 350 miles'))
  assert.ok(evidenceSupports(350, 'EPA range 350 miles'))
  assert.ok(!evidenceSupports(4.5, 'from 14.5 seconds'))
})
test('long text without numbers still needs most of its words in the quote', () => {
  const claim = 'Executive rear seating package with heated and ventilated captain chairs'
  assert.ok(!evidenceSupports(claim, 'A great SUV.'))
  assert.ok(evidenceSupports(claim, 'The executive rear seating package adds heated, ventilated captain chairs'))
})
test('a moved record cannot target a numeric field or rewrite the old text', () => {
  const id = 'mercedes-benz-glb-electric-2027-glb-250-plus-expected'
  const intoNumber = run((f) => { const x = row(f, id); x.hp = 300; rec(f, id, 'hp', 300, { method: 'moved', moved_from: 'range_mi' }) })
  assert.ok(intoNumber.errors.some((e) => e.rule === 'evidence-moved'))
  const rewrite = run((f) => { const x = row(f, id); x.notes = 'Mercedes estimates ~315 mi.'; rec(f, id, 'notes', x.notes, { method: 'moved', moved_from: 'range_mi' }) })
  assert.ok(rewrite.errors.some((e) => e.rule === 'evidence-moved' && /keep its old text/.test(e.msg)))
})
test('an approved identity change still needs a source for the published field', () => {
  const r = run((f) => { row(f, EV9).drivetrain = 'RWD' }, {
    approvals: (s) => evaluate({ repo: s.repo, base: s.base, head: s.head }).exceptions.map((x) => ({ ...x, run_id: 1, approver: 'owner' })),
  })
  assert.ok(r.satisfied.some((x) => x.field === '@identity'))
  assert.ok(r.errors.some((e) => e.rule === 'evidence-missing' && e.field === 'drivetrain'))
})
test('relabelling a range as a manufacturer estimate needs a quoted record', () => {
  const r = run((f) => { const x = row(f, EV9); x.range_basis = 'manufacturer_estimate'; f['scripts/refresh/accepted.json'].range_mi[EV9] = 'Kia estimate' })
  // Missing or unchanged (stale) record: either way the relabel is blocked
  assert.ok(r.errors.some((e) => ['evidence-missing', 'evidence-stale'].includes(e.rule) && e.field === 'range_mi'))
})
test('a duplicate count row fails, and later years are counted', () => {
  const dup = run((f) => { const d = f['lib/ev-data.json']; d.count_data.push({ ...d.count_data[0] }); for (const k of Object.keys(d.count_totals)) d.count_totals[k] += d.count_data[0][k] ?? 0 })
  assert.ok(dup.errors.some((e) => e.rule === 'count-duplicate'))
  const y2028 = run((f) => { const d = f['lib/ev-data.json']; d.count_data[0].y2028 = 3; d.count_data[0].total += 3; d.count_totals.y2028 = 3; d.count_totals.total += 3 })
  assert.ok(y2028.errors.some((e) => e.rule === 'count-rows' && /y2028/.test(e.field)))
})
test('a baseline exemption covers only the original bad value', () => {
  const id = 'bmw-ix7-2027-xdrive50-expected'
  const r = run((f) => { row(f, id).hp = 'TBD (~580 est)' })
  assert.ok(r.errors.some((e) => e.rule === 'type' && e.id === id && e.field === 'hp'))
})
test('a new legacy-marked record is rejected', () => {
  const r = run((f) => { f['lib/ev-data.provenance.json'].fields[EV9] = { ...(f['lib/ev-data.provenance.json'].fields[EV9] ?? {}), hp: { source_url: 'https://www.kia.com/x', verified_on: '2026-11-17', evidence: 'x', legacy: 'name_keyed' } } })
  assert.ok(rules(r).includes('legacy-added'))
})
test('pre-owned baselines are validated and their changes need approval', () => {
  const r = run((f) => { const p = f['lib/ev-data.provenance.json'].preowned; const v = Object.keys(p)[0]; const y = Object.keys(p[v].years)[0]; p[v].years[y].avg_price = -5 })
  assert.ok(rules(r).includes('prov-baseline'))
  assert.ok(r.errors.some((e) => e.field === '@preowned-baselines'))
})

// Regressions for Codex's second review of step 1
test('a source-only edit is checked too: an off-policy URL on an unchanged spec fails', () => {
  const r = run((f) => { rec(f, EV9, 'msrp', row(f, EV9).msrp, { source_url: 'https://www.example.com/kia' }) })
  assert.ok(rules(r).includes('evidence-domain'))
})
test('clearing a required spec fails', () => {
  const r = run((f) => { row(f, EV9).charging_type = '' })
  assert.ok(r.errors.some((e) => e.rule === 'type' && e.field === 'charging_type'))
})
test('a details used-price change must keep the preowned table in agreement', () => {
  const r = run((f) => {
    const d = f['lib/ev-data.json']
    const entry = d.preowned.find((p) => d.details.filter((x) => x.name === p.name).length === 1 && d.details.find((x) => x.name === p.name).preowned_range === p.preowned_range)
    const x = d.details.find((y) => y.name === entry.name)
    x.preowned_range = '$40,000 - $48,000'
  })
  assert.ok(rules(r).includes('preowned-table-disagree'))
})
test('a moved record cannot bring a new claim along', () => {
  const id = 'mercedes-benz-glb-electric-2027-glb-250-plus-expected'
  const r = run((f) => { const x = row(f, id); const est = x.range_mi; x.range_mi = 'TBD'; x.notes = `${x.notes} Range: ${est}, 0-60 in 5.9 s`; rec(f, id, 'notes', x.notes, { method: 'moved', moved_from: 'range_mi' }) })
  assert.ok(r.errors.some((e) => e.rule === 'evidence-moved' && /new claim/.test(e.msg)))
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
test('an unsupported schema version fails even with a migration approval (rules first, then data)', () => {
  const r = run((f) => { f['lib/ev-data.json'].schema_version = 3 }, {
    approvals: (s) => evaluate({ repo: s.repo, base: s.base, head: s.head }).exceptions.map((x) => ({ ...x, run_id: 1, approver: 'owner' })),
  })
  assert.ok(r.satisfied.some((x) => x.field === '*'))
  assert.ok(r.errors.some((e) => e.rule === 'schema-version' && /rules-only PR/.test(e.msg)))
})
