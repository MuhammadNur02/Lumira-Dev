import 'server-only'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { after } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/client'
import { licenseInstances, licenseKeys, products, variants } from '@/db/schema'
import { captureServer } from '@/lib/analytics/server'
import { hashIp } from '@/lib/crypto'
import { env } from '@/lib/env'
import { clientIp, readJsonOrForm, tooManyRequests } from '@/lib/http'
import { hashLicenseKey } from '@/lib/licensing/crypto'
import { licenseApi } from '@/lib/licensing/license-api'
import { ratelimit } from '@/lib/rate-limit'
import { invalidateLicenseCache, logLicenseEvent, shouldSampleValidation } from '@/server/licensing'

const manageUrl = () => `${env.NEXT_PUBLIC_APP_URL}/account/licenses`
const Key = z.string().trim().min(16).max(100)

/** Per-key and per-IP limits (NFR-SEC-10: 30/h/key, 120/h/IP). Returns a 429 response or null. */
async function limit(req: Request, keyHash: string) {
  const [perKey, perIp] = await Promise.all([
    ratelimit.licenseKey.limit(keyHash),
    ratelimit.licenseIp.limit(hashIp(clientIp(req))),
  ])
  return !perKey.success || !perIp.success ? tooManyRequests(Math.max(perKey.reset, perIp.reset)) : null
}

async function productSlugForLs(lsProductId: number) {
  const [row] = await db
    .select({ slug: products.slug })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.lsProductId, lsProductId))
    .limit(1)
  return row?.slug ?? null
}

/** POST /api/v1/licenses/activate (FR-LIC-05/06/07, F-02). */
export async function activate(req: Request) {
  const parsed = z
    .object({ license_key: Key, instance_name: z.string().trim().min(1).max(100) })
    .safeParse(await readJsonOrForm(req))
  if (!parsed.success) return Response.json({ activated: false, error: 'Invalid request' }, { status: 400 })

  const keyHash = hashLicenseKey(parsed.data.license_key)
  const limited = await limit(req, keyHash)
  if (limited) return limited

  const result = await licenseApi.activate(parsed.data.license_key, parsed.data.instance_name)
  const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.keyHash, keyHash) })

  if (key && result.activated && result.instance) {
    const [instance] = await db
      .insert(licenseInstances)
      .values({
        lsInstanceId: result.instance.id,
        licenseKeyId: key.id,
        name: result.instance.name,
        source: 'cli',
        createdAt: new Date(result.instance.created_at),
      })
      .onConflictDoNothing()
      .returning()
    await db
      .update(licenseKeys)
      .set({ status: 'active', instancesCount: result.license_key?.activation_usage ?? key.instancesCount + 1 })
      .where(eq(licenseKeys.id, key.id))
    await logLicenseEvent({ licenseKeyId: key.id, type: 'activated', actor: 'cli', instanceId: instance?.id, req })
    await invalidateLicenseCache(keyHash)
    const slug = await productSlugForLs(key.lsProductId)
    after(() =>
      captureServer({
        distinctId: key.userId ?? key.id,
        event: 'license_activated',
        properties: { product_slug: slug, source: 'cli' },
      }),
    )
  } else if (key) {
    await logLicenseEvent({
      licenseKeyId: key.id,
      type: 'validation_failed',
      actor: 'cli',
      meta: { action: 'activate', error: result.error },
      req,
    })
  }

  const atLimit =
    !result.activated &&
    result.license_key != null &&
    result.license_key.activation_limit !== null &&
    result.license_key.activation_usage >= result.license_key.activation_limit
  const error = atLimit
    ? `This key has reached its activation limit (${result.license_key!.activation_usage} of ${result.license_key!.activation_limit}). Free an activation in your Library or upgrade your license.`
    : result.error
  return Response.json(
    {
      activated: Boolean(result.activated),
      instance_id: result.instance?.id ?? null,
      activation_usage: result.license_key?.activation_usage ?? null,
      activation_limit: result.license_key?.activation_limit ?? null,
      error,
      manage_url: manageUrl(),
    },
    { status: result.activated ? 200 : atLimit ? 409 : 400 },
  )
}

/** POST /api/v1/licenses/validate: cached through Redis for the registry; live for the CLI's `status`. */
export async function validate(req: Request) {
  const parsed = z
    .object({ license_key: Key, instance_id: z.string().max(100).optional() })
    .safeParse(await readJsonOrForm(req))
  if (!parsed.success) return Response.json({ valid: false, error: 'Invalid request' }, { status: 400 })

  const keyHash = hashLicenseKey(parsed.data.license_key)
  const limited = await limit(req, keyHash)
  if (limited) return limited

  const result = await licenseApi.validate(parsed.data.license_key, parsed.data.instance_id)
  const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.keyHash, keyHash) })
  if (key) {
    if (result.valid) {
      if (parsed.data.instance_id) {
        await db
          .update(licenseInstances)
          .set({ lastValidatedAt: new Date() })
          .where(eq(licenseInstances.lsInstanceId, parsed.data.instance_id))
      }
      if (await shouldSampleValidation(key.id))
        await logLicenseEvent({ licenseKeyId: key.id, type: 'validated', actor: 'cli', req })
    } else {
      await logLicenseEvent({
        licenseKeyId: key.id,
        type: 'validation_failed',
        actor: 'cli',
        meta: { action: 'validate', error: result.error },
        req,
      })
    }
  }
  return Response.json(
    {
      valid: Boolean(result.valid),
      status: result.license_key?.status ?? null,
      activation_usage: result.license_key?.activation_usage ?? null,
      activation_limit: result.license_key?.activation_limit ?? null,
      expires_at: result.license_key?.expires_at ?? null,
      instance: result.instance ? { id: result.instance.id, name: result.instance.name } : null,
      error: result.error,
      manage_url: manageUrl(),
    },
    { status: result.valid ? 200 : 400 },
  )
}

/** POST /api/v1/licenses/deactivate: frees a slot; `deactivated_at` + event (F-03). */
export async function deactivate(req: Request) {
  const parsed = z
    .object({ license_key: Key, instance_id: z.string().min(1).max(100) })
    .safeParse(await readJsonOrForm(req))
  if (!parsed.success) return Response.json({ deactivated: false, error: 'Invalid request' }, { status: 400 })

  const keyHash = hashLicenseKey(parsed.data.license_key)
  const limited = await limit(req, keyHash)
  if (limited) return limited

  const result = await licenseApi.deactivate(parsed.data.license_key, parsed.data.instance_id)
  const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.keyHash, keyHash) })
  if (key && result.deactivated) {
    const [instance] = await db
      .update(licenseInstances)
      .set({ deactivatedAt: new Date() })
      .where(and(eq(licenseInstances.lsInstanceId, parsed.data.instance_id), isNull(licenseInstances.deactivatedAt)))
      .returning({ id: licenseInstances.id })
    await db
      .update(licenseKeys)
      .set({ instancesCount: sql`greatest(${licenseKeys.instancesCount} - 1, 0)` })
      .where(eq(licenseKeys.id, key.id))
    await logLicenseEvent({ licenseKeyId: key.id, type: 'deactivated', actor: 'cli', instanceId: instance?.id, req })
    await invalidateLicenseCache(keyHash)
  }
  return Response.json(
    { deactivated: Boolean(result.deactivated), error: result.error, manage_url: manageUrl() },
    { status: result.deactivated ? 200 : 400 },
  )
}
