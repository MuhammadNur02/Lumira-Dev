import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { discounts } from '@/db/schema'

export type ActivePromo = { code: string; amount: number; amountType: 'percent' | 'fixed'; variantIds: number[] }

/**
 * Validates a promo code against the discounts mirror (FR-CO-05): live, inside its window and, when
 * a variant is given, applicable to it. Invalid codes are dropped silently; the storefront never
 * blocks on a bad cookie.
 */
export async function resolvePromo(code: string | undefined | null, variantId?: number): Promise<ActivePromo | null> {
  if (!code || !/^[A-Z0-9]{3,64}$/.test(code)) return null
  try {
    const d = await db.query.discounts.findFirst({
      where: and(eq(discounts.code, code), eq(discounts.status, 'active')),
    })
    const now = new Date()
    if (!d || (d.startsAt && d.startsAt > now) || (d.expiresAt && d.expiresAt < now)) return null
    if (variantId !== undefined && d.variantIds.length > 0 && !d.variantIds.includes(variantId)) return null
    return { code: d.code, amount: d.amount, amountType: d.amountType, variantIds: d.variantIds }
  } catch {
    return null
  }
}

/** Discounted price for display ("applied at checkout"); LS computes the real total. */
export function applyPromo(priceCents: number, promo: ActivePromo | null, variantId: number): number {
  if (!promo || (promo.variantIds.length > 0 && !promo.variantIds.includes(variantId))) return priceCents
  const off = promo.amountType === 'percent' ? Math.round((priceCents * promo.amount) / 100) : promo.amount
  return Math.max(0, priceCents - off)
}
