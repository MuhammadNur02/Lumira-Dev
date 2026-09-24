import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { testEnv } from './tests/test-env.mts'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` throws outside the react-server condition; tests exercise server modules directly.
      'server-only': fileURLToPath(new URL('./tests/mocks/empty.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    env: testEnv,
    restoreMocks: true,
    testTimeout: 20_000,
    // Each integration suite boots PGlite (WASM Postgres) and applies every migration; under
    // parallel load that alone can exceed Vitest's 10 s default.
    hookTimeout: 90_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'packages/*/src/**/*.ts'],
      exclude: ['src/components/ui/**', 'src/db/migrations/**', 'src/sanity/types.ts'],
    },
  },
})
