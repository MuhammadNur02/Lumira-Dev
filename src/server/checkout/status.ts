import 'server-only'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { checkoutSessions, licenseKeys, orders, products, variants } from '@/db/schema'
import { TIER_LABEL } from '@/lib/format'
import { decryptLicenseKey } from '@/lib/licensing/crypto'
import { downloadsForOrder, issueGuestScope, readGuestScope } from '@/server/delivery'

export type CheckoutKey = {
  id: string
  /** Plaintext for the guest scope only; owners reveal from the Library. */
  value: string | null
  last4: string
  label: string
  status: 'inactive' | 'active' | 'expired' | 'disabled'
}

export type CheckoutStatus =
  | { status: 'pending' | 'completed' | 'unknown' }
  | {
      status: 'completed'
      order: { number: number; totalUsd: number; receiptUrl: string | null; email: string }
      keys: CheckoutKey[]
      downloads: Awaited<ReturnType<typeof downloadsForOrder>>
      signedIn: boolean
    }

const DETAIL_WINDOW_MS = 30 * 60 * 1000

/**
 * Success-page polling (FR-CO-06, Stage 5.1). Details go only to the browser holding the matching
 * `__Host-lumira_cs` cookie within 30 minutes of completion, or to the signed-in owner. Another
 * browser with the same `cs` learns only pending/completed. Guests never get signed in (NFR-SEC-15).
 * Must run in a Route Handler: the first detailed response sets the guest-scope cookie.
 */
export async function checkoutStatus(csId: string): Promise<CheckoutStatus> {
  const session = await db.query.checkoutSessions.findFirst({ where: eq(checkoutSessions.id, csId) })
  if (!session) return { status: 'unknown' }
  if (session.status !== 'completed' || !session.orderId) return { status: 'pending' }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, session.orderId) })
  if (!order) return { status: 'pending' }

  const [{ userId }, jar, guest] = await Promise.all([auth(), cookies(), readGuestScope()])
  const cookieMatches = jar.get('__Host-lumira_cs')?.value === csId
  const fresh = session.completedAt ? Date.now() - session.completedAt.getTime() < DETAIL_WINDOW_MS : false
  const isOwner = Boolean(userId && order.userId === userId)
  const hasGuestScope = guest?.orderId === order.id
  if (!isOwner && !(cookieMatches && fresh) && !hasGuestScope) return { status: 'completed' }

  if (!isOwner && !hasGuestScope) await issueGuestScope(order.id) // first detailed response grants the 30-min guest scope

  const keys = await db.select().from(licenseKeys).where(eq(licenseKeys.lsOrderId, order.lsOrderId))
  const labels = await keyLabels(keys.map((k) => k.lsProductId))
  return {
    status: 'completed',
    order: {
      number: order.orderNumber,
      totalUsd: order.totalUsd,
      receiptUrl: order.receiptUrl,
      email: order.customerEmail,
    },
    keys: keys.map((k) => ({
      id: k.id,
      value: isOwner ? null : decryptLicenseKey(k.keyCiphertext),
      last4: k.keyShort.slice(-4),
      label: labels.get(k.lsProductId) ?? 'Lumira license',
      status: k.status,
    })),
    downloads: await downloadsForOrder(order.id),
    signedIn: Boolean(userId),
  }
}

/** "Lumen UI · Team" for product keys, "All-Access" or "Bundle · Team" for keys that span products. */
export async function keyLabels(lsProductIds: number[]) {
  const labels = new Map<number, string>()
  if (!lsProductIds.length) return labels
  const rows = await db
    .select({ lsProductId: variants.lsProductId, tier: variants.tier, name: products.name })
    .from(variants)
    .leftJoin(products, eq(products.id, variants.productId))
    .where(inArray(variants.lsProductId, [...new Set(lsProductIds)]))
  for (const row of rows) {
    if (labels.has(row.lsProductId)) continue
    labels.set(
      row.lsProductId,
      row.tier === 'all_access' ? 'All-Access' : `${row.name ?? 'Bundle'} · ${TIER_LABEL[row.tier]}`,
    )
  }
  return labels
}
