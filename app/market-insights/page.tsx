import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import PageHeader from '@/components/PageHeader'
import DataStories from '@/components/DataStories'
import DataExplorer from '@/components/DataExplorer'
import { DATA } from '@/lib/data'
import { SITE_URL } from '@/lib/slugs'
import { fmtDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'The 3-Row EV Market in Charts',
  description:
    'What the data says about choice, price and range in three-row electric SUVs, plus an interactive explorer for every trim.',
  alternates: { canonical: `${SITE_URL}/market-insights` },
}

export default function DataPage() {
  return (
    <Suspense>
      <Header activeTab="data" />
      <main className="main">
        <div className="ds-column">
          <PageHeader eyebrow={`Market Insights · Updated ${fmtDate(DATA.last_updated)}`} title="The three-row EV market, in four charts.">
            We spent a lot of evenings in spreadsheets so you don&rsquo;t have to. Here is what stood out, and then the
            whole dataset to poke at yourself.
          </PageHeader>
          <DataStories />
        </div>

        <section id="explore" className="ds-explore">
          <div className="ds-rule" />
          <div className="ds-kicker ds-kicker--accent">Explore it yourself</div>
          <DataExplorer />
        </section>
      </main>
    </Suspense>
  )
}
