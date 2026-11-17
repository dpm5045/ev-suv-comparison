import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Unit tests for the app and domain layer (lib/). Pipeline tests in
// scripts/refresh/test stay on node --test.
export default defineConfig({
  // Match Next's automatic JSX runtime (tsconfig has jsx: preserve)
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
