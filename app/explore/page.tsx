import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/slugs'
import Header from '@/components/Header'
import Breadcrumb from '@/components/Breadcrumb'
import DataExplorer from '@/components/DataExplorer'

export const metadata: Metadata = {
  title: '3-Row EV Data Explorer',
  description: 'Interactive scatter plot for comparing specs across 3-row electric vehicles.',
  alternates: { canonical: `${SITE_URL}/explore` },
}

export default function ExplorePage() {
  return (
    <>
      <Header />
      <main className="info-page">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Data Explorer' },
        ]} />
        <DataExplorer />
      </main>
    </>
  )
}
