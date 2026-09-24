import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { emailOutbox, licenseKeys } from '@/db/schema'
import { enqueueEmail, enqueueJob } from '@/server/outbox/enqueue'

/**
 * Follow-ups after a key upsert (PRD §6.5): if the order confirmation already went out without a
 * key, send `license-key-ready` (FR-EM-02); refresh Discord eligibility when a key's status moved.
 */
export async function onLicenseKeyUpserted(licenseKeyId: string, eventName: string) {
  const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.id, licenseKeyId) })
  if (!key) return

  if (key.orderId) {
    const confirmation = await db.query.emailOutbox.findFirst({
      where: eq(emailOutbox.idempotencyKey, `order-confirmation:${key.orderId}`),
      columns: { status: true, payload: true },
    })
    const alreadySent = confirmation && ['sent', 'delivered'].includes(confirmation.status)
    if (alreadySent && confirmation.payload.withoutKey === true) {
      await enqueueEmail(db, {
        template: 'license-key-ready',
        to: key.customerEmail,
        payload: { licenseKeyId: key.id },
        idempotencyKey: `license-key-ready:${key.id}`,
      })
    }
  }

  if (eventName === 'license_key_updated' && key.userId) {
    const kind = key.status === 'disabled' || key.status === 'expired' ? 'discord_revoke' : 'discord_grant'
    await enqueueJob(db, kind, { userId: key.userId }, `${kind}:key:${key.id}:${key.status}:${key.updatedAt.getTime()}`)
  }
}
