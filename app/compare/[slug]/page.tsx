import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  SITE_URL, toSlug, getUniqueVehicles, getVehicleBySlug,
  getTrimsForVehicle, getAllComparisonPairs, parseComparisonSlug,
} from '@/lib/slugs'
import { VEHICLE_CLASSES, type DetailRow } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import JsonLd from '@/components/JsonLd'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllComparisonPairs().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const parsed = parseComparisonSlug(slug)
  if (!parsed) return {}

  const nameA = getVehicleBySlug(parsed.slugA)
  const nameB = getVehicleBySlug(parsed.slugB)
  if (!nameA || !nameB) return {}

  const title = `${nameA} vs ${nameB} Comparison`
  const description = `Side-by-side comparison of ${nameA} and ${nameB}: pricing, EPA range, battery, charging, cargo space, and technology features.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/compare/${slug}`,
      type: 'website',
    },
    alternates: { canonical: `${SITE_URL}/compare/${slug}` },
  }
}

function pickRepTrim(trims: DetailRow[]): DetailRow {
  const maxYear = Math.max(...trims.map(t => t.year))
  const latest = trims.filter(t => t.year === maxYear)
  // Pick the lowest-priced trim with a numeric MSRP, else first
  const withPrice = latest.filter(t => typeof t.msrp === 'number')
  if (withPrice.length) {
    withPrice.sort((a, b) => (a.msrp as number) - (b.msrp as number))
    return withPrice[0]
  }
  return latest[0]
}

interface Metric {
  label: string
  valueA: string
  valueB: string
  numA?: number | null
  numB?: number | null
  higherIsBetter?: boolean
}

