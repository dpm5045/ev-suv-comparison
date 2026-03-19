import type { Metadata } from 'next'
import Link from 'next/link'
import { DATA } from '@/lib/data'
import { getUniqueVehicles, SITE_URL } from '@/lib/slugs'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'

const vehicleCount = getUniqueVehicles().length
const trimCount = DATA.details.length

export const metadata: Metadata = {
  title: 'About',
  description: 'About the 3-Row EV Comparison Tool — mission, data sources, and methodology.',
  alternates: { canonical: `${SITE_URL}/about` },
}

export default function AboutPage() {
  return (
    <>
      <Header activeTab="about" />
      <main className="info-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]} />

        <h1 className="section-title">About This Tool</h1>

        <div className="info-content">
          <section className="info-section">
            <h2>My Mission</h2>
            <p>
              The 3-row electric vehicle market is growing fast, but comparing vehicles across
              different manufacturers is surprisingly difficult. Specs are scattered across
              press releases, configurators, and review sites — each presenting data differently.
            </p>
            <p>
              I built this tool to solve that problem. Every spec, price, and measurement is
              normalized and presented side-by-side so you can make informed decisions without
              jumping between a dozen browser tabs.
            </p>
          </section>

          <section className="info-section">
            <h2>What&apos;s Covered</h2>
            <p>
              This tool currently tracks <strong>{trimCount} trims</strong> across{' '}
              <strong>{vehicleCount} vehicles</strong>, covering every 3-row electric vehicle available or announced in the US market. Each vehicle listing includes:
            </p>
            <ul>
              <li>Pricing (MSRP, federal tax credit eligibility, pre-owned values)</li>
              <li>Range and battery specifications</li>
              <li>Charging times (Level 2 and DC fast charging)</li>
              <li>Cargo measurements and seat configurations</li>
              <li>Technology features, drivetrain details, and more</li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Data Sources &amp; Methodology</h2>
            <p>
              All data is sourced from official manufacturer specifications, EPA filings,
              and verified press materials. I update the database regularly as new models
              are announced and existing models receive updates.
            </p>
            <p>
              New pricing reflects MSRP as published by the manufacturer. Where data is
              unavailable or unconfirmed, fields are marked as TBD or N/A rather than estimated.
            </p>
            <p>
              For charging terminology and field definitions, see
              the <Link href="/?tab=glossary" className="info-link">Glossary</Link> tab
              on the main comparison tool.
            </p>
          </section>

          <section className="info-section">
            <h2>Independence</h2>
            <p>
              This site is independently operated and is not affiliated with, sponsored by,
              or endorsed by any automaker. My goal is to provide unbiased, accurate
              information to help consumers navigate the 3-row EV market.
            </p>
          </section>

          <section className="info-section">
            <h2>Contact</h2>
            <p>
              Have a question, correction, or suggestion? I&apos;d love to hear from you
              at <a href="mailto:contact@threerowev.com" className="info-link">contact@threerowev.com</a>.
            </p>
          </section>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link href="/" className="back-link">&larr; Back to comparison tool</Link>
        </div>
      </main>
    </>
  )
}
