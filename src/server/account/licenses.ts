import 'server-only'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { licenseInstances, licenseKeys, products, variants, type LicenseInstance, type LicenseKey } from '@/db/schema'
import { billing } from '@/lib/billing'
import { redis } from '@/lib/rate-limit'
import { keyLabels } from '@/server/checkout/status'

type LiveInstance = { id: string; name: string; createdAt: string }

export type LicenseCard = {
  key: Pick<LicenseKey, 'id' | 'status' | 'activationLimit' | 'createdAt' | 'expiresAt'> & { last4: string }
  label: string
  instances: Pick<LicenseInstance, 'id' | 'name' | 'source' | 'createdAt' | 'lastValidatedAt'>[]
  /** UI kits, bundles and All-Access keys unlock the shadcn registry (FR-LIC-11). */
  registry: boolean
  /** False when the live LS read failed and only our mirror is shown. */
  live: boolean
}

const instancesKey = (lsLicenseKeyId: number) => `lic:inst:${lsLicenseKeyId}`

/** Live LS instances, cached 60 s (P6.07). `null` when LS is unreachable. */
async function liveInstances(lsLicenseKeyId: number): Promise<LiveInstance[] | null> {
  try {
    const hit = await redis.get<LiveInstance[]>(instancesKey(lsLicenseKeyId))
    if (hit) return hit
  } catch {
    // cache miss path
  }
  try {
    const list = await billing.listLicenseKeyInstances(lsLicenseKeyId)
    await redis.set(instancesKey(lsLicenseKeyId), list, { ex: 60 }).catch(() => undefined)
    return list
  } catch {
    return null
  }
}

export async function invalidateInstances(lsLicenseKeyId: number) {
  await redis.del(instancesKey(lsLicenseKeyId)).catch(() => undefined)
}

/**
 * Key cards for `/account/licenses` (FR-BD-04). Our instance mirror is merged with the live LS list:
 * activations made outside the CLI are mirrored as `external` so they can be freed here too, and
 * mirrored rows LS no longer knows are hidden (the nightly reconcile marks them deactivated).
 */
export async function getLicenses(userId: string): Promise<LicenseCard[]> {
  const keys = await db
    .select()
    .from(licenseKeys)
    .where(eq(licenseKeys.userId, userId))
    .orderBy(desc(licenseKeys.createdAt))
  if (!keys.length) return []

  const lsProductIds = [...new Set(keys.map((k) => k.lsProductId))]
  const [labels, lines, local, live] = await Promise.all([
    keyLabels(lsProductIds),
    db
      .select({ lsProductId: variants.lsProductId, tier: variants.tier, line: products.line })
      .from(variants)
      .leftJoin(products, eq(products.id, variants.productId))
      .where(inArray(variants.lsProductId, lsProductIds)),
    db
      .select()
      .from(licenseInstances)
      .where(
        and(
          inArray(
            licenseInstances.licenseKeyId,
            keys.map((k) => k.id),
          ),
          isNull(licenseInstances.deactivatedAt),
        ),
      ),
    Promise.all(keys.map((k) => liveInstances(k.lsLicenseKeyId))),
  ])

  const cards: LicenseCard[] = []
  for (const [i, key] of keys.entries()) {
    const mine = local.filter((row) => row.licenseKeyId === key.id)
    const remote = live[i]
    let instances = mine
    if (remote) {
      const known = new Set(mine.map((row) => row.lsInstanceId))
      const missing = remote.filter((r) => !known.has(r.id))
      if (missing.length) {
        const mirrored = await db
          .insert(licenseInstances)
          .values(
            missing.map((r) => ({
              lsInstanceId: r.id,
              licenseKeyId: key.id,
              name: r.name,
              source: 'external' as const,
              createdAt: new Date(r.createdAt),
            })),
          )
          .onConflictDoNothing({ target: licenseInstances.lsInstanceId })
          .returning()
        instances = [...mine, ...mirrored]
      }
      const remoteIds = new Set(remote.map((r) => r.id))
      instances = instances.filter((row) => remoteIds.has(row.lsInstanceId))
    }
    cards.push({
      key: {
        id: key.id,
        status: key.status,
        activationLimit: key.activationLimit,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        last4: key.keyShort.slice(-4),
      },
      label: labels.get(key.lsProductId) ?? 'Lumira license',
      registry: lines.some(
        (l) => l.lsProductId === key.lsProductId && (l.line === 'ui_kit' || l.line === null || l.tier === 'all_access'),
      ),
      instances: instances
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(({ id, name, source, createdAt, lastValidatedAt }) => ({ id, name, source, createdAt, lastValidatedAt })),
      live: Boolean(remote),
    })
  }
  return cards
}
