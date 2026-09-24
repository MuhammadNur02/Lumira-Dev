import 'server-only'
import { eq, sql } from 'drizzle-orm'
import { db, type DbOrTx } from '@/db/client'
import { licenseEvents, licenseKeys, orders, subscriptions } from '@/db/schema'
import { billing } from '@/lib/billing'
import type { LsLicenseKeyResource } from '@/lib/billing/lemonsqueezy/types'
import { hashIp } from '@/lib/crypto'
import { clientCountry, clientIp } from '@/lib/http'
import { encryptLicenseKey, hashLicenseKey } from '@/lib/licensing/crypto'
import { licenseApi } from '@/lib/licensing/license-api'
import { redis } from '@/lib/rate-limit'
import { productsCoveredByKey } from '@/server/entitlements'

type EventType = (typeof licenseEvents.$inferInsert)['type']
type Actor = (typeof licenseEvents.$inferInsert)['actor']

/** Licensing activity log (FR-LIC-07): IPs hashed, never raw; never the key itself. */
export async function logLicenseEvent(input: {
  licenseKeyId: string
  type: EventType
  actor: Actor
  actorUserId?: string | null
  instanceId?: string | null
  meta?: Record<string, unknown>
  req?: Request
  headers?: Headers
  tx?: DbOrTx
}) {
  const h = input.req?.headers ?? input.headers
  await (input.tx ?? db).insert(licenseEvents).values({
    licenseKeyId: input.licenseKeyId,
    type: input.type,
    actor: input.actor,
    actorUserId: input.actorUserId ?? null,
    instanceId: input.instanceId ?? null,
    ipHash: h ? hashIp(clientIp(h)) : null,
    country: h ? clientCountry(h) : null,
    userAgent: h?.get('user-agent')?.slice(0, 300) ?? null,
    meta: input.meta ?? null,
  })
}

/** At most one `validated` event per key per hour (FR-LIC-07). */
export async function shouldSampleValidation(licenseKeyId: string): Promise<boolean> {
  try {
    return (await redis.set(`lic:vlog:${licenseKeyId}`, 1, { nx: true, ex: 3600 })) === 'OK'
  } catch {
    return false
  }
}

const cacheKey = (hash: string) => `lic:${hash}`
const graceKey = (hash: string) => `lic:grace:${hash}`

export type CachedValidation = { valid: boolean; keyId: string | null; productIds: string[]; expiresAt: string | null }

export async function invalidateLicenseCache(keyHash: string) {
  try {
    await redis.del(cacheKey(keyHash), graceKey(keyHash))
  } catch {
    // cache is an optimization; TTLs bound staleness
  }
}

/**
 * Cached validation (FR-LIC-06): Redis `lic:{hash}` holds valid results for 10 min and invalid ones
 * for 60 s. When the LS License API is unavailable, a successful validation from the last 24 h is
 * honored (PRD §6.7).
 */
export async function validateLicenseCached(key: string): Promise<CachedValidation> {
  const hash = hashLicenseKey(key)
  try {
    const cached = await redis.get<CachedValidation>(cacheKey(hash))
    if (cached) return cached
  } catch {
    // fall through to a live validation
  }

  const invalid: CachedValidation = { valid: false, keyId: null, productIds: [], expiresAt: null }
  const row = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.keyHash, hash) })
  if (!row || row.status === 'disabled' || row.status === 'expired') {
    await redis.set(cacheKey(hash), invalid, { ex: 60 }).catch(() => {})
    return invalid
  }

  const result = await licenseApi.validate(key)
  const unreachable = !result.meta && !result.license_key && Boolean(result.error)
  if (unreachable) {
    const grace = await redis.get<CachedValidation>(graceKey(hash)).catch(() => null)
    return grace ?? invalid
  }

  const valid = Boolean(result.valid) || result.license_key?.status === 'inactive'
  const value: CachedValidation = valid
    ? {
        valid: true,
        keyId: row.id,
        productIds: await productsCoveredByKey(row.id),
        expiresAt: result.license_key?.expires_at ?? null,
      }
    : { ...invalid, keyId: row.id }
  await Promise.all([
    redis.set(cacheKey(hash), value, { ex: valid ? 600 : 60 }).catch(() => {}),
    valid ? redis.set(graceKey(hash), value, { ex: 24 * 60 * 60 }).catch(() => {}) : Promise.resolve(),
  ])
  return value
}

