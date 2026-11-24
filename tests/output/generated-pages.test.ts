/**
 * Checks on the generated HTML (run after `npm run build`): the FAQ text,
 * structured data and metadata that search engines read. Values are compared
 * as structured data, not by scanning for comparative words.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DATA } from '@/lib/data'
import { dataYear, numberWord } from '@/lib/data-stories'
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

/** Range values that are only manufacturer estimates for this vehicle (no other row has the same number). */
function estimateOnlyValues(vehicle: string): number[] {
  const rows = getTrimsForVehicle(vehicle)
  const isEst = (r: (typeof rows)[number]) => rangeBasis(r) === 'manufacturer_estimate'
  const other = new Set(rows.filter((r) => !isEst(r)).map((r) => r.range_mi))
  return [...new Set(rows.filter((r) => isEst(r) && typeof r.range_mi === 'number').map((r) => r.range_mi as number))].filter((v) => !other.has(v))
}

/** "EPA" may appear in generated text only for vehicles with at least one verified EPA rating. */
function expectNoUnverifiedEpaClaim(text: string, vehicles: string[]) {
  const verified = vehicles.some((v) => getTrimsForVehicle(v).some((r) => rangeBasis(r) === 'epa'))
  if (!verified) expect(text).not.toMatch(/\bEPA\b/)
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
    expectNoUnverifiedEpaClaim([description, ...jsonFaq.map((f) => f.a)].join('. '), [nameA, nameB])
  })
})

describe('vehicle pages', () => {
  it.each(getUniqueVehicles())('%s: FAQ and metadata are truthful and match', (vehicle) => {
    const { jsonFaq, visible, description } = page('vehicles', toSlug(vehicle))
    expect(visible).toEqual(jsonFaq)
    expect(jsonFaq).toEqual(vehicleFaq(vehicle, getTrimsForVehicle(vehicle), dataYear))
    expectEstimatesAttributed([description, ...jsonFaq.map((f) => f.a)].join('. '), estimateOnlyValues(vehicle))
    expectNoUnverifiedEpaClaim([description, ...jsonFaq.map((f) => f.a)].join('. '), [vehicle])
    // "starts at … MSRP" only when the vehicle has a configuration sold new
    const soldNew = DATA.details.some((r) => r.vehicle === vehicle && typeof r.msrp === 'number' && r.year >= dataYear - 1)
    if (!soldNew) expect(jsonFaq.map((f) => f.a).join(' ')).not.toMatch(/starts at/)
  })
})

describe('market insights', () => {
  it('the page title counts the stories that render', () => {
    const html = readFileSync(join(APP, 'market-insights.html'), 'utf8')
    const stories = (html.match(/<section class="ds-story">/g) ?? []).length
    expect(stories).toBeGreaterThanOrEqual(1)
    expect(html).toContain(`The three-row EV market, in ${numberWord(stories)} charts.`)
  })

  it('story kickers are numbered 1..n in order', () => {
    const html = readFileSync(join(APP, 'market-insights.html'), 'utf8')
    const kickers = [...html.matchAll(/<div class="ds-kicker">(\d+)(?: |&nbsp;)·/g)].map((m) => Number(m[1]))
    expect(kickers).toEqual(kickers.map((_, i) => i + 1))
    expect(kickers.length).toBe((html.match(/<section class="ds-story">/g) ?? []).length)
  })
})
