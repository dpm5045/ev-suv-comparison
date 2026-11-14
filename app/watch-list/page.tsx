import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import WatchListTab from '@/components/tabs/WatchListTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'Watch List — Upcoming & Discontinued 3-Row EVs',
  description:
    'Three-row electric SUVs announced but not yet on sale in the US, plus the ones that have been discontinued.',
  alternates: { canonical: `${SITE_URL}/watch-list` },
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
