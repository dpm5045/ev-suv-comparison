import type { Metadata, Viewport } from 'next'
import { DATA } from '@/lib/data'
import { SITE_URL, getUniqueVehicles } from '@/lib/slugs'
import Footer from '@/components/Footer'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const vehicleCount = getUniqueVehicles().length
const trimCount = DATA.details.length
const description = `Compare ${trimCount} trims across ${vehicleCount} vehicles — pricing, range, charging, cargo & more for every 3-row electric SUV and minivan (2021–2027).`

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#151921',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '3-Row EV Comparison Tool',
    template: '%s | 3-Row EV Comparison',
  },
  description,
  openGraph: {
    title: '3-Row EV Comparison Tool',
    description,
    siteName: '3-Row EV Comparison',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og?type=home', width: 1200, height: 630, alt: '3-Row EV Comparison Tool' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3-Row EV Comparison Tool',
    description,
    images: ['/og?type=home'],
  },
  icons: { icon: '/favicon.svg' },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GoogleAnalytics />
        {children}
        <Footer />
      </body>
    </html>
  )
}
