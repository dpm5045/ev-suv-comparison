// One-time script: merges cargo metrics CSV into ev-data.json
// Run with: node scripts/merge-cargo.mjs

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── Load files ──────────────────────────────────────────────────────────────

const jsonPath = resolve(root, 'lib/ev-data.json')
const csvPath = resolve(root, 'awd_cargo_metrics_for_master.csv')

const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
const csvText = readFileSync(csvPath, 'utf8')

// ── Parse CSV ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  const headers = parseCSVRow(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseCSVRow(line)
    const row = {}
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? '').trim() })
    return row
  })
}

// Simple CSV row parser that handles quoted fields (including quoted commas)
function parseCSVRow(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

const csvRows = parseCSV(csvText)
console.log(`Parsed ${csvRows.length} CSV rows`)

// Build lookup map: name → cargo fields
const cargoMap = new Map()
for (const row of csvRows) {
  const name = row['"Name, Year, Trim"'] ?? row['Name, Year, Trim'] ?? row['Name']
  if (!name) continue

  // Normalize fold_flat
  const rawFold = row['Fold Flat?'] ?? ''
  let fold_flat
  if (rawFold.startsWith('No')) {
    fold_flat = 'No'
  } else if (rawFold.startsWith('Yes (center gap') || rawFold.startsWith('Yes (best with Flex')) {
    // "Yes (center gap...)" = Partial; "Yes (best with Flexboard...)" = Yes (seats fold flat)
    if (rawFold.includes('center gap')) {
      fold_flat = 'Partial'
    } else {
      fold_flat = 'Yes'
    }
  } else if (rawFold.startsWith('Yes')) {
    fold_flat = 'Yes'
  } else {
    fold_flat = null
  }

  // Parse numeric or keep string
  const parseNumOrStr = (val) => {
    if (!val || val === '') return null
    const n = parseFloat(val)
    return isNaN(n) ? val : n
  }

  const frunk = parseNumOrStr(row['Frunk Volume (cu ft)'])
  const cargo3 = row['Cargo Behind 3rd Row (cu ft)']
  const cargo2 = parseNumOrStr(row['Cargo Behind 2nd Row (cu ft)'])
  const width = row['Cargo Floor Width Between Wheel Wells (in)']

  // cargo_behind_3rd_cu_ft: numeric, "N/A", or null
  let cargo_behind_3rd
  if (!cargo3 || cargo3 === '') {
    cargo_behind_3rd = null
  } else if (cargo3.startsWith('N/A')) {
    cargo_behind_3rd = 'N/A'
  } else {
    const n = parseFloat(cargo3)
    cargo_behind_3rd = isNaN(n) ? cargo3 : n
  }

  // cargo_floor_width_in: numeric or "TBD / not reliably published"
  let cargo_floor_width
  if (!width || width === '') {
    cargo_floor_width = null
  } else {
    const n = parseFloat(width)
    cargo_floor_width = isNaN(n) ? width : n
  }

  cargoMap.set(name, {
    frunk_cu_ft: frunk,
    cargo_behind_3rd_cu_ft: cargo_behind_3rd,
    cargo_behind_2nd_cu_ft: cargo2,
    fold_flat,
    cargo_floor_width_in: cargo_floor_width,
  })
}

console.log(`Built cargo map with ${cargoMap.size} entries`)

// ── Step 1: Remove duplicate Rivian entry ────────────────────────────────────

const DUPLICATE_NAME = 'Rivian R1S, 2026, Adventure Max Battery (requested; closest match: Dual Max)'
const beforeCount = data.details.length
data.details = data.details.filter(r => r.name !== DUPLICATE_NAME)
const afterCount = data.details.length
console.log(`Removed duplicate: ${beforeCount} → ${afterCount} entries`)

// Also fix count_data for Rivian (was 6 for 2026, should be 5 after removing duplicate)
const rivianCount = data.count_data.find(r => r.model === 'Rivian R1S')
if (rivianCount) {
  console.log(`Rivian 2026 count before: ${rivianCount.y2026}, total: ${rivianCount.total}`)
  // Leave count_data as-is since it reflects real-world models, not our dataset rows.
  // The user can decide if count_data needs separate adjustment.
}

// ── Step 2: Merge cargo fields into each detail row ──────────────────────────

const NULL_CARGO = {
  frunk_cu_ft: null,
  cargo_behind_3rd_cu_ft: null,
  cargo_behind_2nd_cu_ft: null,
  fold_flat: null,
  cargo_floor_width_in: null,
}

let matched = 0
let unmatched = []

for (const row of data.details) {
  const cargo = cargoMap.get(row.name)
  if (cargo) {
    Object.assign(row, cargo)
    matched++
  } else {
    Object.assign(row, NULL_CARGO)
    unmatched.push(row.name)
  }
}

console.log(`Matched: ${matched}, Unmatched (set to null): ${unmatched.length}`)
if (unmatched.length) {
  console.log('Unmatched entries:')
  unmatched.forEach(n => console.log('  -', n))
}

// ── Write output ─────────────────────────────────────────────────────────────

writeFileSync(jsonPath, JSON.stringify(data, null, 2))
console.log(`\nDone. ev-data.json updated with ${data.details.length} entries.`)
