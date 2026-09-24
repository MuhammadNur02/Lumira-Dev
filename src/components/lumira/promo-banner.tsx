import { cookies } from 'next/headers'
import { getSiteSettings } from '@/lib/sanity/fetchers'
import { resolvePromo } from '@/server/promo'
import { PromoBannerBar } from './promo-banner-bar'

/**
 * Promo banner (FR-GL-05): an active `lumira_promo` cookie (validated against the discounts
 * mirror) wins over the Sanity site-wide banner. Reads cookies, so it renders in a Suspense hole.
 */
export async function PromoBanner() {
  const [settings, jar] = await Promise.all([getSiteSettings(), cookies()])
  const promo = await resolvePromo(jar.get('lumira_promo')?.value)
  if (promo) {
    const amount = promo.amountType === 'percent' ? `${promo.amount}% off` : `$${(promo.amount / 100).toFixed(0)} off`
    return <PromoBannerBar id={promo.code} code={promo.code} text={`${amount} applied at checkout.`} />
  }
  const banner = settings.promoBanner
  if (!banner?.enabled || !banner.text) return null
  return <PromoBannerBar id={banner.code ?? banner.text} code={banner.code} text={banner.text} href={banner.href} />
}