/**
 * Idempotent key upsert shared by the `license_key_created` / `license_key_updated` webhooks and
 * the post-order fetch job (FR-LIC-02). Order-agnostic: links to the order or subscription when
 * they already exist, and fills them in later otherwise (PRD R3). Webhook replays carry a
 * redacted key, so the plaintext is re-fetched from LS when the row does not exist yet.
 */
export async function upsertLicenseKey(input: LsLicenseKeyResource): Promise<{ id: string; inserted: boolean } | null> {
  let k = input
  if (!k.attributes.key || k.attributes.key === '[redacted]') {
    const existing = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.lsLicenseKeyId, Number(k.id)) })
    if (!existing) {
      const fresh = await billing.getLicenseKey(Number(k.id))
      if (!fresh) throw new Error(`License key ${k.id} not found in Lemon Squeezy`)
      k = fresh
    }
  }
  const a = k.attributes
  const status = a.disabled ? 'disabled' : a.status
  const [order, subscription] = await Promise.all([
    db.query.orders.findFirst({ where: eq(orders.lsOrderId, a.order_id), columns: { id: true, userId: true } }),
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.lsOrderId, a.order_id),
      columns: { id: true, userId: true },
    }),
  ])
  const hasKey = Boolean(a.key) && a.key !== '[redacted]'
  const keyHash = hasKey ? hashLicenseKey(a.key) : null

  if (!hasKey) {
    // Replay of a redacted payload for a key we already store: update the mirror fields only.
    const [row] = await db
      .update(licenseKeys)
      .set({
        status,
        activationLimit: a.activation_limit,
        instancesCount: a.instances_count,
        expiresAt: a.expires_at ? new Date(a.expires_at) : null,
      })
      .where(eq(licenseKeys.lsLicenseKeyId, Number(k.id)))
      .returning({ id: licenseKeys.id, keyHash: licenseKeys.keyHash })
    if (row) await invalidateLicenseCache(row.keyHash)
    return row ? { id: row.id, inserted: false } : null
  }

  const [row] = await db
    .insert(licenseKeys)
    .values({
      lsLicenseKeyId: Number(k.id),
      lsOrderId: a.order_id,
      lsOrderItemId: a.order_item_id,
      lsProductId: a.product_id,
      orderId: order?.id,
      subscriptionId: subscription?.id,
      userId: order?.userId ?? subscription?.userId,
      customerEmail: a.user_email.trim().toLowerCase(),
      keyCiphertext: encryptLicenseKey(a.key),
      keyHash: keyHash!,
      keyShort: a.key_short,
      status,
      activationLimit: a.activation_limit,
      instancesCount: a.instances_count,
      expiresAt: a.expires_at ? new Date(a.expires_at) : null,
      createdAt: new Date(a.created_at),
    })
    .onConflictDoUpdate({
      target: licenseKeys.lsLicenseKeyId,
      set: {
        status,
        activationLimit: a.activation_limit,
        instancesCount: a.instances_count,
        expiresAt: a.expires_at ? new Date(a.expires_at) : null,
        orderId: sql`coalesce(excluded.order_id, ${licenseKeys.orderId})`,
        subscriptionId: sql`coalesce(excluded.subscription_id, ${licenseKeys.subscriptionId})`,
        userId: sql`coalesce(excluded.user_id, ${licenseKeys.userId})`,
      },
    })
    .returning({ id: licenseKeys.id, inserted: sql<boolean>`(xmax = 0)` }) // xmax = 0 ⇒ this was an insert
  if (!row) return null
  if (row.inserted) await logLicenseEvent({ licenseKeyId: row.id, type: 'issued', actor: 'system' })
  await invalidateLicenseCache(keyHash!)
  return { id: row.id, inserted: Boolean(row.inserted) }
}
