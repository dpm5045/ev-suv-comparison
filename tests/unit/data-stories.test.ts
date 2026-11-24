import { describe, expect, it } from 'vitest'
import type { DetailRow } from '@/lib/data'
import {
  bestValueTrims,
  choiceDek,
  choiceHeadline,
  comparisonExclusions,
  costPerMileHeadline,
  dataYear,
  inComparisonSet,
  keepsData,
  keepsHeadline,
  MIN_THIRD_ROW_LEGROOM_IN,
  priceDek,
  priceHeadline,
  priceRanges,
  rangeDek,
  rangeHeadline,
  thirdRowData,
  thirdRowHeadline,
  trimsByYear,
  usedHeadline,
  usedHighlight,
  usedVsNew,
} from '@/lib/data-stories'

let n = 0
/** A detail row with only what the stories read; AWD with a 30 in third row unless overridden. */
function row(p: Partial<DetailRow> & { vehicle: string; trim: string }): DetailRow {
  n++
  return {
    year: 2025, seats: 7, msrp: null, destination: null, preowned_range: '', preowned_low: null, preowned_high: null,
    range_mi: null, drivetrain: 'AWD', third_row_legroom_in: 30, cargo_behind_3rd_cu_ft: 15,
    id: `row-${n}`, name: `${p.vehicle}, ${p.year ?? 2025}, ${p.trim}`,
    availability: 'new', msrp_status: 'current',
    ...p,
  } as unknown as DetailRow
}
const used = (low: number, high = low) => ({ preowned_range: `$${low} - $${high}`, preowned_low: low, preowned_high: high })

describe('inComparisonSet: AWD trims with at least 28 in of third-row legroom', () => {
  const t = (p: Partial<DetailRow>) => inComparisonSet(row({ vehicle: 'V', trim: 'T', ...p }))
  it('uses a 28 in cutoff', () => expect(MIN_THIRD_ROW_LEGROOM_IN).toBe(28))
  it('leaves out RWD', () => expect(t({ drivetrain: 'RWD' })).toBe(false))
  it('leaves out 26.5 in', () => expect(t({ third_row_legroom_in: 26.5 })).toBe(false))
  it('leaves out unknown legroom', () => expect(t({ third_row_legroom_in: null })).toBe(false))
  it('leaves out no third row', () => expect(t({ third_row_legroom_in: 'N/A' })).toBe(false))
  it('keeps AWD (dual motor)', () => expect(t({ drivetrain: 'AWD (dual motor)' })).toBe(true))
  it('keeps exactly 28 in', () => expect(t({ third_row_legroom_in: 28 })).toBe(true))
})

describe('choice: trims by model year', () => {
  const rows = [
    row({ vehicle: 'Tesla Model X', year: 2021, trim: 'Long Range', seats: 5, availability: 'used_only' }),
    row({ vehicle: 'Tesla Model X', year: 2021, trim: 'Long Range', seats: 6, availability: 'used_only' }),
    row({ vehicle: 'Tesla Model X', year: 2021, trim: 'Long Range', seats: 7, availability: 'used_only' }),
    row({ vehicle: 'Tesla Model X', year: 2021, trim: 'Plaid', availability: 'used_only' }),
    row({ vehicle: 'Rivian R1S', year: 2022, trim: 'Premium (7-seat)' }),
    row({ vehicle: 'Rivian R1S', year: 2022, trim: 'Premium (6-seat)' }),
    row({ vehicle: 'Rivian R1S', year: 2022, trim: 'Dual Max' }),
    row({ vehicle: 'Rivian R1S', year: 2022, trim: 'Tri', availability: 'announced' }),
    row({ vehicle: 'Genesis GV90', year: 2022, trim: 'Prestige' }),
    row({ vehicle: 'Rivian R1S', year: dataYear + 1, trim: 'Dual' }),
  ]
  const ys = trimsByYear(rows)
  it('counts seat layouts of one trim once', () => expect(ys[0]).toMatchObject({ year: 2021, trims: 2, models: 1 }))
  it('counts Rivian (N-seat) variants once, and leaves out announced and watch-list rows', () =>
    expect(ys[1]).toMatchObject({ year: 2022, trims: 2, models: 1 }))
  it('leaves out model years after the data year', () => expect(ys.map((y) => y.year)).toEqual([2021, 2022]))
  it('names model years in the headline', () =>
    expect(choiceHeadline(rows)).toBe('Model year 2021 offered two trims. Model year 2022 offered two.'))
  it('builds the dek from the same population', () => expect(choiceDek(rows)).toMatch(/^In 2021 every one of them was a Tesla Model X\. /))
  it('returns null with fewer than two years', () => expect(choiceHeadline(rows.slice(0, 1))).toBeNull())
})

