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
import { SPEC_SECTIONS } from '@/lib/spec-fields'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import JsonLd from '@/components/JsonLd'
import FaqSection from '@/components/FaqSection'
import { comparisonFaq, faqJsonLd, representativeTrim } from '@/lib/compare-text'
import { dataYear } from '@/lib/data-stories'

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
  const description = `Side-by-side comparison of ${nameA} and ${nameB}: pricing, range, battery, charging, cargo space, and technology features.`

  const ogImage = `/og?type=compare&a=${encodeURIComponent(nameA)}&b=${encodeURIComponent(nameB)}`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/compare/${slug}`,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${nameA} vs ${nameB}` }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
    alternates: { canonical: `${SITE_URL}/compare/${slug}` },
  }
}

const pickRepTrim = representativeTrim

interface Metric {
  label: string
  valueA: string
  valueB: string
  numA?: number | null
  numB?: number | null
  higherIsBetter?: boolean
}

function buildMetrics(a: DetailRow, b: DetailRow): { section: string; metrics: Metric[] }[] {
  return SPEC_SECTIONS.map(sec => ({
    section: sec.title,
    metrics: sec.fields.map(f => ({
      label: f.label,
      valueA: f.render(a),
      valueB: f.render(b),
      numA: f.rawNum?.(a) ?? null,
      numB: f.rawNum?.(b) ?? null,
      higherIsBetter: f.higherIsBetter,
    })),
  }))
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

  // FAQ: built from structured values (ties say so; EPA only for EPA figures),
  // shown on the page and emitted as FAQPage structured data from the same list
  const faqEntries = comparisonFaq(nameA, repA, nameB, repB, dataYear)
  const faqData = faqJsonLd(faqEntries)

  return (
    <>
      <JsonLd data={jsonLd} />
      {faqData && <JsonLd data={faqData} />}
      <Header activeTab="none" />
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

        <FaqSection entries={faqEntries} />

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
            href={`/side-by-side?v1=${encodeURIComponent(nameA)}&v2=${encodeURIComponent(nameB)}`}
            className="back-link"
            style={{ fontSize: 15 }}
          >
            Compare specific trims in the Side-by-Side tool &rarr;
          </Link>
        </div>
        {/* More comparisons for internal linking */}
        {(() => {
          const allPairs = getAllComparisonPairs()
          const related = allPairs.filter(p =>
            (p.slugA === parsed.slugA || p.slugB === parsed.slugA ||
             p.slugA === parsed.slugB || p.slugB === parsed.slugB) &&
            p.slug !== slug
          ).slice(0, 8)
          if (!related.length) return null
          return (
            <div style={{ marginTop: '2rem' }}>
              <h2 className="section-title" style={{ fontSize: 18, marginBottom: '0.75rem' }}>More Comparisons</h2>
              <div className="compare-links" style={{ flexWrap: 'wrap' }}>
                {related.map(p => (
                  <Link key={p.slug} href={`/compare/${p.slug}`} className="related-link-card">
                    <span>{p.nameA} vs {p.nameB}</span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })()}

        <div style={{ marginTop: '1rem' }}>
          <Link href="/" className="back-link">&larr; Back to comparison tool</Link>
        </div>
      </main>
    </>
  )
}
