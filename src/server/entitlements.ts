import 'server-only'
import { and, eq, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { db, type DbOrTx } from '@/db/client'
import { entitlements, licenseKeys, orderItems, products, releases, type LicenseTier } from '@/db/schema'
import { coversProduct, evaluateEligibility, type EligibilityResult } from './eligibility'

export type DownloadIdentity = { userId: string } | { orderId: string }

/** Entitlements that belong to an identity: a signed-in user, or a guest scoped to one order. */
function ownerFilter(identity: DownloadIdentity) {
  return 'userId' in identity
    ? eq(entitlements.userId, identity.userId)
    : inArray(
        entitlements.sourceOrderItemId,
        db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, identity.orderId)),
      )
}

/**
 * Eligibility for one release (PRD §7.3), without rate limits. `authorizeDownload` (P6.03) adds
 * rate limiting and logging on top.
 */
export async function canDownload(
  identity: DownloadIdentity,
  releaseId: string,
): Promise<{
  result: EligibilityResult | { allowed: false; reason: 'not_found' }
  release?: typeof releases.$inferSelect
  product?: typeof products.$inferSelect
}> {
  const [found] = await db
    .select({ release: releases, product: products })
    .from(releases)
    .innerJoin(products, eq(products.id, releases.productId))
    .where(eq(releases.id, releaseId))
    .limit(1)
  if (!found) return { result: { allowed: false, reason: 'not_found' } }

  const candidates = await db
    .select()
    .from(entitlements)
    .where(
      and(
        ownerFilter(identity),
        eq(entitlements.status, 'active'),
        or(eq(entitlements.productId, found.release.productId), eq(entitlements.kind, 'all_access')),
      ),
    )
  return { result: evaluateEligibility(candidates, found.release, found.product), ...found }
}

/**
 * Grants download rights for one paid order item (inside the order_created transaction). Bundles
 * expand to every included product. `maxMajor` pins one-time licenses to the latest published
 * major at purchase time (majors are sold as upgrades, F-06).
 */
export async function grantFromOrderItem(
  tx: DbOrTx,
  input: {
    userId: string | null
    email: string
    orderItemId: string
    tier: LicenseTier
    productIds: string[]
  },
) {
  if (input.productIds.length === 0) return []
  const majors = await tx
    .select({ productId: releases.productId, major: sql<number>`max(${releases.major})` })
    .from(releases)
    .where(and(inArray(releases.productId, input.productIds), eq(releases.status, 'published')))
    .groupBy(releases.productId)
  const majorOf = new Map(majors.map((m) => [m.productId, Number(m.major)]))

  return tx
    .insert(entitlements)
    .values(
      input.productIds.map((productId) => ({
        userId: input.userId,
        customerEmail: input.email,
        kind: 'license' as const,
        productId,
        tier: input.tier,
        maxMajor: majorOf.get(productId) ?? 1,
        sourceOrderItemId: input.orderItemId,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: entitlements.id })
}

/** Full refund (F-05): every entitlement created from the order's items is revoked. */
export async function revokeForOrder(tx: DbOrTx, orderId: string) {
  return tx
    .update(entitlements)
    .set({ status: 'revoked' })
    .where(
      and(
        inArray(
          entitlements.sourceOrderItemId,
          tx.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, orderId)),
        ),
        eq(entitlements.status, 'active'),
      ),
    )
    .returning({ id: entitlements.id })
}

/** FR-LIC-04: at least one key that is `inactive` or `active` (disabled and expired keys excluded). */
export async function isVerifiedLicenseHolder(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: licenseKeys.id })
    .from(licenseKeys)
    .where(and(eq(licenseKeys.userId, userId), inArray(licenseKeys.status, ['inactive', 'active'])))
    .limit(1)
  return Boolean(row)
}

/** Product ids a license key unlocks: its order item's products, or the whole All-Access catalog. */
export async function productsCoveredByKey(keyId: string): Promise<string[]> {
  const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.id, keyId) })
  if (!key || key.status === 'disabled' || key.status === 'expired') return []

  if (key.subscriptionId) {
    const pass = await db.query.entitlements.findFirst({
      where: and(eq(entitlements.sourceSubscriptionId, key.subscriptionId), eq(entitlements.status, 'active')),
    })
    if (!pass) return []
    const catalog = await db
      .select()
      .from(products)
      .where(and(eq(products.inAllAccess, true), eq(products.active, true)))
    return catalog.filter((p) => coversProduct(pass, p)).map((p) => p.id)
  }

  const rows = await db
    .select({ productId: entitlements.productId })
    .from(entitlements)
    .innerJoin(orderItems, eq(orderItems.id, entitlements.sourceOrderItemId))
    .where(
      and(
        eq(orderItems.lsOrderItemId, key.lsOrderItemId),
        eq(entitlements.status, 'active'),
        isNotNull(entitlements.productId),
      ),
    )
  return rows.map((r) => r.productId!).filter(Boolean)
}

export async function keyCoversProduct(keyId: string, productId: string): Promise<boolean> {
  return (await productsCoveredByKey(keyId)).includes(productId)
}

/** Any active entitlement covering the product (by slug). Used by licensed docs (F-08) and PDP ownership. */
export async function ownsProduct(userId: string, productSlug: string): Promise<boolean> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug) })
  if (!product) return false
  const rows = await db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.status, 'active'),
        or(eq(entitlements.productId, product.id), eq(entitlements.kind, 'all_access')),
      ),
    )
  return rows.some((e) => coversProduct(e, product))
}

/** Ownership summary for the PDP buy rail and Live Preview CTA (FR-SF-11, FR-LP-05). */
export async function ownershipFor(userId: string, productSlug: string) {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug) })
  if (!product) return null
  const rows = await db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.status, 'active'),
        or(eq(entitlements.productId, product.id), eq(entitlements.kind, 'all_access')),
      ),
    )
  const covering = rows.filter((e) => coversProduct(e, product))
  if (covering.length === 0) return null
  const order: LicenseTier[] = ['personal', 'team', 'extended', 'all_access']
  const best = covering
    .map((e) => (e.kind === 'all_access' ? 'all_access' : (e.tier ?? 'personal')))
    .sort((a, b) => order.indexOf(b) - order.indexOf(a))[0]!
  return { tier: best, viaAllAccess: covering.some((e) => e.kind === 'all_access') }
}
