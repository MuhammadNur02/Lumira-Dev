import { chromium } from '@playwright/test'
const OUT = process.env.OUT
const [, , label, width, scheme, route, chunk = '1000'] = process.argv
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: +width, height: 900 },
  colorScheme: scheme,
  reducedMotion: 'reduce',
})
if (scheme === 'light')
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('theme', 'light')
    } catch {}
  })
const page = await ctx.newPage()
const res = await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 180_000 })
await page.evaluate(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 120))
  }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(1200)
const h = await page.evaluate(() => document.documentElement.scrollHeight)
const step = +chunk
for (let y = 0, i = 0; y < h; y += step, i++) {
  await page.screenshot({
    path: `${OUT}/${label}-${i}.png`,
    fullPage: true,
    clip: { x: 0, y, width: +width, height: Math.min(step, h - y) },
  })
}
console.log(`${label}: HTTP ${res.status()} · ${Math.ceil(h / step)} sections (${h}px)`)
await browser.close()
