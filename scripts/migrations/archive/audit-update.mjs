#!/usr/bin/env node
/**
 * One-time script to add missing trims from the March 2026 audit.
 * Run: node scripts/audit-update.mjs
 */
import { readFileSync, writeFileSync } from 'fs'

const PATH = './lib/ev-data.json'
const data = JSON.parse(readFileSync(PATH, 'utf-8'))

// Helper: existing detail names for dedup
const existingNames = new Set(data.details.map(d => d.name))

function addIfMissing(entry) {
  if (existingNames.has(entry.name)) {
    console.log(`  SKIP (exists): ${entry.name}`)
    return false
  }
  data.details.push(entry)
  existingNames.add(entry.name)
  console.log(`  ADD: ${entry.name}`)
  return true
}

// ─── MERCEDES-BENZ EQS SUV ───────────────────────────────────────

const mbBase = {
  vehicle: 'Mercedes-Benz EQS SUV',
  seats: 7,
  drivetrain: 'AWD',
  onboard_ac_kw: 9.6,
  car_software: 'MBUX with Apple CarPlay & Android Auto',
  self_driving: 'Mercedes Driver Assistance Package',
  frunk_cu_ft: null,
  fold_flat: 'Yes',
  cargo_floor_width_in: null,
  cargo_behind_3rd_cu_ft: 6.8,
  cargo_behind_2nd_cu_ft: 28.2,
  cargo_behind_1st_cu_ft: 71.3,
  driver_profiles: 'Mercedes me connect profiles',
}

