import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import GlossaryTab from '@/components/tabs/GlossaryTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'EV Glossary & Methodology',
  description:
    'Definitions for every spec field in the 3-row EV comparison — charging standards, OTD pricing assumptions, cargo measurements and more.',
  alternates: { canonical: `${SITE_URL}/glossary` },
}

export default function GlossaryPage() {
  return (
    <Suspense>
      <Header activeTab="glossary" />
      <main className="main">
        <GlossaryTab />
      </main>
    </Suspense>
  )
}