describe('price, range and value use the comparison set', () => {
  const rows = [
    row({ vehicle: 'Tesla Model Y (3-Row)', trim: 'AWD', msrp: 50000, range_mi: 300, third_row_legroom_in: 26.5 }),
    row({ vehicle: 'Kia EV9', trim: 'Light RWD', drivetrain: 'RWD', msrp: 55000, range_mi: 305 }),
    row({ vehicle: 'Kia EV9', trim: 'Wind AWD', msrp: 60000, range_mi: 280 }),
    row({ vehicle: 'Kia EV9', trim: 'GT-Line', msrp: 70000, range_mi: 270 }),
    row({ vehicle: 'VinFast VF9', trim: 'Eco', msrp: 64000, range_mi: 330, third_row_legroom_in: null }),
    row({ vehicle: 'Rivian R1S', trim: 'Dual', msrp: 77000, range_mi: 410 }),
    row({ vehicle: 'Rivian R1S', trim: 'Old', msrp: 70000, range_mi: 400, availability: 'used_only' }),
  ]
  it('price ranges drop RWD, short third rows and unknown legroom', () =>
    expect(priceRanges(rows)).toEqual([
      { vehicle: 'Kia EV9', low: 60000, high: 70000 },
      { vehicle: 'Rivian R1S', low: 77000, high: 77000 },
    ]))
  it('price headline counts comparison-set models', () => expect(priceHeadline(rows)).toBe('Only one model starts under $65,000.'))
  it('value picks AWD trims only', () => expect(bestValueTrims(rows).map((v) => v.trim)).toEqual(['Dual', 'Wind AWD']))
  it('value headline', () =>
    expect(costPerMileHeadline(rows)).toBe('A mile of range costs $188 in the Rivian R1S, and $214 in the Kia EV9.'))
  it('lists what was left out, and why', () =>
    expect(comparisonExclusions(rows)).toBe(
      'Left out: RWD trims; Tesla Model Y (3-Row), 26.5 in; VinFast VF9, legroom not published.',
    ))
  it('range headline splits at the price where range jumps', () => {
    const r2 = [
      row({ vehicle: 'A', trim: 'a', msrp: 60000, range_mi: 300 }),
      row({ vehicle: 'B', trim: 'b', msrp: 80000, range_mi: 320 }),
      row({ vehicle: 'C', trim: 'c', msrp: 95000, range_mi: 410 }),
      row({ vehicle: 'D', trim: 'd', msrp: 120000, range_mi: 460 }),
    ]
    expect(rangeHeadline(r2)).toBe('Under $90,000, no model tops 320 miles. Above it, every one gets at least 410.')
  })
  it('range headline falls back when the split does not hold', () =>
    expect(rangeHeadline(rows)).toBe('The longest range here is 410 miles, in the Rivian R1S.'))
  it('range dek no longer claims range ignores price', () => expect(rangeDek(rows)).not.toMatch(/whatever they cost/))
  it('every builder returns null, never throws, with no eligible rows', () => {
    const none = [rows[0], rows[1]]
    expect(priceHeadline(none)).toBeNull()
    expect(priceDek(none)).toBeNull()
    expect(costPerMileHeadline(none)).toBeNull()
    expect(rangeDek(none)).toBeNull()
    expect(rangeHeadline(none)).toBeNull()
    expect(usedHeadline(none)).toBeNull()
    expect(keepsData(none, () => true)).toBeNull()
    expect(thirdRowData([])).toBeNull()
  })
})

