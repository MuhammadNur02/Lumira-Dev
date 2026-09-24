import 'server-only'
import crypto from 'node:crypto'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { discounts, entitlements, orderItems, products, variants, type LicenseTier, type Variant } from '@/db/schema'
import { billing } from '@/lib/billing'
import { env } from '@/lib/env'

/** Major upgrades (v2 → v3) cost this share of the current price for one-time owners (PRD §1.5, F-06). */
export const MAJOR_UPGRADE_DISCOUNT_PERCENT = 50
const CODE_TTL_MS = 48 * 60 * 60 * 1000
const TIER_ORDER: LicenseTier[] = ['personal', 'team', 'extended']

export type UpgradeTarget = { kind: 'major' } | { kind: 'tier'; tier: Exclude<LicenseTier, 'all_access'> }
export type UpgradeQuote = {
  variant: Variant
  discount: { amount: number; amountType: 'percent' | 'fixed' }
  label: string
}

/** Upgrade options for one owned product: the next major at the same tier, and any higher tier. */
export async function upgradeOptions(userId: string, productId: string) {
  const owned = await db
    .select({ entitlement: entitlements, pricePaid: orderItems.priceUsd })
    .from(entitlements)
    .leftJoin(orderItems, eq(orderItems.id, entitlements.sourceOrderItemId))
    .where(
      and(
        eq(entitlements.userId, userId),
        eq(entitlements.productId, productId),
        eq(entitlements.status, 'active'),
        eq(entitlements.kind, 'license'),
      ),
    )
  if (!owned.length) return null
  const best = owned.sort(
    (a, b) => TIER_ORDER.indexOf(b.entitlement.tier as never) - TIER_ORDER.indexOf(a.entitlement.tier as never),
  )[0]!
  const tier = (best.entitlement.tier ?? 'personal') as Exclude<LicenseTier, 'all_access'>
  const higher = TIER_ORDER.slice(TIER_ORDER.indexOf(tier) + 1) as Exclude<LicenseTier, 'all_access'>[]
  return { tier, higher, pricePaid: best.pricePaid ?? 0, maxMajor: best.entitlement.maxMajor }
}

/** Resolves the target variant and the single-use discount that turns it into an upgrade price. */
export async function quoteUpgrade(
  userId: string,
  productSlug: string,
  target: UpgradeTarget,
): Promise<UpgradeQuote | null> {
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, productSlug), eq(products.active, true)),
  })
  if (!product) return null
  const options = await upgradeOptions(userId, product.id)
  if (!options) return null

  const tier = target.kind === 'tier' ? target.tier : options.tier
  if (target.kind === 'tier' && !options.higher.includes(target.tier)) return null
  const variant = await db.query.variants.findFirst({
    where: and(
      eq(variants.productId, product.id),
      eq(variants.tier, tier),
      eq(variants.active, true),
      isNull(variants.interval),
    ),
    orderBy: desc(variants.priceCents),
  })
  if (!variant) return null

  if (target.kind === 'major') {
    return {
      variant,
      discount: { amount: MAJOR_UPGRADE_DISCOUNT_PERCENT, amountType: 'percent' },
      label: `${product.name} major upgrade`,
    }
  }
  // Tier upgrade: credit what was paid, never more than the target price minus one dollar.
  const credit = Math.min(options.pricePaid, Math.max(0, variant.priceCents - 100))
  if (credit <= 0) return null
  return { variant, discount: { amount: credit, amountType: 'fixed' }, label: `${product.name} upgrade to ${tier}` }
}

/**
 * F-06: single-use LS discount limited to the target variant, mirrored in `discounts` so admin
 * reporting sees it. Returns the code to prefill the checkout with.
 */
export async function issueUpgradeCode(quote: UpgradeQuote): Promise<string> {
  const code = `UP${crypto
    .randomBytes(6)
    .toString('base64url')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .padEnd(8, 'X')
    .slice(0, 8)}`
  const expiresAt = new Date(Date.now() + CODE_TTL_MS)
  const { id } = await billing.createDiscount({
    name: quote.label,
    code,
    amount: quote.discount.amount,
    amountType: quote.discount.amountType,
    variantIds: [quote.variant.lsVariantId],
    maxRedemptions: 1,
    expiresAt,
    duration: 'once',
    testMode: env.LS_TEST_MODE,
  })
  await db.insert(discounts).values({
    lsDiscountId: id,
    code,
    name: quote.label,
    amount: quote.discount.amount,
    amountType: quote.discount.amountType,
    duration: 'once',
    variantIds: [quote.variant.lsVariantId],
    maxRedemptions: 1,
    expiresAt,
    testMode: env.LS_TEST_MODE,
  })
  return code
}

/** Variant prices for the upgrade buttons ("Upgrade to Team · $79"). */
export async function tierPrices(productId: string, tiers: LicenseTier[]) {
  if (!tiers.length) return new Map<LicenseTier, number>()
  const rows = await db
    .select({ tier: variants.tier, price: variants.priceCents })
    .from(variants)
    .where(
      and(
        eq(variants.productId, productId),
        inArray(variants.tier, tiers),
        eq(variants.active, true),
        isNull(variants.interval),
      ),
    )
  return new Map(rows.map((r) => [r.tier, r.price]))
}
