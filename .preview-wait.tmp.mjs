import { chromium } from '@playwright/test'
const OUT = process.env.OUT
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const events = []
page.on('console', (m) => {
  if (/preview|bridge|timeout/i.test(m.text())) events.push(m.text())
})
await page.goto('http://localhost:3000/products/folio/preview', { waitUntil: 'domcontentloaded' })
for (const s of [5, 12, 20]) {
  await page.waitForTimeout(s === 5 ? 5000 : 7000)
  await page.screenshot({ path: `${OUT}/preview-t${s}.png` })
  const state = await page.evaluate(() => ({
    iframes: document.querySelectorAll('iframe').length,
    fallbackText:
      document.body.innerText.match(/(couldn.t load|preview unavailable|gallery|try again)[^\n]*/i)?.[0] ?? null,
  }))
  console.log(`t=${s}s`, JSON.stringify(state))
}
console.log('console:', events.slice(0, 5))
await browser.close()
