import { describe, expect, it } from 'vitest'
import type { DetailRow } from '@/lib/data'
import { DATA, isWatchlistVehicle } from '@/lib/data'
import { effectivePrefs, parseSpeedDatingParams, rankConfigurations, rowMetric, formatMetric } from '@/lib/speed-dating'
import { budgetBuckets, eligibleRows, isSoldNew, MIN_SPEED_DATING_SEATS } from '@/lib/selection'

let n = 0
/** A detail row with only what scoring and eligibility read; everything else null. */
function cfg(p: Partial<DetailRow> & { vehicle: string; trim: string }): DetailRow {
  n++
  return {
    year: 2024, seats: 7, msrp: null, preowned_range: '', preowned_low: null, preowned_high: null,
    range_mi: null, zero_to_60_sec: null, cargo_behind_3rd_cu_ft: null, cargo_behind_2nd_cu_ft: null,
    dc_fast_charge_10_80_min: null, self_driving_rank: null, self_driving_tier: null, adas_downgraded: false,
    id: `cfg-${n}`, name: `${p.vehicle}, ${p.year ?? 2024}, ${p.trim} #${n}`,
    availability: 'new', msrp_status: 'current', range_basis: null,
    ...p,
  } as unknown as DetailRow
}
const used = (low: number, high = low + 8000) => ({ preowned_range: `$${low.toLocaleString()} - $${high.toLocaleString()}`, preowned_low: low, preowned_high: high })

describe('rankConfigurations: every number shown belongs to one real configuration', () => {
  // The audit's three examples: each model's best range and best 0–60 are on different trims
  const rows = [
    cfg({ vehicle: 'Kia EV9', trim: 'Light Long Range RWD', range_mi: 305, zero_to_60_sec: 8.8, ...used(38000) }),
    cfg({ vehicle: 'Kia EV9', trim: 'GT-Line AWD', range_mi: 270, zero_to_60_sec: 5.0, ...used(45000) }),
    cfg({ vehicle: 'Rivian R1S', trim: 'Large Pack Dual', range_mi: 352, zero_to_60_sec: 4.5, ...used(52000) }),
    cfg({ vehicle: 'Rivian R1S', trim: 'Quad', range_mi: 316, zero_to_60_sec: 3.0, ...used(55000) }),
    cfg({ vehicle: 'Tesla Model X', trim: 'Long Range', range_mi: 371, zero_to_60_sec: 4.4, ...used(48000) }),
    cfg({ vehicle: 'Tesla Model X', trim: 'Plaid', range_mi: 333, zero_to_60_sec: 2.5, ...used(56000) }),
  ]
  const ranked = rankConfigurations(rows, 'range', 'power', 'preowned')

  it('shows range and 0–60 from the same row for each model', () => {
    for (const m of ranked) {
      const [range, power] = m.metrics
      expect(range.value).toBe(m.row.range_mi)
      expect(power.value).toBe(m.row.zero_to_60_sec)
      expect(rows).toContain(m.row)
    }
    // No model is credited with a combination it doesn't sell
    const r1s = ranked.find((m) => m.vehicle === 'Rivian R1S')!
    expect([r1s.metrics[0].value, r1s.metrics[1].value]).not.toEqual([352, 3.0])
  })

  it('picks the configuration with the best combined score', () => {
    // Model X: Long Range 0.6·1 + 0.4·(2.5/4.4) = 0.827; Plaid 0.6·(333/371) + 0.4·1 = 0.939
    expect(ranked.find((m) => m.vehicle === 'Tesla Model X')!.row.trim).toBe('Plaid')
  })

  it('reports model-level context separately from the chosen row', () => {
    const ev9 = ranked.find((m) => m.vehicle === 'Kia EV9')!
    expect(ev9.trimCount).toBe(2)
    expect(ev9.priceLow).toBe(38000)
    expect(ev9.priceHigh).toBe(45000) // the span of starting prices, never above the budget's measure
  })
})

