#!/usr/bin/env node
/**
 * Export the dataset as CSV files, one per table, for the Claude Sheet backup
 * ("ThreeRowEV Data"). See .claude/commands/sync-sheet.md for how they get
 * into the Sheet.
 *
 *   node scripts/export-sheet.mjs <out dir>
 *
 * Writes Details.csv, Pre-owned.csv, Model counts.csv, Glossary.csv,
 * Sources.csv and CarGurus baselines.csv. A text that a spreadsheet would read
 * as something else (a number, date, percent, boolean or formula) gets a
 * leading apostrophe, so it comes in exactly as stored.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = process.argv[2]
if (!out) {
  console.error('usage: export-sheet.mjs <out dir>')
  process.exit(1)
}
mkdirSync(out, { recursive: true })

const data = JSON.parse(readFileSync(join(ROOT, 'lib/ev-data.json'), 'utf-8'))
const prov = JSON.parse(readFileSync(join(ROOT, 'lib/ev-data.provenance.json'), 'utf-8'))

const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'
const READ_AS_OTHER = [
  /^[=+\-@]/, // formula
  /^\s*[$€£]?\s*-?[\d,]*\.?\d+\s*%?\s*$/, // number, currency, percent
  /^\d{1,4}[/.-]\d{1,2}([/.-]\d{1,4})?$/, // date
  new RegExp(`^(${MONTHS})[a-z]*\\.? \\d{1,2}(,? \\d{2,4})?$`, 'i'), // "Mar 15"
  /^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i, // time
  /^(true|false)$/i,
]

function cell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  let s = typeof v === 'string' ? v : JSON.stringify(v)
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(s) // verified_on, as_of: meant as dates
  if (!isoDate && READ_AS_OTHER.some((re) => re.test(s))) s = "'" + s
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function write(name, header, rows) {
  const text = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n'
  writeFileSync(join(out, `${name}.csv`), text)
  console.log(`${name}.csv: ${rows.length} rows x ${header.length} columns`)
}

const keysOf = (list) => [...new Set(list.flatMap((r) => Object.keys(r)))]

const detailKeys = keysOf(data.details)
write('Details', detailKeys, data.details.map((r) => detailKeys.map((k) => r[k])))

const preownedKeys = keysOf(data.preowned)
write('Pre-owned', preownedKeys, data.preowned.map((r) => preownedKeys.map((k) => r[k])))

const countKeys = keysOf(data.count_data)
write('Model counts', countKeys, [
  ...data.count_data.map((r) => countKeys.map((k) => r[k])),
  countKeys.map((k) => (k === 'model' ? 'Total' : data.count_totals[k])),
])

const glossaryKeys = keysOf(data.glossary)
write('Glossary', glossaryKeys, data.glossary.map((r) => glossaryKeys.map((k) => r[k])))

const sources = []
for (const [name, fields] of Object.entries(prov.fields ?? {})) {
  for (const [field, s] of Object.entries(fields)) sources.push([name, field, s.verified_on, s.source_url, s.evidence])
}
write('Sources', ['row', 'field', 'verified_on', 'source_url', 'evidence'], sources)

const baselines = []
for (const [vehicle, v] of Object.entries(prov.preowned ?? {})) {
  for (const [year, b] of Object.entries(v.years ?? {})) {
    baselines.push([vehicle, Number(year), b.basis, b.avg_price, b.as_of, b.last_repriced, b.last_move_pct, v.source_url])
  }
}
write('CarGurus baselines', ['vehicle', 'year', 'basis', 'avg_price', 'as_of', 'last_repriced', 'last_move_pct', 'source_url'], baselines)

console.log(`data last_updated: ${data.last_updated}`)
