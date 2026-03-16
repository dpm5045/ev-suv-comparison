/**
 * Validates ev-data.json integrity before PR creation.
 */

import { loadAssumptions, calcOtdNew, parsePreownedRange, calcOtdPreowned } from './otd-calculator.mjs'

const REQUIRED_DETAIL_FIELDS = [
  'name', 'vehicle', 'year', 'trim', 'seats', 'drivetrain',
  'msrp', 'otd_new', 'preowned_range', 'otd_preowned',
  'range_mi', 'hp', 'battery_kwh', 'charging_type',
]

const NUMERIC_RANGES = {
  range_mi: [150, 500],
  hp: [200, 1200],
  battery_kwh: [50, 250],
  msrp: [30000, 200000],
}

/**
 * Validate the full data object. Returns { errors: string[], warnings: string[] }.
 * Errors block PR creation; warnings are included in PR body.
 * @param {object} data - The full EVData object
 * @param {object} originalData - The original data (for no-data-loss check)
 */
export function validateData(data, originalData) {
  const errors = []
  const warnings = []

  // 1. Required fields present
  for (let i = 0; i < data.details.length; i++) {
    const row = data.details[i]
    for (const field of REQUIRED_DETAIL_FIELDS) {
      if (row[field] === undefined) {
        errors.push(`details[${i}] (${row.name || 'unknown'}): missing field "${field}"`)
      }
    }
  }

  // 2. No duplicate names (warn only — some vehicles have same name but different seat counts)
  const names = data.details.map((r) => r.name)
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  if (dupes.length > 0) {
    warnings.push(`Duplicate detail names (may differ by seat count): ${[...new Set(dupes)].join(', ')}`)
  }

  // 3. OTD consistency
  const params = loadAssumptions(data.assumptions)
  for (const row of data.details) {
    if (typeof row.msrp === 'number' && typeof row.otd_new === 'number') {
      const dest = typeof row.destination === 'number' ? row.destination : 0
      const expected = calcOtdNew(row.msrp, dest, params)
      if (Math.abs(row.otd_new - expected) > 50) {
        errors.push(`${row.name}: otd_new ${row.otd_new} != expected ${expected.toFixed(2)}`)
      } else if (Math.abs(row.otd_new - expected) > 1) {
        warnings.push(`${row.name}: otd_new ${row.otd_new} differs from expected ${expected.toFixed(2)} by $${Math.abs(row.otd_new - expected).toFixed(2)}`)
      }
    }
  }

  // 4. Preowned OTD consistency
  for (const row of data.details) {
    const range = parsePreownedRange(row.preowned_range)
    if (range && row.otd_preowned && row.otd_preowned.includes('$')) {
      const [low] = range
      const expectedLow = calcOtdPreowned(low, params)
      const actualRange = parsePreownedRange(row.otd_preowned)
      if (actualRange && Math.abs(actualRange[0] - expectedLow) > 1) {
        warnings.push(`${row.name}: otd_preowned low ${actualRange[0]} != expected ${Math.round(expectedLow)}`)
      }
    }
  }

  // 5. Numeric range sanity
  for (const row of data.details) {
    for (const [field, [min, max]] of Object.entries(NUMERIC_RANGES)) {
      const val = row[field]
      if (typeof val === 'number' && (val < min || val > max)) {
        warnings.push(`${row.name}: ${field}=${val} outside expected range [${min}, ${max}]`)
      }
    }
  }

  // 6. Count totals consistency
  if (data.count_data && data.count_totals) {
    for (const yearKey of ['y2021', 'y2022', 'y2023', 'y2024', 'y2025', 'y2026']) {
      const sum = data.count_data.reduce((acc, r) => acc + (r[yearKey] || 0), 0)
      if (sum !== data.count_totals[yearKey]) {
        errors.push(`count_totals.${yearKey}: ${data.count_totals[yearKey]} != sum ${sum}`)
      }
    }
    const totalSum = data.count_data.reduce((acc, r) => acc + (r.total || 0), 0)
    if (totalSum !== data.count_totals.total) {
      errors.push(`count_totals.total: ${data.count_totals.total} != sum ${totalSum}`)
    }
  }

  // 7. No data loss — never fewer entries than before
  if (originalData) {
    if (data.details.length < originalData.details.length) {
      errors.push(`Data loss: details shrunk from ${originalData.details.length} to ${data.details.length}`)
    }
    if (data.preowned.length < originalData.preowned.length) {
      errors.push(`Data loss: preowned shrunk from ${originalData.preowned.length} to ${data.preowned.length}`)
    }
  }

  // 8. Preowned names match details
  const detailNames = new Set(data.details.map((r) => r.name))
  for (const row of data.preowned) {
    if (!detailNames.has(row.name)) {
      warnings.push(`preowned "${row.name}" has no matching detail entry`)
    }
  }

  // 9. Data completeness — flag entries with many null/empty fields
  const completenessFields = [
    'onboard_ac_kw', 'l2_10_100', 'l2_10_80', 'charging_type',
    'frunk_cu_ft', 'cargo_behind_3rd_cu_ft', 'cargo_behind_2nd_cu_ft',
    'cargo_behind_1st_cu_ft', 'fold_flat', 'hp', 'battery_kwh', 'range_mi',
    'self_driving', 'car_software', 'main_display',
  ]
  for (const row of data.details) {
    const nullCount = completenessFields.filter((f) => {
      const val = row[f]
      return val === null || val === '' || (typeof val === 'string' && val === 'TBD')
    }).length
    if (nullCount >= 5) {
      const missing = completenessFields.filter((f) => {
        const val = row[f]
        return val === null || val === '' || (typeof val === 'string' && val === 'TBD')
      })
      warnings.push(`${row.name}: ${nullCount} missing fields (${missing.join(', ')})`)
    }
  }

  return { errors, warnings }
}
