import { defineConfig } from 'vitest/config'
import base from './vitest.config'

// Tests on the built site (.next): run after `npm run build`.
// (Not mergeConfig: that would concatenate the include lists.)
export default defineConfig({
  ...base,
  test: { ...base.test, include: ['tests/output/**/*.test.ts'] },
})
