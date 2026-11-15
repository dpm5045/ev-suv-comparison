import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import WatchListTab from '@/components/tabs/WatchListTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'News Radar — New, Upcoming & Discontinued 3-Row EVs',
  description:
    'Three-row electric SUVs on the way to the US, the latest model-year announcements, and the ones that have been discontinued.',
  alternates: { canonical: `${SITE_URL}/news-radar` },
}

export default function WatchListPage() {
  return (
    <Suspense>
      <Header activeTab="watchlist" />
      <main className="main">
        <WatchListTab />
      </main>
    </Suspense>
  )
}