// 2023 EQS SUV (108.4 kWh, CCS1)
const mb2023 = { ...mbBase, year: 2023, battery_kwh: 108.4, charging_type: 'CCS1', l2_10_80: 7.9, l2_10_100: 11.3 }
addIfMissing({ ...mb2023, name: 'Mercedes-Benz EQS SUV, 2023, EQS 450+', trim: 'EQS 450+', drivetrain: 'RWD', msrp: 104400, destination: 1150, range_mi: 305, hp: 355, main_display: '12.8" OLED center', additional_displays: '12.3" driver display', audio: 'Burmester 3D surround sound', notes: 'RWD single motor. Hyperscreen optional.', otd_new: null, preowned_range: '$55,000 - $70,000', otd_preowned: null })
addIfMissing({ ...mb2023, name: 'Mercedes-Benz EQS SUV, 2023, EQS 450 4MATIC', trim: 'EQS 450 4MATIC', msrp: 107400, destination: 1150, range_mi: 285, hp: 355, main_display: '12.8" OLED center', additional_displays: '12.3" driver display', audio: 'Burmester 3D surround sound', notes: 'AWD dual motor. Hyperscreen optional.', otd_new: null, preowned_range: '$58,000 - $73,000', otd_preowned: null })
addIfMissing({ ...mb2023, name: 'Mercedes-Benz EQS SUV, 2023, EQS 580 4MATIC', trim: 'EQS 580 4MATIC', msrp: 125950, destination: 1150, range_mi: 285, hp: 536, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + 12.3" passenger OLED', audio: 'Burmester 3D surround sound', notes: 'AWD dual motor. Hyperscreen standard on 580.', otd_new: null, preowned_range: '$65,000 - $82,000', otd_preowned: null })

// 2024 EQS SUV (118 kWh, CCS1)
const mb2024 = { ...mbBase, year: 2024, battery_kwh: 118, charging_type: 'CCS1', l2_10_80: 7.9, l2_10_100: 10.1 }
addIfMissing({ ...mb2024, name: 'Mercedes-Benz EQS SUV, 2024, EQS 450+', trim: 'EQS 450+', drivetrain: 'RWD', msrp: 104400, destination: 1150, range_mi: 339, hp: 355, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + 12.3" passenger OLED', audio: 'Burmester 3D surround sound', notes: 'RWD single motor. Hyperscreen standard for 2024.', otd_new: null, preowned_range: '$65,000 - $80,000', otd_preowned: null })
addIfMissing({ ...mb2024, name: 'Mercedes-Benz EQS SUV, 2024, EQS 450 4MATIC', trim: 'EQS 450 4MATIC', msrp: 107400, destination: 1150, range_mi: 330, hp: 355, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + 12.3" passenger OLED', audio: 'Burmester 3D surround sound', notes: 'AWD dual motor.', otd_new: null, preowned_range: '$68,000 - $83,000', otd_preowned: null })
addIfMissing({ ...mb2024, name: 'Mercedes-Benz EQS SUV, 2024, EQS 580 4MATIC', trim: 'EQS 580 4MATIC', msrp: 127350, destination: 1150, range_mi: 330, hp: 536, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + 12.3" passenger OLED', audio: 'Burmester 3D surround sound', notes: 'AWD dual motor. Performance variant.', otd_new: null, preowned_range: '$78,000 - $95,000', otd_preowned: null })
addIfMissing({ ...mb2024, name: 'Mercedes-Benz EQS SUV, 2024, Maybach EQS 680 4MATIC', trim: 'Maybach EQS 680 4MATIC', msrp: 179900, destination: 1150, range_mi: 321, hp: 649, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + rear MBUX tablet', audio: 'Burmester 4D surround sound (Dolby Atmos)', cargo_behind_3rd_cu_ft: null, cargo_behind_2nd_cu_ft: 15.3, cargo_behind_1st_cu_ft: 74.2, notes: '2-row Maybach luxury. Executive rear seating.', otd_new: null, preowned_range: '$120,000 - $150,000', otd_preowned: null })

// 2025 Maybach (existing trims are fine, just add Maybach)
addIfMissing({ ...mbBase, year: 2025, name: 'Mercedes-Benz EQS SUV, 2025, Maybach EQS 680 4MATIC', trim: 'Maybach EQS 680 4MATIC', msrp: 179900, destination: 1150, battery_kwh: 118, charging_type: 'NACS', l2_10_80: 7.9, l2_10_100: 10.1, range_mi: 302, hp: 649, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + rear MBUX tablet', audio: 'Burmester 4D surround sound (Dolby Atmos)', cargo_behind_3rd_cu_ft: null, cargo_behind_2nd_cu_ft: 15.3, cargo_behind_1st_cu_ft: 74.2, notes: '2-row Maybach luxury. Executive rear seating. NACS charging.', otd_new: null, preowned_range: null, otd_preowned: null })

// 2026 new trims (400, 550, Maybach)
const mb2026 = { ...mbBase, year: 2026, battery_kwh: 118, charging_type: 'NACS', l2_10_80: 7.9, l2_10_100: 10.1 }
addIfMissing({ ...mb2026, name: 'Mercedes-Benz EQS SUV, 2026, EQS 400 4MATIC', trim: 'EQS 400 4MATIC', msrp: 89950, destination: 1150, range_mi: 312, hp: 355, main_display: '12.8" OLED center', additional_displays: '12.3" driver display', audio: 'Burmester 3D surround sound', notes: 'New entry-level AWD for 2026.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...mb2026, name: 'Mercedes-Benz EQS SUV, 2026, EQS 550 4MATIC', trim: 'EQS 550 4MATIC', msrp: 112450, destination: 1150, range_mi: 317, hp: 536, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + 12.3" passenger OLED', audio: 'Burmester 3D surround sound', notes: 'Mid-range performance. Replaces 580 naming.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...mb2026, name: 'Mercedes-Benz EQS SUV, 2026, Maybach EQS 680 4MATIC', trim: 'Maybach EQS 680 4MATIC', msrp: 181250, destination: 1150, range_mi: 302, hp: 649, main_display: 'MBUX Hyperscreen (56")', additional_displays: '12.3" driver display + rear MBUX tablet', audio: 'Burmester 4D surround sound (Dolby Atmos)', cargo_behind_3rd_cu_ft: null, cargo_behind_2nd_cu_ft: 15.3, cargo_behind_1st_cu_ft: 74.2, notes: '2-row Maybach luxury. Executive rear seating.', otd_new: null, preowned_range: null, otd_preowned: null })

// Fix 2025 duplicate: remove one of the two "EQS 450+" entries
const mb2025dupes = data.details.filter(d => d.name === 'Mercedes-Benz EQS SUV, 2025, EQS 450+')
if (mb2025dupes.length > 1) {
  const idx = data.details.findIndex(d => d.name === 'Mercedes-Benz EQS SUV, 2025, EQS 450+')
  data.details.splice(idx, 1)
  console.log('  FIX: Removed duplicate 2025 EQS 450+')
}

// Fix 2026 duplicates
for (const dupName of ['Mercedes-Benz EQS SUV, 2026, EQS 450+ 4MATIC', 'Mercedes-Benz EQS SUV, 2026, EQS 580 4MATIC']) {
  const dupes = data.details.filter(d => d.name === dupName)
  if (dupes.length > 1) {
    const idx = data.details.findIndex(d => d.name === dupName)
    data.details.splice(idx, 1)
    console.log(`  FIX: Removed duplicate ${dupName}`)
  }
}

// ─── CADILLAC ESCALADE IQ ─────────────────────────────────────────

const eiqBase = {
  vehicle: 'Cadillac Escalade IQ',
  seats: 7,
  drivetrain: 'AWD',
  battery_kwh: 200,
  onboard_ac_kw: 19.2,
  charging_type: 'CCS1',
  self_driving: 'Super Cruise (hands-free highway driving)',
  car_software: 'Google built-in (Maps, Assistant)',
  frunk_cu_ft: 12.2,
  cargo_behind_3rd_cu_ft: 23.6,
  cargo_behind_2nd_cu_ft: 69.1,
  cargo_behind_1st_cu_ft: 119.1,
  fold_flat: 'Yes',
  cargo_floor_width_in: null,
  main_display: '55" diagonal LED display',
  driver_profiles: 'Super Cruise driver profiles',
}

// 2025 Escalade IQ
const eiq2025 = { ...eiqBase, year: 2025, range_mi: 460, hp: 680 }
addIfMissing({ ...eiq2025, name: 'Cadillac Escalade IQ, 2025, Luxury 1', trim: 'Luxury 1', msrp: 127700, destination: 2290, onboard_ac_kw: 11.5, l2_10_80: 12.2, l2_10_100: 15.6, additional_displays: '', audio: 'AKG 19-speaker', notes: 'Base trim. 11.5 kW charger standard; 19.2 kW available.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...eiq2025, name: 'Cadillac Escalade IQ, 2025, Sport 1', trim: 'Sport 1', msrp: 128200, destination: 2290, onboard_ac_kw: 11.5, l2_10_80: 12.2, l2_10_100: 15.6, additional_displays: '', audio: 'AKG 19-speaker', notes: 'Same as Luxury 1 with sportier exterior styling.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...eiq2025, name: 'Cadillac Escalade IQ, 2025, Luxury 2', trim: 'Luxury 2', msrp: 147700, destination: 2290, l2_10_80: 7.3, l2_10_100: 9.4, additional_displays: '11" rear-seat entertainment screens', audio: 'AKG 36-speaker', notes: 'Premium trim with 19.2 kW charger standard.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...eiq2025, name: 'Cadillac Escalade IQ, 2025, Sport 2', trim: 'Sport 2', msrp: 148200, destination: 2290, l2_10_80: 7.3, l2_10_100: 9.4, additional_displays: '11" rear-seat entertainment screens', audio: 'AKG 36-speaker', notes: 'Same as Luxury 2 with sportier exterior styling.', otd_new: null, preowned_range: null, otd_preowned: null })

// 2026 Escalade IQ (match existing Luxury entry's specs)
const existingEiq2026 = data.details.find(d => d.vehicle === 'Cadillac Escalade IQ' && d.year === 2026)
if (existingEiq2026) {
  const eiq2026base = { ...eiqBase, year: 2026, range_mi: existingEiq2026.range_mi, hp: existingEiq2026.hp, destination: existingEiq2026.destination, l2_10_80: existingEiq2026.l2_10_80, l2_10_100: existingEiq2026.l2_10_100, additional_displays: existingEiq2026.additional_displays, audio: existingEiq2026.audio }
  addIfMissing({ ...eiq2026base, name: 'Cadillac Escalade IQ, 2026, Sport', trim: 'Sport', msrp: 130295, notes: 'Same as Luxury with sportier exterior styling.', otd_new: null, preowned_range: null, otd_preowned: null })
  addIfMissing({ ...eiq2026base, name: 'Cadillac Escalade IQ, 2026, Premium Luxury', trim: 'Premium Luxury', msrp: 150095, audio: 'AKG 38-speaker Studio Reference (Dolby Atmos)', notes: 'Premium trim. Night Vision, massaging front seats.', otd_new: null, preowned_range: null, otd_preowned: null })
  addIfMissing({ ...eiq2026base, name: 'Cadillac Escalade IQ, 2026, Premium Sport', trim: 'Premium Sport', msrp: 150595, audio: 'AKG 38-speaker Studio Reference (Dolby Atmos)', notes: 'Same as Premium Luxury with sportier exterior styling.', otd_new: null, preowned_range: null, otd_preowned: null })
}

// ─── CADILLAC VISTIQ ──────────────────────────────────────────────

// Rename "Base" to "Luxury"
const vistiqBase = data.details.find(d => d.vehicle === 'Cadillac VISTIQ' && d.trim === 'Base')
if (vistiqBase) {
  vistiqBase.trim = 'Luxury'
  vistiqBase.name = 'Cadillac VISTIQ, 2026, Luxury'
  console.log('  RENAME: Cadillac VISTIQ Base → Luxury')
}

const vBase = {
  vehicle: 'Cadillac VISTIQ',
  year: 2026,
  seats: 7,
  drivetrain: 'AWD',
  battery_kwh: 102,
  range_mi: 305,
  hp: 615,
  onboard_ac_kw: 11.5,
  l2_10_80: 6.2,
  l2_10_100: 8.0,
  charging_type: 'NACS',
  self_driving: 'Super Cruise (hands-free highway driving)',
  car_software: 'Google built-in (Maps, Assistant)',
  main_display: '33" diagonal curved LED display',
  additional_displays: '',
  audio: 'AKG 23-speaker (Dolby Atmos)',
  frunk_cu_ft: null,
  cargo_behind_3rd_cu_ft: 15.2,
  cargo_behind_2nd_cu_ft: 43.0,
  cargo_behind_1st_cu_ft: 80.2,
  fold_flat: 'Yes',
  cargo_floor_width_in: null,
  driver_profiles: 'Super Cruise driver profiles',
}

addIfMissing({ ...vBase, name: 'Cadillac VISTIQ, 2026, Sport', trim: 'Sport', msrp: 77895, destination: 1695, notes: 'Same powertrain as Luxury with sportier exterior.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...vBase, name: 'Cadillac VISTIQ, 2026, Premium Luxury', trim: 'Premium Luxury', msrp: 91895, destination: 1695, onboard_ac_kw: 19.2, l2_10_80: 3.7, l2_10_100: 4.8, additional_displays: 'AR Head-Up Display', notes: 'Air Ride Adaptive Suspension, Active Rear Steering, Night Vision, 19.2 kW charger.', otd_new: null, preowned_range: null, otd_preowned: null })
addIfMissing({ ...vBase, name: 'Cadillac VISTIQ, 2026, Platinum', trim: 'Platinum', msrp: 96495, destination: 1695, onboard_ac_kw: 19.2, l2_10_80: 3.7, l2_10_100: 4.8, notes: 'Top trim. Brembo brakes, exclusive interior options.', otd_new: null, preowned_range: null, otd_preowned: null })

// ─── LUCID GRAVITY ────────────────────────────────────────────────

// Fix duplicate Touring → Dream Edition
const lucidTourings = data.details.filter(d => d.vehicle === 'Lucid Gravity' && d.trim === 'Touring')
if (lucidTourings.length > 1) {
  // Convert the second one to Dream Edition
  const secondIdx = data.details.findLastIndex(d => d.vehicle === 'Lucid Gravity' && d.trim === 'Touring')
  const de = data.details[secondIdx]
  de.name = 'Lucid Gravity, 2026, Dream Edition'
  de.trim = 'Dream Edition'
  de.msrp = 139900
  de.range_mi = 440
  de.hp = 1070
  de.audio = 'Surreal Sound Pro 22-speaker (Dolby Atmos)'
  de.self_driving = 'Lucid DreamDrive Pro (32-sensor suite)'
  de.notes = 'Top-tier Dream Edition. Quad-motor AWD, 0-60 in 3.1s. Nappa leather, massaging seats.'
  console.log('  FIX: Converted duplicate Lucid Touring → Dream Edition')
}

// ─── RIVIAN R1S 2024 (3 missing) ──────────────────────────────────

const r1s2024base = {
  vehicle: 'Rivian R1S',
  year: 2024,
  seats: 7,
  drivetrain: 'AWD',
  onboard_ac_kw: 11.5,
  charging_type: 'CCS1',
  car_software: 'No CarPlay/Android Auto (Rivian UI)',
  main_display: '15.6" center + 12.3" driver',
  additional_displays: '',
  audio: 'Rivian Elevation audio',
  self_driving: 'Driver+ (Gen1 hardware)',
  driver_profiles: 'User profiles in Rivian account',
  frunk_cu_ft: 11.1,
  cargo_behind_3rd_cu_ft: 17.7,
  cargo_behind_2nd_cu_ft: 46.7,
  cargo_behind_1st_cu_ft: 104.7,
  fold_flat: 'Yes',
  cargo_floor_width_in: 51.1,
}

addIfMissing({ ...r1s2024base, name: 'Rivian R1S, 2024, Adventure Dual-Motor Standard+', trim: 'Adventure Dual-Motor Standard+', msrp: 78000, destination: 1800, battery_kwh: 121, range_mi: 315, hp: 533, l2_10_80: 7.4, l2_10_100: 9.5, notes: 'Gen1 platform. Standard+ 121 kWh battery.', otd_new: null, preowned_range: '$52,000 - $65,000', otd_preowned: null })
addIfMissing({ ...r1s2024base, name: 'Rivian R1S, 2024, Performance Dual-Motor Standard+', trim: 'Performance Dual-Motor Standard+', msrp: 83000, destination: 1800, battery_kwh: 121, range_mi: 315, hp: 665, l2_10_80: 7.4, l2_10_100: 9.5, notes: 'Gen1 platform. Performance with Standard+ 121 kWh.', otd_new: null, preowned_range: '$55,000 - $68,000', otd_preowned: null })
addIfMissing({ ...r1s2024base, name: 'Rivian R1S, 2024, Performance Dual-Motor Max', trim: 'Performance Dual-Motor Max', msrp: 99000, destination: 1800, battery_kwh: 149, range_mi: 400, hp: 665, l2_10_80: 10.1, l2_10_100: 13.0, notes: 'Gen1 platform. Performance with Max 149 kWh.', otd_new: null, preowned_range: '$62,000 - $80,000', otd_preowned: null })

// ─── TESLA MODEL X 2021 PLAID ─────────────────────────────────────

// Get existing 2021 entries for reference
const mx2021ref = data.details.find(d => d.vehicle === 'Tesla Model X' && d.year === 2021)
const mxPlaidBase = {
  vehicle: 'Tesla Model X',
  year: 2021,
  drivetrain: 'AWD',
  msrp: 119990,
  destination: 1200,
  range_mi: 340,
  hp: 1020,
  battery_kwh: 100,
  onboard_ac_kw: 11.5,
  l2_10_80: mx2021ref?.l2_10_80 ?? 9.8,
  l2_10_100: mx2021ref?.l2_10_100 ?? 12.6,
  charging_type: mx2021ref?.charging_type ?? 'Tesla',
  car_software: mx2021ref?.car_software ?? 'Tesla OS (no CarPlay/Android Auto)',
  self_driving: mx2021ref?.self_driving ?? 'Tesla Autopilot (FSD optional)',
  main_display: mx2021ref?.main_display ?? '17" center touchscreen',
  additional_displays: mx2021ref?.additional_displays ?? '',
  audio: mx2021ref?.audio ?? 'Premium 22-speaker, 560W',
  driver_profiles: mx2021ref?.driver_profiles ?? 'Tesla driver profiles',
  fold_flat: 'Yes',
  cargo_floor_width_in: mx2021ref?.cargo_floor_width_in ?? 39,
  frunk_cu_ft: mx2021ref?.frunk_cu_ft ?? 6.5,
}

// 5-seat Plaid
const mx2021_5seat = data.details.find(d => d.vehicle === 'Tesla Model X' && d.year === 2021 && d.seats === 5)
addIfMissing({ ...mxPlaidBase, name: 'Tesla Model X, 2021, Plaid (5-seat)', trim: 'Plaid', seats: 5, cargo_behind_3rd_cu_ft: mx2021_5seat?.cargo_behind_3rd_cu_ft ?? null, cargo_behind_2nd_cu_ft: mx2021_5seat?.cargo_behind_2nd_cu_ft ?? 39.2, cargo_behind_1st_cu_ft: mx2021_5seat?.cargo_behind_1st_cu_ft ?? 87.3, notes: 'Refreshed 2021 Plaid. Tri-motor, 1,020 hp.', otd_new: null, preowned_range: '$30,000 - $55,000', otd_preowned: null })

// 6-seat Plaid
const mx2021_6seat = data.details.find(d => d.vehicle === 'Tesla Model X' && d.year === 2021 && d.seats === 6)
addIfMissing({ ...mxPlaidBase, name: 'Tesla Model X, 2021, Plaid (6-seat)', trim: 'Plaid', seats: 6, cargo_behind_3rd_cu_ft: mx2021_6seat?.cargo_behind_3rd_cu_ft ?? null, cargo_behind_2nd_cu_ft: mx2021_6seat?.cargo_behind_2nd_cu_ft ?? 39.2, cargo_behind_1st_cu_ft: mx2021_6seat?.cargo_behind_1st_cu_ft ?? 70.7, notes: 'Refreshed 2021 Plaid. Tri-motor, 1,020 hp. Captain chairs.', otd_new: null, preowned_range: '$30,000 - $55,000', otd_preowned: null })

// 7-seat Plaid
const mx2021_7seat = data.details.find(d => d.vehicle === 'Tesla Model X' && d.year === 2021 && d.seats === 7)
addIfMissing({ ...mxPlaidBase, name: 'Tesla Model X, 2021, Plaid (7-seat)', trim: 'Plaid', seats: 7, cargo_behind_3rd_cu_ft: mx2021_7seat?.cargo_behind_3rd_cu_ft ?? 12.6, cargo_behind_2nd_cu_ft: mx2021_7seat?.cargo_behind_2nd_cu_ft ?? 39.2, cargo_behind_1st_cu_ft: mx2021_7seat?.cargo_behind_1st_cu_ft ?? 76.5, notes: 'Refreshed 2021 Plaid. Tri-motor, 1,020 hp.', otd_new: null, preowned_range: '$30,000 - $55,000', otd_preowned: null })

// ─── VOLVO EX90 2026 — Replace 3 generic entries with 6 Plus/Ultra ──

// Remove the 3 generic entries
const volvoGenericNames = [
  'Volvo EX90, 2026, Single Motor',
  'Volvo EX90, 2026, Twin Motor',
  'Volvo EX90, 2026, Twin Motor Performance',
]
for (const gn of volvoGenericNames) {
  const idx = data.details.findIndex(d => d.name === gn)
  if (idx !== -1) {
    data.details.splice(idx, 1)
    console.log(`  REMOVE: ${gn} (replacing with Plus/Ultra variants)`)
  }
}

const ex90Base2026 = {
  vehicle: 'Volvo EX90',
  year: 2026,
  seats: 7,
  onboard_ac_kw: 11,
  l2_10_80: 7,
  l2_10_100: 9,
  charging_type: 'NACS',
  car_software: 'Google built-in; Apple CarPlay support varies',
  self_driving: 'Volvo Pilot Assist',
  main_display: '14.5" center display',
  additional_displays: 'Driver display',
  fold_flat: 'Yes',
  driver_profiles: 'Volvo profiles',
  frunk_cu_ft: 1.6,
  cargo_floor_width_in: 44.5,
  otd_new: null,
  preowned_range: null,
  otd_preowned: null,
}

// Single Motor (RWD, 111 kWh)
addIfMissing({ ...ex90Base2026, name: 'Volvo EX90, 2026, Single Motor Plus', trim: 'Single Motor Plus', drivetrain: 'RWD', msrp: 78090, destination: 1295, battery_kwh: 111, range_mi: 291, hp: 329, audio: 'Bose', cargo_behind_3rd_cu_ft: 13.6, cargo_behind_2nd_cu_ft: 37.3, cargo_behind_1st_cu_ft: 75.4, notes: 'New RWD option for 2026. Plus trim.' })
addIfMissing({ ...ex90Base2026, name: 'Volvo EX90, 2026, Single Motor Ultra', trim: 'Single Motor Ultra', drivetrain: 'RWD', msrp: 82590, destination: 1295, battery_kwh: 111, range_mi: 291, hp: 329, audio: 'Bowers & Wilkins', cargo_behind_3rd_cu_ft: 13.6, cargo_behind_2nd_cu_ft: 37.3, cargo_behind_1st_cu_ft: 75.4, notes: 'New RWD option for 2026. Ultra trim.' })

// Twin Motor (AWD, 102 kWh)
addIfMissing({ ...ex90Base2026, name: 'Volvo EX90, 2026, Twin Motor Plus', trim: 'Twin Motor Plus', drivetrain: 'AWD', msrp: 81390, destination: 1295, battery_kwh: 102, range_mi: 305, hp: 449, audio: 'Bose', cargo_behind_3rd_cu_ft: 11, cargo_behind_2nd_cu_ft: 25, cargo_behind_1st_cu_ft: 67.6, notes: 'AWD dual motor. Plus trim.' })
addIfMissing({ ...ex90Base2026, name: 'Volvo EX90, 2026, Twin Motor Ultra', trim: 'Twin Motor Ultra', drivetrain: 'AWD', msrp: 85890, destination: 1295, battery_kwh: 102, range_mi: 305, hp: 449, audio: 'Bowers & Wilkins', cargo_behind_3rd_cu_ft: 11, cargo_behind_2nd_cu_ft: 25, cargo_behind_1st_cu_ft: 67.6, notes: 'AWD dual motor. Ultra trim.' })

// Twin Motor Performance (AWD, 102 kWh)
addIfMissing({ ...ex90Base2026, name: 'Volvo EX90, 2026, Twin Motor Performance Plus', trim: 'Twin Motor Performance Plus', drivetrain: 'AWD', msrp: 86390, destination: 1295, battery_kwh: 102, range_mi: 298, hp: 670, audio: 'Bose', cargo_behind_3rd_cu_ft: 11, cargo_behind_2nd_cu_ft: 25, cargo_behind_1st_cu_ft: 67.6, notes: 'AWD performance dual motor. Plus trim.' })
addIfMissing({ ...ex90Base2026, name: 'Volvo EX90, 2026, Twin Motor Performance Ultra', trim: 'Twin Motor Performance Ultra', drivetrain: 'AWD', msrp: 90890, destination: 1295, battery_kwh: 102, range_mi: 298, hp: 670, audio: 'Bowers & Wilkins', cargo_behind_3rd_cu_ft: 11, cargo_behind_2nd_cu_ft: 25, cargo_behind_1st_cu_ft: 67.6, notes: 'AWD performance dual motor. Ultra trim.' })

// ─── UPDATE COUNTS ────────────────────────────────────────────────

// Recount everything from details
const countMap = {}
for (const d of data.details) {
  const v = d.vehicle
  if (!countMap[v]) countMap[v] = { y2021: 0, y2022: 0, y2023: 0, y2024: 0, y2025: 0, y2026: 0, y2027: 0, total: 0 }
  const key = `y${d.year}`
  if (countMap[v][key] !== undefined) countMap[v][key]++
  countMap[v].total++
}

// Update count_data
for (const row of data.count_data) {
  const c = countMap[row.model]
  if (c) {
    row.y2021 = c.y2021; row.y2022 = c.y2022; row.y2023 = c.y2023
    row.y2024 = c.y2024; row.y2025 = c.y2025; row.y2026 = c.y2026
    row.total = c.total
  }
}

// Check for models in details not in count_data
for (const [model, c] of Object.entries(countMap)) {
  if (!data.count_data.find(r => r.model === model)) {
    console.log(`  NOTE: ${model} not in count_data table`)
  }
}

// Recompute totals
const totals = { y2021: 0, y2022: 0, y2023: 0, y2024: 0, y2025: 0, y2026: 0, total: 0 }
for (const row of data.count_data) {
  totals.y2021 += row.y2021; totals.y2022 += row.y2022; totals.y2023 += row.y2023
  totals.y2024 += row.y2024; totals.y2025 += row.y2025; totals.y2026 += row.y2026
  totals.total += row.total
}
data.count_totals = totals

// Update scope
data.scope = `Scope of Car Models Analyzed: ${totals.total} trims were analyzed across six years & ${data.count_data.length} car models.`

console.log(`\nFinal total: ${totals.total} trims`)
console.log('Count totals:', JSON.stringify(totals))

// Write
writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n')
console.log('\nWritten to', PATH)