describe('metrics', () => {
  it('never substitutes behind-second-row cargo for missing third-row cargo', () => {
    const r = cfg({ vehicle: 'A', trim: 'x', cargo_behind_3rd_cu_ft: null, cargo_behind_2nd_cu_ft: 45 })
    expect(rowMetric(r, 'storage')).toBeNull()
    const ranked = rankConfigurations([r, cfg({ vehicle: 'B', trim: 'y', cargo_behind_3rd_cu_ft: 20 })], 'storage', '', 'new')
    expect(ranked.find((m) => m.vehicle === 'A')!.composite).toBe(0)
    expect(ranked.find((m) => m.vehicle === 'B')!.composite).toBe(1)
  })

  it('treats non-numeric, non-finite, zero and negative values as unknown', () => {
    for (const v of ['TBD', NaN, Infinity, 0, -5]) {
      expect(rowMetric(cfg({ vehicle: 'A', trim: 'x', range_mi: v as never }), 'range')).toBeNull()
    }
  })

  it('scores lower-is-better picks as best ÷ value', () => {
    const ranked = rankConfigurations([
      cfg({ vehicle: 'Fast', trim: 'x', zero_to_60_sec: 3 }),
      cfg({ vehicle: 'Slow', trim: 'y', zero_to_60_sec: 6 }),
    ], 'power', '', 'new')
    expect(ranked.map((m) => [m.vehicle, m.composite])).toEqual([['Fast', 1], ['Slow', 0.5]])
  })

  it('labels self-driving with the configuration\'s tier and older hardware', () => {
    const r = cfg({ vehicle: 'Tesla Model X', trim: 'x', self_driving_tier: 'L2+ Point-to-Point', self_driving_rank: 3, adas_downgraded: true })
    expect(formatMetric('selfdriving', 3, r)).toBe('L2+ Point-to-Point (older hardware)')
  })
})

describe('preferences', () => {
  it('drops duplicates, unknown picks and the six-seat filter', () => {
    expect(effectivePrefs('range', 'range')).toEqual(['range'])
    expect(effectivePrefs('sixseat', 'power')).toEqual(['power'])
    expect(effectivePrefs('bogus', '')).toEqual([])
  })

  it('weights two picks 60/40 and one pick fully', () => {
    const rows = [
      cfg({ vehicle: 'A', trim: 'x', range_mi: 300, zero_to_60_sec: 6 }),
      cfg({ vehicle: 'B', trim: 'y', range_mi: 200, zero_to_60_sec: 3 }),
    ]
    const two = rankConfigurations(rows, 'range', 'power', 'new')
    expect(two.find((m) => m.vehicle === 'A')!.composite).toBeCloseTo(0.6 + 0.4 * 0.5)
    expect(two.find((m) => m.vehicle === 'B')!.composite).toBeCloseTo(0.6 * (2 / 3) + 0.4)
    expect(rankConfigurations(rows, 'range', '', 'new')[0].vehicle).toBe('A')
    expect(rankConfigurations(rows, '', '', 'new')).toEqual([])
  })
})

describe('ties', () => {
  it('breaks a tie within a vehicle on lower price, then newer year', () => {
    const rows = [
      cfg({ vehicle: 'A', trim: 'pricey', range_mi: 300, msrp: 70000, year: 2026 }),
      cfg({ vehicle: 'A', trim: 'cheap', range_mi: 300, msrp: 60000, year: 2025 }),
      cfg({ vehicle: 'B', trim: 'old', range_mi: 250, msrp: 50000, year: 2025 }),
      cfg({ vehicle: 'B', trim: 'new', range_mi: 250, msrp: 50000, year: 2026 }),
    ]
    const ranked = rankConfigurations(rows, 'range', '', 'new')
    expect(ranked.find((m) => m.vehicle === 'A')!.row.trim).toBe('cheap')
    expect(ranked.find((m) => m.vehicle === 'B')!.row.trim).toBe('new')
  })

  it('gives equal scores the same (dense) rank', () => {
    const ranked = rankConfigurations([
      cfg({ vehicle: 'A', trim: 'x', range_mi: 300 }),
      cfg({ vehicle: 'B', trim: 'y', range_mi: 300 }),
      cfg({ vehicle: 'C', trim: 'z', range_mi: 150 }),
    ], 'range', '', 'new')
    expect(ranked.map((m) => m.rank)).toEqual([1, 1, 2])
  })
})

