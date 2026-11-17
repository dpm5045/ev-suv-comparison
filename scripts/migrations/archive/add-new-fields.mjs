#!/usr/bin/env node
/**
 * One-time script to add 12 new spec fields to all trims.
 * Run: node scripts/add-new-fields.mjs
 */
import { readFileSync, writeFileSync } from 'fs'

const PATH = './lib/ev-data.json'
const data = JSON.parse(readFileSync(PATH, 'utf-8'))

const NEW_FIELDS = [
  'towing_lbs', 'dc_fast_charge_kw', 'dc_fast_charge_10_80_min',
  'curb_weight_lbs', 'length_in', 'width_in', 'height_in',
  'third_row_legroom_in', 'third_row_headroom_in',
  'torque_lb_ft', 'zero_to_60_sec', 'ground_clearance_in',
]

// Ensure all details have the new fields (default null)
for (const d of data.details) {
  for (const f of NEW_FIELDS) {
    if (!(f in d)) d[f] = null
  }
}

// ── LOOKUP HELPERS ──────────────────────────────────────────────
function applyToVehicleYear(vehicle, year, specs) {
  for (const d of data.details) {
    if (d.vehicle === vehicle && d.year === year) {
      for (const [k, v] of Object.entries(specs)) {
        if (v !== undefined) d[k] = v
      }
    }
  }
}

function applyToVehicleYearTrimMatch(vehicle, year, trimMatch, specs) {
  for (const d of data.details) {
    if (d.vehicle === vehicle && d.year === year && d.trim.toLowerCase().includes(trimMatch.toLowerCase())) {
      for (const [k, v] of Object.entries(specs)) {
        if (v !== undefined) d[k] = v
      }
    }
  }
}

