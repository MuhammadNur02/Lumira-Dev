import type { License, SiteSettings } from '@/lib/sanity/models'

// Client-safe purchase view models shared by the PDP rail, the license selector and the preview CTA.

export type TierKey = 'personal' | 'team' | 'extended' | 'all_access'
export type Ownership = { tier: TierKey; viaAllAccess: boolean } | null
export type PromoInfo = { code: string; amount: number; amountType: 'percent' | 'fixed'; variantIds: number[] } | null

export type PurchaseOption = {
  tier: TierKey
  variantId: number
  priceCents: number | null
  activationLimit: number | null
  rights: string[]
  buyUrl: string | null
  interval?: 'month' | 'year'
}

export const TIER_ORDER: TierKey[] = ['personal', 'team', 'extended', 'all_access']

export function licenseOptions(licenses: License[]): PurchaseOption[] {
  return [...licenses]
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .map((l) => ({
      tier: l.tier,
      variantId: l.lsVariantId,
      priceCents: l.priceCents,
      activationLimit: l.activationLimit,
      rights: l.rights,
      buyUrl: l.buyUrl,
    }))
}

export function allAccessOption(pass: SiteSettings['allAccess']): PurchaseOption | null {
  const monthly = pass?.monthly
  if (!monthly?.lsVariantId) return null
  return {
    tier: 'all_access',
    variantId: monthly.lsVariantId,
    priceCents: monthly.priceCents,
    activationLimit: pass?.activationLimit ?? 10,
    rights: pass?.perks ?? [],
    buyUrl: monthly.buyUrl,
    interval: 'month',
  }
}

/** Display price after a promo; Lemon Squeezy computes the real total at checkout. */
export function promoPrice(priceCents: number | null, promo: PromoInfo, variantId: number): number | null {
  if (priceCents == null || !promo) return priceCents
  if (promo.variantIds.length > 0 && !promo.variantIds.includes(variantId)) return priceCents
  const off = promo.amountType === 'percent' ? Math.round((priceCents * promo.amount) / 100) : promo.amount
  return Math.max(0, priceCents - off)
}

/** Owned tiers can't be bought again; higher tiers remain available as upgrades (FR-CO-07). */
export function isOwned(option: TierKey, ownership: Ownership): boolean {
  if (!ownership) return false
  if (ownership.viaAllAccess || ownership.tier === 'all_access') return true
  return TIER_ORDER.indexOf(option) <= TIER_ORDER.indexOf(ownership.tier) && option !== 'all_access'
}

export const activationLabel = (limit: number | null) =>
  limit == null ? 'Unlimited activations' : `${limit} ${limit === 1 ? 'activation' : 'activations'}`
