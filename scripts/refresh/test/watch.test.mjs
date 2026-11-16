import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deflateRawSync } from 'node:zlib'
import { unzipFirst } from '../lib/zip.mjs'
import { parseCsv, buildEpaIndex, checkRanges, diffEpa, updateRangeProvenance, planRangeFixes, applyRangeFixes } from '../lib/epa.mjs'
import { extractAmounts, storedMsrps, pageEntry, checkPage, extractHeadline, storedPriceSpan, checkHeadline, priceGaps } from '../lib/pages.mjs'

const csv = readFileSync(new URL('./fixtures/epa-sample.txt' /* .txt: the repo ignores *.csv */, import.meta.url), 'utf-8')
// The real file has tens of thousands of rows; pad so the truncation guard passes.
const padded = csv + ',Front-Wheel Drive,1,Pad,Pad,0,2000,\n'.repeat(1000)
const models = {
  'Kia EV9': { make: 'Kia', model: '^EV9\\b' },
  'Tesla Model Y (3-Row)': { make: 'Tesla', model: '^Model Y\\b(?! L\\b)' },
  'Tesla Model Y L': { make: 'Tesla', model: '^Model Y L\\b' },
  'VinFast VF9': { make: 'VinFast', model: '^VF ?9\\b' },
}
const row = (vehicle, year, trim, drivetrain, range_mi, msrp = null) => ({ name: `${vehicle}, ${year}, ${trim}`, vehicle, year, trim, drivetrain, range_mi, msrp })

