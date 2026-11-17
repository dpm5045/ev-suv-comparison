import { defineConfig } from '@playwright/test'

// Override with PW_PORT to avoid colliding with a dev server already on 3000
const port = Number(process.env.PW_PORT) || 3000

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 900 },
  },
  // CI tests the production build on a fresh server; locally, a dev server
  // (or one already running) is fine.
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${port}` : `npm run dev -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
