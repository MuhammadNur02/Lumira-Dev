import 'server-only'
import crypto from 'node:crypto'
import { after } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { webhookEvents } from '@/db/schema'
import { drainOutboxes } from '@/server/outbox/dispatch'

type Source = (typeof webhookEvents.$inferInsert)['source']

/**
 * Inbound webhook ledger shared by every provider (FR-SYS-01, NFR-SEC-02): record → process once →
 * mark. Failed events return 500 so the sender re-delivers; handlers are upsert-safe, so replays
 * and out-of-order deliveries converge on the same state.
 *
 * `stored` is what lands in `webhook_events.payload` (secrets redacted); `handle` receives the
 * original event in memory.
 */
export async function recordWebhook(
  source: Source,
  eventName: string,
  dedupeKey: string,
  stored: unknown,
  handle: () => Promise<void>,
): Promise<Response> {
  const idempotencyKey = crypto.createHash('sha256').update(`${source}:${dedupeKey}`).digest('hex')
  const [row] = await db
    .insert(webhookEvents)
    .values({ source, eventName, idempotencyKey, payload: stored as object })
    .onConflictDoUpdate({ target: webhookEvents.idempotencyKey, set: { attempts: sql`${webhookEvents.attempts} + 1` } })
    .returning({ id: webhookEvents.id, status: webhookEvents.status })
  if (!row) return new Response('Ledger write failed', { status: 500 })
  if (row.status === 'processed' || row.status === 'ignored') return Response.json({ duplicate: true })

  const started = Date.now()
  try {
    await handle()
    await db
      .update(webhookEvents)
      .set({ status: 'processed', error: null, processedAt: new Date(), durationMs: Date.now() - started })
      .where(eq(webhookEvents.id, row.id))
    after(() => drainOutboxes({ limit: 25 }))
    return Response.json({ ok: true })
  } catch (error) {
    await db
      .update(webhookEvents)
      .set({ status: 'failed', error: String(error).slice(0, 2000), durationMs: Date.now() - started })
      .where(eq(webhookEvents.id, row.id))
    console.error(JSON.stringify({ level: 'error', msg: 'webhook_failed', source, eventName, error: String(error) }))
    return new Response('Processing failed', { status: 500 })
  }
}
