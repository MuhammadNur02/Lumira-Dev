import { expect, test } from '@playwright/test'

/**
 * AC-01 in Lemon Squeezy TEST MODE (Task.md P5.17): overlay checkout with the test card, success
 * page shows keys and downloads without signing in. Runs only against staging:
 *   PLAYWRIGHT_BASE_URL=https://staging.lumira.dev E2E_COMMERCE=1 pnpm test:e2e --grep @commerce
 */
test.skip(!process.env.E2E_COMMERCE, 'Needs a staging deployment with LS test mode')

test('purchase → success page → key and download @commerce', async ({ page }) => {
  await page.goto('/products/lumen-ui')
  await page
    .getByRole('button', { name: /Buy license/i })
    .first()
    .click()
  await page.getByRole('radio', { name: /Personal/i }).check()
  await page.getByRole('button', { name: /^Buy/ }).last().click()

  const overlay = page.frameLocator('iframe[src*="lemonsqueezy.com"]')
  await overlay.getByLabel(/email/i).fill(`e2e+${Date.now()}@resend.dev`)
  await overlay.getByLabel(/card number/i).fill('4242 4242 4242 4242')
  await overlay.getByLabel(/expiration|expiry/i).fill('12 / 34')
  await overlay.getByLabel(/cvc|security code/i).fill('123')
  await overlay.getByLabel(/name/i).first().fill('E2E Buyer')
  await overlay.getByRole('button', { name: /pay|purchase/i }).click()

  await expect(page).toHaveURL(/\/checkout\/success\?cs=/, { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /You’re all set/ })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByLabel(/License key/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Download v/ })).toBeVisible()
})

test('another browser with the same cs sees no order details @commerce', async ({ browser, page }) => {
  await page.goto('/checkout/success?cs=00000000-0000-4000-8000-000000000000')
  const other = await browser.newContext()
  const res = await other.request.get('/api/checkout/status?cs=00000000-0000-4000-8000-000000000000')
  const body = (await res.json()) as { status: string; order?: unknown }
  expect(body.order).toBeUndefined()
  await other.close()
})
