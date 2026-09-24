import 'server-only'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import semver from 'semver'
import { db } from '@/db/client'
import { products, releases, variants } from '@/db/schema'
import { sanity } from '@/lib/sanity/client'
import type { Bundle, ProductMirror, SiteSettings } from '@/lib/sanity/models'
import { PRODUCT_MIRROR_QUERY } from '@/lib/sanity/queries'

/**
 * Sanity → Postgres catalog mirror (FR-SYS-09). Postgres keeps `products` and `variants` for FK
 * integrity and fast lookups on the commerce path; Sanity stays the source of truth for the
 * product ↔ Lemon Squeezy mapping, and LS for prices (FR-AD-51 fills `priceCents`).
 */
export async function mirrorProduct(doc: ProductMirror) {
  await db.transaction(async (tx) => {
    await tx
      .insert(products)
      .values({
        id: doc._id,
        slug: doc.slug,
        name: doc.name,
        line: doc.line,
        inAllAccess: doc.inAllAccess,
        active: true,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: { slug: doc.slug, name: doc.name, line: doc.line, inAllAccess: doc.inAllAccess, active: true },
      })

    for (const l of doc.licenses) {
      await tx
        .insert(variants)
        .values({
          lsVariantId: l.lsVariantId,
          lsProductId: l.lsProductId,
          productId: doc._id,
          tier: l.tier,
          activationLimit: l.activationLimit,
          priceCents: l.priceCents ?? 0,
          active: true,
        })
        .onConflictDoUpdate({
          target: variants.lsVariantId,
          set: {
            lsProductId: l.lsProductId,
            productId: doc._id,
            tier: l.tier,
            active: true,
            ...(l.priceCents != null ? { priceCents: l.priceCents } : {}),
            ...(l.activationLimit != null ? { activationLimit: l.activationLimit } : {}),
          },
        })
    }

    const keep = doc.licenses.map((l) => l.lsVariantId)
    await tx
      .update(variants)
      .set({ active: false })
      .where(and(eq(variants.productId, doc._id), keep.length ? notInArray(variants.lsVariantId, keep) : undefined))
  })
}

/** Unpublished or deleted in Sanity: keep the rows (orders reference them) but stop selling. */
export async function deactivateProduct(id: string) {
  await db.transaction(async (tx) => {
    await tx.update(products).set({ active: false }).where(eq(products.id, id))
    await tx.update(variants).set({ active: false }).where(eq(variants.productId, id))
  })
}

export async function syncProductMirror(sanityId: string) {
  const id = sanityId.replace(/^drafts\./, '')
  const doc = await sanity.withConfig({ useCdn: false }).fetch<ProductMirror | null>(PRODUCT_MIRROR_QUERY, { id })
  if (doc) await mirrorProduct(doc)
  else await deactivateProduct(id)
}

/** All-Access monthly/yearly variants from `siteSettings.allAccess` (tier `all_access`, no product). */
export async function mirrorAllAccess(settings: Pick<SiteSettings, 'allAccess'>) {
  const pass = settings.allAccess
  if (!pass?.lsProductId) return
  const plans = [
    { plan: pass.monthly, interval: 'month' as const },
    { plan: pass.yearly, interval: 'year' as const },
  ]
  for (const { plan, interval } of plans) {
    if (!plan?.lsVariantId) continue
    await db
      .insert(variants)
      .values({
        lsVariantId: plan.lsVariantId,
        lsProductId: pass.lsProductId,
        productId: null,
        tier: 'all_access',
        interval,
        activationLimit: pass.activationLimit ?? 10,
        priceCents: plan.priceCents ?? 0,
      })
      .onConflictDoUpdate({
        target: variants.lsVariantId,
        set: {
          lsProductId: pass.lsProductId,
          tier: 'all_access',
          interval,
          active: true,
          ...(plan.priceCents != null ? { priceCents: plan.priceCents } : {}),
        },
      })
  }
}

/** Bundles: one LS variant mapped to several products (FR-CO-10). */
export async function mirrorBundle(
  bundle: Pick<Bundle, 'lsProductId' | 'lsVariantId' | 'priceCents' | 'tier'> & { includes: { _id: string }[] },
) {
  const bundleProductIds = bundle.includes.map((p) => p._id)
  await db
    .insert(variants)
    .values({
      lsVariantId: bundle.lsVariantId,
      lsProductId: bundle.lsProductId,
      productId: null,
      tier: bundle.tier,
      priceCents: bundle.priceCents ?? 0,
      bundleProductIds,
    })
    .onConflictDoUpdate({
      target: variants.lsVariantId,
      set: {
        lsProductId: bundle.lsProductId,
        tier: bundle.tier,
        bundleProductIds,
        active: true,
        ...(bundle.priceCents != null ? { priceCents: bundle.priceCents } : {}),
      },
    })
}

/** The License API accepts keys from any LS store; only Lumira's LS products count (FR-LIC-05). */
export async function isLumiraLsProduct(lsProductId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: variants.lsVariantId })
    .from(variants)
    .where(eq(variants.lsProductId, lsProductId))
    .limit(1)
  return Boolean(row)
}

export async function getProductOrThrow(productId: string) {
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) })
  if (!product) throw new Error(`Unknown product ${productId}`)
  return product
}

/** Releases are immutable and ordered: a new semver must exceed every existing one (FR-AD-53). */
export async function assertNewerThanLatest(productId: string, version: string) {
  const existing = await db
    .select({ semver: releases.semver })
    .from(releases)
    .where(and(eq(releases.productId, productId), inArray(releases.status, ['draft', 'published', 'yanked'])))
    .orderBy(desc(releases.createdAt))
  if (existing.some((r) => r.semver === version)) throw new Error(`v${version} already exists; releases are immutable`)
  const latest = existing.map((r) => r.semver).sort(semver.rcompare)[0]
  if (latest && !semver.gt(version, latest)) throw new Error(`v${version} must be greater than the latest v${latest}`)
}
