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
  description: 'About the 3-Row EV Comparison Tool — our mission, data sources, and methodology.',
  alternates: { canonical: `${SITE_URL}/about` },
}

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="info-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'About' },
        ]} />

        <h1 className="section-title">About This Tool</h1>

        <div className="info-content">
          <section className="info-section">
            <h2>Our Mission</h2>
            <p>
              The 3-row electric SUV market is growing fast, but comparing vehicles across
              different manufacturers is surprisingly difficult. Specs are scattered across
              press releases, configurators, and review sites — each presenting data differently.
            </p>
            <p>
              We built this tool to solve that problem. Every spec, price, and measurement is
              normalized and presented side-by-side so you can make informed decisions without
              jumping between a dozen browser tabs.
            </p>
          </section>

          <section className="info-section">
            <h2>What We Cover</h2>
            <p>
              We currently track <strong>{trimCount} trims</strong> across{' '}
              <strong>{vehicleCount} vehicles</strong>, covering every 3-row electric SUV
              and minivan available or announced in the US market. Each vehicle listing includes:
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
              and verified press materials. We update our database regularly as new models
              are announced and existing models receive updates.
            </p>
            <p>
              For a detailed breakdown of our data assumptions and methodology, see
              the <Link href="/?tab=assumptions" className="info-link">Approach &amp; Assumptions</Link> tab
              on the main comparison tool.
            </p>
          </section>

          <section className="info-section">
            <h2>Independence</h2>
            <p>
              This site is independently operated and is not affiliated with, sponsored by,
              or endorsed by any automaker. Our goal is to provide unbiased, accurate
              information to help consumers navigate the 3-row EV market.
            </p>
          </section>

          <section className="info-section">
            <h2>Contact</h2>
            <p>
              Have a question, correction, or suggestion? We&apos;d love to hear from you
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
