import { Suspense } from 'react'
import type { Metadata } from 'next'
import ComparisonClient from '@/components/pages/ComparisonClient'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'The Full Monty — Compare Every 3-Row EV Trim',
  description:
    'Filterable spreadsheet of every 3-row electric SUV trim: pricing, range, charging speed, cargo space, self-driving tier and more.',
  alternates: { canonical: `${SITE_URL}/comparison` },
}

export default function ComparisonPage() {
  return (
    <Suspense>
      <ComparisonClient />
    </Suspense>
  )
}