function applyToVehicle(vehicle, specs) {
  for (const d of data.details) {
    if (d.vehicle === vehicle) {
      for (const [k, v] of Object.entries(specs)) {
        if (d[k] === null || d[k] === undefined) d[k] = v
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TESLA MODEL X
// ═══════════════════════════════════════════════════════════════

// 2021 pre-refresh (Long Range Plus)
applyToVehicleYear('Tesla Model X', 2021, {
  towing_lbs: 5000,
  dc_fast_charge_kw: 250,
  dc_fast_charge_10_80_min: 32,
  ground_clearance_in: 6.5,
})
applyToVehicleYearTrimMatch('Tesla Model X', 2021, 'Long Range', {
  length_in: 198.3, width_in: 78.7, height_in: 66.0,
  third_row_legroom_in: 29.8, third_row_headroom_in: 37.1,
  curb_weight_lbs: 5534, torque_lb_ft: 557, zero_to_60_sec: 4.4,
})
applyToVehicleYearTrimMatch('Tesla Model X', 2021, 'Plaid', {
  length_in: 199.1, width_in: 78.7, height_in: 66.1,
  third_row_legroom_in: 32.3, third_row_headroom_in: 37.2,
  curb_weight_lbs: 5578, torque_lb_ft: 1050, zero_to_60_sec: 2.5,
})

// 2022-2026 refreshed body (shared dimensions)
for (const yr of [2022, 2023, 2024, 2025, 2026]) {
  applyToVehicleYear('Tesla Model X', yr, {
    towing_lbs: 5000,
    dc_fast_charge_kw: 250,
    dc_fast_charge_10_80_min: 32,
    length_in: 199.1, width_in: 78.7, height_in: 66.1,
    ground_clearance_in: 6.5,
    third_row_legroom_in: 32.3, third_row_headroom_in: 37.2,
  })
  applyToVehicleYearTrimMatch('Tesla Model X', yr, 'Plaid', {
    curb_weight_lbs: 5441, torque_lb_ft: 1050, zero_to_60_sec: 2.5,
  })
  applyToVehicleYearTrimMatch('Tesla Model X', yr, 'Base', {
    curb_weight_lbs: 5232, torque_lb_ft: 590, zero_to_60_sec: 3.8,
  })
}

// ═══════════════════════════════════════════════════════════════
// KIA EV9
// ═══════════════════════════════════════════════════════════════

// Shared dimensions across all years
const ev9Dims = {
  length_in: 197.2, width_in: 77.9,
  dc_fast_charge_kw: 210, dc_fast_charge_10_80_min: 24,
}

for (const yr of [2024, 2025, 2026]) {
  applyToVehicleYear('Kia EV9', yr, ev9Dims)

  // Light RWD
  applyToVehicleYearTrimMatch('Kia EV9', yr, 'Light RWD', {
    height_in: 68.9, ground_clearance_in: 7.0, towing_lbs: 2000,
    dc_fast_charge_kw: 235, dc_fast_charge_10_80_min: 20,
    curb_weight_lbs: 5093, torque_lb_ft: 258, zero_to_60_sec: 7.7,
    third_row_legroom_in: 30.8, third_row_headroom_in: 39.5,
  })
  // Light Long Range RWD
  applyToVehicleYearTrimMatch('Kia EV9', yr, 'Light Long Range', {
    height_in: 69.1, ground_clearance_in: 7.0, towing_lbs: 2000,
    curb_weight_lbs: 5313, torque_lb_ft: 258, zero_to_60_sec: 8.8,
    third_row_legroom_in: 32.0, third_row_headroom_in: 39.5,
  })
  // Wind
  applyToVehicleYearTrimMatch('Kia EV9', yr, 'Wind', {
    height_in: 69.1, ground_clearance_in: 7.8, towing_lbs: 3500,
    curb_weight_lbs: 5688, torque_lb_ft: 443, zero_to_60_sec: 5.7,
    third_row_legroom_in: 30.8, third_row_headroom_in: 39.5,
  })
  // Land (all variants)
  applyToVehicleYearTrimMatch('Kia EV9', yr, 'Land', {
    height_in: 69.1, ground_clearance_in: 7.8, towing_lbs: 5000,
    curb_weight_lbs: 5732, torque_lb_ft: 443, zero_to_60_sec: 5.7,
    third_row_legroom_in: 32.0, third_row_headroom_in: 39.5,
  })
  // GT-Line (all variants)
  applyToVehicleYearTrimMatch('Kia EV9', yr, 'GT-Line', {
    height_in: 70.1, ground_clearance_in: 7.8, towing_lbs: 5000,
    curb_weight_lbs: 5800, torque_lb_ft: 516, zero_to_60_sec: 5.0,
    third_row_legroom_in: 29.9, third_row_headroom_in: 39.5,
  })
}

// ═══════════════════════════════════════════════════════════════
// HYUNDAI IONIQ 9
// ═══════════════════════════════════════════════════════════════

const ioniq9Dims = {
  length_in: 199.2, width_in: 78.0, height_in: 70.5,
  ground_clearance_in: 6.9, third_row_legroom_in: 32.0,
  third_row_headroom_in: 39.7, dc_fast_charge_kw: 233,
  dc_fast_charge_10_80_min: 24,
}

applyToVehicleYear('Hyundai IONIQ 9', 2026, ioniq9Dims)

// S RWD
applyToVehicleYearTrimMatch('Hyundai IONIQ 9', 2026, 'S RWD', {
  towing_lbs: 3500, curb_weight_lbs: 5507, torque_lb_ft: 258, zero_to_60_sec: 8.4,
})
// SE
applyToVehicleYearTrimMatch('Hyundai IONIQ 9', 2026, 'SE', {
  towing_lbs: 5000, curb_weight_lbs: 5745, torque_lb_ft: 446, zero_to_60_sec: 6.2,
})
// SEL
applyToVehicleYearTrimMatch('Hyundai IONIQ 9', 2026, 'SEL', {
  towing_lbs: 5000, curb_weight_lbs: 5786, torque_lb_ft: 446, zero_to_60_sec: 6.2,
})
// Performance trims
for (const d of data.details) {
  if (d.vehicle === 'Hyundai IONIQ 9' && d.trim.startsWith('Performance')) {
    d.towing_lbs = 5000
    d.torque_lb_ft = 516
    d.zero_to_60_sec = 4.9
    if (d.trim.includes('Limited')) d.curb_weight_lbs = 5992
    else if (d.trim.includes('Design')) d.curb_weight_lbs = 6034
    else d.curb_weight_lbs = 6008
  }
}

// ═══════════════════════════════════════════════════════════════
// RIVIAN R1S
// ═══════════════════════════════════════════════════════════════

// Shared dimensions (all years)
applyToVehicle('Rivian R1S', {
  length_in: 200.8, width_in: 81.8, height_in: 77.3,
  ground_clearance_in: 8.8, // entry height; adjustable 8.0-14.9
  third_row_legroom_in: 32.7, third_row_headroom_in: 38.6,
  towing_lbs: 7700,
})

// Gen1 (2022-2024): DC fast 220kW, 10-80% ~43 min
for (const yr of [2022, 2023, 2024]) {
  applyToVehicleYear('Rivian R1S', yr, {
    dc_fast_charge_kw: 220, dc_fast_charge_10_80_min: 43,
  })
}

// Gen1 per-trim specs
// Quad Motor (835hp)
for (const d of data.details) {
  if (d.vehicle !== 'Rivian R1S') continue
  if (d.year >= 2022 && d.year <= 2024) {
    if (d.hp === 835) {
      d.torque_lb_ft = 908
      d.zero_to_60_sec = d.year >= 2024 ? 2.6 : 3.0
      d.curb_weight_lbs = 6890
    } else if (d.hp === 665) {
      d.torque_lb_ft = 829
      d.zero_to_60_sec = 3.5
      d.curb_weight_lbs = 6400 // estimated
    } else if (d.hp === 533) {
      d.torque_lb_ft = 610
      d.zero_to_60_sec = 4.5
      // Weight varies by battery
      if (d.battery_kwh <= 110) d.curb_weight_lbs = 6200
      else if (d.battery_kwh <= 135) d.curb_weight_lbs = 6400
      else d.curb_weight_lbs = 6650
    }
  }
}

// Gen2 (2025-2026): DC fast 220kW, faster charge times
for (const yr of [2025, 2026]) {
  applyToVehicleYear('Rivian R1S', yr, {
    dc_fast_charge_kw: 220, dc_fast_charge_10_80_min: 35,
  })
}

// Gen2 per-trim
for (const d of data.details) {
  if (d.vehicle !== 'Rivian R1S') continue
  if (d.year >= 2025) {
    const trimLc = d.trim.toLowerCase()
    if (trimLc.includes('tri') || trimLc.includes('ascend')) {
      d.torque_lb_ft = 908; d.zero_to_60_sec = 2.9; d.curb_weight_lbs = 6812
    } else if (d.hp === 665 || trimLc.includes('performance')) {
      d.torque_lb_ft = 829; d.zero_to_60_sec = 3.4; d.curb_weight_lbs = 6413
    } else if (d.hp === 533) {
      d.torque_lb_ft = 610; d.zero_to_60_sec = 4.5; d.curb_weight_lbs = 6515
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// CADILLAC ESCALADE IQ
// ═══════════════════════════════════════════════════════════════

applyToVehicle('Cadillac Escalade IQ', {
  length_in: 224.3, width_in: 85.3, height_in: 76.1,
  ground_clearance_in: 6.9,
  third_row_legroom_in: 32.3, third_row_headroom_in: 37.2,
  towing_lbs: 8000,
  dc_fast_charge_kw: 350, dc_fast_charge_10_80_min: 52,
  curb_weight_lbs: 9046,
  torque_lb_ft: 785, // Velocity Max
  zero_to_60_sec: 4.7,
})

// ═══════════════════════════════════════════════════════════════
// CADILLAC VISTIQ
// ═══════════════════════════════════════════════════════════════

applyToVehicle('Cadillac VISTIQ', {
  length_in: 205.6, width_in: 79.8, height_in: 71.0,
  ground_clearance_in: 7.2,
  third_row_legroom_in: 30.6, third_row_headroom_in: 39.5,
  towing_lbs: 5000,
  dc_fast_charge_kw: 190, dc_fast_charge_10_80_min: 30,
  curb_weight_lbs: 6326,
  torque_lb_ft: 650,
  zero_to_60_sec: 3.7,
})

// ═══════════════════════════════════════════════════════════════
// LUCID GRAVITY
// ═══════════════════════════════════════════════════════════════

const gravDims = {
  length_in: 198.2, width_in: 78.7, height_in: 65.2,
  ground_clearance_in: 7.0,
  third_row_legroom_in: 33.5, third_row_headroom_in: 37.4,
  dc_fast_charge_kw: 405,
}

applyToVehicle('Lucid Gravity', gravDims)

applyToVehicleYearTrimMatch('Lucid Gravity', 2026, 'Touring', {
  towing_lbs: 3500, curb_weight_lbs: 5794, torque_lb_ft: 811,
  zero_to_60_sec: 4.0, dc_fast_charge_10_80_min: 25,
})
applyToVehicleYearTrimMatch('Lucid Gravity', 2026, 'Grand Touring', {
  towing_lbs: 6000, curb_weight_lbs: 6048, torque_lb_ft: 909,
  zero_to_60_sec: 3.4, dc_fast_charge_10_80_min: 24,
})
applyToVehicleYearTrimMatch('Lucid Gravity', 2026, 'Dream', {
  towing_lbs: 6000, curb_weight_lbs: 6045, torque_lb_ft: 909,
  zero_to_60_sec: 3.0, dc_fast_charge_10_80_min: 24,
})

// ═══════════════════════════════════════════════════════════════
// MERCEDES-BENZ EQS SUV
// ═══════════════════════════════════════════════════════════════

applyToVehicle('Mercedes-Benz EQS SUV', {
  length_in: 201.8, width_in: 77.1, height_in: 67.6,
  ground_clearance_in: 7.1,
  third_row_legroom_in: 32.0, third_row_headroom_in: 35.4,
  dc_fast_charge_kw: 200, dc_fast_charge_10_80_min: 31,
})

// Per-trim specs
for (const d of data.details) {
  if (d.vehicle !== 'Mercedes-Benz EQS SUV') continue
  const t = d.trim
  if (t.includes('450+') || t.includes('400')) {
    // RWD or lower AWD
    if (d.drivetrain === 'RWD') {
      d.curb_weight_lbs = 5941; d.towing_lbs = 1653; d.torque_lb_ft = 419; d.zero_to_60_sec = 6.5
    } else {
      d.curb_weight_lbs = 6184; d.towing_lbs = 3968; d.torque_lb_ft = 590; d.zero_to_60_sec = 6.2
      if (t.includes('400')) { d.curb_weight_lbs = 6305; d.zero_to_60_sec = 5.9 }
    }
  } else if (t.includes('580') || t.includes('550')) {
    d.curb_weight_lbs = t.includes('550') ? 6327 : 6195
    d.towing_lbs = 3968; d.torque_lb_ft = 633; d.zero_to_60_sec = t.includes('550') ? 4.6 : 4.5
  } else if (t.includes('Maybach') || t.includes('680')) {
    d.curb_weight_lbs = 6393; d.towing_lbs = 3968; d.torque_lb_ft = 701; d.zero_to_60_sec = 4.3
    d.height_in = 67.8
    d.third_row_legroom_in = null; d.third_row_headroom_in = null // Maybach is 2-row only
  }
  // 450 4MATIC (no +)
  if (t === 'EQS 450 4MATIC') {
    d.curb_weight_lbs = 6184; d.towing_lbs = 3968; d.torque_lb_ft = 590; d.zero_to_60_sec = 6.2
  }
}

// ═══════════════════════════════════════════════════════════════
// VOLKSWAGEN ID. BUZZ
// ═══════════════════════════════════════════════════════════════

applyToVehicle('Volkswagen ID. Buzz', {
  length_in: 195.4, width_in: 78.1, height_in: 76.2,
  ground_clearance_in: 6.3,
  third_row_legroom_in: 42.4, third_row_headroom_in: 38.7,
  dc_fast_charge_kw: 200, dc_fast_charge_10_80_min: 26,
})

for (const d of data.details) {
  if (d.vehicle !== 'Volkswagen ID. Buzz') continue
  if (d.trim.includes('4MOTION')) {
    d.towing_lbs = 3500; d.curb_weight_lbs = 6197; d.torque_lb_ft = 512; d.zero_to_60_sec = 5.5
  } else {
    d.towing_lbs = 2600; d.curb_weight_lbs = 5968; d.torque_lb_ft = 413; d.zero_to_60_sec = 7.4
  }
}

// ═══════════════════════════════════════════════════════════════
// VOLVO EX90
// ═══════════════════════════════════════════════════════════════

applyToVehicle('Volvo EX90', {
  length_in: 198.3, width_in: 77.3, height_in: 68.8,
  ground_clearance_in: 8.5,
  third_row_legroom_in: 31.9, third_row_headroom_in: 35.8,
  dc_fast_charge_kw: 250, dc_fast_charge_10_80_min: 30,
  towing_lbs: 4850,
})

for (const d of data.details) {
  if (d.vehicle !== 'Volvo EX90') continue
  const t = d.trim.toLowerCase()
  if (t.includes('single motor')) {
    d.curb_weight_lbs = 5750; d.torque_lb_ft = 354; d.zero_to_60_sec = 7.3
  } else if (t.includes('performance')) {
    d.curb_weight_lbs = 6197; d.torque_lb_ft = 671; d.zero_to_60_sec = 4.7
  } else if (t.includes('twin motor')) {
    d.curb_weight_lbs = 6040; d.torque_lb_ft = 568; d.zero_to_60_sec = 5.7
  }
}

// ═══════════════════════════════════════════════════════════════
// TOYOTA HIGHLANDER EV (2027, partial)
// ═══════════════════════════════════════════════════════════════

applyToVehicle('Toyota Highlander EV', {
  length_in: 198.8, width_in: 78.3, height_in: 67.3,
  ground_clearance_in: 8.0,
  dc_fast_charge_kw: 150, dc_fast_charge_10_80_min: 30,
})

for (const d of data.details) {
  if (d.vehicle !== 'Toyota Highlander EV') continue
  if (d.trim.includes('XLE') && d.drivetrain === 'FWD') {
    d.torque_lb_ft = 198; d.towing_lbs = 2600
  } else if (d.trim.includes('XLE')) {
    d.torque_lb_ft = 323; d.towing_lbs = 2600
  } else if (d.trim.includes('Limited')) {
    d.torque_lb_ft = 323; d.towing_lbs = 3500
  }
}

// ═══════════════════════════════════════════════════════════════
// TESLA MODEL Y (3-Row) & SUBARU - minimal data
// ═══════════════════════════════════════════════════════════════

for (const d of data.details) {
  if (d.vehicle === 'Tesla Model Y Long (Asia)' || d.vehicle === 'Tesla Model Y (3-Row)') {
    d.length_in = 195.6; d.width_in = 75.6; d.height_in = 65.7
    d.ground_clearance_in = 6.6; d.dc_fast_charge_kw = 250
    d.dc_fast_charge_10_80_min = 28; d.torque_lb_ft = 413
  }
}

// ═══════════════════════════════════════════════════════════════
// VERIFY
// ═══════════════════════════════════════════════════════════════

let nullCount = 0
let totalFields = 0
for (const d of data.details) {
  for (const f of NEW_FIELDS) {
    totalFields++
    if (d[f] === null || d[f] === undefined) nullCount++
  }
}

console.log(`\nPopulated ${totalFields - nullCount} of ${totalFields} new field values (${nullCount} remaining nulls)`)

// Show which vehicles still have nulls
const nullByVehicle = {}
for (const d of data.details) {
  for (const f of NEW_FIELDS) {
    if (d[f] === null || d[f] === undefined) {
      if (!nullByVehicle[d.vehicle]) nullByVehicle[d.vehicle] = new Set()
      nullByVehicle[d.vehicle].add(f)
    }
  }
}
for (const [v, fields] of Object.entries(nullByVehicle)) {
  console.log(`  ${v}: nulls in [${[...fields].join(', ')}]`)
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n')
console.log('\nWritten to', PATH)