describe('used: best new vs best used cost per mile', () => {
  const rows = [
    row({ vehicle: 'Kia EV9', year: 2026, trim: 'Wind', msrp: 63000, range_mi: 280 }),
    row({ vehicle: 'Kia EV9', year: 2024, trim: 'Wind', availability: 'used_only', range_mi: 280, ...used(30000, 36000) }),
    row({ vehicle: 'Kia EV9', year: 2024, trim: 'Land', availability: 'used_only', range_mi: 280, ...used(20000, 60000) }),
    row({ vehicle: 'Tesla Model X', year: 2022, trim: 'Long Range', availability: 'used_only', range_mi: 330, ...used(40000) }),
    row({ vehicle: 'Rivian R1S', year: 2026, trim: 'Dual RWD', drivetrain: 'RWD', msrp: 76000, range_mi: 330 }),
    row({ vehicle: 'Rivian R1S', year: 2023, trim: 'Quad', availability: 'used_only', range_mi: 320, ...used(55000) }),
    row({ vehicle: 'Lucid Gravity', year: 2026, trim: 'Touring', msrp: 80000, range_mi: 400, preowned_range: 'No used market yet' }),
  ]
  const u = usedVsNew(rows)
  it('uses the midpoint of the used range', () => expect(u.find((x) => x.vehicle === 'Kia EV9')!.used).toMatchObject({ perMile: 118, year: 2024, trim: 'Wind' }))
  it('skips models with no used price', () => expect(u.map((x) => x.vehicle)).not.toContain('Lucid Gravity'))
  it('labels a model with no new rows "no longer sold new"', () =>
    expect(u.find((x) => x.vehicle === 'Tesla Model X')).toMatchObject({ newBest: null, newLabel: 'no longer sold new' }))
  it('labels a model whose new rows do not qualify', () =>
    expect(u.find((x) => x.vehicle === 'Rivian R1S')).toMatchObject({ newBest: null, newLabel: 'no new trim in this comparison' }))
  it('sorts by used cost', () => expect(u.map((x) => x.used.perMile)).toEqual([...u.map((x) => x.used.perMile)].sort((a, b) => a - b)))
  it('headline names the model with the biggest gap', () =>
    expect(usedHeadline(rows)).toBe('The best-value used Kia EV9 costs $118 per mile of range. The best-value new one, $225.'))
  it('returns null with no model that has both', () => expect(usedHeadline(rows.slice(3, 4))).toBeNull())
  it('the chart highlight and the headline name the same model', () => {
    expect(usedHighlight(rows)?.vehicle).toBe('Kia EV9')
    expect(usedHeadline(rows)).toContain(usedHighlight(rows)!.vehicle)
    expect(usedHighlight(rows.slice(3, 4))).toBeNull()
  })
})

describe('keeps: used price as a share of a sourced original MSRP', () => {
  const sourced = new Set<string>()
  const r = (p: Partial<DetailRow> & { vehicle: string; trim: string }, isSourced = true) => {
    const x = row({ availability: 'used_only', msrp_status: 'historical', ...p })
    if (isSourced) sourced.add(x.id)
    return x
  }
  const rows = [
    r({ vehicle: 'Mercedes-Benz EQS SUV', year: 2023, trim: '450', msrp: 100000, ...used(40000) }),
    r({ vehicle: 'Mercedes-Benz EQS SUV', year: 2023, trim: '580', msrp: 120000, ...used(60000) }),
    r({ vehicle: 'Mercedes-Benz EQS SUV', year: 2025, trim: '450', msrp: 100000, ...used(120000) }),
    r({ vehicle: 'Mercedes-Benz EQS SUV', year: 2025, trim: '450', seats: 6, msrp: 100000, ...used(120000) }),
    r({ vehicle: 'Mercedes-Benz EQS SUV', year: 2025, trim: '580', msrp: 120000, ...used(130000) }),
    r({ vehicle: 'Volvo EX90', year: 2025, trim: 'Plus', msrp: 80000, ...used(60000) }),
    r({ vehicle: 'Kia EV9', year: 2024, trim: 'Land', msrp: 70000, msrp_status: 'unknown', ...used(40000) }),
    r({ vehicle: 'Kia EV9', year: 2026, trim: 'Land', msrp: 70000, msrp_status: 'announced', ...used(40000) }),
    r({ vehicle: 'Kia EV9', year: 2025, trim: 'Wind', msrp: 65000, ...used(40000) }, false),
  ]
  const k = keepsData(rows, (x) => sourced.has(x.id))!
  it('makes a panel for a model with two or more years', () =>
    expect(k.panels).toEqual([
      { vehicle: 'Mercedes-Benz EQS SUV', points: [{ year: 2023, pct: 45, n: 2 }, { year: 2025, pct: 114, n: 2 }] },
    ]))
  it('counts seat layouts once (n = trims)', () => expect(k.panels[0].points[1].n).toBe(2))
  it('puts single-year models in the strip', () => expect(k.strip).toEqual([{ vehicle: 'Volvo EX90', year: 2025, pct: 75, n: 1 }]))
  it('extends the axis past 100% when a model year sells above sticker', () => expect(k.axisMax).toBe(125))
  it('counts coverage over distinct used trims', () => expect([k.covered, k.total]).toEqual([5, 8]))
  it('headline uses the model with the most years, oldest year', () =>
    expect(keepsHeadline(k)).toBe('A 2023 Mercedes-Benz EQS SUV sells for about 45% of its MSRP on record for that model year.'))
  it('uses a sourced seat layout when an unsourced sibling sorts first', () => {
    const a = row({ vehicle: 'Volvo EX90', year: 2024, trim: 'Plus', id: 'aaa-6s', availability: 'used_only', msrp_status: 'historical', msrp: 80000, ...used(40000) })
    const b = row({ vehicle: 'Volvo EX90', year: 2024, trim: 'Plus', id: 'zzz-7s', availability: 'used_only', msrp_status: 'historical', msrp: 80000, ...used(40000) })
    const k2 = keepsData([...rows, a, b], (x) => sourced.has(x.id) || x.id === 'zzz-7s')!
    expect(k2.panels.find((p) => p.vehicle === 'Volvo EX90')?.points).toEqual([{ year: 2024, pct: 50, n: 1 }, { year: 2025, pct: 75, n: 1 }])
    expect([k2.covered, k2.total]).toEqual([6, 9])
  })
  it('counts RWD trims with a third row, and leaves out trims with none', () => {
    const rwd = row({ vehicle: 'Volvo EX90', year: 2024, trim: 'Single', drivetrain: 'RWD', availability: 'used_only', msrp_status: 'historical', msrp: 70000, ...used(35000) })
    const five = row({ vehicle: 'Volvo EX90', year: 2023, trim: 'Five', third_row_legroom_in: 'N/A', availability: 'used_only', msrp_status: 'historical', msrp: 70000, ...used(35000) })
    const k3 = keepsData([...rows, rwd, five], (x) => sourced.has(x.id) || x === rwd || x === five)!
    expect(k3.panels.find((p) => p.vehicle === 'Volvo EX90')?.points.map((p) => p.year)).toEqual([2024, 2025])
  })
  it('returns null when no model has two eligible years', () => expect(keepsData(rows.slice(5), (x) => sourced.has(x.id))).toBeNull())
})