describe('eligibility', () => {
  const base = { sixSeat: false, dataYear: 2026, minSeats: MIN_SPEED_DATING_SEATS }
  const rows = [
    cfg({ vehicle: 'New', trim: 'a', year: 2026, msrp: 60000 }),
    cfg({ vehicle: 'New', trim: 'b', year: 2026, msrp: 59999 }),
    cfg({ vehicle: 'Gone', trim: 'c', year: 2025, msrp: null, availability: 'used_only', msrp_status: 'unknown', ...used(50000) }),
    cfg({ vehicle: 'Old', trim: 'd', year: 2022, msrp: 80000, availability: 'used_only', msrp_status: 'historical', ...used(40000) }),
    cfg({ vehicle: 'Five', trim: 'e', year: 2026, msrp: 50000, seats: 5 }),
    cfg({ vehicle: 'Unknown', trim: 'f', year: 2026, msrp: 50000, seats: null }),
    cfg({ vehicle: 'Six', trim: 'g', year: 2026, msrp: 55000, seats: 6 }),
  ]
  const names = (o: Parameters<typeof eligibleRows>[1]) => eligibleRows(rows, o).map((r) => r.trim)

  it('keeps used-only and historically priced configurations out of New, at any price', () => {
    expect(names({ ...base, condition: 'new', budget: 'all' })).toEqual(['a', 'b', 'g'])
    expect(isSoldNew(rows[3], 2026)).toBe(false)
  })

  it('applies the budget independently of the condition, at the bucket edge', () => {
    expect(names({ ...base, condition: 'new', budget: 'under60' })).toEqual(['b', 'g'])
    expect(names({ ...base, condition: 'new', budget: '60to90' })).toEqual(['a'])
    expect(names({ ...base, condition: 'preowned', budget: 'under60' })).toEqual(['c', 'd'])
  })

  it('requires a known seat count of six or more, and six exactly for the six-seat pick', () => {
    expect(names({ ...base, condition: 'new', budget: 'all', sixSeat: true })).toEqual(['g'])
    expect(names({ ...base, minSeats: undefined, condition: 'new', budget: 'all' })).toContain('e')
  })
})

describe('URL parameters', () => {
  it('falls back to the documented defaults for unknown values', () => {
    expect(parseSpeedDatingParams({ condition: 'bogus', budget: 'nope', pref1: 'x', pref2: 'range' }, budgetBuckets))
      .toEqual({ condition: 'preowned', budget: 'under60', pref1: 'range', pref2: '' })
    expect(parseSpeedDatingParams({ condition: 'new', budget: '90plus', pref1: 'power', pref2: 'power' }, budgetBuckets))
      .toEqual({ condition: 'new', budget: '90plus', pref1: 'power', pref2: '' })
  })
})

describe('against the real data', () => {
  const dataYear = new Date(DATA.last_updated).getUTCFullYear()
  const run = (condition: 'new' | 'preowned', budget: string, p1: string, p2: string) =>
    rankConfigurations(eligibleRows(DATA.details, { condition, budget, sixSeat: false, dataYear, exclude: isWatchlistVehicle, minSeats: MIN_SPEED_DATING_SEATS }), p1, p2, condition)

  it('New + Any price (/?condition=new&budget=all&pref1=range&pref2=power) has no used-only configuration', () => {
    const ranked = run('new', 'all', 'range', 'power')
    expect(ranked.length).toBeGreaterThan(0)
    for (const m of ranked) {
      expect(typeof m.row.msrp).toBe('number')
      expect(m.row.msrp).not.toBe('N/A - Not New')
    }
    expect(ranked.map((m) => m.vehicle)).not.toContain('Tesla Model X')
  })

  it('every displayed metric matches the chosen row, for every pick pair', () => {
    const picks = ['range', 'storage', 'power', 'charging', 'selfdriving']
    for (const condition of ['new', 'preowned'] as const) {
      for (const p1 of picks) for (const p2 of picks) {
        for (const m of run(condition, 'all', p1, p2)) {
          expect(m.row.seats).toBeGreaterThanOrEqual(6)
          for (const x of m.metrics) expect(x.value).toBe(rowMetric(m.row, x.pref))
        }
      }
    }
  })
})
