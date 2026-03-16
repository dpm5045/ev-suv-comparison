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
import SpecSection from '@/components/SpecSection'
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/vehicles/${slug}`,
      type: 'website',
    },
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

  // JSON-LD
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

  return (
    <>
      <JsonLd data={jsonLd} />
      <Header />
      <main className="vehicle-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Vehicles', href: '/' },
          { label: vehicle },
        ]} />

        <div className="vehicle-hero">
          <span className={`vehicle-badge ${cls}`}>{vehicle}</span>
          <p className="vehicle-hero-sub">{yearRange} &middot; {trims.length} trim{trims.length !== 1 ? 's' : ''} &middot; {seats.join(' or ')}-seat</p>
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

        {/* Trim-by-trim breakdown */}
        <h2 className="section-title" style={{ marginTop: '2rem' }}>All Trims</h2>
        {trims.map((r, i) => (
          <div key={i} className="trim-card">
            <div className="trim-card-header">
              <span className={`vehicle-badge ${cls}`} style={{ fontSize: 13, padding: '3px 10px' }}>{r.vehicle}</span>
              <span className="trim-card-name">{r.year} {r.trim}</span>
            </div>

            <div className="detail-grid">
              {([
                ['MSRP', (() => { const f = fmtMoney(r.msrp); return f.text })()],
                ['EPA Range', (() => { const f = fmtNum(r.range_mi); return f.text + (typeof r.range_mi === 'number' ? ' mi' : '') })()],
                ['Horsepower', (() => { const f = fmtNum(r.hp); return f.text + (typeof r.hp === 'number' ? ' hp' : '') })()],
                ['Battery', (() => { const f = fmtNum(r.battery_kwh); return f.text + (typeof r.battery_kwh === 'number' ? ' kWh' : '') })()],
                ['Seats', r.seats ?? '—'],
              ] as [string, React.ReactNode][]).map(([label, val]) => (
                <div key={label} className="detail-stat">
                  <div className="detail-stat-label">{label}</div>
                  <div className="detail-stat-value">{val}</div>
                </div>
              ))}
            </div>

            <SpecSection title="Drivetrain & Charging" rows={[
              ['Drivetrain', r.drivetrain],
              ['Charging Type', r.charging_type],
              ['Onboard AC', r.onboard_ac_kw ? `${r.onboard_ac_kw} kW` : '—'],
              ['L2 10–80%', r.l2_10_80 ? `${r.l2_10_80} hrs` : '—'],
              ['L2 10–100%', r.l2_10_100 ? `${r.l2_10_100} hrs` : '—'],
            ]} />

            <SpecSection title="Technology & Features" rows={[
              ['Self Driving', r.self_driving],
              ['Car Software', r.car_software],
              ['Main Display', r.main_display],
              ['Additional Displays', r.additional_displays],
              ['Audio', r.audio],
              ['Driver Profiles', r.driver_profiles],
            ]} />

            <SpecSection title="Cargo & Storage" rows={[
              ['Frunk', typeof r.frunk_cu_ft === 'number' ? `${r.frunk_cu_ft} cu ft` : r.frunk_cu_ft],
              ['Behind 3rd Row', typeof r.cargo_behind_3rd_cu_ft === 'number' ? `${r.cargo_behind_3rd_cu_ft} cu ft` : r.cargo_behind_3rd_cu_ft],
              ['Behind 2nd Row', typeof r.cargo_behind_2nd_cu_ft === 'number' ? `${r.cargo_behind_2nd_cu_ft} cu ft` : r.cargo_behind_2nd_cu_ft],
              ['Fold Flat', r.fold_flat],
              ['Floor Width (Wheel Wells)', typeof r.cargo_floor_width_in === 'number' ? `${r.cargo_floor_width_in} in` : r.cargo_floor_width_in],
            ]} />

            {r.notes && (
              <div className="detail-section">
                <div className="detail-section-title">Notes</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.notes}</p>
              </div>
            )}
          </div>
        ))}

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

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" className="back-link">&larr; Back to comparison tool</Link>
        </div>
      </main>
    </>
  )
}
