import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '3-Row EV AWD SUV Market Analysis',
  description: '63 models · 9 vehicles · 2023–2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
