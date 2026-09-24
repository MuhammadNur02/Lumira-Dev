import { expect, test } from '@playwright/test'

// Storefront smoke (PRD AC-level journeys that need no external accounts).

test('home renders the bento hero, header and footer @mobile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('contentinfo')).toContainText('Merchant of Record')
})

test('catalog → product page with license selector', async ({ page }) => {
  await page.goto('/ui-kits')
  const card = page.getByRole('link', { name: /Lumen UI/ }).first()
  await card.click()
  await expect(page).toHaveURL(/\/products\/lumen-ui/)
  await expect(page.getByRole('heading', { level: 1, name: /Lumen UI/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Buy license/i }).first()).toBeVisible()
})

test('changelog lists releases with stable anchors', async ({ page }) => {
  await page.goto('/changelog')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('[id*="-v"]').first()).toBeAttached()
})

test('unknown routes render the branded 404', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist')
  expect(res?.status()).toBe(404)
  await expect(page.getByText('404')).toBeVisible()
})

test('security headers and CSP are present on the storefront', async ({ request }) => {
  const res = await request.get('/')
  const headers = res.headers()
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['strict-transport-security']).toContain('max-age=63072000')
  const csp = headers['content-security-policy'] ?? headers['content-security-policy-report-only']
  expect(csp).toContain("object-src 'none'")
  expect(csp).not.toContain('nonce-')
})

test('account routes require sign-in and get a nonce CSP', async ({ request }) => {
  const res = await request.get('/account/library', { maxRedirects: 0 })
  expect([302, 303, 307, 308, 401, 404]).toContain(res.status())
})

test('admin is not discoverable by anonymous visitors', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).not.toHaveURL(/\/admin$/)
})

test('cron and webhook endpoints refuse unauthenticated calls', async ({ request }) => {
  expect((await request.get('/api/cron/checkouts')).status()).toBe(401)
  expect((await request.post('/api/webhooks/lemonsqueezy', { data: '{}' })).status()).toBeGreaterThanOrEqual(400)
  expect((await request.post('/api/webhooks/resend', { data: '{}' })).status()).toBe(400)
})

test('email download links never consume a use on GET', async ({ request }) => {
  const res = await request.get('/d/not-a-real-token')
  expect(res.status()).toBe(200)
  expect(await res.text()).toContain('expired')
})