describe('third row: legroom against cargo', () => {
  const rows = [
    row({ vehicle: 'Volkswagen ID. Buzz', year: 2025, trim: 'Pro S', msrp: 60000, third_row_legroom_in: 42, cargo_behind_3rd_cu_ft: 18.6 }),
    row({ vehicle: 'Kia EV9', year: 2026, trim: 'Land', msrp: 66000, third_row_legroom_in: 33.1, cargo_behind_3rd_cu_ft: 20.2 }),
    row({ vehicle: 'Kia EV9', year: 2026, trim: 'Wind', msrp: 63000, third_row_legroom_in: 32, cargo_behind_3rd_cu_ft: 20 }),
    row({ vehicle: 'Kia EV9', year: 2025, trim: 'Light', msrp: 55000, third_row_legroom_in: 32, cargo_behind_3rd_cu_ft: 20 }),
    row({ vehicle: 'Tesla Model Y (3-Row)', year: 2026, trim: 'AWD', msrp: 50000, third_row_legroom_in: 26.5, cargo_behind_3rd_cu_ft: 12 }),
    row({ vehicle: 'Mercedes-Benz EQS SUV', year: 2026, trim: '450', msrp: 105000, third_row_legroom_in: 29.1, cargo_behind_3rd_cu_ft: 6.6 }),
    row({ vehicle: 'Mercedes-Benz EQS SUV', year: 2026, trim: 'Maybach', msrp: 180000, third_row_legroom_in: 'N/A', cargo_behind_3rd_cu_ft: 'N/A' }),
    row({ vehicle: 'VinFast VF9', year: 2025, trim: 'Plus', msrp: 80000, third_row_legroom_in: null }),
    row({ vehicle: 'Example Two-Row', year: 2025, trim: 'Base', msrp: 80000, third_row_legroom_in: 'N/A' }),
  ]
  const t = thirdRowData(rows)!
  it('picks the newest year, then the lowest MSRP', () => expect(t.points.find((p) => p.vehicle === 'Kia EV9')).toMatchObject({ year: 2026, trim: 'Wind' }))
  it('includes the Model Y (3-Row)', () => expect(t.points.map((p) => p.vehicle)).toContain('Tesla Model Y (3-Row)'))
  it('lists unknown legroom as not published', () => expect(t.notPublished).toEqual(['VinFast VF9']))
  it('lists N/A as no third row', () => expect(t.noThirdRow).toEqual(['Example Two-Row']))
  it('headline is scoped to plotted models', () =>
    expect(thirdRowHeadline(t)).toBe(
      'Of the models we plot, the Volkswagen ID. Buzz has the most third-row legroom, 10 in more than the next. The Mercedes-Benz EQS SUV has the least cargo space behind its third row.',
    ))
  it('returns null with fewer than three models', () => expect(thirdRowData(rows.slice(0, 3))).toBeNull())
})

describe('live data', () => {
  it('no headline contains NaN, undefined or Infinity', () => {
    const all = [choiceHeadline(), choiceDek(), priceHeadline(), priceDek(), rangeDek(), costPerMileHeadline(), usedHeadline()]
    const t = thirdRowData()
    if (t) all.push(thirdRowHeadline(t))
    for (const s of all) expect(s ?? '').not.toMatch(/NaN|undefined|Infinity/)
  })
})
