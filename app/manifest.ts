import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '3-Row EV Comparison Tool',
    short_name: '3-Row EV',
    description: 'Compare specs, pricing, and features for every 3-row electric vehicle',
    start_url: '/',
    display: 'standalone',
    background_color: '#151921',
    theme_color: '#151921',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
