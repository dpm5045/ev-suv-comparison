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
        { label: 'Seats', valueA: a.seats != null ? String(a.seats) : '—', valueB: b.seats != null ? String(b.seats) : '—', numA: a.seats, numB: b.seats, higherIsBetter: true },
        { label: 'EPA Range', valueA: fmtNum(a.range_mi).text + (typeof a.range_mi === 'number' ? ' mi' : ''), valueB: fmtNum(b.range_mi).text + (typeof b.range_mi === 'number' ? ' mi' : ''), numA: nv(a.range_mi), numB: nv(b.range_mi), higherIsBetter: true },
        { label: 'Horsepower', valueA: fmtNum(a.hp).text + (typeof a.hp === 'number' ? ' hp' : ''), valueB: fmtNum(b.hp).text + (typeof b.hp === 'number' ? ' hp' : ''), numA: nv(a.hp), numB: nv(b.hp), higherIsBetter: true },
        { label: 'Battery', valueA: fmtNum(a.battery_kwh).text + (typeof a.battery_kwh === 'number' ? ' kWh' : ''), valueB: fmtNum(b.battery_kwh).text + (typeof b.battery_kwh === 'number' ? ' kWh' : ''), numA: nv(a.battery_kwh), numB: nv(b.battery_kwh), higherIsBetter: true },
      ],
    },
    {
      section: 'Drivetrain & Charging',
      metrics: [
        { label: 'Drivetrain', valueA: a.drivetrain || '—', valueB: b.drivetrain || '—' },
        { label: 'Charging Type', valueA: a.charging_type || '—', valueB: b.charging_type || '—' },
        { label: 'Onboard AC', valueA: a.onboard_ac_kw ? `${a.onboard_ac_kw} kW` : '—', valueB: b.onboard_ac_kw ? `${b.onboard_ac_kw} kW` : '—', numA: nv(a.onboard_ac_kw), numB: nv(b.onboard_ac_kw), higherIsBetter: true },
        { label: 'L2 10–80%', valueA: a.l2_10_80 ? `${a.l2_10_80} hrs` : '—', valueB: b.l2_10_80 ? `${b.l2_10_80} hrs` : '—', numA: nv(a.l2_10_80), numB: nv(b.l2_10_80), higherIsBetter: false },
        { label: 'L2 10–100%', valueA: a.l2_10_100 ? `${a.l2_10_100} hrs` : '—', valueB: b.l2_10_100 ? `${b.l2_10_100} hrs` : '—', numA: nv(a.l2_10_100), numB: nv(b.l2_10_100), higherIsBetter: false },
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

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
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

        {/* Comparison table */}
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
                <>
                  <tr key={sec.section} className="compare-section-row">
                    <td colSpan={3}>{sec.section}</td>
                  </tr>
                  {sec.metrics.map(m => (
                    <tr key={`${sec.section}-${m.label}`}>
                      <td className="compare-metric-label">{m.label}</td>
                      <td className={cellClass(m, 'A')}>{m.valueA}</td>
                      <td className={cellClass(m, 'B')}>{m.valueB}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
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
