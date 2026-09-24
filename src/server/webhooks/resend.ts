import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { emailOutbox, users } from '@/db/schema'

/** What the ledger stores for a Resend event: references only, no recipient address. */
export type StoredResendEvent = {
  type: string
  created_at: string
  email_id: string
  bounce: { type?: string; subType?: string; message?: string } | null
}

const STATUS = {
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
} as const

/**
 * FR-EM-13: mirrors delivery status onto `email_outbox` by `resend_id`; a hard bounce or complaint
 * flags the customer for the admin. Idempotent, so the webhook inspector can replay it.
 */
export async function handleResendEvent(evt: StoredResendEvent): Promise<void> {
  const status = STATUS[evt.type as keyof typeof STATUS]
  if (!status) return
  const [row] = await db
    .update(emailOutbox)
    .set({ status, ...(status !== 'delivered' ? { lastError: evt.bounce?.message?.slice(0, 500) ?? evt.type } : {}) })
    .where(eq(emailOutbox.resendId, evt.email_id))
    .returning({ to: emailOutbox.to })
  const hardBounce = status === 'bounced' && (evt.bounce?.type ?? 'Permanent') === 'Permanent'
  if (row && (hardBounce || status === 'complained')) {
    await db.update(users).set({ emailBouncedAt: new Date() }).where(eq(users.email, row.to.trim().toLowerCase()))
  }
}
