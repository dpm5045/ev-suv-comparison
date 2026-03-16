import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/slugs'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for the 3-Row EV Comparison Tool.',
  alternates: { canonical: `${SITE_URL}/privacy` },
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="info-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Privacy Policy' },
        ]} />

        <h1 className="section-title">Privacy Policy</h1>
        <p className="info-effective">Effective date: March 16, 2026</p>

        <div className="info-content">
          <section className="info-section">
            <h2>Overview</h2>
            <p>
              threerowev.com (&quot;we&quot;, &quot;us&quot;, or &quot;the site&quot;) is committed to
              protecting your privacy. This policy describes what data we collect, how we use it,
              and your rights regarding that data.
            </p>
          </section>

          <section className="info-section">
            <h2>Data We Collect</h2>

            <h3>Analytics</h3>
            <p>
              We use Google Analytics to understand how visitors use the site. Google Analytics
              collects anonymized data including pages visited, time on site, browser type,
              device type, and approximate geographic location. This data is aggregated and
              cannot be used to identify you personally.
            </p>
            <p>
              You can opt out of Google Analytics by installing
              the <a href="https://tools.google.com/dlpage/gaoptout" className="info-link" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.
            </p>

            <h3>Local Storage</h3>
            <p>
              The site may store non-personal preferences and cached data in your
              browser&apos;s local storage (e.g., filter settings, cached search results).
              This data never leaves your device and is not transmitted to any server.
            </p>
          </section>

          <section className="info-section">
            <h2>Data We Do Not Collect</h2>
            <ul>
              <li>We do not require or collect any personal information (name, email, address)</li>
              <li>We do not use cookies for tracking or advertising</li>
              <li>We do not sell, share, or trade any user data with third parties</li>
              <li>We do not serve targeted advertisements</li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Third-Party Services</h2>
            <p>
              The site is hosted on <strong>Vercel</strong> and uses <strong>Google Analytics</strong>.
              Both services have their own privacy policies:
            </p>
            <ul>
              <li><a href="https://vercel.com/legal/privacy-policy" className="info-link" target="_blank" rel="noopener noreferrer">Vercel Privacy Policy</a></li>
              <li><a href="https://policies.google.com/privacy" className="info-link" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted on
              this page with an updated effective date.
            </p>
          </section>

          <section className="info-section">
            <h2>Contact</h2>
            <p>
              If you have questions about this policy, contact us
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
