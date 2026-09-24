import { revalidateTag } from 'next/cache'
import { and, eq, inArray, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { checkoutSessions } from '@/db/schema'
import { cronResult, cronUnauthorized } from '@/server/cron'

/**
 * FR-SYS-02 (every 15 min): `initiated` after 60 min → `abandoned`; after 24 h → `expired`. Lemon.js
 * emits no close event, so abandonment is inferred here. A late `order_created` still completes the
 * session (the handler updates by id regardless of status).
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()
  const hourAgo = new Date(started - 60 * 60 * 1000)
  const dayAgo = new Date(started - 24 * 60 * 60 * 1000)

  const abandoned = await db
    .update(checkoutSessions)
    .set({ status: 'abandoned' })
    .where(and(eq(checkoutSessions.status, 'initiated'), lt(checkoutSessions.createdAt, hourAgo)))
    .returning({ id: checkoutSessions.id })
  const expired = await db
    .update(checkoutSessions)
    .set({ status: 'expired' })
    .where(and(inArray(checkoutSessions.status, ['initiated', 'abandoned']), lt(checkoutSessions.createdAt, dayAgo)))
    .returning({ id: checkoutSessions.id })

  if (abandoned.length || expired.length) revalidateTag('admin-metrics', 'max')
  return cronResult('checkouts', { abandoned: abandoned.length, expired: expired.length }, started)
}