function buildMetrics(a: DetailRow, b: DetailRow): { section: string; metrics: Metric[] }[] {
  const nv = (v: number | string | null | undefined) => typeof v === 'number' ? v : null

  return [
    {
      section: 'Key Stats',
      metrics: [
        { label: 'MSRP', valueA: fmtMoney(a.msrp).text, valueB: fmtMoney(b.msrp).text, numA: nv(a.msrp), numB: nv(b.msrp), higherIsBetter: false },
        { label: 'Seats', valueA: a.seats != null ? String(a.seats) : '—', valueB: b.seats != null ? String(b.seats) : '—', numA: null, numB: null, higherIsBetter: true },
        { label: 'EPA Range', valueA: fmtNum(a.range_mi).text + (typeof a.range_mi === 'number' ? ' mi' : ''), valueB: fmtNum(b.range_mi).text + (typeof b.range_mi === 'number' ? ' mi' : ''), numA: nv(a.range_mi), numB: nv(b.range_mi), higherIsBetter: true },
        { label: 'Horsepower', valueA: fmtNum(a.hp).text + (typeof a.hp === 'number' ? ' hp' : ''), valueB: fmtNum(b.hp).text + (typeof b.hp === 'number' ? ' hp' : ''), numA: nv(a.hp), numB: nv(b.hp), higherIsBetter: true },
        { label: 'Battery', valueA: fmtNum(a.battery_kwh).text + (typeof a.battery_kwh === 'number' ? ' kWh' : ''), valueB: fmtNum(b.battery_kwh).text + (typeof b.battery_kwh === 'number' ? ' kWh' : ''), numA: nv(a.battery_kwh), numB: nv(b.battery_kwh), higherIsBetter: true },
      ],
    },
    {
      section: 'Performance',
      metrics: [
        { label: 'Torque', valueA: typeof a.torque_lb_ft === 'number' ? `${a.torque_lb_ft.toLocaleString()} lb-ft` : '—', valueB: typeof b.torque_lb_ft === 'number' ? `${b.torque_lb_ft.toLocaleString()} lb-ft` : '—', numA: nv(a.torque_lb_ft), numB: nv(b.torque_lb_ft), higherIsBetter: true },
        { label: '0–60 mph', valueA: typeof a.zero_to_60_sec === 'number' ? `${a.zero_to_60_sec} sec` : '—', valueB: typeof b.zero_to_60_sec === 'number' ? `${b.zero_to_60_sec} sec` : '—', numA: nv(a.zero_to_60_sec), numB: nv(b.zero_to_60_sec), higherIsBetter: false },
        { label: 'Curb Weight', valueA: typeof a.curb_weight_lbs === 'number' ? `${a.curb_weight_lbs.toLocaleString()} lbs` : '—', valueB: typeof b.curb_weight_lbs === 'number' ? `${b.curb_weight_lbs.toLocaleString()} lbs` : '—', numA: nv(a.curb_weight_lbs), numB: nv(b.curb_weight_lbs), higherIsBetter: false },
        { label: 'Towing', valueA: typeof a.towing_lbs === 'number' ? `${a.towing_lbs.toLocaleString()} lbs` : '—', valueB: typeof b.towing_lbs === 'number' ? `${b.towing_lbs.toLocaleString()} lbs` : '—', numA: nv(a.towing_lbs), numB: nv(b.towing_lbs), higherIsBetter: true },
      ],
    },
    {
      section: 'Drivetrain & Charging',
      metrics: [
        { label: 'Drivetrain', valueA: a.drivetrain || '—', valueB: b.drivetrain || '—' },
        { label: 'Charging Type', valueA: a.charging_type || '—', valueB: b.charging_type || '—' },
        { label: 'DC Fast Charge', valueA: typeof a.dc_fast_charge_kw === 'number' ? `${a.dc_fast_charge_kw} kW` : '—', valueB: typeof b.dc_fast_charge_kw === 'number' ? `${b.dc_fast_charge_kw} kW` : '—', numA: nv(a.dc_fast_charge_kw), numB: nv(b.dc_fast_charge_kw), higherIsBetter: true },
        { label: 'DC 10–80%', valueA: typeof a.dc_fast_charge_10_80_min === 'number' ? `${a.dc_fast_charge_10_80_min} min` : '—', valueB: typeof b.dc_fast_charge_10_80_min === 'number' ? `${b.dc_fast_charge_10_80_min} min` : '—', numA: nv(a.dc_fast_charge_10_80_min), numB: nv(b.dc_fast_charge_10_80_min), higherIsBetter: false },
        { label: 'Onboard AC', valueA: a.onboard_ac_kw ? `${a.onboard_ac_kw} kW` : '—', valueB: b.onboard_ac_kw ? `${b.onboard_ac_kw} kW` : '—', numA: nv(a.onboard_ac_kw), numB: nv(b.onboard_ac_kw), higherIsBetter: true },
        { label: 'L2 10–80%', valueA: a.l2_10_80 ? `${a.l2_10_80} hrs` : '—', valueB: b.l2_10_80 ? `${b.l2_10_80} hrs` : '—', numA: nv(a.l2_10_80), numB: nv(b.l2_10_80), higherIsBetter: false },
        { label: 'L2 10–100%', valueA: a.l2_10_100 ? `${a.l2_10_100} hrs` : '—', valueB: b.l2_10_100 ? `${b.l2_10_100} hrs` : '—', numA: nv(a.l2_10_100), numB: nv(b.l2_10_100), higherIsBetter: false },
      ],
    },
    {
      section: 'Dimensions',
      metrics: [
        { label: 'Length', valueA: typeof a.length_in === 'number' ? `${a.length_in} in` : '—', valueB: typeof b.length_in === 'number' ? `${b.length_in} in` : '—' },
        { label: 'Width', valueA: typeof a.width_in === 'number' ? `${a.width_in} in` : '—', valueB: typeof b.width_in === 'number' ? `${b.width_in} in` : '—' },
        { label: 'Height', valueA: typeof a.height_in === 'number' ? `${a.height_in} in` : '—', valueB: typeof b.height_in === 'number' ? `${b.height_in} in` : '—' },
        { label: 'Ground Clearance', valueA: typeof a.ground_clearance_in === 'number' ? `${a.ground_clearance_in} in` : '—', valueB: typeof b.ground_clearance_in === 'number' ? `${b.ground_clearance_in} in` : '—' },
        { label: '3rd Row Legroom', valueA: typeof a.third_row_legroom_in === 'number' ? `${a.third_row_legroom_in} in` : '—', valueB: typeof b.third_row_legroom_in === 'number' ? `${b.third_row_legroom_in} in` : '—', numA: nv(a.third_row_legroom_in), numB: nv(b.third_row_legroom_in), higherIsBetter: true },
        { label: '3rd Row Headroom', valueA: typeof a.third_row_headroom_in === 'number' ? `${a.third_row_headroom_in} in` : '—', valueB: typeof b.third_row_headroom_in === 'number' ? `${b.third_row_headroom_in} in` : '—', numA: nv(a.third_row_headroom_in), numB: nv(b.third_row_headroom_in), higherIsBetter: true },
      ],
    },
    {
      section: 'Technology & Features',
      metrics: [
        { label: 'Self Driving', valueA: a.self_driving || '—', valueB: b.self_driving || '—' },
        { label: 'Car Software', valueA: a.car_software || '—', valueB: b.car_software || '—' },
        { label: 'Main Display', valueA: a.main_display || '—', valueB: b.main_display || '—' },
        { label: 'Audio', valueA: a.audio || '—', valueB: b.audio || '—' },
      ],
    },
    {
      section: 'Cargo & Storage',
      metrics: [
        { label: 'Frunk', valueA: typeof a.frunk_cu_ft === 'number' ? `${a.frunk_cu_ft} cu ft` : (a.frunk_cu_ft || '—'), valueB: typeof b.frunk_cu_ft === 'number' ? `${b.frunk_cu_ft} cu ft` : (b.frunk_cu_ft || '—'), numA: a.frunk_cu_ft, numB: b.frunk_cu_ft, higherIsBetter: true },
        { label: 'Behind 3rd Row', valueA: typeof a.cargo_behind_3rd_cu_ft === 'number' ? `${a.cargo_behind_3rd_cu_ft} cu ft` : (a.cargo_behind_3rd_cu_ft as string || '—'), valueB: typeof b.cargo_behind_3rd_cu_ft === 'number' ? `${b.cargo_behind_3rd_cu_ft} cu ft` : (b.cargo_behind_3rd_cu_ft as string || '—'), numA: nv(a.cargo_behind_3rd_cu_ft), numB: nv(b.cargo_behind_3rd_cu_ft), higherIsBetter: true },
        { label: 'Behind 2nd Row', valueA: a.cargo_behind_2nd_cu_ft ? `${a.cargo_behind_2nd_cu_ft} cu ft` : '—', valueB: b.cargo_behind_2nd_cu_ft ? `${b.cargo_behind_2nd_cu_ft} cu ft` : '—', numA: a.cargo_behind_2nd_cu_ft, numB: b.cargo_behind_2nd_cu_ft, higherIsBetter: true },
        { label: 'Fold Flat', valueA: a.fold_flat || '—', valueB: b.fold_flat || '—' },
      ],
    },
  ]
}

