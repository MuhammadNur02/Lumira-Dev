import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { variants } from '@/db/schema'
import { listVariants } from '@/lib/billing/lemonsqueezy/client'
import { sanityWrite } from '@/lib/sanity/client'

type LsVariant = Awaited<ReturnType<typeof listVariants>>[number]
type SanityLicense = {
  _key: string
  tier: string
  lsProductId: number
  lsVariantId: number
  priceCents: number | null
  activationLimit: number | null
}

export type VariantSyncLine = {
  doc: string
  lsVariantId: number
  priceCents: number | null
  activationLimit: number | null
  status: 'unchanged' | 'updated' | 'missing_in_ls'
}

const SYNC_QUERY = `{
  "products": *[_type == "product" && !(_id in path("drafts.**"))]{ _id, "slug": slug.current, licenses[]{ _key, tier, lsProductId, lsVariantId, priceCents, activationLimit } },
  "bundles": *[_type == "bundle" && !(_id in path("drafts.**"))]{ _id, "slug": slug.current, lsProductId, lsVariantId, priceCents },
  "settings": *[_id == "siteSettings"][0]{ "allAccess": allAccess{ lsProductId, monthly{ lsVariantId, priceCents }, yearly{ lsVariantId, priceCents }, activationLimit } }
}`

/**
 * P5.02 / FR-AD-51: Lemon Squeezy is the source of truth for prices and activation limits. Reads
 * every LS variant referenced from Sanity, patches Sanity where they differ and updates the
 * Postgres mirror. The Sanity webhook then revalidates the affected pages; the admin action also
 * revalidates directly. Returns the product slugs whose prices changed.
 */
export async function syncVariantsFromLs(): Promise<{ lines: VariantSyncLine[]; changedSlugs: string[] }> {
  const data = await sanityWrite.fetch<{
    products: { _id: string; slug: string; licenses: SanityLicense[] | null }[]
    bundles: {
      _id: string
      slug: string
      lsProductId: number | null
      lsVariantId: number | null
      priceCents: number | null
    }[]
    settings: {
      allAccess: {
        lsProductId: number | null
        monthly: { lsVariantId: number | null; priceCents: number | null } | null
        yearly: { lsVariantId: number | null; priceCents: number | null } | null
        activationLimit: number | null
      } | null
    } | null
  }>(SYNC_QUERY)

  const cache = new Map<number, Map<number, LsVariant>>()
  async function lsVariant(lsProductId: number, lsVariantId: number) {
    if (!cache.has(lsProductId)) {
      const list = await listVariants(lsProductId)
      cache.set(lsProductId, new Map(list.map((v) => [Number(v.id), v])))
    }
    return cache.get(lsProductId)!.get(lsVariantId)
  }
  const limitOf = (v: LsVariant) =>
    v.attributes.is_license_limit_unlimited ? null : v.attributes.license_activation_limit

  const lines: VariantSyncLine[] = []
  const changedSlugs = new Set<string>()

  async function mirror(lsVariantId: number, priceCents: number, activationLimit: number | null) {
    await db.update(variants).set({ priceCents, activationLimit }).where(eq(variants.lsVariantId, lsVariantId))
  }

  for (const product of data.products) {
    let patch = sanityWrite.patch(product._id)
    let dirty = false
    for (const license of product.licenses ?? []) {
      const v = await lsVariant(license.lsProductId, license.lsVariantId)
      if (!v) {
        lines.push({
          doc: product.slug,
          lsVariantId: license.lsVariantId,
          priceCents: null,
          activationLimit: null,
          status: 'missing_in_ls',
        })
        continue
      }
      const price = v.attributes.price
      const limit = limitOf(v)
      const changed = price !== license.priceCents || limit !== license.activationLimit
      if (changed) {
        patch = patch.set({
          [`licenses[_key=="${license._key}"].priceCents`]: price,
          [`licenses[_key=="${license._key}"].activationLimit`]: limit,
        })
        dirty = true
      }
      await mirror(license.lsVariantId, price, limit)
      lines.push({
        doc: product.slug,
        lsVariantId: license.lsVariantId,
        priceCents: price,
        activationLimit: limit,
        status: changed ? 'updated' : 'unchanged',
      })
    }
    if (dirty) {
      await patch.commit({ autoGenerateArrayKeys: false })
      changedSlugs.add(product.slug)
    }
  }

  for (const bundle of data.bundles) {
    if (!bundle.lsProductId || !bundle.lsVariantId) continue
    const v = await lsVariant(bundle.lsProductId, bundle.lsVariantId)
    if (!v) {
      lines.push({
        doc: `bundle:${bundle.slug}`,
        lsVariantId: bundle.lsVariantId,
        priceCents: null,
        activationLimit: null,
        status: 'missing_in_ls',
      })
      continue
    }
    const changed = v.attributes.price !== bundle.priceCents
    if (changed) await sanityWrite.patch(bundle._id).set({ priceCents: v.attributes.price }).commit()
    await mirror(bundle.lsVariantId, v.attributes.price, limitOf(v))
    lines.push({
      doc: `bundle:${bundle.slug}`,
      lsVariantId: bundle.lsVariantId,
      priceCents: v.attributes.price,
      activationLimit: limitOf(v),
      status: changed ? 'updated' : 'unchanged',
    })
  }

  const allAccess = data.settings?.allAccess
  if (allAccess?.lsProductId) {
    for (const interval of ['monthly', 'yearly'] as const) {
      const plan = allAccess[interval]
      if (!plan?.lsVariantId) continue
      const v = await lsVariant(allAccess.lsProductId, plan.lsVariantId)
      if (!v) {
        lines.push({
          doc: `all-access:${interval}`,
          lsVariantId: plan.lsVariantId,
          priceCents: null,
          activationLimit: null,
          status: 'missing_in_ls',
        })
        continue
      }
      const changed = v.attributes.price !== plan.priceCents
      if (changed)
        await sanityWrite
          .patch('siteSettings')
          .set({ [`allAccess.${interval}.priceCents`]: v.attributes.price })
          .commit()
      await mirror(plan.lsVariantId, v.attributes.price, limitOf(v))
      lines.push({
        doc: `all-access:${interval}`,
        lsVariantId: plan.lsVariantId,
        priceCents: v.attributes.price,
        activationLimit: limitOf(v),
        status: changed ? 'updated' : 'unchanged',
      })
    }
  }

  return { lines, changedSlugs: [...changedSlugs] }
}
