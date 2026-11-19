#!/usr/bin/env node
/**
 * The data contract between two revisions (WP-F; docs/plans/wp-f-data-contract.md).
 *
 *   node scripts/validate-diff.mjs --base <sha> --head <sha> [--repo <dir>]
 *        [--report <file.md>] [--json <file.json>]
 *
 * CI runs THIS FILE FROM THE BASE REVISION (a trusted worktree) against the
 * PR's repository, so a PR can't loosen the rules that judge it. It reads both
 * revisions with `git show <sha>:<path>`; it never uses a branch name.
 * One mode for every path: people and bots are held to the same rules.
 * Exit 0 = pass, 1 = contract violations. Sensitive changes (protected fields,
 * availability, identity, removals, withdrawn values, schema and top-level
 * content) are not failures: they are REVIEW ITEMS, listed with before/after
 * values. The owner's merge is the approval; a bot PR with review items never
 * auto-merges (docs/plans/simplify-owner-review.md).
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkState, applyBaseline, DETAIL_FIELDS, PROTECTED, PUBLISHED, IDENTITY, FIELDS } from './schema/ev-data.schema.mjs'
import { DATA_FILES, changedPaths } from './refresh/lib/hashes.mjs'
import { NO_MARKET } from './schema/ev-data.schema.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

/** Files that define the rules. They may change only in a PR that changes no data (§1). */
export const GATE_FILES = [
  'scripts/validate-data.js', 'scripts/validate-diff.mjs', 'scripts/schema/',
  'scripts/refresh/source-policy.json', 'scripts/refresh/compat.json', 'scripts/refresh/publish-control.json',
  'scripts/refresh/lib/hashes.mjs',
  '.github/workflows/ci.yml', '.github/workflows/data-contract.yml', '.github/CODEOWNERS',
]
const BASELINE = 'scripts/schema/known-violations.json'
const isGate = (p) => GATE_FILES.some((g) => (g.endsWith('/') ? p.startsWith(g) : p === g))

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const show = (repo, sha, path, fallback) => {
  try { return JSON.parse(execFileSync('git', ['-C', repo, 'show', `${sha}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })) } catch { return fallback }
}
const hostOf = (url) => { try { return new URL(url).hostname.toLowerCase() } catch { return '' } }
const domainOk = (host, domains) => domains.some((d) => host === d || host.endsWith(`.${d}`))

/** Whole numbers stated in a text ("$62,500" → 62500, "4.5 s" → 4.5), never fragments of longer numbers. */
export function numbersIn(text) {
  return (String(text ?? '').match(/(?<![\d.,])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d,])|(?<![\d.,])\d+(?:\.\d+)?(?![\d])/g) ?? [])
    .map((t) => Number(t.replace(/,/g, '')))
}
const WORD = /[a-z][a-z0-9+-]{3,}/g
/**
 * Does the quoted evidence support the value (mechanically)?
 * - numbers: the evidence states that exact number as a whole token (350 never supports 35);
 * - short text (<= 60 chars): the evidence contains it;
 * - long text: every number it states appears as a whole token in the evidence, and at
 *   least half of its significant words appear too (text with no numbers is still checked).
 */
export function evidenceSupports(value, evidence) {
  const ev = String(evidence ?? '').toLowerCase()
  const evNums = numbersIn(ev)
  if (typeof value === 'number') return evNums.includes(value)
  if (typeof value === 'string') {
    if (value.length <= 60) return ev.includes(value.toLowerCase())
    if (!numbersIn(value).every((n) => evNums.includes(n))) return false
    const words = [...new Set(value.toLowerCase().match(WORD) ?? [])]
    return words.length > 0 && words.filter((w) => ev.includes(w)).length / words.length >= 0.5
  }
  return false
}
const TEXT_FIELDS = ['notes', 'adas_hardware_note', 'self_driving']

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
 * Evaluate the contract. Pure apart from git reads.
 * @returns {{ errors: object[], review: object[], changes: object[], dataChanged: boolean }}
 */
export function evaluate({ repo, base, head }) {
  const errors = []
  const review = []
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
  if (!dataChanged) return { errors, review, changes, dataChanged, paths }

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
  if (!H.data) { err('unreadable', '-', 'lib/ev-data.json', 'head data is missing or not JSON'); return { errors, review, changes, dataChanged, paths } }

  /** A sensitive change for the owner to see before merging (not a failure). */
  const need = (id, field, oldV, newV, why) => review.push({ id, field, old: oldV ?? null, new: newV ?? null, why })
  /** Review items for every changed entry of a list or key of an object, with real before/after values. */
  const reviewDiff = (label, before, after) => {
    if (same(before, after)) return
    if (Array.isArray(before) && Array.isArray(after)) {
      const n = Math.max(before.length, after.length)
      for (let i = 0; i < n; i++) if (!same(before[i], after[i])) need('-', `${label}[${i}]`, before[i], after[i], `${label} entry ${before[i] === undefined ? 'added' : after[i] === undefined ? 'removed' : 'changed'}`)
    } else if (before && after && typeof before === 'object' && typeof after === 'object') {
      for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) if (!same(before[k], after[k])) need('-', `${label}.${k}`, before[k], after[k], `${label}.${k} changed`)
    } else {
      need('-', label, before, after, `${label} changed`)
    }
  }

  // The known-violations baseline may only shrink, and only alongside data
  const baseKnown = new Set(B.baseline.violations ?? [])
  for (const k of H.baseline.violations ?? []) if (!baseKnown.has(k)) err('baseline-grow', '-', BASELINE, `known-violations.json may only shrink; "${k}" was added`)

  // Full state of the head, judged with the head baseline (which can only have shrunk)
  const { errors: stateErrors } = applyBaseline(checkState(H), H.baseline)
  for (const e of stateErrors) errors.push(e)

  // Schema version and other top-level content
  if (!same(B.data?.schema_version, H.data.schema_version)) need('-', 'schema_version', B.data?.schema_version, H.data.schema_version, 'schema_version change (migration)')
  for (const k of ['scope', 'count_note', 'us_ev_sales', 'us_ev_sales_notes', 'glossary', 'assumptions']) reviewDiff(k, B.data?.[k], H.data[k])
  // The parallel preowned table (removed in WP-F step 3): an entry may only change to a value
  // that a details row with the same name now has; and no name may go from agreeing to disagreeing.
  const valuesByName = (rows) => rows.reduce((m, r) => m.set(r.name, [...(m.get(r.name) ?? []), r.preowned_range]), new Map())
  const bVals = valuesByName(B.data?.details ?? [])
  const hVals = valuesByName(H.data.details)
  // Every entry is judged: a duplicate name would otherwise hide entries behind the last one
  for (const [label, list] of [['base', B.data?.preowned ?? []], ['head', H.data.preowned ?? []]]) {
    const seen = new Set()
    for (const p of list) {
      if (seen.has(p.name) && label === 'head') err('preowned-table-duplicate', '-', p.name, `the preowned table lists "${p.name}" more than once`)
      seen.add(p.name)
    }
  }
  const bTable = new Map((B.data?.preowned ?? []).map((p) => [p.name, p.preowned_range]))
  const hTable = new Map((H.data.preowned ?? []).map((p) => [p.name, p.preowned_range]))
  if (B.data && 'preowned' in B.data && !('preowned' in H.data)) need('-', 'preowned', `${bTable.size} entries`, null, 'the parallel preowned table is removed (no page reads it)')
  else for (const [name, val] of bTable) if (!hTable.has(name)) need('-', `preowned:${name}`, val, null, 'preowned table entry removed')
  for (const [name, val] of hTable) {
    // While the table exists, a new or edited entry must match a details row of that name
    if (bTable.get(name) !== val && !(hVals.get(name) ?? []).includes(val)) err('preowned-table-mismatch', '-', name, `preowned table entry "${name}" is ${val}, which no details row of that name has`)
    const agreed = (bVals.get(name) ?? []).includes(bTable.get(name))
    const agrees = (hVals.get(name) ?? []).includes(val)
    if (agreed && !agrees) err('preowned-table-disagree', '-', name, `the preowned table entry (${val}) no longer matches any details row named "${name}": update it in the same PR`)
  }

  // Rows by id
  const bRows = new Map((B.data?.details ?? []).map((r) => [r.id, r]))
  const hRows = new Map(H.data.details.map((r) => [r.id, r]))
  const bRetired = new Set((B.retired.ids ?? []).map((x) => x.id))
  const hRetired = new Set((H.retired.ids ?? []).map((x) => x.id))
  for (const id of bRetired) if (!hRetired.has(id)) err('retired-append-only', id, 'retired-ids.json', 'retired ids are append-only')

  const checked = new Set()
  const evidence = (row, field, newValue) => {
    const rec = H.prov.fields?.[row.id]?.[field]
    const old = B.prov.fields?.[row.id]?.[field]
    if (!rec) return err('evidence-missing', row.id, field, `${field} changed to ${JSON.stringify(newValue)} without a provenance record`)
    if (old && same(rec, old)) return err('evidence-stale', row.id, field, `${field} changed but its provenance record did not`)
    checkRecord(row, field, newValue, rec)
  }
  /** Every check a new or edited record must pass, whether or not the spec value changed. */
  function checkRecord(row, field, newValue, rec) {
    const k = `${row.id}|${field}`
    if (checked.has(k)) return
    checked.add(k)
    if (rec.legacy) return err('evidence-legacy', row.id, field, 'a new or edited record must be a full record (no legacy marker)')
    if (!same(rec.value, newValue)) return err('evidence-value', row.id, field, `record value ${JSON.stringify(rec.value)} differs from the stored ${JSON.stringify(newValue)}`)
    if (rec.method === 'moved') {
      // Text relocated from another field of the same row (e.g. a TBD estimate into notes).
      // Only into a text field; the old text of the destination is kept unchanged (append only);
      // the moved claim must carry every number the source field stated; and its original
      // source record (if any) travels with it.
      const bRow = bRows.get(row.id)
      const src = bRow?.[rec.moved_from]
      const before = bRow?.[field] ?? ''
      const added = typeof newValue === 'string' && newValue.startsWith(before) ? newValue.slice(before.length) : null
      const srcRec = B.prov.fields?.[row.id]?.[rec.moved_from]
      const problems = []
      if (!TEXT_FIELDS.includes(field)) problems.push(`moves may only go into a text field (${TEXT_FIELDS.join(', ')})`)
      if (!FIELDS[rec.moved_from] || typeof src !== 'string' || !/\d/.test(src)) problems.push('moved_from must name a field of the base row holding text with the claim')
      else if (added === null) problems.push('the destination must keep its old text unchanged and append the moved text')
      else {
        // The original claim travels verbatim (e.g. "TBD (~315 est)"), and nothing new comes with it:
        // the rest of the appended text may only be a short label with no numbers.
        const at = added.indexOf(src)
        const rest = at < 0 ? added : added.slice(0, at) + added.slice(at + src.length)
        if (at < 0) problems.push(`the appended text must contain the original text verbatim: ${JSON.stringify(src)}`)
        else if (/\d/.test(rest) || rest.trim().length > 40) problems.push('only the original text (plus a short label without numbers) may be appended; a new claim needs its own source')
      }
      if (srcRec && rec.source_url !== srcRec.source_url) problems.push(`the moved claim must keep its original source (${srcRec.source_url})`)
      for (const msg of problems) err('evidence-moved', row.id, field, msg)
      return
    }
    if (rec.method === 'derived' && field === 'msrp' && rec.derivation === 'quoted_total_minus_destination') {
      // Car and Driver quotes a destination-inclusive price (refresh.md): msrp = quoted_total - destination,
      // with destination carrying its own record
      const total = rec.quoted_total
      if (typeof total !== 'number' || !evidenceSupports(total, rec.evidence)) err('evidence-quote', row.id, field, 'a derived msrp needs quoted_total stated in the evidence')
      else if (typeof row.destination !== 'number' || total - row.destination !== newValue) err('evidence-derived', row.id, field, `quoted_total ${total} minus destination ${row.destination} is not the stored ${newValue}`)
      if (!H.prov.fields?.[row.id]?.destination) err('evidence-derived', row.id, field, 'a derived msrp needs a sourced destination record')
      if (!domainOk(hostOf(rec.source_url), allowedDomains(B.policy, field, row))) err('evidence-domain', row.id, field, `${hostOf(rec.source_url)} is not an allowed source for msrp of ${row.vehicle}`)
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
  const isBlank = (v) => v === null || v === 'TBD' || v === 'N/A' || v === NO_MARKET

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
    need(id, '@add', null, r.name, `new row: ${r.availability}`)
    for (const f of PROTECTED) need(id, f, null, r[f], 'protected value on a new row')
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
      if (same(b[f], h[f]) || f === 'id') continue
      changes.push({ id, field: f, old: b[f], new: h[f] })
      // Identity fields: flagged above for review; published ones also need a source
      if (IDENTITY.includes(f) && f !== 'seats') { if (FIELDS[f].published !== false) evidence(h, f, h[f]); continue }
      if (f === 'availability') { need(id, f, b[f], h[f], 'availability change'); continue }
      if (f === 'msrp_status') {
        if (same(b.availability, h.availability) && same(b.msrp, h.msrp)) err('meaning-unsupported', id, f, 'msrp_status changed without an availability change or a new msrp')
        continue
      }
      if (f === 'range_basis') {
        if (h.range_basis === 'manufacturer_estimate') {
          // Proves the maker supplied this figure, even if range_mi itself did not change
          if (same(b.range_mi, h.range_mi)) evidence(h, 'range_mi', h.range_mi)
        } else if (b.range_basis === 'manufacturer_estimate') {
          need(id, f, b[f], h[f], 'range no longer labelled a manufacturer estimate')
        } else if (same(b.range_mi, h.range_mi)) {
          err('meaning-unsupported', id, f, 'range_basis changed without a new range or a sourced estimate')
        }
        continue
      }
      const prot = PROTECTED.includes(f)
      if (prot) need(id, f, b[f], h[f], 'protected field change')
      if (isBlank(h[f])) { if (!prot) need(id, f, b[f], h[f], `${f} withdrawn to ${JSON.stringify(h[f])}`); continue }
      if (FIELDS[f].published !== false) evidence(h, f, h[f])
    }
  }

  // Provenance records: never deleted while the row exists; every new or edited record is a full record
  for (const [id, fields] of Object.entries(B.prov.fields ?? {})) {
    if (!hRows.has(id)) continue
    for (const f of Object.keys(fields)) {
      if (H.prov.fields?.[id]?.[f]) continue
      // A record may go only with its value: a withdrawal (value now blank, which is flagged for review above)
      const withdrawn = isBlank(hRows.get(id)?.[f]) && !isBlank(bRows.get(id)?.[f])
      if (!withdrawn) err('prov-deleted', id, f, 'a provenance record was deleted')
    }
  }
  for (const [id, fields] of Object.entries(H.prov.fields ?? {})) {
    for (const [f, rec] of Object.entries(fields)) {
      const was = B.prov.fields?.[id]?.[f]
      if (was && same(was, rec)) continue
      if (rec.legacy) { err(was ? 'legacy-edited' : 'legacy-added', id, f, 'a new or edited record must be a full record (no legacy marker)'); continue }
      const r = hRows.get(id)
      if (r && f in r) checkRecord(r, f, r[f], rec) // source policy and quote, even when the spec itself didn't change
    }
  }
  for (const veh of new Set([...Object.keys(B.prov.preowned ?? {}), ...Object.keys(H.prov.preowned ?? {})])) {
    reviewDiff(`preowned baseline ${veh}`, B.prov.preowned?.[veh]?.years, H.prov.preowned?.[veh]?.years)
  }

  // Attach the source and quote behind each change, for the owner's review
  for (const c of changes) {
    const rec = H.prov.fields?.[c.id]?.[c.field]
    if (rec && !rec.legacy) { c.source = rec.source_url; c.quote = rec.evidence }
  }

  return { errors, review, changes, dataChanged, paths }
}

export function renderReport(r, { base, head }) {
  const L = [`## Data contract`, '', `Base \`${base.slice(0, 12)}\` → head \`${head.slice(0, 12)}\``, '']
  if (!r.dataChanged) return [...L, 'No data files changed.'].join('\n')
  const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 160)
  const status = r.errors.length ? `**Failed: ${r.errors.length} problem(s).**` : r.review.length ? `**Passed. ${r.review.length} change(s) need the owner's review before merging** (label \`needs-owner-review\`).` : '**Passed.**'
  L.push(status, '')
  if (r.errors.length) { L.push('### Problems', ''); for (const e of r.errors) L.push(`- [${e.rule}] \`${e.id}\` ${e.field}: ${e.msg}`); L.push('') }
  if (r.review.length) {
    L.push("### Needs the owner's review", '', 'Sensitive changes. Merging the PR approves them; nothing to fill in.', '')
    L.push('| id | field | before | after | why |', '|---|---|---|---|---|')
    for (const x of r.review.slice(0, 300)) L.push(`| \`${x.id}\` | ${x.field} | ${cell(JSON.stringify(x.old))} | ${cell(JSON.stringify(x.new))} | ${x.why} |`)
    L.push('')
  }
  if (r.changes.length) {
    L.push('### All changes', '', 'Check that each quote is about this exact configuration: the checker confirms it states the value.', '')
    L.push('| id | field | old | new | source | quote |', '|---|---|---|---|---|---|')
    for (const c of r.changes.slice(0, 300)) {
      L.push(`| \`${c.id}\` | ${c.field} | ${cell(JSON.stringify(c.old))} | ${cell(JSON.stringify(c.new))} | ${c.source ? `[${hostOf(c.source)}](${c.source})` : ''} | ${cell(c.quote)} |`)
    }
    L.push('')
  }
  return L.join('\n')
}

async function main() {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
  const repo = resolve(arg('--repo', resolve(HERE, '..')))
  const base = arg('--base')
  const head = arg('--head')
  if (!base || !head) { console.error('usage: validate-diff.mjs --base <sha> --head <sha> [--repo dir] [--report file.md] [--json file.json]'); process.exit(2) }
  const r = evaluate({ repo, base, head })
  const report = renderReport(r, { base, head })
  console.log(report)
  const out = arg('--report')
  if (out) writeFileSync(out, report + '\n')
  const json = arg('--json')
  if (json) writeFileSync(json, JSON.stringify({ errors: r.errors.length, review: r.review.length, dataChanged: r.dataChanged }) + '\n')
  process.exit(r.errors.length ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1) })