function cellClass(metric: Metric, side: 'A' | 'B'): string {
  const num = side === 'A' ? metric.numA : metric.numB
  const other = side === 'A' ? metric.numB : metric.numA
  if (metric.higherIsBetter === undefined || num == null || other == null) return ''
  if (num === other) return ''
  const isBetter = metric.higherIsBetter ? num > other : num < other
  return isBetter ? 'compare-cell-best' : 'compare-cell-worst'
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params
  const parsed = parseComparisonSlug(slug)
  if (!parsed) notFound()

  const nameA = getVehicleBySlug(parsed.slugA)
  const nameB = getVehicleBySlug(parsed.slugB)
  if (!nameA || !nameB) notFound()

  const trimsA = getTrimsForVehicle(nameA)
  const trimsB = getTrimsForVehicle(nameB)
  const repA = pickRepTrim(trimsA)
  const repB = pickRepTrim(trimsB)
  const clsA = VEHICLE_CLASSES[nameA] ?? ''
  const clsB = VEHICLE_CLASSES[nameB] ?? ''

  const sections = buildMetrics(repA, repB)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${nameA} vs ${nameB}`,
    description: `Side-by-side comparison of ${nameA} and ${nameB}`,
    about: [
      { '@type': 'Product', name: nameA },
      { '@type': 'Product', name: nameB },
    ],
  }

  // FAQ JSON-LD for comparison
  const nv = (v: number | string | null | undefined) => typeof v === 'number' ? v : null
  const faqEntries: { q: string; a: string }[] = []

  // Price comparison
  const priceA = nv(repA.msrp)
  const priceB = nv(repB.msrp)
  if (priceA && priceB) {
    const cheaper = priceA < priceB ? nameA : nameB
    const diff = Math.abs(priceA - priceB)
    faqEntries.push({ q: `Which is cheaper, the ${nameA} or ${nameB}?`, a: `The ${cheaper} starts at a lower MSRP, approximately $${diff.toLocaleString()} less when comparing representative trims.` })
  }

  // Range comparison
  const rangeA = nv(repA.range_mi)
  const rangeB = nv(repB.range_mi)
  if (rangeA && rangeB) {
    const longer = rangeA > rangeB ? nameA : nameB
    const longerMi = Math.max(rangeA, rangeB)
    const shorterMi = Math.min(rangeA, rangeB)
    faqEntries.push({ q: `Which has more range, the ${nameA} or ${nameB}?`, a: `The ${longer} has a longer EPA-estimated range at ${longerMi} miles compared to ${shorterMi} miles for representative trims.` })
  }

  // Cargo comparison
  const cargo3A = nv(repA.cargo_behind_3rd_cu_ft)
  const cargo3B = nv(repB.cargo_behind_3rd_cu_ft)
  if (cargo3A && cargo3B) {
    const more = cargo3A > cargo3B ? nameA : nameB
    faqEntries.push({ q: `Which has more cargo space, the ${nameA} or ${nameB}?`, a: `The ${more} offers more cargo space behind the third row (${Math.max(cargo3A, cargo3B)} vs ${Math.min(cargo3A, cargo3B)} cu ft).` })
  }

  // Towing comparison
  const towA = nv(repA.towing_lbs)
  const towB = nv(repB.towing_lbs)
  if (towA && towB) {
    const stronger = towA > towB ? nameA : nameB
    faqEntries.push({ q: `Which can tow more, the ${nameA} or ${nameB}?`, a: `The ${stronger} has a higher towing capacity at ${Math.max(towA, towB).toLocaleString()} lbs compared to ${Math.min(towA, towB).toLocaleString()} lbs.` })
  }

  // Seats
  const seatsA = repA.seats
  const seatsB = repB.seats
  if (seatsA && seatsB) {
    faqEntries.push({ q: `How many seats do the ${nameA} and ${nameB} have?`, a: `The ${nameA} seats ${seatsA} and the ${nameB} seats ${seatsB} in their representative configurations. Both are available in multiple seating layouts.` })
  }

  const faqJsonLd = faqEntries.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null

  return (
    <>
      <JsonLd data={jsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <Header activeTab="overview" />
      <main className="compare-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Compare' },
          { label: `${nameA} vs ${nameB}` },
        ]} />

        {/* Hero */}
        <div className="compare-hero">
          <Link href={`/vehicles/${parsed.slugA}`} className={`vehicle-badge ${clsA}`}>{nameA}</Link>
          <span className="compare-vs">vs</span>
          <Link href={`/vehicles/${parsed.slugB}`} className={`vehicle-badge ${clsB}`}>{nameB}</Link>
        </div>
        <p className="compare-rep-note">
          Comparing {repA.year} {repA.trim} vs {repB.year} {repB.trim} (representative trims)
        </p>

        {/* Desktop: Comparison table */}
        <div className="cmp-table-view">
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>
                    <span className={`vehicle-badge ${clsA}`} style={{ fontSize: 12, padding: '2px 8px' }}>{nameA}</span>
                  </th>
                  <th>
                    <span className={`vehicle-badge ${clsB}`} style={{ fontSize: 12, padding: '2px 8px' }}>{nameB}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map(sec => (
                  <Fragment key={sec.section}>
                    <tr className="compare-section-row">
                      <td colSpan={3}>{sec.section}</td>
                    </tr>
                    {sec.metrics.map(m => (
                      <tr key={`${sec.section}-${m.label}`}>
                        <td className="compare-metric-label">{m.label}</td>
                        <td className={cellClass(m, 'A')}>{m.valueA}</td>
                        <td className={cellClass(m, 'B')}>{m.valueB}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: Stacked comparison cards */}
        <div className="cmp-card-view">
          {sections.map(sec => (
            <div key={sec.section} className="compare-mobile-section">
              <div className="compare-mobile-section-title">{sec.section}</div>
              {sec.metrics.map(m => (
                <div key={m.label} className="compare-mobile-metric">
                  <div className="compare-mobile-metric-label">{m.label}</div>
                  <div className="compare-mobile-values">
                    <div className={`compare-mobile-value ${cellClass(m, 'A')}`}>
                      <span className={`vehicle-badge ${clsA}`} style={{ fontSize: 11, padding: '2px 8px' }}>{nameA}</span>
                      <span>{m.valueA}</span>
                    </div>
                    <div className={`compare-mobile-value ${cellClass(m, 'B')}`}>
                      <span className={`vehicle-badge ${clsB}`} style={{ fontSize: 11, padding: '2px 8px' }}>{nameB}</span>
                      <span>{m.valueB}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Links to individual pages */}
        <div className="compare-links">
          <Link href={`/vehicles/${parsed.slugA}`} className="related-link-card">
            <span className={`vehicle-badge ${clsA}`} style={{ fontSize: 13, padding: '3px 10px' }}>{nameA}</span>
            <span>View all {nameA} trims &rarr;</span>
          </Link>
          <Link href={`/vehicles/${parsed.slugB}`} className="related-link-card">
            <span className={`vehicle-badge ${clsB}`} style={{ fontSize: 13, padding: '3px 10px' }}>{nameB}</span>
            <span>View all {nameB} trims &rarr;</span>
          </Link>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link
            href={`/?tab=sidebyside&v1=${encodeURIComponent(nameA)}&v2=${encodeURIComponent(nameB)}`}
            className="back-link"
            style={{ fontSize: 15 }}
          >
            Compare specific trims in the Side-by-Side tool &rarr;
          </Link>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link href="/" className="back-link">&larr; Back to comparison tool</Link>
        </div>
      </main>
    </>
  )
}