/** Build a one-file zip in memory. */
function makeZip(name, content, method = 8) {
  const data = method === 8 ? deflateRawSync(content) : content
  const n = Buffer.from(name)
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(method, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(n.length, 26)
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(method, 10); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(0, 42)
  const cdOffset = 30 + n.length + data.length
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(46 + n.length, 12); eocd.writeUInt32LE(cdOffset, 16)
  return Buffer.concat([local, n, data, central, n, eocd])
}

test('unzip reads deflated and stored entries and rejects junk', () => {
  const content = Buffer.from(csv)
  assert.equal(unzipFirst(makeZip('vehicles.csv', content), 'vehicles.csv').toString(), csv)
  assert.equal(unzipFirst(makeZip('vehicles.csv', content, 0), 'vehicles.csv').toString(), csv)
  assert.throws(() => unzipFirst(makeZip('other.csv', content), 'vehicles.csv'), /not found/)
  assert.throws(() => unzipFirst(Buffer.from('<html>blocked</html>'.repeat(5)), 'vehicles.csv'), /not a zip/)
})

test('csv parser handles quoted commas and missing columns', () => {
  const rows = parseCsv(csv, ['id', 'model', 'evMotor'])
  assert.equal(rows[0].evMotor, '139 and 235 kW PMSM (IPM)')
  assert.equal(rows[4].model, 'EV6 Long Range AWD (19 inch Wheels)')
  assert.throws(() => parseCsv(csv, ['id', 'nope']), /missing column/)
})

test('EPA index keeps only matching electric variants', () => {
  const idx = buildEpaIndex(padded, models)
  assert.deepEqual(idx['Kia EV9']['2026'].map((v) => v.range), [260, 283, 305, 230])
  assert.equal(idx['Tesla Model Y (3-Row)']['2026'].length, 1)
  assert.equal(idx['Tesla Model Y (3-Row)']['2027'], undefined) // "Model Y L" is a different vehicle
  assert.equal(idx['Tesla Model Y L']['2027'][0].range, 328)
  assert.equal(idx['VinFast VF9']['2025'][0].range, 287) // make matched case-insensitively
  assert.throws(() => buildEpaIndex(csv, models), /truncated/)
})

test('range check classifies rows and respects drive type', () => {
  const idx = buildEpaIndex(padded, models)
  const data = { details: [
    row('Kia EV9', 2026, 'GT', 'AWD', 260),
    row('Kia EV9', 2026, 'Light RWD', 'RWD', 230),
    row('Kia EV9', 2026, 'Wind', 'AWD', 305),     // 305 is an EPA figure, but only for RWD
    row('Kia EV9', 2026, 'Land', 'AWD', 'TBD'),
    row('Kia EV9', 2028, 'GT', 'AWD', 260),
    row('Tesla Model Y L', 2026, 'L', 'AWD', 325),
  ] }
  const { rows, groups } = checkRanges(data, idx)
  assert.deepEqual(rows.map((r) => r.state), ['consistent', 'consistent', 'mismatch', 'no_stored_range', 'not_in_epa', 'not_in_epa'])
  assert.equal(rows[0].evidence, 'EPA 2026 EV9 GT: 260 mi')
  assert.equal(rows[0].sourceUrl, 'https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=49669')
  assert.deepEqual(rows[2].epaRanges, [230, 260, 283, 305])
  assert.deepEqual(rows[5].otherYears, ['2027'])
  assert.equal(groups.find((g) => g.vehicle === 'Kia EV9' && g.year === 2026).consistent, 2)
})

test('EPA diff reports added, removed and changed variants', () => {
  const before = buildEpaIndex(padded, models)
  const after = structuredClone(before)
  after['Kia EV9']['2026'][0].range = 265
  after['Kia EV9']['2026'].pop()
  after['Kia EV9']['2027'] = [{ id: 60000, model: 'EV9 GT', drive: 'All-Wheel Drive', range: 270 }]
  assert.deepEqual(diffEpa(before, before), [])
  assert.deepEqual(diffEpa(before, after).map((c) => `${c.kind}:${c.id}`).sort(), ['added:60000', 'range_changed:49669', 'removed:49672'])
})

test('range fixes carry a known EPA variant forward and leave guesses alone', () => {
  const V = (id, model, range, drive = 'All-Wheel Drive') => ({ id, model, drive, range })
  const idx = {
    'Tesla Model X': {
      '2024': [V(1, 'Model X', 335), V(2, 'Model X Plaid (20in wheels)', 326), V(3, 'Model X Plaid (22in wheels)', 300)],
      '2025': [V(4, 'Model X', 329), V(5, 'Model X Plaid (20in wheels)', 314), V(6, 'Model X Plaid (22in wheels)', 294)],
    },
    'VinFast VF9': { '2024': [V(7, 'VF 9 Eco', 330), V(8, 'VF 9 Plus', 291)], '2025': [V(9, 'VF 9 Plus', 287)] },
    'Kia EV9': { '2026': [V(10, 'EV9 GT', 260)], '2027': [V(11, 'EV9 GT', 200)] },
    'Lucid Gravity': { '2026': [V(12, 'Gravity Dream', 420)] },
  }
  const data = { last_updated: '2026-11-01', details: [
    row('Tesla Model X', 2024, 'Base', 'AWD', 348),
    { ...row('Tesla Model X', 2024, 'Base', 'AWD', 348), seats: 7 }, // seat variant sharing the name
    { ...row('Tesla Model X', 2024, 'Plaid', 'AWD', 333), notes: 'Plaid: up to 333 mi.' },
    row('Tesla Model X', 2025, 'Base', 'AWD', 329),
    row('Tesla Model X', 2025, 'Plaid', 'AWD', 314),
    row('VinFast VF9', 2024, 'Eco', 'AWD', 330),
    row('VinFast VF9', 2025, 'Eco', 'AWD', 330),     // EPA has no 2025 Eco
    row('Kia EV9', 2026, 'GT', 'AWD', 260),
    row('Kia EV9', 2027, 'GT', 'AWD', 260),          // 260 → 200 is too big a jump
    row('Lucid Gravity', 2026, 'Dream Edition', 'AWD', 440), // no earlier match at all
  ] }
  const { fixes, skipped } = planRangeFixes(data, idx, idx)
  assert.deepEqual(fixes.map((f) => `${f.name}:${f.old}->${f.new}`), ['Tesla Model X, 2024, Base:348->335', 'Tesla Model X, 2024, Plaid:333->326'])
  assert.equal(fixes[1].notesMentionOld, true)
  assert.match(fixes[0].evidence, /^EPA 2024 Model X: 335 mi \(same EPA variant as the 2025 Base\)$/)
  assert.deepEqual(skipped.map((s) => s.name), ['VinFast VF9, 2025, Eco', 'Kia EV9, 2027, GT', 'Lucid Gravity, 2026, Dream Edition'])
  assert.match(skipped[0].reason, /no 2025 rating .*VF 9 Eco/)
  assert.match(skipped[1].reason, /over 15%/)

  // EPA revising a figure: the previous snapshot names the variant.
  const before = { 'Lucid Gravity': { '2026': [V(12, 'Gravity Dream', 440)] } }
  assert.deepEqual(planRangeFixes(data, idx, before).fixes.map((f) => f.new), [335, 326, 420])

  const out = applyRangeFixes(data, fixes, '2026-11-20')
  assert.deepEqual(out.details.slice(0, 3).map((r) => r.range_mi), [335, 335, 326])
  assert.equal(out.last_updated, '2026-11-20')
  assert.equal(data.details[0].range_mi, 348) // input untouched
  assert.equal(applyRangeFixes(data, [], '2026-11-20'), data)
})

test('range sources are written once and left alone on a repeat run', () => {
  const idx = buildEpaIndex(padded, models)
  const { rows } = checkRanges({ details: [row('Kia EV9', 2026, 'GT', 'AWD', 260), row('Kia EV9', 2026, 'Wind', 'AWD', 305)] }, idx)
  const first = updateRangeProvenance({}, rows, '2026-11-15')
  assert.deepEqual(Object.keys(first), ['Kia EV9, 2026, GT']) // the mismatch gets no source
  assert.equal(first['Kia EV9, 2026, GT'].range_mi.verified_on, '2026-11-15')
  assert.deepEqual(updateRangeProvenance(first, rows, '2026-12-01'), first)
  assert.equal(updateRangeProvenance(first, rows, '2027-03-01')['Kia EV9, 2026, GT'].range_mi.verified_on, '2027-03-01') // refreshed after 90 days
})

test('amount extraction keeps plausible vehicle prices only', () => {
  const html = '<p>Starting at $54,900*</p><script>{"msrp":"$57,900","fee":"$1,645"}</script> $199/mo, $1,234,567, $ 71,900 and $54,900 again'
  assert.deepEqual(extractAmounts(html), [54900, 57900, 71900])
})

test('stored MSRPs come from the two newest priced model years', () => {
  const data = { details: [row('Kia EV9', 2025, 'a', 'AWD', 1, 50000), row('Kia EV9', 2026, 'a', 'AWD', 1, 54900), row('Kia EV9', 2027, 'a', 'AWD', 1, 54990), row('Kia EV9', 2028, 'a', 'AWD', 1, 'TBD'), row('Other', 2027, 'a', 'AWD', 1, 99999)] }
  assert.deepEqual(storedMsrps(data, 'Kia EV9'), [54900, 54990])
})

test('page check flags a stored price that vanished and a new one in the band', () => {
  const stored = [58955, 62765]
  const first = checkPage([29000, 58955, 62765, 64000], stored, undefined)
  assert.deepEqual([first.watchable, first.flags, first.found, first.other], [true, [], [58955, 62765], [64000]]) // 29,000 is outside the band

  assert.deepEqual(checkPage([29000, 58955, 62765, 64000], stored, first.state).flags, [])
  assert.deepEqual(checkPage([31000, 58955, 62765, 64000], stored, first.state).flags, []) // other models' prices are ignored
  const changed = checkPage([59955, 62765, 64000], stored, first.state)
  assert.deepEqual(changed.flags, ['stored MSRP no longer on the page: $58,955', 'new amount(s) in the price band: $59,955'])
})

test('a page showing none of the stored prices is not watchable', () => {
  const r = checkPage([77500, 78400], [77395, 91895], { found: [], other_in_band: [] })
  assert.deepEqual([r.watchable, r.flags], [false, []])
})

test('an accepted row is not reported as a mismatch', () => {
  const idx = buildEpaIndex(padded, models)
  const data = { details: [row('Kia EV9', 2026, 'Wind', 'AWD', 305), row('Kia EV9', 2026, 'Land', 'AWD', 299)] }
  const { rows, groups } = checkRanges(data, idx, { 'Kia EV9, 2026, Wind': 'Maker estimate.' })
  assert.deepEqual(rows.map((r) => r.state), ['accepted', 'mismatch'])
  assert.equal(groups[0].accepted[0].reason, 'Maker estimate.')
  assert.deepEqual(updateRangeProvenance({}, rows, '2026-11-15'), {}) // accepted rows get no EPA source
})

const cdPage = (title, line) => `<html><head><title>${title}</title><script>var x = "MSRP $1,000"</script></head><body><div>Car and Driver <span>MSRP</span> ${line} <a>Shop New</a></div></body></html>`

test('headline extraction reads the range, a single price, and the estimate marker', () => {
  assert.deepEqual(extractHeadline(cdPage('2027 Kia EV9 Review, Pricing, and Specs', '$56,635–$73,635')), { model_year: 2027, low: 56635, high: 73635, estimated: false })
  assert.deepEqual(extractHeadline(cdPage('2027 VinFast VF9 Review', '$64,290')), { model_year: 2027, low: 64290, high: 64290, estimated: false })
  assert.deepEqual(extractHeadline(cdPage('2028 Subaru Getaway Review', '$55,000–$65,000 est')), { model_year: 2028, low: 55000, high: 65000, estimated: true })
  assert.throws(() => extractHeadline('<html><title>404</title><body>Not found</body></html>'), /headline not found/)
})

test('headline check flags price, model-year and estimate changes only', () => {
  const base = { model_year: 2027, low: 56635, high: 73635, estimated: false }
  assert.deepEqual(checkHeadline(base, undefined), [])
  assert.deepEqual(checkHeadline(base, { url: 'x', ...base }), [])
  assert.deepEqual(checkHeadline({ ...base, low: 57635 }, base), ['MSRP line changed from $56,635–$73,635 to $57,635–$73,635'])
  assert.deepEqual(checkHeadline({ ...base, model_year: 2028 }, base), ['page moved from model year 2027 to 2028'])
  assert.deepEqual(checkHeadline(base, { ...base, low: 55000, high: 75000, estimated: true }), ['estimated pricing became actual pricing: $56,635–$73,635'])
})

test('stored price span adds destination and ignores unpriced rows', () => {
  const data = { details: [
    { vehicle: 'Kia EV9', year: 2027, msrp: 54990, destination: 1645 },
    { vehicle: 'Kia EV9', year: 2027, msrp: 71990, destination: 1645 },
    { vehicle: 'Kia EV9', year: 2027, msrp: 'TBD', destination: 1645 },
    { vehicle: 'Kia EV9', year: 2026, msrp: 10, destination: 1 },
  ] }
  assert.deepEqual(storedPriceSpan(data, 'Kia EV9', 2027), { low: 56635, high: 73635 })
  assert.equal(storedPriceSpan(data, 'Kia EV9', 2028), null)
})

test('stored prices can include destination for pages that print them that way', () => {
  const data = { details: [
    { vehicle: 'Volvo EX90', year: 2026, msrp: 76695, destination: 1395 },
    { vehicle: 'Volvo EX90', year: 2026, msrp: 84345, destination: 1395 },
    { vehicle: 'Volvo EX90', year: 2026, msrp: 80000, destination: null }, // no destination: left out
  ] }
  assert.deepEqual(storedMsrps(data, 'Volvo EX90'), [76695, 80000, 84345])
  assert.deepEqual(storedMsrps(data, 'Volvo EX90', { includeDestination: true }), [78090, 85740])
  assert.deepEqual(pageEntry('https://x.example'), { url: 'https://x.example', prices_include_destination: false })
})

test('price gaps: missing priced rows and a different starting price, not estimates or skipped pages', () => {
  const line = (vehicle, model_year, low, high, estimated, stored) => ({ vehicle, headline: { model_year, low, high, estimated }, stored })
  const gaps = priceGaps([
    line('Tesla Model X', 2026, 116630, 161060, false, { low: 99990, high: 114990 }),
    line('Kia EV9', 2027, 56635, 73635, false, { low: 56635, high: 73635 }), // agrees
    line('Mercedes-Benz GLB Electric', 2027, 51350, 69000, false, null),
    line('Genesis GV90', 2028, 110000, 160000, true, null), // estimate
    line('Tesla Model Y L', 2027, 41630, 63630, false, null), // skipped
  ], { 'Tesla Model Y L': 'five-seat page' })
  assert.deepEqual(gaps, [
    "Tesla Model X 2026: stored starting price $99,990 (MSRP + destination) differs from Car and Driver's $116,630",
    'Mercedes-Benz GLB Electric: Car and Driver lists 2027 prices ($51,350–$69,000, including destination) but no 2027 rows have prices',
  ])
})
