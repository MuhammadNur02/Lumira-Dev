import { revalidateTag } from 'next/cache'
import { inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { orders, subscriptions } from '@/db/schema'
import { listRecent } from '@/lib/billing/lemonsqueezy/client'
import type { LsOrderAttributes, LsSubscriptionAttributes, LsWebhook } from '@/lib/billing/lemonsqueezy/types'
import { alertAdmin } from '@/server/outbox/dispatch'
import { cronResult, cronUnauthorized } from '@/server/cron'
import { onOrderCreated } from '@/server/webhooks/lemonsqueezy/order-created'
import { onOrderRefunded } from '@/server/webhooks/lemonsqueezy/order-refunded'
import { onSubscriptionChanged } from '@/server/webhooks/lemonsqueezy/subscription'

export const maxDuration = 300

const WINDOW_MS = 72 * 60 * 60 * 1000

/** A webhook-shaped event for replays. Custom data exists only in webhooks, so identity resolves by email. */
const synth = <A>(
  eventName: string,
  type: string,
  id: string,
  attributes: A & { test_mode?: boolean },
): LsWebhook<A> => ({
  meta: { event_name: eventName, test_mode: attributes.test_mode, webhook_id: `reconcile:${id}` },
  data: { type, id, attributes },
})

/**
 * FR-SYS-04, daily 01:00 UTC: compares the last 72 h of LS orders and subscriptions with Postgres
 * and replays anything missing or mismatched through the same idempotent handlers. The mismatch
 * report is emailed to the admin.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()
  const since = new Date(started - WINDOW_MS)
  const report: string[] = []

  const [lsOrders, lsSubs] = await Promise.all([
    listRecent<LsOrderAttributes>('orders', since),
    listRecent<LsSubscriptionAttributes>('subscriptions', since),
  ])

  const knownOrders = lsOrders.length
    ? await db
        .select({ lsOrderId: orders.lsOrderId, status: orders.status })
        .from(orders)
        .where(
          inArray(
            orders.lsOrderId,
            lsOrders.map((o) => Number(o.id)),
          ),
        )
    : []
  const orderStatus = new Map(knownOrders.map((o) => [o.lsOrderId, o.status]))

  for (const row of lsOrders) {
    const a = row.attributes
    if (a.status === 'pending' || a.status === 'failed') continue
    const local = orderStatus.get(Number(row.id))
    try {
      if (!local) {
        await onOrderCreated(synth('order_created', 'orders', row.id, a))
        report.push(`Restored missing order #${a.order_number} (LS ${row.id})`)
        if (a.status === 'refunded' || a.status === 'partial_refund')
          await onOrderRefunded(synth('order_refunded', 'orders', row.id, a))
      } else if ((a.status === 'refunded' || a.status === 'partial_refund') && local !== a.status) {
        await onOrderRefunded(synth('order_refunded', 'orders', row.id, a))
        report.push(`Order #${a.order_number}: ${local} → ${a.status}`)
      }
    } catch (error) {
      report.push(`FAILED order #${a.order_number} (LS ${row.id}): ${String(error).slice(0, 160)}`)
    }
  }

  const knownSubs = lsSubs.length
    ? await db
        .select({ id: subscriptions.lsSubscriptionId, status: subscriptions.status })
        .from(subscriptions)
        .where(
          inArray(
            subscriptions.lsSubscriptionId,
            lsSubs.map((s) => Number(s.id)),
          ),
        )
    : []
  const subStatus = new Map(knownSubs.map((s) => [s.id, s.status]))

  for (const row of lsSubs) {
    const local = subStatus.get(Number(row.id))
    if (local === row.attributes.status) continue
    try {
      await onSubscriptionChanged(synth('subscription_updated', 'subscriptions', row.id, row.attributes))
      report.push(
        local
          ? `Subscription ${row.id}: ${local} → ${row.attributes.status}`
          : `Restored missing subscription ${row.id} (${row.attributes.status})`,
      )
    } catch (error) {
      report.push(`FAILED subscription ${row.id}: ${String(error).slice(0, 160)}`)
    }
  }

  if (report.length) {
    await alertAdmin(
      `Reconciliation: ${report.length} mismatch${report.length === 1 ? '' : 'es'}`,
      report.slice(0, 60),
      `reconcile:${new Date(started).toISOString().slice(0, 10)}`,
      '/admin/webhooks',
    )
    revalidateTag('admin-metrics', 'max')
  }
  return cronResult(
    'reconcile',
    { orders: lsOrders.length, subscriptions: lsSubs.length, mismatches: report.length },
    started,
  )
}
