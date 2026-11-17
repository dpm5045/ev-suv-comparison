/**
 * Checks on the generated HTML (run after `npm run build`): the FAQ text,
 * structured data and metadata that search engines read. Values are compared
 * as structured data, not by scanning for comparative words.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATA } from '@/lib/data'
import { dataYear } from '@/lib/data-stories'
import { getTrimsForVehicle, getUniqueVehicles, parseComparisonSlug, getVehicleBySlug, toSlug } from '@/lib/slugs'
import { comparisonFaq, rangeBasis, representativeTrim, vehicleFaq, type Faq } from '@/lib/compare-text'

const APP = join(process.cwd(), '.next/server/app')
if (!existsSync(APP)) throw new Error('No build output: run `npm run build` before `npm run test:output`.')

const decode = (s: string) => s
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

function page(dir: string, slug: string) {
  const html = readFileSync(join(APP, dir, `${slug}.html`), 'utf8')
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  const faqLd = ld.find((x) => x['@type'] === 'FAQPage')
  const jsonFaq: Faq[] = faqLd ? faqLd.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => ({ q: q.name, a: q.acceptedAnswer.text })) : []
  const visible: Faq[] = [...html.matchAll(/<dt class="faq-q">([\s\S]*?)<\/dt><dd class="faq-a">([\s\S]*?)<\/dd>/g)].map((m) => ({ q: decode(m[1]), a: decode(m[2]) }))
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '')
  return { jsonFaq, visible, description }
}

/** Range values that are only manufacturer estimates for this vehicle (no EPA row has the same number). */
function estimateOnlyValues(vehicle: string): number[] {
  const rows = getTrimsForVehicle(vehicle)
  const epa = new Set(rows.filter((r) => rangeBasis(r) === 'epa').map((r) => r.range_mi))
  return [...new Set(rows.filter((r) => rangeBasis(r) !== 'epa' && typeof r.range_mi === 'number').map((r) => r.range_mi as number))].filter((v) => !epa.has(v))
}

/** Every mention of an estimate-only range must be attributed to the manufacturer in its own clause. */
function expectEstimatesAttributed(text: string, values: number[]) {
  for (const clause of text.split(/[,;]|\.\s/)) {
    for (const v of values) {
      if (new RegExp(`\\b${v.toLocaleString('en-US')} mi(les)?\\b`).test(clause)) {
        expect(clause, `"${clause.trim()}" presents a manufacturer estimate without saying so`).toMatch(/manufacturer|maker est/)
      }
    }
  }
}

const compareSlugs = readdirSync(join(APP, 'compare')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, ''))

describe('comparison pages', () => {
  it('exist for every pair', () => {
    const n = getUniqueVehicles().length
    expect(compareSlugs.length).toBe((n * (n - 1)) / 2)
  })

  it.each(compareSlugs)('%s: FAQ is truthful, visible and matches its structured data', (slug) => {
    const { slugA, slugB } = parseComparisonSlug(slug)!
    const nameA = getVehicleBySlug(slugA)!
    const nameB = getVehicleBySlug(slugB)!
    const a = representativeTrim(getTrimsForVehicle(nameA))
    const b = representativeTrim(getTrimsForVehicle(nameB))
    const { jsonFaq, visible, description } = page('compare', slug)

    expect(visible).toEqual(jsonFaq)
    expect(jsonFaq).toEqual(comparisonFaq(nameA, a, nameB, b, dataYear))

    // Equal structured values are reported as ties, never as a winner
    const pairs: [string, unknown, unknown][] = [
      ['range', a.range_mi, b.range_mi], ['cargo', a.cargo_behind_3rd_cu_ft, b.cargo_behind_3rd_cu_ft],
      ['tow', a.towing_lbs, b.towing_lbs],
    ]
    for (const [key, va, vb] of pairs) {
      const f = jsonFaq.find((x) => x.q.toLowerCase().includes(key))
      if (f && typeof va === 'number' && va === vb) expect(f.a.startsWith('Neither')).toBe(true)
    }

    for (const v of [nameA, nameB]) expectEstimatesAttributed([description, ...jsonFaq.map((f) => f.a)].join('. '), estimateOnlyValues(v))
  })
})

describe('vehicle pages', () => {
  it.each(getUniqueVehicles())('%s: FAQ and metadata are truthful and match', (vehicle) => {
    const { jsonFaq, visible, description } = page('vehicles', toSlug(vehicle))
    expect(visible).toEqual(jsonFaq)
    expect(jsonFaq).toEqual(vehicleFaq(vehicle, getTrimsForVehicle(vehicle), dataYear))
    expectEstimatesAttributed([description, ...jsonFaq.map((f) => f.a)].join('. '), estimateOnlyValues(vehicle))
    // "starts at … MSRP" only when the vehicle has a configuration sold new
    const soldNew = DATA.details.some((r) => r.vehicle === vehicle && typeof r.msrp === 'number' && r.year >= dataYear - 1)
    if (!soldNew) expect(jsonFaq.map((f) => f.a).join(' ')).not.toMatch(/starts at/)
  })
})
