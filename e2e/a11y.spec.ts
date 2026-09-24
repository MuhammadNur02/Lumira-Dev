import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// NFR-A11Y / P8.04: axe on every public route, in both themes (projects desktop-dark and
// desktop-light) and on mobile. WCAG 2.2 AA rule set.
const ROUTES = [
  '/',
  '/boilerplates',
  '/ui-kits',
  '/templates',
  '/products/lumen-ui',
  '/products/saas-starter/changelog',
  '/changelog',
  '/all-access',
  '/bundles',
  '/license',
  '/refund-policy',
  '/docs',
  '/sign-in',
]

for (const route of ROUTES) {
  test(`${route} has no WCAG 2.2 AA violations @a11y`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('iframe')
      .analyze()
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`)).toEqual([])
  })
}

test('keyboard: skip link moves focus to main content @a11y', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: /skip to content/i })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page.locator('#main')).toBeInViewport()
})

test('reduced motion is respected @a11y', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  const animated = await page.evaluate(
    () =>
      [...document.querySelectorAll('*')].filter((el) => {
        const s = getComputedStyle(el)
        return (
          s.animationName !== 'none' &&
          s.animationPlayState === 'running' &&
          Number.parseFloat(s.animationDuration) > 0.01 &&
          s.animationIterationCount === 'infinite'
        )
      }).length,
  )
  expect(animated).toBe(0)
  await context.close()
})
