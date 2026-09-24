import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { licenseEvents, licenseInstances, licenseKeys } from '@/db/schema'
import { billing } from '@/lib/billing'
import { cronResult, cronUnauthorized } from '@/server/cron'
import { invalidateInstances } from '@/server/account/licenses'
import { invalidateLicenseCache, logLicenseEvent } from '@/server/licensing'

export const maxDuration = 300

/**
 * FR-LIC-08 / FR-SYS-06 (nightly 02:00 UTC): for keys with activity in the last 48 h, the live LS
 * instance list is the truth. Unseen instances become `activated` events with source `external`;
 * mirrored rows LS no longer lists are marked deactivated. LS allows ~60 requests/minute, so keys
 * are processed sequentially.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()
  const since = new Date(started - 48 * 60 * 60 * 1000)

  const recent = db
    .selectDistinct({ id: licenseEvents.licenseKeyId })
    .from(licenseEvents)
    .where(gt(licenseEvents.createdAt, since))
  const keys = await db
    .select()
    .from(licenseKeys)
    .where(
      and(
        inArray(licenseKeys.status, ['active', 'inactive']),
        or(gt(licenseKeys.updatedAt, since), inArray(licenseKeys.id, recent)),
      ),
    )
    .limit(500)

  let added = 0
  let removed = 0
  let failed = 0
  for (const key of keys) {
    let live: { id: string; name: string; createdAt: string }[]
    try {
      live = await billing.listLicenseKeyInstances(key.lsLicenseKeyId)
    } catch {
      failed++
      continue
    }
    const local = await db
      .select()
      .from(licenseInstances)
      .where(and(eq(licenseInstances.licenseKeyId, key.id), isNull(licenseInstances.deactivatedAt)))
    const liveIds = new Set(live.map((i) => i.id))
    const localIds = new Set(local.map((i) => i.lsInstanceId))

    for (const instance of live.filter((i) => !localIds.has(i.id))) {
      const [row] = await db
        .insert(licenseInstances)
        .values({
          lsInstanceId: instance.id,
          licenseKeyId: key.id,
          name: instance.name,
          source: 'external',
          createdAt: new Date(instance.createdAt),
        })
        .onConflictDoUpdate({ target: licenseInstances.lsInstanceId, set: { deactivatedAt: null } })
        .returning({ id: licenseInstances.id })
      await logLicenseEvent({
        licenseKeyId: key.id,
        type: 'activated',
        actor: 'system',
        instanceId: row?.id,
        meta: { source: 'external' },
      })
      added++
    }
    const gone = local.filter((i) => !liveIds.has(i.lsInstanceId))
    if (gone.length) {
      await db
        .update(licenseInstances)
        .set({ deactivatedAt: new Date() })
        .where(
          inArray(
            licenseInstances.id,
            gone.map((i) => i.id),
          ),
        )
      for (const instance of gone) {
        await logLicenseEvent({
          licenseKeyId: key.id,
          type: 'deactivated',
          actor: 'system',
          instanceId: instance.id,
          meta: { source: 'reconcile' },
        })
      }
      removed += gone.length
    }
    if (live.length !== key.instancesCount) {
      await db
        .update(licenseKeys)
        .set({ instancesCount: live.length, status: live.length > 0 ? 'active' : sql`${licenseKeys.status}` })
        .where(eq(licenseKeys.id, key.id))
      await Promise.all([invalidateLicenseCache(key.keyHash), invalidateInstances(key.lsLicenseKeyId)])
    }
  }
  return cronResult('license-instances', { keys: keys.length, added, removed, failed }, started)
}
