import { Suspense } from 'react'
import Dashboard from '@/components/Dashboard'
import JsonLd from '@/components/JsonLd'
import { SITE_URL, getUniqueVehicles } from '@/lib/slugs'
import { DATA } from '@/lib/data'

const vehicleCount = getUniqueVehicles().length
const trimCount = DATA.details.length

export default function Home() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '3-Row EV Comparison Tool',
        url: SITE_URL,
        description: `Compare ${trimCount} trims across ${vehicleCount} vehicles — pricing, range, charging, cargo & more for every 3-row electric SUV.`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?tab=comparison&q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '3-Row EV Comparison',
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'contact@threerowev.com',
          contactType: 'customer service',
        },
      }} />
      <Suspense>
        <Dashboard />
      </Suspense>
    </>
  )
}
