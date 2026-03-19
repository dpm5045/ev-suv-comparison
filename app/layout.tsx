import type { Metadata, Viewport } from 'next'
import { DATA } from '@/lib/data'
import { SITE_URL, getUniqueVehicles } from '@/lib/slugs'
import Footer from '@/components/Footer'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const vehicleCount = getUniqueVehicles().length
const trimCount = DATA.details.length
const description = `Compare ${trimCount} trims across ${vehicleCount} vehicles — pricing, range, charging, cargo & more for every 3-row electric vehicle (2021–2027).`

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#151921',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Compare Every 3-Row Electric Vehicle — Pricing, Range & Specs',
    template: '%s | 3-Row EV Comparison',
  },
  description,
  openGraph: {
    title: 'Compare Every 3-Row Electric Vehicle — Pricing, Range & Specs',
    description,
    siteName: '3-Row EV Comparison',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og?type=home', width: 1200, height: 630, alt: 'Compare every 3-row electric vehicle side by side' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Every 3-Row Electric Vehicle — Pricing, Range & Specs',
    description,
    images: ['/og?type=home'],
  },
  icons: { icon: '/favicon.svg' },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <GoogleAnalytics />
        {children}
        <Footer />
      </body>
    </html>
  )
}
