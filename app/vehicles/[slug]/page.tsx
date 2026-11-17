import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  SITE_URL, toSlug, getUniqueVehicles, getVehicleBySlug,
  getTrimsForVehicle, getBrandFromVehicle, getAllComparisonPairs,
} from '@/lib/slugs'
import { VEHICLE_CLASSES } from '@/lib/data'
import { WATCHLIST_META, WATCH_STATUS_LABEL } from '@/lib/watchlist'
import { fmtMoney, fmtMsrp, fmtNum } from '@/lib/utils'
import { SPEC_SECTIONS } from '@/lib/spec-fields'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import VehicleTrimSection from '@/components/VehicleTrimSection'
import JsonLd from '@/components/JsonLd'
import FaqSection from '@/components/FaqSection'
import { currentPriceText, faqJsonLd, maxRangeText, priceSpans, rangeBasis, rangeCell, rangeLabel, vehicleFaq } from '@/lib/compare-text'
import { dataYear } from '@/lib/data-stories'
import { isSoldNew } from '@/lib/selection'

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
  const years = [...new Set(trims.map(t => t.year))].sort()
  // Current MSRPs only (configurations sold new today), and the longest range with its basis
  const priceRange = currentPriceText(trims, dataYear) ?? ''
  const maxRange = maxRangeText(trims)
  const yearRange = years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`

  const title = `${yearRange} ${vehicle} Specs, Range & Pricing`
  const rangeWord = rangeLabel(trims) === 'EPA Range' ? 'EPA range' : 'range'
  const description = `Compare all ${vehicle} trims${priceRange ? `: pricing from ${priceRange}` : ''}${maxRange ? `, ${rangeWord} up to ${maxRange}` : ''}. Detailed specs, charging times, and cargo measurements.`

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
  const watchMeta = WATCHLIST_META[vehicle]
  const brand = getBrandFromVehicle(vehicle)
  const years = [...new Set(trims.map(t => t.year))].sort()
  const yearRange = years.length === 1 ? String(years[0]) : `${years[0]}–${years[years.length - 1]}`

  // Current MSRPs (configurations sold new today); older MSRPs are only "when new" prices
  const { current: currentPrices, announced: announcedPrices, past: pastPrices } = priceSpans(trims, dataYear)
  const shownPrices = currentPrices ?? announcedPrices ?? pastPrices
  const priceStatLabel = currentPrices ? 'MSRP Range' : announcedPrices ? 'Announced MSRP' : 'MSRP When New'
  const ranges = trims.map(t => t.range_mi).filter((r): r is number => typeof r === 'number')
  const rangeStatLabel = rangeLabel(trims)
  const hps = trims.map(t => t.hp).filter((h): h is number => typeof h === 'number')
  const batteries = trims.map(t => t.battery_kwh).filter((b): b is number => typeof b === 'number')
  const seats = [...new Set(trims.map(t => t.seats).filter((s): s is number => s !== null))].sort()

  // Related comparisons
  const allPairs = getAllComparisonPairs()
  const vehicleSlug = toSlug(vehicle)
  const related = allPairs.filter(p => p.slugA === vehicleSlug || p.slugB === vehicleSlug)

  // Build spec sections from centralized registry
  const specSections = SPEC_SECTIONS.map(sec => ({
    title: sec.title,
    rows: sec.fields.map(f => ({
      label: f.label,
      values: trims.map(r => f.render(r)),
    })),
  }))

  // Pre-format trim data for the mobile client component
  // Filter out 'Pricing' since those values are already in the card header
  const trimDataForMobile = trims.map((r, i) => ({
    id: `trim-${i}`,
    year: r.year,
    trim: r.trim,
    msrp: fmtMsrp(r).text,
    range: rangeCell(r) ?? fmtNum(r.range_mi).text,
    hp: fmtNum(r.hp).text + (typeof r.hp === 'number' ? ' hp' : ''),
    seats: r.seats != null ? `${r.seats}-seat` : '—',
    notes: r.notes || '',
    sections: specSections.filter(sec => sec.title !== 'Pricing').map(sec => ({
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
  // Offers only for configurations sold new today
  if (currentPrices) {
    jsonLd.offers = {
      '@type': 'AggregateOffer',
      lowPrice: currentPrices.min,
      highPrice: currentPrices.max,
      priceCurrency: 'USD',
      offerCount: trims.filter(t => isSoldNew(t, dataYear)).length,
    }
  }

  // FAQ: built from structured values (current prices, range basis), shown on
  // the page and emitted as FAQPage structured data from the same list
  const faqEntries = vehicleFaq(vehicle, trims, dataYear)
  const faqData = faqJsonLd(faqEntries)

  return (
    <>
      <JsonLd data={jsonLd} />
      {faqData && <JsonLd data={faqData} />}
      <Header activeTab="none" />
      <main className="vehicle-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Vehicles', href: '/' },
          { label: vehicle },
        ]} />

        <div className="vehicle-hero">
          <span className={`vehicle-badge ${cls}`}>{vehicle}</span>
          <p className="vehicle-hero-sub">{yearRange} &middot; {trims.length} trim{trims.length !== 1 ? 's' : ''} &middot; {seats.join(' or ')}-seat</p>
          {watchMeta && (
            <p className="vehicle-hero-watch">
              <span className={`wl-chip wl-chip--${watchMeta.status}`}>{WATCH_STATUS_LABEL[watchMeta.status]}</span>
              <span>{watchMeta.windowLabel}</span>
              <Link href="/news-radar">News Radar →</Link>
            </p>
          )}
          <div className="vehicle-hero-actions">
            <Link href={`/comparison?vehicle=${encodeURIComponent(vehicle)}`}>
              Compare trims →
            </Link>
            <Link href={`/side-by-side?v1=${encodeURIComponent(vehicle)}`}>
              Side-by-side →
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="detail-grid vehicle-stats-grid">
          {shownPrices && (
            <div className="detail-stat">
              <div className="detail-stat-label">{priceStatLabel}</div>
              <div className="detail-stat-value">${shownPrices.min.toLocaleString()} – ${shownPrices.max.toLocaleString()}</div>
            </div>
          )}
          {ranges.length > 0 && (
            <div className="detail-stat">
              <div className="detail-stat-label">{rangeStatLabel}</div>
              <div className="detail-stat-value">
                {Math.min(...ranges)} – {Math.max(...ranges)} mi
                {trims.some(t => rangeBasis(t) === 'manufacturer_estimate' && typeof t.range_mi === 'number') && <span className="detail-stat-note">includes maker estimates</span>}
              </div>
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
          <div className="table-wrap trim-table-wrap" tabIndex={0} role="region" aria-label="All trims table (scrolls sideways)">
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
                      <td className="col-sticky">{sec.title}</td>
                      <td colSpan={trims.length} />
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
                      <td className="col-sticky">Notes</td>
                      <td colSpan={trims.length} />
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

        <FaqSection entries={faqEntries} />

        {/* Related comparisons */}
        {related.length > 0 && (
          <>
            <h2 className="section-title" style={{ marginTop: '2rem' }}>Compare {vehicle} With</h2>
            <div className="related-links">
              {related.map(pair => {
                const other = pair.nameA === vehicle ? pair.nameB : pair.nameA
                const otherCls = VEHICLE_CLASSES[other] ?? ''
                return (
                  <Link key={pair.slug} href={`/compare/${pair.slug}`} className="related-link-card" aria-label={`Compare ${vehicle} with ${other}`}>
                    <span className={`vehicle-badge ${otherCls}`} style={{ fontSize: 13, padding: '3px 10px' }}>{other}</span>
                    <span className="related-link-arrow" aria-hidden="true">→</span>
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
              href={`/comparison?vehicle=${encodeURIComponent(vehicle)}`}
              className="vehicle-cta-btn"
            >
              Compare all {vehicle} trims
            </Link>
            <Link
              href={`/side-by-side?v1=${encodeURIComponent(vehicle)}`}
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
