// ESLint 9 flat config (Next 16 removed `next lint`; run `npm run lint`).
import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  { ignores: ['.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'] },
]

export default config
