'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { licenseInstances, licenseKeys } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { decryptLicenseKey } from '@/lib/licensing/crypto'
import { licenseApi } from '@/lib/licensing/license-api'
import { ratelimit } from '@/lib/rate-limit'
import { invalidateInstances } from '@/server/account/licenses'
import { invalidateLicenseCache, logLicenseEvent } from '@/server/licensing'

const id = z.uuid()

/** Re-checks ownership on every call and records a `revealed` event (FR-LIC-07, SG §5.6). */
export async function revealLicenseKey(keyId: string): Promise<string> {
  const { userId } = await requireUser()
  const parsed = id.parse(keyId)
  const { success } = await ratelimit.reveal.limit(userId)
  if (!success) throw new Error('Too many reveals. Try again in a minute.')
  const key = await db.query.licenseKeys.findFirst({
    where: and(eq(licenseKeys.id, parsed), eq(licenseKeys.userId, userId)),
  })
  if (!key) throw new Error('License key not found')
  await logLicenseEvent({
    licenseKeyId: key.id,
    type: 'revealed',
    actor: 'buyer',
    actorUserId: userId,
    headers: await headers(),
  })
  return decryptLicenseKey(key.keyCiphertext)
}

export type DeactivateResult = { ok: true } | { ok: false; error: string }

/** Frees an activation slot at Lemon Squeezy first, then mirrors it locally (F-03). */
export async function deactivateInstance(instanceId: string): Promise<DeactivateResult> {
  const { userId } = await requireUser()
  const parsed = id.safeParse(instanceId)
  if (!parsed.success) return { ok: false, error: 'Activation not found' }

  const [found] = await db
    .select({ instance: licenseInstances, key: licenseKeys })
    .from(licenseInstances)
    .innerJoin(licenseKeys, eq(licenseKeys.id, licenseInstances.licenseKeyId))
    .where(
      and(eq(licenseInstances.id, parsed.data), eq(licenseKeys.userId, userId), isNull(licenseInstances.deactivatedAt)),
    )
    .limit(1)
  if (!found) return { ok: false, error: 'Activation not found' }

  const result = await licenseApi.deactivate(decryptLicenseKey(found.key.keyCiphertext), found.instance.lsInstanceId)
  if (!result.deactivated) return { ok: false, error: result.error ?? 'Deactivation failed. Try again.' }

  await db.transaction(async (tx) => {
    await tx.update(licenseInstances).set({ deactivatedAt: new Date() }).where(eq(licenseInstances.id, parsed.data))
    await tx
      .update(licenseKeys)
      .set({ instancesCount: sql`greatest(${licenseKeys.instancesCount} - 1, 0)` })
      .where(eq(licenseKeys.id, found.key.id))
  })
  await logLicenseEvent({
    licenseKeyId: found.key.id,
    type: 'deactivated',
    actor: 'buyer',
    actorUserId: userId,
    instanceId: parsed.data,
    headers: await headers(),
  })
  await Promise.all([invalidateLicenseCache(found.key.keyHash), invalidateInstances(found.key.lsLicenseKeyId)])
  revalidatePath('/account/licenses')
  return { ok: true }
}
