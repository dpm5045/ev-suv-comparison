#!/usr/bin/env node
/**
 * Manual data refresh — March 2026
 * Applies all research findings from the manual audit session.
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { recalculateAllOtd } from './lib/otd-calculator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../lib/ev-data.json')

const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))

function findDetail(name) {
  return data.details.find((r) => r.name === name)
}

function findDetailsByVehicle(vehicle) {
  return data.details.filter((r) => r.vehicle === vehicle)
}

function updatePreowned(name, newRange) {
  const detail = data.details.find((r) => r.name === name)
  if (detail) detail.preowned_range = newRange

  const preowned = data.preowned.find((r) => r.name === name)
  if (preowned) preowned.preowned_range = newRange
}

let changeCount = 0
function log(msg) {
  changeCount++
  console.log(`  ${changeCount}. ${msg}`)
}

// ═══════════════════════════════════════════════════════════
// 1. VOLVO EX90 2026 — Revert HP/battery to 800V specs
// ═══════════════════════════════════════════════════════════
console.log('\n=== Volvo EX90 2026 Revert ===')

const volvo2026TM = data.details.find(
  (r) => r.vehicle === 'Volvo EX90' && r.year === 2026 && r.trim === 'Twin Motor'
)
if (volvo2026TM) {
  volvo2026TM.hp = 449
  volvo2026TM.battery_kwh = 102
  log('Volvo EX90 2026 Twin Motor: HP 402→449, battery 111→102 (800V arch)')
}

const volvo2026TMP = data.details.find(
  (r) => r.vehicle === 'Volvo EX90' && r.year === 2026 && r.trim === 'Twin Motor Performance'
)
if (volvo2026TMP) {
  volvo2026TMP.hp = 670
  volvo2026TMP.battery_kwh = 102
  volvo2026TMP.range_mi = 305
  log('Volvo EX90 2026 TM Performance: HP 510→670, battery 111→102, range TBD→305')
}

// ═══════════════════════════════════════════════════════════
// 2. TOYOTA HIGHLANDER EV — Year 2026→2027, fill specs
// ═══════════════════════════════════════════════════════════
console.log('\n=== Toyota Highlander EV ===')

for (const row of findDetailsByVehicle('Toyota Highlander EV')) {
  row.year = 2027
  row.name = row.name.replace('2026', '2027')
  row.drivetrain = 'AWD'
  row.hp = 338
  row.battery_kwh = 95.8
  row.range_mi = 320
  row.onboard_ac_kw = 11
  row.self_driving = 'Toyota Safety Sense 4.0'
  row.car_software = 'Toyota multimedia with wireless Apple CarPlay & Android Auto'
  row.main_display = '14" center touchscreen'
  row.additional_displays = '12.3" driver display'
  row.audio = '6 speakers (base); higher trims TBD'
  row.cargo_behind_3rd_cu_ft = 15.9
  row.cargo_behind_2nd_cu_ft = 45.6
  row.cargo_behind_1st_cu_ft = 80
  row.fold_flat = 'Yes'
  row.notes = 'MY2027. Range is mfr estimate (EPA pending). MSRP not yet announced. Sales expected late 2026/early 2027.'
  log(`${row.name}: year→2027, filled confirmed specs`)
}

// Update count_data for Toyota
const toyotaCount = data.count_data.find((c) => c.model === 'Toyota Highlander EV')
if (toyotaCount) {
  // Move count from y2026 to a conceptual 2027 — but we only have y2023-y2026 columns
  // For now just note it in the data; the year field on the detail rows is what matters
}

// Update preowned entries too
for (const row of data.preowned.filter((r) => r.vehicle === 'Toyota Highlander EV')) {
  row.year = 2027
  row.name = row.name.replace('2026', '2027')
}

// ═══════════════════════════════════════════════════════════
// 3. TESLA MODEL X — Update MSRP, add discontinuation note
// ═══════════════════════════════════════════════════════════
console.log('\n=== Tesla Model X ===')

// 2025/2026 Base entries — update MSRP to $91,630
for (const row of data.details.filter(
  (r) => r.vehicle === 'Tesla Model X' && r.year >= 2025 && r.trim === 'Base'
)) {
  if (typeof row.msrp === 'number' && row.msrp !== 91630) {
    log(`${row.name} (${row.seats}-seat): MSRP ${row.msrp}→91630`)
    row.msrp = 91630
  }
  if (!row.notes.includes('Discontinued')) {
    row.notes = (row.notes ? row.notes + ' ' : '') + 'Tesla announced Model X discontinued Q2 2026.'
  }
}

// 2025/2026 Plaid entries — update MSRP to $106,630
for (const row of data.details.filter(
  (r) => r.vehicle === 'Tesla Model X' && r.year >= 2025 && r.trim === 'Plaid'
)) {
  if (typeof row.msrp === 'number' && row.msrp !== 106630) {
    log(`${row.name} (${row.seats}-seat): MSRP ${row.msrp}→106630`)
    row.msrp = 106630
  }
  if (!row.notes.includes('Discontinued')) {
    row.notes = (row.notes ? row.notes + ' ' : '') + 'Tesla announced Model X discontinued Q2 2026.'
  }
}

// ═══════════════════════════════════════════════════════════
// 4. KIA EV9 2026 GT-Line — MSRP update
// ═══════════════════════════════════════════════════════════
console.log('\n=== Kia EV9 MSRP ===')

for (const row of data.details.filter(
  (r) => r.vehicle === 'Kia EV9' && r.year === 2026 && r.trim === 'GT-Line'
)) {
  if (row.msrp !== 73395) {
    log(`${row.name} (${row.seats}-seat): MSRP ${row.msrp}→73395`)
    row.msrp = 73395
  }
}

// ═══════════════════════════════════════════════════════════
// 5. PRE-OWNED PRICING UPDATES
// ═══════════════════════════════════════════════════════════
console.log('\n=== Pre-Owned Pricing ===')

const pricingUpdates = [
  // Kia EV9
  ['Kia EV9, 2024, Wind', '$32,000 - $38,000'],
  ['Kia EV9, 2024, GT-Line', '$35,900 - $56,300'],
  ['Kia EV9, 2025, Wind', '$38,000 - $45,000'],
  ['Kia EV9, 2025, GT-Line', '$42,000 - $70,000'],
  // Hyundai IONIQ 9
  ['Hyundai IONIQ 9, 2026, SE', '$46,600 - $60,000'],
  ['Hyundai IONIQ 9, 2026, SEL', '$46,600 - $60,000'],
  ['Hyundai IONIQ 9, 2026, Limited', '$46,600 - $60,000'],
  ['Hyundai IONIQ 9, 2026, Calligraphy', '$46,600 - $60,000'],
  // Lucid Gravity
  ['Lucid Gravity, 2026, Grand Touring', '$95,000 - $110,000'],
  // Rivian R1S
  ['Rivian R1S, 2023, Launch Edition', '$55,000 - $62,300'],
  ['Rivian R1S, 2023, Adventure', '$47,900 - $62,000'],
  // Tesla Model X
  ['Tesla Model X, 2023, Base', '$33,000 - $62,500'],
  ['Tesla Model X, 2024, Base', '$41,800 - $80,000'],
  // VW ID. Buzz
  ['Volkswagen ID. Buzz, 2025, Pro S Plus with 4MOTION', '$50,000 - $58,000'],
  ['Volkswagen ID. Buzz, 2025, 1st Edition with 4MOTION', '$52,000 - $62,000'],
  // Volvo EX90
  ['Volvo EX90, 2025, Twin Motor Plus 7-Seater', '$47,800 - $55,000'],
  ['Volvo EX90, 2025, Twin Motor Plus 6-Seater', '$47,800 - $55,000'],
]

for (const [name, range] of pricingUpdates) {
  // Try exact match first, then partial
  let detail = data.details.find((r) => r.name === name)
  let preowned = data.preowned.find((r) => r.name === name)

  if (detail) {
    detail.preowned_range = range
    log(`${name}: preowned_range → ${range}`)
  }
  if (preowned) {
    preowned.preowned_range = range
  }

  // For vehicles with multiple seat configs (same name), update all
  const allMatching = data.details.filter((r) => r.name === name)
  if (allMatching.length > 1) {
    for (const r of allMatching) r.preowned_range = range
  }
}

// ═══════════════════════════════════════════════════════════
// 6. NEW VEHICLES
// ═══════════════════════════════════════════════════════════
console.log('\n=== New Vehicles ===')

// Helper to create a skeleton detail row
function skeleton(overrides) {
  return {
    name: '', vehicle: '', year: 2026, trim: '', seats: null,
    drivetrain: 'AWD', msrp: null, destination: null, otd_new: 'TBD',
    preowned_range: 'No meaningful used market yet', otd_preowned: 'TBD',
    self_driving: 'TBD', range_mi: null, hp: null, battery_kwh: null,
    onboard_ac_kw: null, l2_10_100: null, l2_10_80: null,
    charging_type: 'TBD', car_software: 'TBD', main_display: 'TBD',
    additional_displays: 'TBD', audio: 'TBD', driver_profiles: 'TBD',
    notes: '', frunk_cu_ft: null, cargo_behind_3rd_cu_ft: null,
    cargo_behind_2nd_cu_ft: null, cargo_behind_1st_cu_ft: null,
    fold_flat: null, cargo_floor_width_in: null,
    ...overrides,
  }
}

// --- Cadillac Escalade IQ ---
data.details.push(skeleton({
  name: 'Cadillac Escalade IQ, 2026, Luxury',
  vehicle: 'Cadillac Escalade IQ',
  year: 2026,
  trim: 'Luxury',
  seats: 7,
  msrp: 127405,
  destination: 1895,
  range_mi: 465,
  hp: 750,
  battery_kwh: 205,
  charging_type: 'CCS',
  self_driving: 'Super Cruise (hands-free highway driving)',
  car_software: 'Google built-in (Maps, Assistant)',
  main_display: '55" diagonal LED display',
  additional_displays: '11" rear-seat entertainment screens',
  notes: 'On sale. Full-size luxury EV SUV. 800V DC fast charging.',
}))
log('Added: Cadillac Escalade IQ 2026 Luxury')

// --- Cadillac VISTIQ ---
data.details.push(skeleton({
  name: 'Cadillac VISTIQ, 2026, Base',
  vehicle: 'Cadillac VISTIQ',
  year: 2026,
  trim: 'Base',
  seats: 7,
  msrp: 78790,
  destination: 1895,
  range_mi: 305,
  hp: 615,
  battery_kwh: 102,
  charging_type: 'CCS',
  self_driving: 'Super Cruise (hands-free highway driving)',
  car_software: 'Google built-in (Maps, Assistant)',
  main_display: '33" diagonal LED display',
  notes: 'Mid-size luxury EV SUV. US sales beginning mid-2026.',
}))
log('Added: Cadillac VISTIQ 2026 Base')

// --- Mercedes-Benz EQS SUV (5-seat and 7-seat for each trim) ---
const eqsBase = {
  vehicle: 'Mercedes-Benz EQS SUV',
  year: 2026,
  drivetrain: 'AWD',
  charging_type: 'CCS (+NACS adpt)',
  self_driving: 'Mercedes Driver Assistance Package',
  car_software: 'MBUX with Apple CarPlay & Android Auto',
  main_display: '12.8" OLED center display',
  additional_displays: '12.3" driver display, optional MBUX Hyperscreen (56")',
  audio: 'Burmester 3D surround sound',
  frunk_cu_ft: null,
  fold_flat: 'Yes',
  preowned_range: 'No meaningful used market yet',
  otd_preowned: 'TBD',
}

// EQS 450+ 4MATIC
for (const seats of [5, 7]) {
  data.details.push(skeleton({
    ...eqsBase,
    name: `Mercedes-Benz EQS SUV, 2026, EQS 450+ 4MATIC`,
    trim: 'EQS 450+ 4MATIC',
    seats,
    msrp: 89950,
    destination: 1150,
    range_mi: 312,
    hp: 355,
    battery_kwh: 118,
    notes: seats === 7
      ? 'Optional 3rd-row seating. On sale.'
      : 'Standard 5-seat configuration. On sale.',
  }))
  log(`Added: Mercedes-Benz EQS SUV 2026 EQS 450+ 4MATIC (${seats}-seat)`)
}

// EQS 580 4MATIC
for (const seats of [5, 7]) {
  data.details.push(skeleton({
    ...eqsBase,
    name: `Mercedes-Benz EQS SUV, 2026, EQS 580 4MATIC`,
    trim: 'EQS 580 4MATIC',
    seats,
    msrp: 112450,
    destination: 1150,
    range_mi: 317,
    hp: 536,
    battery_kwh: 118,
    notes: seats === 7
      ? 'Optional 3rd-row seating. Performance variant. On sale.'
      : 'Standard 5-seat configuration. Performance variant. On sale.',
  }))
  log(`Added: Mercedes-Benz EQS SUV 2026 EQS 580 4MATIC (${seats}-seat)`)
}

// --- Subaru 3-Row EV ---
data.details.push(skeleton({
  name: 'Subaru 3-Row EV, 2027, Base (expected)',
  vehicle: 'Subaru 3-Row EV',
  year: 2027,
  trim: 'Base (expected)',
  seats: 7,
  msrp: null,
  range_mi: 'TBD (~300-330 est)',
  hp: 'TBD',
  battery_kwh: 'TBD (~85-95 est)',
  charging_type: 'TBD',
  notes: 'Confirmed by Subaru America COO. On sale late 2026/2027. Symmetrical AWD expected. Specs not finalized.',
}))
log('Added: Subaru 3-Row EV 2027 Base (skeleton)')

// Add count_data entries for new vehicles
const newVehicleCounts = [
  { model: 'Cadillac Escalade IQ', y2023: 0, y2024: 0, y2025: 0, y2026: 1, total: 1 },
  { model: 'Cadillac VISTIQ', y2023: 0, y2024: 0, y2025: 0, y2026: 1, total: 1 },
  { model: 'Mercedes-Benz EQS SUV', y2023: 0, y2024: 0, y2025: 0, y2026: 4, total: 4 },
  { model: 'Subaru 3-Row EV', y2023: 0, y2024: 0, y2025: 0, y2026: 1, total: 1 },
]

for (const entry of newVehicleCounts) {
  if (!data.count_data.find((c) => c.model === entry.model)) {
    data.count_data.push(entry)
    log(`Added count_data: ${entry.model}`)
  }
}

// Add preowned entries for new vehicles
const newPreownedEntries = [
  { name: 'Cadillac Escalade IQ, 2026, Luxury', vehicle: 'Cadillac Escalade IQ', year: 2026, trim: 'Luxury', preowned_range: 'No meaningful used market yet', otd_preowned: 'TBD' },
  { name: 'Cadillac VISTIQ, 2026, Base', vehicle: 'Cadillac VISTIQ', year: 2026, trim: 'Base', preowned_range: 'No meaningful used market yet', otd_preowned: 'TBD' },
  { name: 'Mercedes-Benz EQS SUV, 2026, EQS 450+ 4MATIC', vehicle: 'Mercedes-Benz EQS SUV', year: 2026, trim: 'EQS 450+ 4MATIC', preowned_range: 'No meaningful used market yet', otd_preowned: 'TBD' },
  { name: 'Mercedes-Benz EQS SUV, 2026, EQS 580 4MATIC', vehicle: 'Mercedes-Benz EQS SUV', year: 2026, trim: 'EQS 580 4MATIC', preowned_range: 'No meaningful used market yet', otd_preowned: 'TBD' },
  { name: 'Subaru 3-Row EV, 2027, Base (expected)', vehicle: 'Subaru 3-Row EV', year: 2027, trim: 'Base (expected)', preowned_range: 'No meaningful used market yet', otd_preowned: 'TBD' },
]

for (const entry of newPreownedEntries) {
  data.preowned.push(entry)
}

// ═══════════════════════════════════════════════════════════
// 7. RECALCULATE OTD + UPDATE TOTALS
// ═══════════════════════════════════════════════════════════
console.log('\n=== Recalculating OTD ===')
recalculateAllOtd(data)
log('Recalculated all OTD values')

// Update count totals
const yearKeys = ['y2023', 'y2024', 'y2025', 'y2026']
for (const key of yearKeys) {
  data.count_totals[key] = data.count_data.reduce((sum, r) => sum + (r[key] || 0), 0)
}
data.count_totals.total = data.count_data.reduce((sum, r) => sum + (r.total || 0), 0)
log(`Updated count_totals: ${data.count_totals.total} total models`)

// ═══════════════════════════════════════════════════════════
// 8. WRITE
// ═══════════════════════════════════════════════════════════
console.log('\n=== Writing ===')
writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n')
console.log(`Done! ${changeCount} changes applied to ${DATA_PATH}`)
console.log(`Total details: ${data.details.length}`)
console.log(`Total preowned: ${data.preowned.length}`)
