import 'server-only'
import { revalidateTag } from 'next/cache'
import { sanity } from '@/lib/sanity/client'
import type { Bundle, SiteSettings } from '@/lib/sanity/models'
import { mirrorAllAccess, mirrorBundle, syncProductMirror } from '@/server/catalog'

/** Projection configured on the Sanity webhook (Task.md P2.13). */
export type SanityWebhookPayload = { _type: string; _id: string; slug?: string | null; product?: string | null }

const NOW = { expire: 0 } as const // prices & catalog: never serve stale after an edit

/** Cache invalidation + Postgres mirror per document type (PRD §6.6). */
export async function handleSanityEvent(body: SanityWebhookPayload): Promise<void> {
  switch (body._type) {
    case 'product':
      await syncProductMirror(body._id) // upsert app.products + app.variants
      if (body.slug) revalidateTag(`product:${body.slug}`, NOW)
      revalidateTag('catalog', NOW)
      revalidateTag('home', NOW)
      break
    case 'release':
      if (body.product) {
        revalidateTag(`release:${body.product}`, 'max')
        revalidateTag(`product:${body.product}`, NOW)
      }
      revalidateTag('changelog', 'max')
      revalidateTag('catalog', NOW) // freshness labels and "New & Updated"
      break
    case 'homePage':
      revalidateTag('home', NOW)
      break
    case 'siteSettings': {
      const settings = await sanity
        .withConfig({ useCdn: false })
        .fetch<Pick<SiteSettings, 'allAccess'> | null>(`*[_type == "siteSettings"][0]{ allAccess }`)
      if (settings) await mirrorAllAccess(settings)
      revalidateTag('site-settings', NOW)
      break
    }
    case 'bundle': {
      const bundle = await sanity
        .withConfig({ useCdn: false })
        .fetch<
          (Pick<Bundle, 'lsProductId' | 'lsVariantId' | 'priceCents' | 'tier'> & { includes: { _id: string }[] }) | null
        >(
          `*[_type == "bundle" && _id == $id][0]{ lsProductId, lsVariantId, priceCents, "tier": coalesce(tier, "team"), "includes": includes[]->{ _id } }`,
          { id: body._id.replace(/^drafts\./, '') },
        )
      if (bundle?.lsVariantId) await mirrorBundle(bundle)
      revalidateTag('bundle', NOW)
      revalidateTag('catalog', NOW)
      break
    }
    default:
      revalidateTag(body._type, 'max')
  }
}
