'use server'

import { revalidatePath } from 'next/cache'
import type { WebhookEvent as ClerkEvent } from '@clerk/nextjs/webhooks'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { webhookEvents } from '@/db/schema'
import type { LsWebhook } from '@/lib/billing/lemonsqueezy/types'
import { adminAction, withAudit } from '@/server/admin/audit'
import { handleClerkEvent } from '@/server/webhooks/clerk'
import { dispatchLemonSqueezyEvent } from '@/server/webhooks/lemonsqueezy'
import { handleResendEvent, type StoredResendEvent } from '@/server/webhooks/resend'
import { handleSanityEvent, type SanityWebhookPayload } from '@/server/webhooks/sanity'

/**
 * FR-AD-46 replay: re-runs the idempotent handler on the stored payload, bypassing the ledger's
 * "processed" short-circuit on purpose. LS payloads were stored with the license key redacted;
 * the key handler refetches it from LS in that case.
 */
export async function replayWebhook(id: string) {
  return adminAction(async () => {
    const event = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, z.uuid().parse(id)) })
    if (!event) throw new Error('Webhook event not found')
    if ((event.payload as { redacted?: boolean }).redacted)
      throw new Error('This payload is older than 90 days and was redacted.')
    const started = Date.now()
    await withAudit(
      {
        action: 'webhook.replayed',
        targetType: 'webhook_event',
        targetId: id,
        before: { status: event.status, error: event.error },
      },
      async () => {
        try {
          switch (event.source) {
            case 'lemonsqueezy':
              await dispatchLemonSqueezyEvent(event.payload as LsWebhook)
              break
            case 'clerk':
              await handleClerkEvent(event.payload as ClerkEvent)
              break
            case 'sanity':
              await handleSanityEvent(event.payload as SanityWebhookPayload)
              break
            case 'resend':
              await handleResendEvent(event.payload as StoredResendEvent)
              break
          }
        } catch (error) {
          await db
            .update(webhookEvents)
            .set({
              status: 'failed',
              error: String(error).slice(0, 2000),
              attempts: event.attempts + 1,
              durationMs: Date.now() - started,
            })
            .where(eq(webhookEvents.id, id))
          revalidatePath('/admin/webhooks')
          throw error
        }
        const [after] = await db
          .update(webhookEvents)
          .set({
            status: 'processed',
            error: null,
            processedAt: new Date(),
            attempts: event.attempts + 1,
            durationMs: Date.now() - started,
          })
          .where(eq(webhookEvents.id, id))
          .returning({ status: webhookEvents.status })
        return after
      },
    )
    revalidatePath('/admin/webhooks')
  })
}
