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
  webServer: {
    command: `npm run dev -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
