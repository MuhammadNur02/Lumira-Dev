import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { licenseKeys, orders, paymentEvents } from '@/db/schema'
import type { LsOrderAttributes, LsWebhook } from '@/lib/billing/lemonsqueezy/types'
import { revokeDownloadTokens } from '@/server/delivery/tokens'
import { revokeForOrder } from '@/server/entitlements'
import { enqueueEmail, enqueueJob } from '@/server/outbox/enqueue'

/**
 * `order_refunded` (F-05, PRD §6.5): status → refunded / partial_refund. A full refund revokes the
 * order's entitlements, disables its license keys at LS, re-checks Discord eligibility and emails
 * the buyer. Partial refunds change the status only.
 */
export async function onOrderRefunded(event: LsWebhook<LsOrderAttributes>) {
  const a = event.data.attributes
  const order = await db.query.orders.findFirst({ where: eq(orders.lsOrderId, Number(event.data.id)) })
  if (!order) throw new Error(`Refund for unknown LS order ${event.data.id}`) // order_created not ingested yet → retry

  const full = a.status === 'refunded'
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: full ? 'refunded' : 'partial_refund',
        refundedAt: a.refunded_at ? new Date(a.refunded_at) : new Date(),
      })
      .where(eq(orders.id, order.id))

    await tx
      .insert(paymentEvents)
      .values({
        type: 'payment_refunded',
        userId: order.userId,
        orderId: order.id,
        amountUsd: a.refunded_amount_usd ?? order.totalUsd,
        meta: { full, lsOrderId: order.lsOrderId },
      })
      .onConflictDoNothing()

    if (!full) return
    await revokeForOrder(tx, order.id)
    await revokeDownloadTokens(order.id, tx) // emailed links die with the entitlement (FR-DL-06)

    const keys = await tx
      .select({ lsLicenseKeyId: licenseKeys.lsLicenseKeyId })
      .from(licenseKeys)
      .where(eq(licenseKeys.lsOrderId, order.lsOrderId))
    for (const k of keys) {
      await enqueueJob(
        tx,
        'license_key_disable',
        { lsLicenseKeyId: k.lsLicenseKeyId, reason: 'refund' },
        `license_key_disable:refund:${k.lsLicenseKeyId}`,
      )
    }
    if (order.userId)
      await enqueueJob(tx, 'discord_revoke', { userId: order.userId }, `discord_revoke:refund:${order.id}`)
    await enqueueJob(
      tx,
      'analytics_capture',
      {
        event: 'refund_processed',
        distinctId: order.userId ?? order.id,
        properties: { order_id: order.id, amount_usd: order.totalUsd / 100 },
      },
      `refund_processed:${order.id}`,
    )
    await enqueueEmail(tx, {
      template: 'refund-processed',
      to: order.customerEmail,
      payload: { orderId: order.id },
      idempotencyKey: `refund-processed:${order.id}`,
    })
  })
}
