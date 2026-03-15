// Add 8 new Tesla Model X 7-seat entries to ev-data.json
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const jsonPath = resolve(__dirname, '..', 'lib/ev-data.json')
const data = JSON.parse(readFileSync(jsonPath, 'utf8'))

const shared = {
  vehicle: 'Tesla Model X',
  drivetrain: 'AWD',
  seats: 7,
  self_driving: 'Tesla Autopilot / Full Self-Driving (optional)',
  battery_kwh: 100,
  onboard_ac_kw: 11.5,
  charging_type: 'NACS',
  car_software: 'Tesla OS (no native CarPlay/Android Auto)',
  main_display: '17" center touchscreen (reported)',
  additional_displays: 'Driver display + rear screen (reported)',
  audio: 'Premium audio (trim dependent)',
  driver_profiles: 'Driver profiles supported',
  frunk_cu_ft: 6.5,
  cargo_behind_3rd_cu_ft: 14.8,
  cargo_behind_2nd_cu_ft: 36,
  fold_flat: 'Yes',
  cargo_floor_width_in: 39,
}

const newEntries = [
  // 2026
  {
    ...shared, year: 2026,
    name: 'Tesla Model X, 2026, Model X Plaid + 7-seat interior option',
    trim: 'Model X Plaid + 7-seat interior option',
    msrp: 110130, destination: 0, otd_new: 117642.8,
    preowned_range: '$100,000 - $125,000', otd_preowned: '$106,905 - $133,405',
    range_mi: 335, hp: 1020, l2_10_100: 10.8, l2_10_80: 6.8,
    notes: 'MSRP for 7-seat row estimated as 5-seat MSRP + $3,500. Note: Model X Plaid seating availability has changed over time.',
  },
  {
    ...shared, year: 2026,
    name: 'Tesla Model X, 2026, Model X + 7-seat interior option',
    trim: 'Model X + 7-seat interior option',
    msrp: 95130, destination: 0, otd_new: 101742.8,
    preowned_range: '$89,000 - $98,000', otd_preowned: '$95,245 - $104,785',
    range_mi: 352, hp: 670, l2_10_100: 12.6, l2_10_80: 6.8,
    notes: 'MSRP for 7-seat row estimated as 5-seat MSRP + $3,500.',
  },
  // 2025
  {
    ...shared, year: 2025,
    name: 'Tesla Model X, 2025, Model X Plaid + 7-seat interior option',
    trim: 'Model X Plaid + 7-seat interior option',
    msrp: 105130, destination: 0, otd_new: 112342.8,
    preowned_range: '$94,494 - $98,988', otd_preowned: '$101,069 - $105,832',
    range_mi: 314, hp: 1020, l2_10_100: 14.0, l2_10_80: 10.9,
    notes: 'MSRP for 7-seat row estimated as 5-seat MSRP + $3,500. Note: Model X Plaid seating availability has changed over time.',
  },
  {
    ...shared, year: 2025,
    name: 'Tesla Model X, 2025, Model X Standard + 7-seat interior option',
    trim: 'Model X Standard + 7-seat interior option',
    msrp: 90130, destination: 0, otd_new: 96442.8,
    preowned_range: '$75,000 - $85,000', otd_preowned: '$80,405 - $91,005',
    range_mi: 329, hp: 670, l2_10_100: 14.0, l2_10_80: 10.9,
    notes: 'MSRP for 7-seat row estimated as 5-seat MSRP + $3,500.',
  },
  // 2024
  {
    ...shared, year: 2024,
    name: 'Tesla Model X, 2024, Long Range + 7-seat interior option',
    trim: 'Long Range + 7-seat interior option',
    msrp: 'N/A - Not New', destination: null, otd_new: '-',
    preowned_range: '$63,000 - $79,000', otd_preowned: '$67,685 - $84,645',
    range_mi: 348, hp: 670, l2_10_100: 9.45, l2_10_80: 7.35,
    notes: '',
  },
  {
    ...shared, year: 2024,
    name: 'Tesla Model X, 2024, Plaid + 7-seat interior option',
    trim: 'Plaid + 7-seat interior option',
    msrp: 'N/A - Not New', destination: null, otd_new: '-',
    preowned_range: '$80,000 - $94,000', otd_preowned: '$85,705 - $100,545',
    range_mi: 333, hp: 1020, l2_10_100: 12.6, l2_10_80: 9.8,
    notes: 'Note: Model X Plaid seating availability has changed over time.',
  },
  // 2023
  {
    ...shared, year: 2023,
    name: 'Tesla Model X, 2023, Base + 7-seat interior option',
    trim: 'Base + 7-seat interior option',
    msrp: 'N/A - Not New', destination: null, otd_new: '-',
    preowned_range: '$49,820 - $60,310', otd_preowned: '$53,714 - $64,834',
    range_mi: 348, hp: 670, l2_10_100: 12.6, l2_10_80: 9.8,
    notes: '',
  },
  {
    ...shared, year: 2023,
    name: 'Tesla Model X, 2023, Plaid + 7-seat interior option',
    trim: 'Plaid + 7-seat interior option',
    msrp: 'N/A - Not New', destination: null, otd_new: '-',
    preowned_range: '$65,495 - $79,998', otd_preowned: '$70,330 - $85,703',
    range_mi: 333, hp: 1020, l2_10_100: 12.6, l2_10_80: 9.8,
    notes: 'Note: Model X Plaid seating availability has changed over time.',
  },
]

const before = data.details.length
data.details.push(...newEntries)
console.log(`Added ${newEntries.length} entries: ${before} → ${data.details.length}`)

// Verify
const tesla = data.details.filter(d => d.vehicle === 'Tesla Model X')
for (const year of [2023, 2024, 2025, 2026]) {
  const seats = [...new Set(tesla.filter(d => d.year === year).map(d => d.seats))].sort((a, b) => a - b)
  const trims = tesla.filter(d => d.year === year).map(d => `${d.seats}-seat: ${d.trim}`)
  console.log(`${year} seats: [${seats}]`)
  trims.forEach(t => console.log(`  ${t}`))
}

writeFileSync(jsonPath, JSON.stringify(data, null, 2))
console.log('\nDone. ev-data.json updated.')
