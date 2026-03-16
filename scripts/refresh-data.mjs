#!/usr/bin/env node
/**
 * Monthly EV data refresh pipeline.
 *
 * Runs 4 research phases via Claude + web search, applies updates to ev-data.json,
 * validates the result, and creates a GitHub PR for review.
 *
 * Usage:
 *   node scripts/refresh-data.mjs             # Full run (creates PR)
 *   DRY_RUN=1 node scripts/refresh-data.mjs   # Preview only (writes ev-data-preview.json)
 *
 * Requires: ANTHROPIC_API_KEY env var
 * For PR creation: GITHUB_TOKEN env var (or gh CLI auth)
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { callClaude, delayCalls } from './lib/anthropic.mjs'
import { recalculateAllOtd } from './lib/otd-calculator.mjs'
import { validateData } from './lib/data-validator.mjs'
import { buildChangelog, formatPrBody, createPR } from './lib/pr-builder.mjs'

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
const data = JSON.parse(originalJson) // working copy

let totalInputTokens = 0
let totalOutputTokens = 0

// ── Phase 1: Pre-owned Pricing ──
async function phasePreownedPricing() {
  log('phase1', 'Researching pre-owned pricing...')

  const vehicleSummary = data.preowned.map((r) =>
    `${r.name} | current: ${r.preowned_range}`
  ).join('\n')

  try {
    const { json, inputTokens, outputTokens } = await callClaude({
      systemPrompt: `You are a used car market research assistant. You MUST output ONLY a JSON code block with no other text.

Response schema — a JSON array of objects:
[{ "name": "<exact name from input>", "preowned_range": "$XX,XXX - $XX,XXX" }]

Rules:
- Only include entries where you found updated pricing that differs from the current range.
- Use realistic dealer listing price ranges from sites like CarGurus, AutoTrader, Cars.com, or KBB.
- Prices should reflect fair market value ranges, not outliers.
- If you cannot find reliable data for a vehicle, omit it entirely.
- The "name" field must EXACTLY match the name from the input data.`,

      userMessage: `Search the web for current pre-owned/used pricing for the following electric vehicles. These are AWD 3-row electric SUVs. Return updated price ranges ONLY where they differ significantly (>$2,000 change) from the current values.

Current pre-owned data:
${vehicleSummary}`,

      maxTokens: 4000,
    })

    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens

    if (!Array.isArray(json)) {
      log('phase1', 'Unexpected response format, skipping')
      return
    }

    let updateCount = 0
    for (const update of json) {
      // Update preowned table
      const preownedRow = data.preowned.find((r) => r.name === update.name)
      if (preownedRow && update.preowned_range) {
        preownedRow.preowned_range = update.preowned_range
        updateCount++
      }

      // Update details table
      const detailRow = data.details.find((r) => r.name === update.name)
      if (detailRow && update.preowned_range) {
        detailRow.preowned_range = update.preowned_range
      }
    }

    log('phase1', `Applied ${updateCount} pricing updates`)
  } catch (err) {
    log('phase1', `FAILED: ${err.message} — skipping phase`)
  }
}

// ── Phase 2: TBD Field Resolution ──
async function phaseTbdResolution() {
  log('phase2', 'Checking for TBD field resolution...')

  const tbdRows = data.details.filter((r) => {
    return JSON.stringify(r).toLowerCase().includes('tbd')
  })

  if (tbdRows.length === 0) {
    log('phase2', 'No TBD fields found, skipping')
    return
  }

  const tbdSummary = tbdRows.map((r) => {
    const tbdFields = Object.entries(r)
      .filter(([, v]) => typeof v === 'string' && v.toLowerCase().includes('tbd'))
      .map(([k, v]) => `${k}: "${v}"`)
    return `${r.name}\n  TBD fields: ${tbdFields.join(', ')}`
  }).join('\n\n')

  try {
    const { json, inputTokens, outputTokens } = await callClaude({
      systemPrompt: `You are an EV spec research assistant. You MUST output ONLY a JSON code block with no other text.

Response schema — a JSON object keyed by vehicle name:
{
  "<exact name>": { "<field>": <new_value> },
  ...
}

Rules:
- Only include entries where you found confirmed, official specs to replace TBD values.
- Values should come from manufacturer websites, EPA ratings, or major automotive press.
- If a spec is still unannounced or unconfirmed, do NOT include it.
- Use the exact name from the input as the key.
- Numeric values should be numbers, not strings.`,

      userMessage: `Search the web for any newly released or confirmed specs for the following electric vehicles that currently have TBD (To Be Determined) values. These are AWD 3-row electric SUVs in the US market.

Vehicles with TBD fields:
${tbdSummary}`,

      maxTokens: 3000,
    })

    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens

    if (typeof json !== 'object' || Array.isArray(json)) {
      log('phase2', 'Unexpected response format, skipping')
      return
    }

    let updateCount = 0
    for (const [name, updates] of Object.entries(json)) {
      const row = data.details.find((r) => r.name === name)
      if (!row) continue
      for (const [field, value] of Object.entries(updates)) {
        if (value != null && row[field] !== undefined) {
          row[field] = value
          updateCount++
        }
      }
    }

    log('phase2', `Resolved ${updateCount} TBD fields`)
  } catch (err) {
    log('phase2', `FAILED: ${err.message} — skipping phase`)
  }
}

// ── Phase 3: Spec Corrections ──
async function phaseSpecCorrections() {
  log('phase3', 'Checking for spec corrections...')

  const specSummary = data.details.map((r) =>
    `${r.name} | msrp: ${r.msrp} | range: ${r.range_mi} | hp: ${r.hp} | battery: ${r.battery_kwh} | charging: ${r.charging_type}`
  ).join('\n')

  try {
    const { json, inputTokens, outputTokens } = await callClaude({
      systemPrompt: `You are an EV spec verification assistant. You MUST output ONLY a JSON code block with no other text.

Response schema — a JSON array of corrections:
[{ "name": "<exact name>", "field": "<field_name>", "old_value": <current>, "new_value": <corrected>, "source": "<where you found this>" }]

Rules:
- Only include corrections where you have HIGH CONFIDENCE the current value is wrong.
- Sources must be official: manufacturer websites, EPA.gov, or major automotive press (Car and Driver, Edmunds, MotorTrend).
- MSRP changes must reflect the current official price, not sale prices or incentives.
- Range values must be EPA-rated, not manufacturer-estimated.
- If no corrections are needed, return an empty array: []
- The "name" field must EXACTLY match the name from the input data.

CRITICAL — seat configurations:
- This dataset uses SEPARATE ROWS for each seat configuration of the same vehicle (e.g. "Tesla Model X, 2026, Base (5-seat)" and "Tesla Model X, 2026, Base (6-seat)" are two different entries).
- NEVER change the "seats" field. Each row's seat count is intentionally set and defines that configuration.
- NEVER change "cargo_behind_3rd_cu_ft", "cargo_behind_2nd_cu_ft", "cargo_behind_1st_cu_ft", or "fold_flat" — these are specific to each seat configuration and are correct as-is.
- Only correct fields like msrp, range_mi, hp, battery_kwh, and charging_type.`,

      userMessage: `Cross-check the following EV specs against current manufacturer websites and EPA data. Return corrections ONLY for values that are clearly wrong. These are AWD 3-row electric SUVs.

Note: This dataset tracks multiple seat configurations per vehicle as separate rows (e.g. 5-seat, 6-seat, 7-seat). Do NOT suggest changes to seats or cargo fields — those are intentionally different per configuration.

Current specs:
${specSummary}`,

      maxTokens: 3000,
    })

    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens

    if (!Array.isArray(json)) {
      log('phase3', 'Unexpected response format, skipping')
      return
    }

    // Fields that must never be changed by the pipeline (seat-config-specific)
    const PROTECTED_FIELDS = new Set([
      'seats', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft',
      'cargo_behind_1st_cu_ft', 'fold_flat', 'cargo_floor_width_in',
    ])

    let updateCount = 0
    for (const correction of json) {
      const row = data.details.find((r) => r.name === correction.name)
      if (!row || !correction.field || correction.new_value === undefined) continue
      if (PROTECTED_FIELDS.has(correction.field)) {
        log('phase3', `  SKIPPED (protected field): ${correction.name}: ${correction.field} ${correction.old_value} -> ${correction.new_value}`)
        continue
      }
      if (row[correction.field] !== undefined) {
        row[correction.field] = correction.new_value
        updateCount++
        log('phase3', `  ${correction.name}: ${correction.field} ${correction.old_value} -> ${correction.new_value} (${correction.source})`)
      }
    }

    log('phase3', `Applied ${updateCount} corrections`)
  } catch (err) {
    log('phase3', `FAILED: ${err.message} — skipping phase`)
  }
}

// ── Phase 4: New Vehicle Detection ──
async function phaseNewVehicles() {
  log('phase4', 'Scanning for new 3-row EV SUVs...')

  const currentVehicles = [...new Set(data.details.map((r) => r.vehicle))].sort()

  try {
    const { json, inputTokens, outputTokens } = await callClaude({
      systemPrompt: `You are an EV market research assistant. You MUST output ONLY a JSON code block with no other text.

Response schema — a JSON array of new vehicles:
[{
  "vehicle": "<full vehicle name>",
  "year": <model year>,
  "trims": [{ "trim": "<trim name>", "msrp": <number or null>, "range_mi": <number or null>, "hp": <number or null>, "battery_kwh": <number or null>, "seats": <number or null> }],
  "confidence": "high" | "medium",
  "source": "<where you found this>"
}]

Rules:
- Only include vehicles that are AWD, 3-row, fully electric SUVs available or officially announced for the US market.
- Do NOT include vehicles already in the tracked list.
- Do NOT include plug-in hybrids (PHEV) — only fully electric (BEV).
- Only include vehicles with at least a "medium" confidence level (officially announced with some specs).
- If no new vehicles are found, return an empty array: []`,

      userMessage: `Search the web for any 3-row all-wheel-drive fully electric SUVs that are newly announced, upcoming, or recently released for the US market that are NOT in this list:

Currently tracked: ${currentVehicles.join(', ')}

Look for new entrants from manufacturers like Subaru, Mercedes, BMW, Cadillac, Ford, Nissan, Honda, etc.`,

      maxTokens: 2000,
    })

    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens

    if (!Array.isArray(json)) {
      log('phase4', 'Unexpected response format, skipping')
      return
    }

    let addedCount = 0
    for (const vehicle of json) {
      if (!vehicle.trims || vehicle.trims.length === 0) continue

      for (const trim of vehicle.trims) {
        const name = `${vehicle.vehicle}, ${vehicle.year}, ${trim.trim || 'Base'}`

        // Skip if somehow already exists
        if (data.details.find((r) => r.name === name)) continue

        // Create skeleton entry
        data.details.push({
          name,
          vehicle: vehicle.vehicle,
          year: vehicle.year,
          trim: trim.trim || 'Base',
          seats: trim.seats ?? null,
          drivetrain: 'AWD',
          msrp: trim.msrp ?? 'TBD',
          destination: null,
          otd_new: 'TBD',
          preowned_range: 'No meaningful used market yet',
          otd_preowned: 'TBD',
          self_driving: 'TBD',
          range_mi: trim.range_mi ?? 'TBD',
          hp: trim.hp ?? 'TBD',
          battery_kwh: trim.battery_kwh ?? 'TBD',
          onboard_ac_kw: null,
          l2_10_100: null,
          l2_10_80: null,
          charging_type: 'TBD',
          car_software: 'TBD',
          main_display: 'TBD',
          additional_displays: 'TBD',
          audio: 'TBD',
          driver_profiles: 'TBD',
          notes: `Auto-detected (${vehicle.confidence} confidence). Source: ${vehicle.source}. Needs human review.`,
          frunk_cu_ft: null,
          cargo_behind_3rd_cu_ft: null,
          cargo_behind_2nd_cu_ft: null,
          cargo_behind_1st_cu_ft: null,
          fold_flat: null,
          cargo_floor_width_in: null,
        })
        addedCount++
        log('phase4', `  Added: ${name} (${vehicle.confidence} confidence)`)
      }

      // Add to count_data if vehicle not already tracked
      if (!data.count_data.find((c) => c.model === vehicle.vehicle)) {
        data.count_data.push({
          model: vehicle.vehicle,
          y2023: 0, y2024: 0, y2025: 0, y2026: 0,
          total: 0,
        })
      }
    }

    log('phase4', `Added ${addedCount} new vehicle entries`)
  } catch (err) {
    log('phase4', `FAILED: ${err.message} — skipping phase`)
  }
}

// ── Phase 5: Gap Filling ──
// Scans every entry for null/empty fields that should have data and asks Claude to research them.
async function phaseGapFilling() {
  log('phase5', 'Scanning for data gaps (null/empty fields)...')

  // Note: 'seats' excluded — seat count is set at entry creation and defines the configuration.
  // Cargo/fold fields are included here because Phase 5 only fills genuinely empty fields (null/TBD),
  // not overwrite existing values.
  const fillableFields = [
    'onboard_ac_kw', 'l2_10_100', 'l2_10_80', 'charging_type',
    'frunk_cu_ft', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft',
    'cargo_behind_1st_cu_ft', 'fold_flat', 'cargo_floor_width_in',
    'self_driving', 'car_software', 'main_display', 'additional_displays',
    'audio', 'hp', 'battery_kwh', 'range_mi',
  ]

  // Find rows with gaps
  const gapRows = []
  for (const row of data.details) {
    const gaps = fillableFields.filter((f) => {
      const val = row[f]
      return val === null || val === '' || (typeof val === 'string' && val === 'TBD')
    })
    if (gaps.length > 0) {
      gapRows.push({ name: row.name, vehicle: row.vehicle, year: row.year, trim: row.trim, gaps })
    }
  }

  if (gapRows.length === 0) {
    log('phase5', 'No gaps found')
    return
  }

  log('phase5', `Found ${gapRows.length} entries with data gaps`)

  // Only send rows that have gaps worth researching (more than just cargo_floor_width_in)
  const worthResearching = gapRows.filter((r) =>
    r.gaps.some((g) => g !== 'cargo_floor_width_in')
  )

  if (worthResearching.length === 0) {
    log('phase5', 'All gaps are non-critical (cargo_floor_width_in only), skipping')
    return
  }

  const gapSummary = worthResearching.map((r) =>
    `${r.name}\n  Missing: ${r.gaps.join(', ')}`
  ).join('\n\n')

  try {
    const { json, inputTokens, outputTokens } = await callClaude({
      systemPrompt: `You are an EV spec research assistant filling in missing data. You MUST output ONLY a JSON code block with no other text.

Response schema — a JSON object keyed by vehicle name:
{
  "<exact name>": { "<field>": <value>, ... },
  ...
}

Rules:
- Only include fields where you found CONFIRMED data from official sources.
- Numeric fields (onboard_ac_kw, l2_10_100, l2_10_80, frunk_cu_ft, cargo volumes, cargo_floor_width_in, hp, battery_kwh, range_mi, seats) must be numbers.
- frunk_cu_ft should be null (not 0) if the vehicle has no frunk.
- cargo_behind_3rd_cu_ft should be "N/A" for 5-seat vehicles with no 3rd row.
- fold_flat should be "Yes" or "No".
- charging_type should use the format: "PORT (+ALT detail)" e.g. "NACS (+CCS adpt)" or "CCS (+NACS adpt)".
- L2 charging times (l2_10_100 and l2_10_80) are in hours as decimal numbers.
- If you cannot find reliable data for a field, do NOT include it.
- The "name" key must EXACTLY match the name from the input.`,

      userMessage: `Search the web to fill in missing specifications for these AWD 3-row electric SUVs. Check manufacturer websites, EPA.gov, Edmunds, Car and Driver, and MotorTrend.

Entries with missing data:
${gapSummary}`,

      maxTokens: 4000,
    })

    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens

    if (typeof json !== 'object' || Array.isArray(json)) {
      log('phase5', 'Unexpected response format, skipping')
      return
    }

    let fillCount = 0
    for (const [name, updates] of Object.entries(json)) {
      const row = data.details.find((r) => r.name === name)
      if (!row) continue
      for (const [field, value] of Object.entries(updates)) {
        if (value != null && row[field] !== undefined && fillableFields.includes(field)) {
          const oldVal = row[field]
          // Only fill if currently null, empty, or TBD
          if (oldVal === null || oldVal === '' || oldVal === 'TBD') {
            row[field] = value
            fillCount++
            log('phase5', `  ${name}: ${field} = ${value}`)
          }
        }
      }
    }

    log('phase5', `Filled ${fillCount} data gaps`)
  } catch (err) {
    log('phase5', `FAILED: ${err.message} — skipping phase`)
  }
}

// ── Main pipeline ──
async function main() {
  log('main', DRY_RUN ? 'DRY RUN MODE — no git/PR operations' : 'Full run')
  log('main', `Dataset: ${data.details.length} details, ${data.preowned.length} preowned`)

  // Run all 5 phases sequentially with delays between API calls
  await phasePreownedPricing()
  await delayCalls()
  await phaseTbdResolution()
  await delayCalls()
  await phaseSpecCorrections()
  await delayCalls()
  await phaseNewVehicles()
  await delayCalls()
  await phaseGapFilling()

  // Recalculate all OTD values
  log('otd', 'Recalculating all OTD values...')
  recalculateAllOtd(data)

  // Update count totals
  const yearKeys = ['y2023', 'y2024', 'y2025', 'y2026']
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
    log('validate', `${errors.length} ERRORS — aborting:`)
    for (const e of errors) log('validate', `  ERROR: ${e}`)
    process.exit(1)
  }

  // Check for changes
  const changelog = buildChangelog(originalData, data)
  const totalChanges = changelog.pricing.length + changelog.specs.length +
    changelog.newVehicles.length + changelog.tbdResolved.length + changelog.gapsFilled.length

  if (totalChanges === 0 && changelog.otdRecalculated === 0) {
    log('main', 'No changes detected. Nothing to do.')
    return
  }

  log('main', `Changes: ${changelog.pricing.length} pricing, ${changelog.specs.length} specs, ${changelog.tbdResolved.length} TBD resolved, ${changelog.gapsFilled.length} gaps filled, ${changelog.newVehicles.length} new vehicles, ${changelog.otdRecalculated} OTD recalculated`)

  // Estimate cost (Sonnet: $3/MTok input, $15/MTok output + ~$0.01/search)
  const estimatedCost = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15 + 0.30
  log('main', `Token usage: ${totalInputTokens} input, ${totalOutputTokens} output | Est. cost: $${estimatedCost.toFixed(2)}`)

  // Write updated JSON
  const outputPath = DRY_RUN ? resolve(__dirname, '../lib/ev-data-preview.json') : DATA_PATH
  const outputJson = JSON.stringify(data, null, 2) + '\n'
  writeFileSync(outputPath, outputJson)
  log('main', `Wrote ${outputPath}`)

  if (DRY_RUN) {
    log('main', 'Dry run complete. Review ev-data-preview.json for changes.')
    return
  }

  // Create PR
  const prBody = formatPrBody(changelog, estimatedCost)
  const prUrl = createPR(DATA_PATH, prBody)
  log('main', `Done! PR: ${prUrl}`)
}

main().catch((err) => {
  console.error('Pipeline failed:', err)
  process.exit(1)
})
