import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { licenseKeys, type JobKind } from '@/db/schema'
import { captureServer } from '@/lib/analytics/server'
import type { ServerEventName, ServerEvents } from '@/lib/analytics/events'
import { billing } from '@/lib/billing'
import { grantDiscordRole, revokeDiscordRole } from '@/server/discord'
import { invalidateLicenseCache, logLicenseEvent, upsertLicenseKey } from '@/server/licensing'
import { publishReleaseNotify } from '@/server/releases/notify'
import { RetryableJobError } from './errors'

/** `license_keys_fetch` (P5.09): keys can lag the order by seconds, so an empty list retries fast. */
async function licenseKeysFetch(payload: { orderId: string; lsOrderId: number }) {
  const keys = await billing.listLicenseKeysForOrder(payload.lsOrderId) // GET /v1/license-keys?filter[order_id]=…
  if (keys.length === 0) throw new RetryableJobError('License keys not generated yet')
  for (const key of keys) await upsertLicenseKey(key) // same upsert as the license_key_created webhook
}

/** `license_key_disable` / `license_key_enable` (FR-LIC-09): LS first, then the local mirror. */
async function toggleKey(payload: { lsLicenseKeyId: number; reason?: string }, disabled: boolean) {
  await billing.updateLicenseKey(payload.lsLicenseKeyId, { disabled })
  const [row] = await db
    .update(licenseKeys)
    .set(disabled ? { status: 'disabled' } : { status: 'active' })
    .where(eq(licenseKeys.lsLicenseKeyId, payload.lsLicenseKeyId))
    .returning({ id: licenseKeys.id, keyHash: licenseKeys.keyHash, instancesCount: licenseKeys.instancesCount })
  if (!row) return
  if (!disabled && row.instancesCount === 0) {
    await db.update(licenseKeys).set({ status: 'inactive' }).where(eq(licenseKeys.id, row.id))
  }
  await invalidateLicenseCache(row.keyHash)
  await logLicenseEvent({
    licenseKeyId: row.id,
    type: disabled ? 'disabled' : 'enabled',
    actor: 'system',
    meta: { reason: payload.reason ?? null },
  })
}

type Handler = (payload: Record<string, unknown>) => Promise<void>

/** One handler per `job_kind` (P6.11). Every handler is idempotent. */
export const jobHandlers: Record<JobKind, Handler> = {
  license_keys_fetch: (p) => licenseKeysFetch(p as { orderId: string; lsOrderId: number }),
  license_key_disable: (p) => toggleKey(p as { lsLicenseKeyId: number; reason?: string }, true),
  license_key_enable: (p) => toggleKey(p as { lsLicenseKeyId: number; reason?: string }, false),
  discord_grant: (p) => grantDiscordRole(String(p.userId)),
  discord_revoke: (p) => revokeDiscordRole(String(p.userId), Boolean(p.force)),
  analytics_capture: async (p) => {
    await captureServer({
      distinctId: String(p.distinctId),
      event: p.event as ServerEventName,
      properties: p.properties as ServerEvents[ServerEventName],
    })
  },
  release_notify: (p) => publishReleaseNotify(String(p.releaseId)),
}
