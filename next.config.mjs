/** @type {import('next').NextConfig} */
const config = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  async redirects() {
    // Legacy ?tab= dashboard URLs → real routes (other query params carry over)
    const tabRoutes = [
      ['comparison', '/comparison'],
      ['sidebyside', '/side-by-side'],
      ['specselect', '/spec-select'],
      ['glossary', '/glossary'],
      ['reference', '/glossary'],
    ]
    return tabRoutes.map(([tab, destination]) => ({
      source: '/',
      has: [{ type: 'query', key: 'tab', value: tab }],
      destination,
      permanent: true,
    }))
  },
}

export default config
