import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  SITE_URL, toSlug, getUniqueVehicles, getVehicleBySlug,
  getTrimsForVehicle, getBrandFromVehicle, getAllComparisonPairs,
} from '@/lib/slugs'
import { VEHICLE_CLASSES } from '@/lib/data'
import { fmtMoney, fmtNum } from '@/lib/utils'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import VehicleTrimSection from '@/components/VehicleTrimSection'
import JsonLd from '@/components/JsonLd'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getUniqueVehicles().map(v => ({ slug: toSlug(v) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const vehicle = getVehicleBySlug(slug)
  if (!vehicle) return {}

  const trims = getTrimsForVehicle(vehicle)
  const prices = trims.map(t => t.msrp).filter((p): p is number => typeof p === 'number')
  const ranges = trims.map(t => t.range_mi).filter((r): r is number => typeof r === 'number')
  const years = [...new Set(trims.map(t => t.year))].sort()

  const priceRange = prices.length
    ? `$${Math.min(...prices).toLocaleString()}–$${Math.max(...prices).toLocaleString()}`
    : ''
  const maxRange = ranges.length ? Math.max(...ranges) : 0
  const yearRange = years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`

  const title = `${yearRange} ${vehicle} Specs, Range & Pricing`
  const description = `Compare all ${vehicle} trims${priceRange ? `: pricing from ${priceRange}` : ''}${maxRange ? `, EPA range up to ${maxRange} miles` : ''}. Detailed specs, charging times, and cargo measurements.`

  const ogImage = `/og?type=vehicle&name=${encodeURIComponent(vehicle)}`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/vehicles/${slug}`,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${vehicle} specs and pricing` }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
    alternates: { canonical: `${SITE_URL}/vehicles/${slug}` },
  }
}

export default async function VehiclePage({ params }: Props) {
  const { slug } = await params
  const vehicle = getVehicleBySlug(slug)
  if (!vehicle) notFound()

  const trims = getTrimsForVehicle(vehicle)
  const cls = VEHICLE_CLASSES[vehicle] ?? ''
  const brand = getBrandFromVehicle(vehicle)
  const years = [...new Set(trims.map(t => t.year))].sort()
  const yearRange = years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`

  const prices = trims.map(t => t.msrp).filter((p): p is number => typeof p === 'number')
  const ranges = trims.map(t => t.range_mi).filter((r): r is number => typeof r === 'number')
  const hps = trims.map(t => t.hp).filter((h): h is number => typeof h === 'number')
  const batteries = trims.map(t => t.battery_kwh).filter((b): b is number => typeof b === 'number')
  const seats = [...new Set(trims.map(t => t.seats).filter((s): s is number => s !== null))].sort()

  // Related comparisons
  const allPairs = getAllComparisonPairs()
  const vehicleSlug = toSlug(vehicle)
  const related = allPairs.filter(p => p.slugA === vehicleSlug || p.slugB === vehicleSlug)

  // Charging types
  const chargingTypes = [...new Set(trims.map(t => t.charging_type).filter(Boolean))]
  const cargo3s = trims.map(t => t.cargo_behind_3rd_cu_ft).filter((c): c is number => typeof c === 'number')
  const towing = trims.map(t => t.towing_lbs).filter((t): t is number => typeof t === 'number')

  // Formatting helpers for comparison table
  function fv(val: number | string | null | undefined, unit?: string): string {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'number') return unit ? `${val.toLocaleString()} ${unit}` : val.toLocaleString()
    return val || '—'
  }
  function fm(val: number | string | null | undefined): string {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'number') return `$${val.toLocaleString()}`
    return val || '—'
  }

  // Spec sections for comparison table
  const specSections: { title: string; rows: { label: string; values: string[] }[] }[] = [
    {
      title: 'Key Stats',
      rows: [
        { label: 'MSRP', values: trims.map(r => fm(r.msrp)) },
        { label: 'Pre-Owned Price', values: trims.map(r => r.preowned_range || '—') },
        { label: 'EPA Range', values: trims.map(r => fv(r.range_mi, 'mi')) },
        { label: 'Horsepower', values: trims.map(r => fv(r.hp, 'hp')) },
        { label: 'Battery', values: trims.map(r => fv(r.battery_kwh, 'kWh')) },
        { label: 'Seats', values: trims.map(r => r.seats != null ? String(r.seats) : '—') },
      ],
    },
    {
      title: 'Performance',
      rows: [
        { label: 'Torque', values: trims.map(r => fv(r.torque_lb_ft, 'lb-ft')) },
        { label: '0–60 mph', values: trims.map(r => fv(r.zero_to_60_sec, 'sec')) },
        { label: 'Curb Weight', values: trims.map(r => fv(r.curb_weight_lbs, 'lbs')) },
        { label: 'Towing Capacity', values: trims.map(r => fv(r.towing_lbs, 'lbs')) },
      ],
    },
    {
      title: 'Drivetrain & Charging',
      rows: [
        { label: 'Drivetrain', values: trims.map(r => r.drivetrain || '—') },
        { label: 'Charging Type', values: trims.map(r => r.charging_type || '—') },
        { label: 'DC Fast Charge', values: trims.map(r => fv(r.dc_fast_charge_kw, 'kW')) },
        { label: 'DC 10–80%', values: trims.map(r => fv(r.dc_fast_charge_10_80_min, 'min')) },
        { label: 'Onboard AC', values: trims.map(r => r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—') },
        { label: 'L2 10–80%', values: trims.map(r => r.l2_10_80 ? `${r.l2_10_80} hrs` : '—') },
        { label: 'L2 10–100%', values: trims.map(r => r.l2_10_100 ? `${r.l2_10_100} hrs` : '—') },
      ],
    },
    {
      title: 'Dimensions',
      rows: [
        { label: 'Length', values: trims.map(r => fv(r.length_in, 'in')) },
        { label: 'Width', values: trims.map(r => fv(r.width_in, 'in')) },
        { label: 'Height', values: trims.map(r => fv(r.height_in, 'in')) },
        { label: 'Ground Clearance', values: trims.map(r => fv(r.ground_clearance_in, 'in')) },
        { label: '3rd Row Legroom', values: trims.map(r => fv(r.third_row_legroom_in, 'in')) },
        { label: '3rd Row Headroom', values: trims.map(r => fv(r.third_row_headroom_in, 'in')) },
      ],
    },
    {
      title: 'Technology & Features',
      rows: [
        { label: 'Self Driving', values: trims.map(r => r.self_driving || '—') },
        { label: 'Car Software', values: trims.map(r => r.car_software || '—') },
        { label: 'Main Display', values: trims.map(r => r.main_display || '—') },
        { label: 'Additional Displays', values: trims.map(r => r.additional_displays || '—') },
        { label: 'Audio', values: trims.map(r => r.audio || '—') },
        { label: 'Driver Profiles', values: trims.map(r => r.driver_profiles || '—') },
      ],
    },
    {
      title: 'Cargo & Storage',
      rows: [
        { label: 'Frunk', values: trims.map(r => fv(r.frunk_cu_ft, 'cu ft')) },
        { label: 'Behind 3rd Row', values: trims.map(r => fv(r.cargo_behind_3rd_cu_ft, 'cu ft')) },
        { label: 'Behind 2nd Row', values: trims.map(r => fv(r.cargo_behind_2nd_cu_ft, 'cu ft')) },
        { label: 'Behind 1st Row', values: trims.map(r => fv(r.cargo_behind_1st_cu_ft, 'cu ft')) },
        { label: 'Fold Flat', values: trims.map(r => r.fold_flat || '—') },
        { label: 'Floor Width', values: trims.map(r => fv(r.cargo_floor_width_in, 'in')) },
      ],
    },
  ]

  // Pre-format trim data for the mobile client component
  // Filter out 'Key Stats' since those values are already in the card header
  const trimDataForMobile = trims.map((r, i) => ({
    id: `trim-${i}`,
    year: r.year,
    trim: r.trim,
    msrp: fm(r.msrp),
    range: fv(r.range_mi, 'mi'),
    hp: fv(r.hp, 'hp'),
    seats: r.seats != null ? `${r.seats}-seat` : '—',
    notes: r.notes || '',
    sections: specSections.filter(sec => sec.title !== 'Key Stats').map(sec => ({
      title: sec.title,
      rows: sec.rows.map(row => ({
        label: row.label,
        value: row.values[i],
      })),
    })),
  }))

  // JSON-LD Product
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: vehicle,
    description: `${yearRange} ${vehicle} — 3-row electric vehicle`,
    category: 'Electric Vehicle',
    brand: { '@type': 'Brand', name: brand },
  }
  if (prices.length) {
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      priceCurrency: 'USD',
      offerCount: trims.length,
    }
  }

  // JSON-LD FAQ
  const faqEntries: { q: string; a: string }[] = []
  if (prices.length) {
    const lo = `$${Math.min(...prices).toLocaleString()}`
    const hi = `$${Math.max(...prices).toLocaleString()}`
    faqEntries.push({ q: `How much does the ${vehicle} cost?`, a: `The ${yearRange} ${vehicle} starts at ${lo} MSRP and goes up to ${hi} depending on trim and configuration.` })
  }
  if (ranges.length) {
    const maxR = Math.max(...ranges)
    const minR = Math.min(...ranges)
    faqEntries.push({ q: `What is the range of the ${vehicle}?`, a: `The ${yearRange} ${vehicle} has an EPA-estimated range of ${minR === maxR ? `${maxR} miles` : `${minR} to ${maxR} miles`} depending on trim and battery configuration.` })
  }
  if (seats.length) {
    faqEntries.push({ q: `How many seats does the ${vehicle} have?`, a: `The ${vehicle} is available in ${seats.join(' and ')}-seat configurations across its trim lineup.` })
  }
  if (chargingTypes.length) {
    faqEntries.push({ q: `What charging connector does the ${vehicle} use?`, a: `The ${vehicle} uses ${chargingTypes.join(' or ')}. ${chargingTypes.some(t => t.toLowerCase().includes('nacs')) ? 'NACS provides access to the Tesla Supercharger network.' : ''}`.trim() })
  }
  if (cargo3s.length) {
    const maxCargo = Math.max(...cargo3s)
    faqEntries.push({ q: `How much cargo space does the ${vehicle} have?`, a: `The ${vehicle} offers up to ${maxCargo} cubic feet of cargo space behind the third row with all seats upright.` })
  }
  if (towing.length) {
    const maxTow = Math.max(...towing)
    faqEntries.push({ q: `Can the ${vehicle} tow?`, a: `Yes, the ${vehicle} has a maximum towing capacity of ${maxTow.toLocaleString()} lbs.` })
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
      <main className="vehicle-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Vehicles', href: '/' },
          { label: vehicle },
        ]} />

        <div className="vehicle-hero">
          <span className={`vehicle-badge ${cls}`}>{vehicle}</span>
          <p className="vehicle-hero-sub">{yearRange} &middot; {trims.length} trim{trims.length !== 1 ? 's' : ''} &middot; {seats.join(' or ')}-seat</p>
          <div className="vehicle-hero-actions">
            <Link href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`}>
              Compare trims →
            </Link>
            <Link href={`/?tab=sidebyside&v1=${encodeURIComponent(vehicle)}`}>
              Side-by-side →
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="detail-grid vehicle-stats-grid">
          {prices.length > 0 && (
            <div className="detail-stat">
              <div className="detail-stat-label">MSRP Range</div>
              <div className="detail-stat-value">${Math.min(...prices).toLocaleString()} – ${Math.max(...prices).toLocaleString()}</div>
            </div>
          )}
          {ranges.length > 0 && (
            <div className="detail-stat">
              <div className="detail-stat-label">EPA Range</div>
              <div className="detail-stat-value">{Math.min(...ranges)} – {Math.max(...ranges)} mi</div>
            </div>
          )}
          {hps.length > 0 && (
            <div className="detail-stat">
              <div className="detail-stat-label">Horsepower</div>
              <div className="detail-stat-value">{Math.min(...hps)} – {Math.max(...hps)} hp</div>
            </div>
          )}
          {batteries.length > 0 && (
            <div className="detail-stat">
              <div className="detail-stat-label">Battery</div>
              <div className="detail-stat-value">{[...new Set(batteries)].sort((a, b) => a - b).join(' / ')} kWh</div>
            </div>
          )}
        </div>

        {/* Trim comparison section */}
        <h2 className="section-title" style={{ marginTop: '2rem' }}>All Trims</h2>

        {/* Desktop: comparison table */}
        <div className="cmp-table-view">
          <div className="table-wrap">
            <table className="trim-compare-table">
              <thead>
                <tr>
                  <th className="col-sticky">Spec</th>
                  {trims.map((t, i) => (
                    <th key={i}>{t.year} {t.trim}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specSections.map(sec => (
                  <Fragment key={sec.title}>
                    <tr className="compare-section-row">
                      <td colSpan={trims.length + 1}>{sec.title}</td>
                    </tr>
                    {sec.rows.map(row => (
                      <tr key={row.label}>
                        <td className="col-sticky compare-metric-label">{row.label}</td>
                        {row.values.map((val, j) => (
                          <td key={j}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {trims.some(t => t.notes) && (
                  <>
                    <tr className="compare-section-row">
                      <td colSpan={trims.length + 1}>Notes</td>
                    </tr>
                    {trims.map((t, i) => t.notes ? (
                      <tr key={i} className="notes-row">
                        <td className="col-sticky compare-metric-label">{t.year} {t.trim}</td>
                        <td colSpan={trims.length}>{t.notes}</td>
                      </tr>
                    ) : null)}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: trim navigator + accordion cards */}
        <div className="cmp-card-view">
          <VehicleTrimSection trims={trimDataForMobile} />
        </div>

        {/* Related comparisons */}
        {related.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: '2rem' }}>Compare {vehicle} With</h2>
            <div className="related-links">
              {related.map(pair => {
                const other = pair.nameA === vehicle ? pair.nameB : pair.nameA
                const otherCls = VEHICLE_CLASSES[other] ?? ''
                return (
                  <Link key={pair.slug} href={`/compare/${pair.slug}`} className="related-link-card">
                    <span className={`vehicle-badge ${otherCls}`} style={{ fontSize: 13, padding: '3px 10px' }}>{other}</span>
                    <span className="related-link-vs">{vehicle} vs {other}</span>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        <div className="vehicle-cta-section">
          <h2>Keep Exploring</h2>
          <div className="vehicle-cta-buttons">
            <Link
              href={`/?tab=comparison&vehicle=${encodeURIComponent(vehicle)}`}
              className="vehicle-cta-btn"
            >
              Compare all {vehicle} trims
            </Link>
            <Link
              href={`/?tab=sidebyside&v1=${encodeURIComponent(vehicle)}`}
              className="vehicle-cta-btn secondary"
            >
              Compare {vehicle} side-by-side
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
