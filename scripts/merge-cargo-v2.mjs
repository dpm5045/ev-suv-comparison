// Merge script v2: updates cargo metrics from awd_cargo_metrics_filled_2026-03-15.csv
// Run with: node scripts/merge-cargo-v2.mjs

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const jsonPath = resolve(root, 'lib/ev-data.json')
const csvPath = resolve(root, 'awd_cargo_metrics_filled_2026-03-15.csv')

const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
const csvText = readFileSync(csvPath, 'utf8')

// ── CSV parser (handles quoted fields with embedded commas) ──────────────────

function parseCSVRow(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = parseCSVRow(lines[0]).map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = parseCSVRow(line)
    const row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').trim() })
    return row
  })
}

const csvRows = parseCSV(csvText)
console.log(`Parsed ${csvRows.length} CSV rows`)

// ── Value normalizers ────────────────────────────────────────────────────────

function parseNumOrNull(val) {
  if (!val || val === '' || val.toUpperCase() === 'TBD') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function parseCargo3(val) {
  if (!val || val === '' || val.toUpperCase() === 'TBD') return null
  if (val.startsWith('N/A')) return 'N/A'
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

function parseWidth(val) {
  if (!val || val === '' || val.toUpperCase() === 'TBD') return null
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

function parseFoldFlat(val) {
  if (!val || val === '') return null
  const v = val.trim()
  if (v === 'Yes' || v === 'No' || v === 'Partial') return v
  return null
}

// ── Build lookup maps ────────────────────────────────────────────────────────

// vehicle name = Make + " " + Model
function vehicleName(row) {
  return `${row.Make} ${row.Model}`.trim()
}

function cargoFromRow(row) {
  return {
    frunk_cu_ft: parseNumOrNull(row.Frunk_Volume_cuft),
    cargo_behind_3rd_cu_ft: parseCargo3(row.Cargo_3rd_cuft),
    cargo_behind_2nd_cu_ft: parseNumOrNull(row.Cargo_2nd_cuft),
    fold_flat: parseFoldFlat(row.Fold_Flat),
    cargo_floor_width_in: parseWidth(row.Floor_Width_in),
  }
}

// Exact: vehicle|year|trim → cargo
const exactMap = new Map()
// Fallback: vehicle|year → first cargo row for that vehicle+year
const yearFallbackMap = new Map()

for (const row of csvRows) {
  const vehicle = vehicleName(row)
  const year = String(row.Year)
  const trim = row.Trim
  if (!vehicle || !year || !trim) continue

  const exactKey = `${vehicle}|${year}|${trim}`
  exactMap.set(exactKey, cargoFromRow(row))

  const yearKey = `${vehicle}|${year}`
  if (!yearFallbackMap.has(yearKey)) {
    yearFallbackMap.set(yearKey, cargoFromRow(row))
  }
}

console.log(`Built exact map: ${exactMap.size} entries, year-fallback map: ${yearFallbackMap.size} entries`)

// ── Merge into JSON ──────────────────────────────────────────────────────────

let exactMatches = 0
let fallbackMatches = 0
let unmatched = []

for (const row of data.details) {
  const vehicle = row.vehicle
  const year = String(row.year)
  const trim = row.trim

  const exactKey = `${vehicle}|${year}|${trim}`
  const yearKey = `${vehicle}|${year}`

  if (exactMap.has(exactKey)) {
    Object.assign(row, exactMap.get(exactKey))
    exactMatches++
  } else if (yearFallbackMap.has(yearKey)) {
    Object.assign(row, yearFallbackMap.get(yearKey))
    fallbackMatches++
    console.log(`  [fallback] ${vehicle} ${year} "${trim}" — used year-level match`)
  } else {
    // No match in new CSV — preserve existing cargo fields (don't overwrite)
    unmatched.push(`${vehicle} ${year} "${trim}"`)
  }
}

console.log(`\nExact matches: ${exactMatches}`)
console.log(`Fallback matches: ${fallbackMatches}`)
console.log(`No match (preserved existing): ${unmatched.length}`)
if (unmatched.length) {
  unmatched.forEach(n => console.log(`  - ${n}`))
}

writeFileSync(jsonPath, JSON.stringify(data, null, 2))
console.log(`\nDone. ev-data.json updated with ${data.details.length} entries.`)
