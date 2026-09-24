import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { ownershipFor } from '@/server/entitlements'
import { resolvePromo } from '@/server/promo'
import { BuyRail, type BuyRailProduct } from './buy-rail'
import type { Ownership, PurchaseOption } from './purchase'

/**
 * The dynamic hole of the PDP (FR-SF-11, NFR-PERF-07): reads the session and the promo cookie, so
 * it streams in behind `<Suspense fallback={<BuyRail … />}>` while the page shell stays static.
 */
export async function OwnershipAwareBuyRail(props: {
  product: BuyRailProduct
  options: PurchaseOption[]
  allAccess: PurchaseOption | null
}) {
  const [{ userId }, jar] = await Promise.all([auth(), cookies()])
  const [ownership, promo] = await Promise.all([
    userId ? ownershipFor(userId, props.product.slug).catch(() => null) : Promise.resolve(null),
    resolvePromo(jar.get('lumira_promo')?.value),
  ])
  return <BuyRail {...props} ownership={ownership as Ownership} promo={promo} />
}
