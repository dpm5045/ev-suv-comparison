import { describe, expect, it } from 'vitest'
import type { DetailRow } from '@/lib/data'
import { DATA } from '@/lib/data'
import {
  compareMetric, comparisonFaq, maxRangeText, rangeBasis, rangeCell, rangeLabel, vehicleFaq, currentPriceText,
} from '@/lib/compare-text'

const DATA_YEAR = 2026
let n = 0
function row(p: Partial<DetailRow>): DetailRow {
  n++
  return {
    name: `Test ${n}`, vehicle: 'Test', year: 2026, trim: `T${n}`, seats: 7, msrp: null, range_mi: null,
    cargo_behind_3rd_cu_ft: null, towing_lbs: null, charging_type: '', ...p,
  } as unknown as DetailRow
}
const trimsOf = (v: string) => DATA.details.filter((r) => r.vehicle === v)
const COMPARATIVE = /\b(cheaper|lower|longer|higher|more)\b/

describe('compareMetric', () => {
  it('is strict, reports ties, and is null when a value is unknown', () => {
    expect(compareMetric(5000, 5000)).toBe('tie')
    expect(compareMetric(5001, 5000)).toBe('a')
    expect(compareMetric(3, 4, { lowerIsBetter: true })).toBe('a')
    expect(compareMetric(null, 4)).toBeNull()
  })
})

describe('comparisonFaq', () => {
  it('says "Neither" for equal values and makes no comparative claim', () => {
    const a = row({ msrp: 60000, range_mi: 300, cargo_behind_3rd_cu_ft: 20, towing_lbs: 5000 })
    const b = row({ msrp: 60000, range_mi: 300, cargo_behind_3rd_cu_ft: 20, towing_lbs: 5000 })
    const faq = comparisonFaq('Alpha', a, 'Beta', b, DATA_YEAR).filter((f) => !f.q.startsWith('How many seats'))
    expect(faq).toHaveLength(4)
    for (const f of faq) {
      expect(f.a.startsWith('Neither')).toBe(true)
      expect(f.a.replace(/^Neither: /, '')).not.toMatch(COMPARATIVE)
    }
    expect(faq.find((f) => f.q.includes('tow'))!.a).toBe('Neither: both are rated to tow 5,000 lbs.')
  })

  it('names the strictly better side with both values', () => {
    const a = row({ towing_lbs: 7700 })
    const b = row({ towing_lbs: 5000 })
    const tow = comparisonFaq('Alpha', a, 'Beta', b, DATA_YEAR).find((f) => f.q.includes('tow'))!
    expect(tow.a).toBe('The Alpha has a higher towing capacity at 7,700 lbs compared to 5,000 lbs.')
  })

  it('compares prices only when both representative trims are sold new', () => {
    const current = row({ msrp: 60000, year: 2026 })
    const historical = row({ msrp: 50000, year: 2022 })
    expect(comparisonFaq('A', current, 'B', historical, DATA_YEAR).some((f) => f.q.includes('cheaper'))).toBe(false)
  })

  it('does not call a manufacturer estimate EPA', () => {
    const est = DATA.details.find((r) => rangeBasis(r) === 'manufacturer_estimate' && typeof r.range_mi === 'number')!
    const epa = row({ range_mi: 250 })
    const f = comparisonFaq('A', est, 'B', epa, DATA_YEAR).find((x) => x.q.includes('range'))!
    expect(f.a).not.toMatch(/EPA/)
    expect(f.a).toMatch(/manufacturer estimate/)
  })
})

describe('range basis on real data (Lexus TZ: one EPA-rated trim, two estimates)', () => {
  const tz = trimsOf('Lexus TZ')

  it('labels mixed-basis ranges "Range", never "EPA Range"', () => {
    expect(tz.some((r) => rangeBasis(r) === 'manufacturer_estimate')).toBe(true)
    expect(rangeLabel(tz)).toBe('Range')
  })

  it('splits the FAQ range sentence by basis', () => {
    const f = vehicleFaq('Lexus TZ', tz, DATA_YEAR).find((x) => x.q.startsWith('What is the range'))!
    const epaVals = tz.filter((r) => rangeBasis(r) === 'epa').map((r) => r.range_mi as number)
    const estMax = Math.max(...tz.filter((r) => rangeBasis(r) !== 'epa').map((r) => r.range_mi as number))
    expect(f.a).toContain(`an EPA-estimated range of ${Math.max(...epaVals)} miles`)
    expect(f.a).toContain(`up to ${estMax} miles by the manufacturer's estimate`)
  })

  it('marks estimate cells and the max range when it is an estimate', () => {
    const est = tz.find((r) => rangeBasis(r) === 'manufacturer_estimate')!
    expect(rangeCell(est)).toMatch(/\(maker est\.\)$/)
    const max = Math.max(...tz.map((r) => r.range_mi as number))
    const maxIsEstimate = tz.filter((r) => r.range_mi === max).every((r) => rangeBasis(r) !== 'epa')
    expect(maxRangeText(tz)!.endsWith('(maker est.)')).toBe(maxIsEstimate)
  })

  it('keeps "EPA Range" for a vehicle whose ranges are all EPA figures', () => {
    const allEpa = [...new Set(DATA.details.map((r) => r.vehicle))].find((v) => trimsOf(v).every((r) => rangeBasis(r) === 'epa') && trimsOf(v).some((r) => typeof r.range_mi === 'number'))!
    expect(rangeLabel(trimsOf(allEpa))).toBe('EPA Range')
  })
})

describe('prices on real data', () => {
  it('describes a used-only vehicle as no longer sold new, not by its old MSRP', () => {
    const mx = trimsOf('Tesla Model X')
    expect(currentPriceText(mx, DATA_YEAR)).toBeNull()
    const cost = vehicleFaq('Tesla Model X', mx, DATA_YEAR).find((x) => x.q.startsWith('How much does'))
    // With no stored MSRP at all there is no price question; with old MSRPs it says "no longer sold new"
    if (cost) expect(cost.a).toMatch(/^The Tesla Model X is no longer sold new\./)
    expect(cost?.a ?? '').not.toMatch(/starts at/)
  })

  it('quotes old MSRPs only as "when new" prices', () => {
    const rows = [row({ vehicle: 'Old', msrp: 80000, year: 2022 }), row({ vehicle: 'Old', msrp: 90000, year: 2023 })]
    const cost = vehicleFaq('Old', rows, DATA_YEAR).find((x) => x.q.startsWith('How much does'))!
    expect(cost.a).toBe('The Old is no longer sold new. When new, it was priced from $80,000–$90,000 MSRP; see the pre-owned prices for what it costs today.')
  })
})
