import { Suspense } from 'react'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import CarSeatsTab from '@/components/tabs/CarSeatsTab'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'Car Seat Fit Planner for 3-Row EVs',
  description:
    'Fitting 3+ car seats? See which 3-row electric SUVs fit your rear-facing, forward-facing and booster seats — LATCH anchors, top tethers and 3rd-row access by row.',
  alternates: { canonical: `${SITE_URL}/car-seats` },
}

export default function CarSeatsPage() {
  return (
    <Suspense>
      <Header activeTab="carseats" />
      <main className="main">
        <CarSeatsTab />
      </main>
    </Suspense>
  )
}
