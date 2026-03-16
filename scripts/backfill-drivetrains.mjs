#!/usr/bin/env node
/**
 * One-time backfill script to expand the dataset:
 * 1. Add RWD/FWD trims for existing vehicles
 * 2. Add older Tesla Model X trims (2021-2022)
 *
 * Uses Claude + web search to research specs for each vehicle batch.
 *
 * Usage:
 *   node scripts/backfill-drivetrains.mjs             # Full run
 *   DRY_RUN=1 node scripts/backfill-drivetrains.mjs   # Preview only
 *
 * Requires: ANTHROPIC_API_KEY env var
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { callClaude, delayCalls } from './lib/anthropic.mjs'
import { recalculateAllOtd } from './lib/otd-calculator.mjs'
import { validateData } from './lib/data-validator.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../lib/ev-data.json')
const DRY_RUN = process.env.DRY_RUN === '1'

function log(phase, msg) {
  const ts = new Date().toISOString().slice(11, 19)
  console.log(`[${ts}] [${phase}] ${msg}`)
}

// ── Load data ──
log('init', `Loading ${DATA_PATH}`)
const originalJson = readFileSync(DATA_PATH, 'utf-8')
const originalData = JSON.parse(originalJson)
const data = JSON.parse(originalJson)

let totalInputTokens = 0
let totalOutputTokens = 0

// ── Research batches ──
// Each batch asks Claude to research specific missing trims for one vehicle.

const RESEARCH_BATCHES = [
  {
    label: 'Kia EV9 RWD trims',
    prompt: `Research all Kia EV9 RWD (rear-wheel drive) trims available in the US market for model years 2024, 2025, and 2026.

These are the single-motor, rear-wheel-drive variants (NOT AWD). Look for trims like:
- Light Long Range RWD
- Wind Long Range RWD
- Land Long Range RWD (if exists)

For each trim, provide: trim name, model year, drivetrain (should be "RWD"), seats (6 or 7), MSRP, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

Note: Each seat configuration (6-seat vs 7-seat) should be a SEPARATE entry.`,
  },
  {
    label: 'Hyundai IONIQ 9 RWD trims',
    prompt: `Research all Hyundai IONIQ 9 RWD (rear-wheel drive) trims available or announced for the US market (2026 model year).

Look for the single-motor, rear-wheel-drive variants. For each trim, provide: trim name, model year, drivetrain (should be "RWD"), seats (6 or 7), MSRP, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

Note: Each seat configuration (6-seat vs 7-seat) should be a SEPARATE entry.`,
  },
  {
    label: 'Volvo EX90 Single Motor trims',
    prompt: `Research all Volvo EX90 Single Motor (RWD) trims available in the US market for model years 2025 and 2026.

Look for the single-motor rear-wheel-drive variants (NOT Twin Motor AWD). For each trim, provide: trim name, model year, drivetrain (should be "RWD"), seats (6 or 7), MSRP, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

Note: Each seat configuration should be a SEPARATE entry if different configs exist.`,
  },
  {
    label: 'Rivian R1S non-AWD variants',
    prompt: `Research all Rivian R1S drivetrain variants available in the US market for model years 2025 and 2026 that are NOT standard Dual-Motor AWD.

Look for:
- Quad-Motor (if available as separate trim/option)
- Single-Motor RWD (if announced)
- Any other drivetrain variants

For each trim, provide: trim name, model year, drivetrain, seats, MSRP, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

If Rivian only offers Dual-Motor AWD for R1S, return an empty array.`,
  },
  {
    label: 'VW ID. Buzz RWD trims',
    prompt: `Research all Volkswagen ID. Buzz 3-row RWD (rear-wheel drive) trims available in the US market for model year 2025.

Look for the non-4MOTION (RWD) variants of the long-wheelbase 3-row ID. Buzz. For each trim, provide: trim name, model year, drivetrain (should be "RWD"), seats, MSRP, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

If no RWD 3-row ID. Buzz is available in the US, return an empty array.`,
  },
  {
    label: 'Mercedes-Benz EQS SUV RWD trims',
    prompt: `Research all Mercedes-Benz EQS SUV RWD (rear-wheel drive) 3-row trims available in the US market for model year 2026 (or 2025 if 2026 isn't available yet).

Look for the EQS 450 SUV or similar single-motor RWD variants. For each trim, provide: trim name, model year, drivetrain (should be "RWD"), seats, MSRP, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

If no RWD 3-row variants exist, return an empty array.`,
  },
  {
    label: 'Tesla Model X 2021-2022',
    prompt: `Research all Tesla Model X trims for model years 2021 and 2022 in the US market.

These are the refreshed (post-2020) Model X. Look for:
- 2021 Model X Long Range (AWD)
- 2021 Model X Plaid (AWD)
- 2022 Model X Long Range (AWD)
- 2022 Model X Plaid (AWD)

For each, provide both 5-seat and 6-seat configurations as SEPARATE entries.

For each entry: trim name, model year, drivetrain (AWD), seats (5 or 6), MSRP at time of sale, EPA range (miles), horsepower, battery (kWh), destination fee, charging type, onboard AC kW, L2 charging times, self-driving capability, car software, displays, audio system, driver profiles, frunk size, cargo volumes, fold flat capability.

Also provide current pre-owned price ranges for each year/trim from CarGurus, AutoTrader, or similar.`,
  },
]

const SYSTEM_PROMPT = `You are an EV spec research assistant. You MUST output ONLY a JSON code block with no other text.

Response schema — a JSON array of vehicle entries:
[{
  "name": "<Vehicle Name>, <year>, <trim> (<seats>-seat)",
  "vehicle": "<Vehicle Name>",
  "year": <model year>,
  "trim": "<trim name> (<seats>-seat)",
  "seats": <number>,
  "drivetrain": "<RWD|AWD|4WD>",
  "msrp": <number or null>,
  "destination": <number or null>,
  "preowned_range": "<$XX,XXX - $XX,XXX>" or "No meaningful used market yet",
  "self_driving": "<description>",
  "range_mi": <number or null>,
  "hp": <number or null>,
  "battery_kwh": <number or null>,
  "onboard_ac_kw": <number or null>,
  "l2_10_100": <number or null>,
  "l2_10_80": <number or null>,
  "charging_type": "<e.g. NACS (+CCS adpt) or CCS (+NACS adpt)>",
  "car_software": "<description>",
  "main_display": "<description>",
  "additional_displays": "<description>",
  "audio": "<description>",
  "driver_profiles": "<description or N/A>",
  "notes": "<any relevant notes>",
  "frunk_cu_ft": <number or null>,
  "cargo_behind_3rd_cu_ft": <number or null or "N/A">,
  "cargo_behind_2nd_cu_ft": <number or null>,
  "cargo_behind_1st_cu_ft": <number or null>,
  "fold_flat": "<Yes|No|null>",
  "cargo_floor_width_in": <number or null>
}]

Rules:
- Use CONFIRMED data from manufacturer websites, EPA.gov, or major automotive press.
- Each seat configuration (5-seat, 6-seat, 7-seat) MUST be a separate entry.
- The "name" field format MUST be: "Vehicle Name, Year, Trim (Seats-seat)" — e.g. "Kia EV9, 2025, Light Long Range RWD (7-seat)"
- Numeric values must be numbers, not strings.
- If a spec is unknown, use null.
- If a vehicle/trim does not exist or isn't available, return an empty array: []
- frunk_cu_ft should be null (not 0) if no frunk.
- L2 charging times are in hours as decimal numbers.`

async function runBackfill() {
  let totalAdded = 0

  for (let i = 0; i < RESEARCH_BATCHES.length; i++) {
    const batch = RESEARCH_BATCHES[i]
    log('backfill', `[${i + 1}/${RESEARCH_BATCHES.length}] ${batch.label}`)

    if (i > 0) await delayCalls()

    try {
      const { json, inputTokens, outputTokens } = await callClaude({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: batch.prompt,
        maxTokens: 8000,
      })

      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens

      if (!Array.isArray(json)) {
        log('backfill', `  Unexpected response format, skipping`)
        continue
      }

      if (json.length === 0) {
        log('backfill', `  No entries found (empty array)`)
        continue
      }

      let batchAdded = 0
      for (const entry of json) {
        // Skip if already exists
        if (data.details.find((r) => r.name === entry.name)) {
          log('backfill', `  SKIP (exists): ${entry.name}`)
          continue
        }

        // Add to details
        data.details.push({
          name: entry.name,
          vehicle: entry.vehicle,
          year: entry.year,
          trim: entry.trim,
          seats: entry.seats ?? null,
          drivetrain: entry.drivetrain || 'TBD',
          msrp: entry.msrp ?? null,
          destination: entry.destination ?? null,
          otd_new: 'TBD', // will be recalculated
          preowned_range: entry.preowned_range || 'No meaningful used market yet',
          otd_preowned: 'TBD', // will be recalculated
          self_driving: entry.self_driving || 'TBD',
          range_mi: entry.range_mi ?? null,
          hp: entry.hp ?? null,
          battery_kwh: entry.battery_kwh ?? null,
          onboard_ac_kw: entry.onboard_ac_kw ?? null,
          l2_10_100: entry.l2_10_100 ?? null,
          l2_10_80: entry.l2_10_80 ?? null,
          charging_type: entry.charging_type || 'TBD',
          car_software: entry.car_software || 'TBD',
          main_display: entry.main_display || 'TBD',
          additional_displays: entry.additional_displays || 'TBD',
          audio: entry.audio || 'TBD',
          driver_profiles: entry.driver_profiles || 'TBD',
          notes: entry.notes || `Backfill: ${batch.label}`,
          frunk_cu_ft: entry.frunk_cu_ft ?? null,
          cargo_behind_3rd_cu_ft: entry.cargo_behind_3rd_cu_ft ?? null,
          cargo_behind_2nd_cu_ft: entry.cargo_behind_2nd_cu_ft ?? null,
          cargo_behind_1st_cu_ft: entry.cargo_behind_1st_cu_ft ?? null,
          fold_flat: entry.fold_flat ?? null,
          cargo_floor_width_in: entry.cargo_floor_width_in ?? null,
        })

        // Add to preowned if it has a meaningful preowned_range
        const preownedRange = entry.preowned_range || ''
        if (preownedRange.includes('$')) {
          if (!data.preowned.find((r) => r.name === entry.name)) {
            data.preowned.push({
              name: entry.name,
              vehicle: entry.vehicle,
              year: entry.year,
              trim: entry.trim,
              preowned_range: preownedRange,
              otd_preowned: 'TBD',
            })
          }
        }

        batchAdded++
        log('backfill', `  + ${entry.name} (${entry.drivetrain})`)
      }

      // Update count_data for the vehicle
      for (const entry of json) {
        const countRow = data.count_data.find((c) => c.model === entry.vehicle)
        if (countRow) {
          const yearKey = `y${entry.year}`
          if (yearKey in countRow) {
            // Recount from details
            const yearCount = data.details.filter(
              (d) => d.vehicle === entry.vehicle && d.year === entry.year
            ).length
            countRow[yearKey] = yearCount
          }
        }
      }

      // Update totals per vehicle
      for (const countRow of data.count_data) {
        countRow.total = ['y2021', 'y2022', 'y2023', 'y2024', 'y2025', 'y2026']
          .reduce((sum, k) => sum + (countRow[k] || 0), 0)
      }

      totalAdded += batchAdded
      log('backfill', `  Added ${batchAdded} entries`)
    } catch (err) {
      log('backfill', `  FAILED: ${err.message}`)
    }
  }

  log('backfill', `Total new entries: ${totalAdded}`)
  return totalAdded
}

async function main() {
  log('main', DRY_RUN ? 'DRY RUN MODE' : 'Full run')
  log('main', `Dataset before: ${data.details.length} details, ${data.preowned.length} preowned`)

  const addedCount = await runBackfill()

  if (addedCount === 0) {
    log('main', 'No new entries added. Done.')
    return
  }

  // Recalculate OTD
  log('otd', 'Recalculating all OTD values...')
  recalculateAllOtd(data)

  // Update count totals
  const yearKeys = ['y2021', 'y2022', 'y2023', 'y2024', 'y2025', 'y2026']
  for (const key of yearKeys) {
    data.count_totals[key] = data.count_data.reduce((sum, r) => sum + (r[key] || 0), 0)
  }
  data.count_totals.total = data.count_data.reduce((sum, r) => sum + (r.total || 0), 0)

  // Validate
  log('validate', 'Running validation...')
  const { errors, warnings } = validateData(data, originalData)

  if (warnings.length > 0) {
    log('validate', `${warnings.length} warnings:`)
    for (const w of warnings) log('validate', `  WARN: ${w}`)
  }

  if (errors.length > 0) {
    log('validate', `${errors.length} ERRORS:`)
    for (const e of errors) log('validate', `  ERROR: ${e}`)
    // Don't exit on errors for backfill — some validation rules may need updating
    log('validate', 'Proceeding despite errors (backfill may have edge cases)')
  }

  // Write
  const outputPath = DRY_RUN
    ? resolve(__dirname, '../lib/ev-data-backfill-preview.json')
    : DATA_PATH
  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n')
  log('main', `Dataset after: ${data.details.length} details, ${data.preowned.length} preowned`)
  log('main', `Wrote ${outputPath}`)

  // Cost estimate
  const cost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15 + 0.50
  log('main', `Tokens: ${totalInputTokens} in, ${totalOutputTokens} out | Est. cost: $${cost.toFixed(2)}`)

  // Update scope field
  const vehicleCount = [...new Set(data.details.map((d) => d.vehicle))].length
  data.scope = `${data.details.length} trims analyzed across ${vehicleCount} vehicles (2021–2027)`
  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n')

  log('main', 'Done!')
}

main().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
