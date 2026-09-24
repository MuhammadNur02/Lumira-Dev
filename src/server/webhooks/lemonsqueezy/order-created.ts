import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { checkoutSessions, orderItems, orders, users, variants } from '@/db/schema'
import type { LsOrderAttributes, LsWebhook } from '@/lib/billing/lemonsqueezy/types'
import { grantFromOrderItem } from '@/server/entitlements'
import { resolveBuyerByEmail } from '@/server/identity'
import { enqueueEmail, enqueueJob } from '@/server/outbox/enqueue'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `order_created` → order, items, entitlements, key fetch, confirmation email (PRD Stage 4, F-13).
 * One transaction; side effects go to the outbox. Replays are no-ops (unique `ls_order_id`).
 */
export async function onOrderCreated(event: LsWebhook<LsOrderAttributes>) {
  const a = event.data.attributes
  const custom = event.meta.custom_data ?? {}
  const email = a.user_email.trim().toLowerCase()
  const csId = typeof custom.cs_id === 'string' && UUID.test(custom.cs_id) ? custom.cs_id : null

  // Trust the user bound to a checkout WE created server-side; otherwise resolve by email.
  // Never auto-sign anyone in from here (NFR-SEC-15).
  const session = csId ? await db.query.checkoutSessions.findFirst({ where: eq(checkoutSessions.id, csId) }) : undefined
  const user = session?.userId
    ? await db.query.users.findFirst({ where: eq(users.id, session.userId) })
    : await resolveBuyerByEmail(email, a.user_name) // Clerk getUserList → createUser; outside the transaction
  if (!user) throw new Error(`Cannot resolve buyer for LS order ${event.data.id}`)

  const item = a.first_order_item
  const variant = await db.query.variants.findFirst({ where: eq(variants.lsVariantId, item.variant_id) })
  if (!variant) throw new Error(`Unmapped LS variant ${item.variant_id}`) // 500 → fix mapping → LS re-delivers

  await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        lsOrderId: Number(event.data.id),
        orderNumber: a.order_number,
        userId: user.id,
        customerEmail: email,
        status: a.status,
        currency: a.currency,
        subtotalUsd: a.subtotal_usd,
        discountUsd: a.discount_total_usd,
        taxUsd: a.tax_usd,
        totalUsd: a.total_usd,
        discountCode: session?.discountCode ?? null,
        receiptUrl: a.urls.receipt,
        checkoutSessionId: session?.id ?? null,
        testMode: a.test_mode,
        createdAt: new Date(a.created_at),
      })
      .onConflictDoNothing({ target: orders.lsOrderId })
      .returning()
    if (!order) return // replay: already ingested

    await tx
      .update(users)
      .set({ lsCustomerId: a.customer_id })
      .where(and(eq(users.id, user.id), sql`${users.lsCustomerId} is null`))

    const [orderItem] = await tx
      .insert(orderItems)
      .values({
        orderId: order.id,
        lsOrderItemId: item.id,
        lsVariantId: item.variant_id,
        priceUsd: item.price,
        quantity: item.quantity ?? 1,
      })
      .onConflictDoNothing({ target: orderItems.lsOrderItemId })
      .returning()

    // A late order still completes an abandoned session (P5.16): update by id regardless of status.
    if (session) {
      await tx
        .update(checkoutSessions)
        .set({ status: 'completed', completedAt: new Date(), orderId: order.id })
        .where(eq(checkoutSessions.id, session.id))
    }
    if (a.status !== 'paid' || !orderItem) return

    // The initial order of an All-Access subscription grants nothing here: subscription_created owns it.
    if (variant.tier !== 'all_access') {
      const productIds =
        variant.bundleProductIds.length > 0 ? variant.bundleProductIds : variant.productId ? [variant.productId] : []
      await grantFromOrderItem(tx, {
        userId: user.id,
        email,
        orderItemId: orderItem.id,
        tier: variant.tier,
        productIds,
      })
    }

    await enqueueJob(
      tx,
      'license_keys_fetch',
      { orderId: order.id, lsOrderId: order.lsOrderId },
      `license_keys_fetch:${order.id}`,
    )
    await enqueueJob(
      tx,
      'analytics_capture',
      {
        event: 'purchase_completed',
        distinctId: custom.ph_id || user.id,
        properties: {
          order_id: order.id,
          cs_id: session?.id ?? null,
          variant_ids: [item.variant_id],
          revenue_usd: (a.total_usd - a.tax_usd) / 100,
          tier: variant.tier,
          is_bundle: variant.bundleProductIds.length > 0,
          discount_code: session?.discountCode ?? null,
        },
      },
      `purchase_completed:${order.id}`,
    )
    await enqueueJob(tx, 'discord_grant', { userId: user.id }, `discord_grant:${order.id}`) // no-op unless already linked

    // Due ~15 s later so the key fetch usually lands first; the template decrypts keys at render time.
    if (variant.tier !== 'all_access') {
      await enqueueEmail(tx, {
        template: 'order-confirmation',
        to: email,
        payload: { orderId: order.id },
        idempotencyKey: `order-confirmation:${order.id}`,
        runAt: new Date(Date.now() + 15_000),
      })
    }
  })
}
