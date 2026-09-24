import { defineConfig, devices } from '@playwright/test'

/**
 * E2E + accessibility (Task.md P5.17, P6.14, P8.04). Locally it boots `next dev` against the
 * fixture catalog; in CI it targets a Vercel preview through PLAYWRIGHT_BASE_URL.
 * Purchase flows need LS test mode and are tagged @commerce so they run only on staging.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : undefined,
  },
  projects: [
    { name: 'desktop-dark', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light' }, grep: /@a11y/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], colorScheme: 'dark' }, grep: /@mobile|@a11y/ },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        env: { CONTENT_SOURCE: 'fixtures' },
      },
})
