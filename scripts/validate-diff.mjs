#!/usr/bin/env node
/**
 * The data contract between two revisions (WP-F; docs/plans/wp-f-data-contract.md).
 *
 *   node scripts/validate-diff.mjs --base <sha> --head <sha> [--repo <dir>]
 *        [--approvals github|none|<file.json>] [--report <file.md>]
 *
 * CI runs THIS FILE FROM THE BASE REVISION (a trusted worktree) against the
 * PR's repository, so a PR can't loosen the rules that judge it. It reads both
 * revisions with `git show <sha>:<path>`; it never uses a branch name.
 * One mode for every path: people and bots are held to the same rules.
 * Exit 0 = pass, 1 = contract violations (the report lists any approvals
 * that would resolve them, with their exact inputs).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkState, applyBaseline, DETAIL_FIELDS, PROTECTED, PUBLISHED, IDENTITY, FIELDS } from './schema/ev-data.schema.mjs'
import { loadApprovals, matches } from './schema/approvals.mjs'
import { DATA_FILES, proposalSha256, changedPaths } from './refresh/lib/hashes.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Files that define the rules. They may change only in a PR that changes no data (§1). */
export const GATE_FILES = [
  'scripts/validate-data.js', 'scripts/validate-diff.mjs', 'scripts/schema/',
  'scripts/refresh/source-policy.json', 'scripts/refresh/compat.json', 'scripts/refresh/publish-control.json',
  'scripts/refresh/lib/hashes.mjs', 'scripts/refresh/lib/zip.mjs',
  '.github/workflows/ci.yml', '.github/workflows/approve-data-exception.yml', '.github/CODEOWNERS',
]
const BASELINE = 'scripts/schema/known-violations.json'
const isGate = (p) => GATE_FILES.some((g) => (g.endsWith('/') ? p.startsWith(g) : p === g))

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const show = (repo, sha, path, fallback) => {
  try { return JSON.parse(execFileSync('git', ['-C', repo, 'show', `${sha}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })) } catch { return fallback }
}
const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase() } catch { return '' } }
const domainOk = (host, domains) => domains.some((d) => host === d || host.endsWith(`.${d}`))

/** Does the quoted evidence contain the value (mechanically)? */
export function evidenceSupports(value, evidence) {
  const ev = String(evidence ?? '').toLowerCase()
  if (typeof value === 'number') {
    const forms = new Set([String(value), value.toLocaleString('en-US'), Number.isInteger(value) ? '' : value.toFixed(1)])
    return [...forms].filter(Boolean).some((f) => ev.includes(f.toLowerCase()))
  }
  if (typeof value === 'string') {
    if (value.length <= 60) return ev.includes(value.toLowerCase())
    // Long text: every number it states must appear in the evidence (claims are mostly numbers)
    const nums = value.match(/\d[\d,.]*/g) ?? []
    return nums.every((n) => ev.includes(n.replace(/[.,]$/, '').toLowerCase()))
  }
  return false
}

/** Allowed domains for a field of a vehicle, from the (base) source policy. */
function allowedDomains(policy, field, row) {
  const maker = policy.manufacturer?.[row.vehicle] ?? []
  const blocked = policy.blocked_manufacturers?.vehicles?.includes(row.vehicle) ? policy.blocked_manufacturers.domains : []
  const classes = policy.fields?.[field] ?? policy.fields?.default ?? []
  const out = []
  for (const c of classes) {
    if (c === 'maker') out.push(...maker)
    if (c === 'maker_or_blocked') out.push(...maker, ...blocked)
    if (c === 'press') out.push(...(policy.press ?? []))
    if (c === 'specs') out.push(...(policy.specs_databases ?? []))
    if (c === 'epa') out.push('fueleconomy.gov')
    if (c === 'cargurus') out.push('cargurus.com')
    if (c === 'maker_estimate') out.push(...maker, ...(policy.press ?? []))
  }
  return out
}

/**
 * Evaluate the contract. Pure apart from git reads; approvals are passed in.
 * @returns {{ errors: object[], exceptions: object[], satisfied: object[], changes: object[], dataChanged: boolean, proposal_sha256: string|null }}
 */
export function evaluate({ repo, base, head, approvals = [] }) {
  const errors = []
  const exceptions = []
  const changes = []
  const err = (rule, id, field, msg) => errors.push({ rule, id: id ?? '-', field: field ?? '-', msg })

  const paths = changedPaths(repo, base, head)
  // A data file counts as changed when its content changes; creating
  // retired-ids.json with no ids (the bootstrap) changes nothing.
  const dataPaths = paths.filter((p) => DATA_FILES.includes(p)).filter((p) => p !== 'scripts/refresh/retired-ids.json'
    || !same(show(repo, base, p, { ids: [] }).ids ?? [], show(repo, head, p, { ids: [] }).ids ?? []))
  // The known-violations baseline is a rule file, except that removing entries
  // (because the data was fixed) is part of a data change.
  const baseKnownList = show(repo, base, BASELINE, null)?.violations
  const headKnownList = show(repo, head, BASELINE, { violations: [] }).violations ?? []
  const baselineShrinkOnly = paths.includes(BASELINE) && Array.isArray(baseKnownList) && headKnownList.every((k) => baseKnownList.includes(k))
  const gatePaths = paths.filter((p) => isGate(p) && !(p === BASELINE && baselineShrinkOnly))
  const dataChanged = dataPaths.length > 0 || baselineShrinkOnly
  if (!dataChanged) return { errors, exceptions, satisfied: [], changes, dataChanged, proposal_sha256: null, paths }

  // §1: rules and data never change together
  for (const p of gatePaths) err('gate-and-data', '-', p, `${p} defines the data rules and cannot change in a PR that changes data; split it into its own PR`)

  const B = {
    data: show(repo, base, 'lib/ev-data.json', null), prov: show(repo, base, 'lib/ev-data.provenance.json', {}),
    accepted: show(repo, base, 'scripts/refresh/accepted.json', {}), retired: show(repo, base, 'scripts/refresh/retired-ids.json', { ids: [] }),
    baseline: show(repo, base, BASELINE, { violations: [] }), policy: show(repo, base, 'scripts/refresh/source-policy.json', {}),
  }
  const H = {
    data: show(repo, head, 'lib/ev-data.json', null), prov: show(repo, head, 'lib/ev-data.provenance.json', {}),
    accepted: show(repo, head, 'scripts/refresh/accepted.json', {}), retired: show(repo, head, 'scripts/refresh/retired-ids.json', { ids: [] }),
    baseline: show(repo, head, BASELINE, { violations: [] }),
  }
  if (!H.data) { err('unreadable', '-', 'lib/ev-data.json', 'head data is missing or not JSON'); return { errors, exceptions, satisfied: [], changes, dataChanged, proposal_sha256: null, paths } }

  const proposal_sha256 = proposalSha256(repo, base, head)
  const need = (id, field, oldV, newV, why) => exceptions.push({ base_sha: base, proposal_sha256, id, field, old: JSON.stringify(oldV ?? null), new: JSON.stringify(newV ?? null), why })

  // The known-violations baseline may only shrink, and only alongside data
  const baseKnown = new Set(B.baseline.violations ?? [])
  for (const k of H.baseline.violations ?? []) if (!baseKnown.has(k)) err('baseline-grow', '-', BASELINE, `known-violations.json may only shrink; "${k}" was added`)

  // Full state of the head, judged with the head baseline (which can only have shrunk)
  const { errors: stateErrors } = applyBaseline(checkState(H), H.baseline)
  for (const e of stateErrors) errors.push(e)

  // Schema version and other top-level content
  if (!same(B.data?.schema_version, H.data.schema_version)) need('-', '*', B.data?.schema_version, H.data.schema_version, 'schema_version change (migration)')
  for (const k of ['scope', 'count_note', 'us_ev_sales', 'us_ev_sales_notes', 'glossary', 'assumptions']) {
    if (!same(B.data?.[k], H.data[k])) need('-', `@top:${k}`, '(previous)', '(changed)', `top-level ${k} changed`)
  }
  if (!same(B.data?.preowned, H.data.preowned)) need('-', '@preowned-table', '(previous)', '(changed)', 'the parallel preowned table is frozen until it is removed (WP-F step 3)')

  // Rows by id
  const bRows = new Map((B.data?.details ?? []).map((r) => [r.id, r]))
  const hRows = new Map(H.data.details.map((r) => [r.id, r]))
  const bRetired = new Set((B.retired.ids ?? []).map((x) => x.id))
  const hRetired = new Set((H.retired.ids ?? []).map((x) => x.id))
  for (const id of bRetired) if (!hRetired.has(id)) err('retired-append-only', id, 'retired-ids.json', 'retired ids are append-only')

  const evidence = (row, field, newValue) => {
    const rec = H.prov.fields?.[row.id]?.[field]
    const old = B.prov.fields?.[row.id]?.[field]
    if (!rec) return err('evidence-missing', row.id, field, `${field} changed to ${JSON.stringify(newValue)} without a provenance record`)
    if (old && same(rec, old)) return err('evidence-stale', row.id, field, `${field} changed but its provenance record did not`)
    if (rec.legacy) return err('evidence-legacy', row.id, field, 'a new or edited record must be a full record (no legacy marker)')
    if (!same(rec.value, newValue)) return err('evidence-value', row.id, field, `record value ${JSON.stringify(rec.value)} differs from the new ${JSON.stringify(newValue)}`)
    if (rec.method === 'moved') {
      // Text relocated from another field of the same row (e.g. a TBD estimate into notes):
      // the base row must have held it, and every number it stated must appear in the new value.
      const src = bRows.get(row.id)?.[rec.moved_from]
      const nums = typeof src === 'string' ? src.match(/\d[\d,.]*/g) ?? [] : []
      if (!FIELDS[rec.moved_from] || typeof src !== 'string' || !nums.every((n) => String(newValue).includes(n.replace(/[.,]$/, '')))) {
        err('evidence-moved', row.id, field, `a moved record needs moved_from naming a field of the base row whose text (and its numbers) the new value carries`)
      }
      return
    }
    const host = hostOf(rec.source_url)
    let domains = allowedDomains(B.policy, field, row)
    if (field === 'range_mi' && row.range_basis !== 'manufacturer_estimate') domains = ['fueleconomy.gov']
    if (!domainOk(host, domains)) err('evidence-domain', row.id, field, `${host || rec.source_url} is not an allowed source for ${field} of ${row.vehicle}`)
    if (field === 'range_mi' && row.range_basis === 'manufacturer_estimate' && !domainOk(host, B.policy.manufacturer?.[row.vehicle] ?? [])) {
      const make = row.vehicle.split(' ')[0].toLowerCase()
      if (!String(rec.evidence).toLowerCase().includes(make)) err('evidence-estimate', row.id, field, `a press source for a manufacturer estimate must quote the maker (${row.vehicle.split(' ')[0]})`)
    }
    if (!evidenceSupports(newValue, rec.evidence)) err('evidence-quote', row.id, field, `the quoted evidence does not contain ${JSON.stringify(newValue)}`)
  }
  const isBlank = (v) => v === null || v === 'TBD' || v === 'N/A'

  // Removed rows
  for (const [id, r] of bRows) {
    if (hRows.has(id)) continue
    changes.push({ id, field: '@remove', old: r.name, new: null })
    need(id, '@remove', r.name, null, 'row removed')
    if (!hRetired.has(id)) err('remove-not-retired', id, 'id', 'a removed id must be added to scripts/refresh/retired-ids.json')
  }
  for (const id of hRetired) if (!bRetired.has(id) && bRows.has(id) && hRows.has(id)) err('retire-without-remove', id, 'id', 'retired-ids.json lists an id that still exists')

  // Added rows
  for (const [id, r] of hRows) {
    if (bRows.has(id)) continue
    changes.push({ id, field: '@add', old: null, new: r.name })
    if (bRetired.has(id)) err('id-reuse', id, 'id', 'this id was retired and cannot be reused')
    if (r.availability !== 'needs_review' && r.availability !== 'announced') need(id, 'availability', null, r.availability, `a new row must start as needs_review or announced, not ${r.availability}`)
    for (const f of PUBLISHED) if (!isBlank(r[f])) evidence(r, f, r[f])
  }

  // Changed rows
  for (const [id, h] of hRows) {
    const b = bRows.get(id)
    if (!b) continue
    const identity = IDENTITY.filter((f) => f !== 'seats' && !same(b[f], h[f]))
    if (identity.length) {
      const tuple = (r) => Object.fromEntries(identity.map((f) => [f, r[f]]))
      need(id, '@identity', tuple(b), tuple(h), `identity fields changed: ${identity.join(', ')}`)
    }
    for (const f of DETAIL_FIELDS) {
      if (same(b[f], h[f]) || IDENTITY.includes(f) && f !== 'seats' || f === 'id') continue
      changes.push({ id, field: f, old: b[f], new: h[f] })
      if (f === 'availability') { need(id, f, b[f], h[f], 'availability change'); continue }
      if (f === 'msrp_status') {
        if (same(b.availability, h.availability) && same(b.msrp, h.msrp)) err('meaning-unsupported', id, f, 'msrp_status changed without an availability change or a new msrp')
        continue
      }
      if (f === 'range_basis') {
        if (same(b.range_mi, h.range_mi) && h.range_basis !== 'manufacturer_estimate' && b.range_basis !== 'manufacturer_estimate') err('meaning-unsupported', id, f, 'range_basis changed without a new range or estimate record')
        continue
      }
      const prot = PROTECTED.includes(f)
      if (prot) need(id, f, b[f], h[f], 'protected field change')
      if (isBlank(h[f])) { if (!prot) need(id, f, b[f], h[f], `${f} withdrawn to ${JSON.stringify(h[f])}`); continue }
      if (FIELDS[f].published !== false) evidence(h, f, h[f])
    }
  }

  // Provenance records: never deleted while the row exists; edits are full records
  for (const [id, fields] of Object.entries(B.prov.fields ?? {})) {
    if (!hRows.has(id)) continue
    for (const [f, rec] of Object.entries(fields)) {
      const now = H.prov.fields?.[id]?.[f]
      if (!now) err('prov-deleted', id, f, 'a provenance record was deleted')
      else if (!same(now, rec) && now.legacy) err('legacy-edited', id, f, 'an edited record must drop the legacy marker and be a full record')
    }
  }

  // Approvals
  const satisfied = []
  const open = []
  for (const x of exceptions) {
    const a = approvals.find((ap) => matches(ap, x))
    if (a) satisfied.push({ ...x, run_id: a.run_id, approver: a.approver })
    else open.push(x)
  }
  for (const x of open) err('approval-needed', x.id, x.field, `${x.why}: needs the owner's approval (see report)`)
  return { errors, exceptions: open, satisfied, changes, dataChanged, proposal_sha256, paths }
}

export function renderReport(r, { base, head }) {
  const L = [`## Data contract`, '', `Base \`${base.slice(0, 12)}\` → head \`${head.slice(0, 12)}\``, '']
  if (!r.dataChanged) return [...L, 'No data files changed.'].join('\n')
  L.push(`proposal_sha256: \`${r.proposal_sha256}\``, '', r.errors.length ? `**${r.errors.length} problem(s).**` : '**Passed.**', '')
  if (r.changes.length) {
    L.push('| id | field | old | new |', '|---|---|---|---|')
    for (const c of r.changes.slice(0, 200)) L.push(`| \`${c.id}\` | ${c.field} | ${JSON.stringify(c.old)?.slice(0, 60)} | ${JSON.stringify(c.new)?.slice(0, 60)} |`)
    L.push('')
  }
  const other = r.errors.filter((e) => e.rule !== 'approval-needed')
  if (other.length) { L.push('### Problems', ''); for (const e of other) L.push(`- [${e.rule}] \`${e.id}\` ${e.field}: ${e.msg}`); L.push('') }
  if (r.exceptions.length) {
    L.push('### Needs the owner\'s approval', '', 'Run **Approve data exception** (Actions → Approve data exception → Run workflow) once per line, with exactly these inputs, then re-run CI:', '')
    L.push('| id | field | old | new | base_sha | proposal_sha256 | why |', '|---|---|---|---|---|---|---|')
    for (const x of r.exceptions) L.push(`| \`${x.id}\` | \`${x.field}\` | \`${x.old}\` | \`${x.new}\` | \`${x.base_sha}\` | \`${x.proposal_sha256}\` | ${x.why} |`)
    L.push('')
  }
  if (r.satisfied.length) { L.push('### Approved', ''); for (const x of r.satisfied) L.push(`- \`${x.id}\` ${x.field}: approved by ${x.approver} (run ${x.run_id})`) }
  return L.join('\n')
}

async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
  const repo = resolve(arg('--repo', resolve(HERE, '..')))
  const base = arg('--base')
  const head = arg('--head')
  if (!base || !head) { console.error('usage: validate-diff.mjs --base <sha> --head <sha> [--repo dir] [--approvals github|none|file] [--report file]'); process.exit(2) }
  const mode = arg('--approvals', 'none')
  // Evaluate first; read approvals only if some exception actually needs one
  let r = evaluate({ repo, base, head, approvals: [] })
  if (r.exceptions.length && mode !== 'none') {
    let approvals = []
    if (mode === 'github') {
      const repoName = process.env.GITHUB_REPOSITORY
      const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
      if (!repoName || !token) { console.error('--approvals github needs GITHUB_REPOSITORY and GH_TOKEN'); process.exit(2) }
      const loaded = await loadApprovals({ repo: repoName, token })
      approvals = loaded.approvals
      if (loaded.rejected.length) console.log(`Ignored approval runs:\n${loaded.rejected.map((x) => `  - ${x}`).join('\n')}`)
    } else {
      approvals = JSON.parse(readFileSync(mode, 'utf8'))
    }
    r = evaluate({ repo, base, head, approvals })
  }
  const report = renderReport(r, { base, head })
  console.log(report)
  const out = arg('--report')
  if (out) writeFileSync(out, report + '\n')
  process.exit(r.errors.length ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1) })
