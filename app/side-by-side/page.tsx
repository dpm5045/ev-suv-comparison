import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import SideBySideTab from '@/components/tabs/SideBySideTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'Side-by-Side 3-Row EV Comparison',
  description:
    'Pick up to three 3-row electric SUV trims and compare their full specs side by side — pricing, range, charging, cargo and infotainment.',
  alternates: { canonical: `${SITE_URL}/side-by-side` },
}

export default function SideBySidePage() {
  return (
    <Suspense>
      <Header activeTab="sidebyside" />
      <main className="main">
        <SideBySideTab />
      </main>
    </Suspense>
  )
}
