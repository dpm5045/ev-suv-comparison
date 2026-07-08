import { Suspense } from 'react'
import type { Metadata } from 'next'
import SpecSelectClient from '@/components/pages/SpecSelectClient'
import { SITE_URL } from '@/lib/slugs'

export const metadata: Metadata = {
  title: 'Spec & Select — Filter 3-Row EVs by What Matters',
  description:
    'Narrow down 3-row electric SUVs by budget, condition, range, cargo and self-driving capability to find your shortlist.',
  alternates: { canonical: `${SITE_URL}/spec-select` },
}

export default function SpecSelectPage() {
  return (
    <Suspense>
      <SpecSelectClient />
    </Suspense>
  )
}
