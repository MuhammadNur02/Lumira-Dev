import { hashLicenseKey } from '@/lib/licensing/crypto'
import { getRegistryIndex, r2GetText } from '@/lib/r2'
import { ratelimit } from '@/lib/rate-limit'
import { logLicenseEvent, shouldSampleValidation, validateLicenseCached } from '@/server/licensing'

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

/**
 * License-gated shadcn registry (FR-LIC-11): `npx shadcn add @lumira/<name>` sends the key as a
 * Bearer token. 401 missing/invalid (including keys from other stores), 403 valid but not covering
 * the component, 404 unknown item. Never cached by shared caches.
 */
export async function GET(req: Request, { params }: RouteContext<'/r/[name]'>) {
  const item = (await params).name.replace(/\.json$/, '')
  if (!/^[a-z0-9-]{1,80}$/.test(item)) return json({ error: 'Not found' }, 404)

  const key = req.headers
    .get('authorization')
    ?.replace(/^Bearer\s+/i, '')
    .trim()
  if (!key)
    return json(
      { error: 'Missing license key. Set LUMIRA_LICENSE_KEY and the registry headers in components.json.' },
      401,
    )
  if (!(await ratelimit.registryKey.limit(hashLicenseKey(key))).success)
    return json({ error: 'Too many requests' }, 429)

  const license = await validateLicenseCached(key) // Redis → LS validate with the store/product guard
  if (!license.valid || !license.keyId) return json({ error: 'Invalid license key' }, 401)

  const entry = (await getRegistryIndex())[item] // "use cache", tag 'registry'
  if (!entry) return json({ error: 'Not found' }, 404)
  if (!license.productIds.includes(entry.productId)) {
    return json({ error: 'Your license does not include this component' }, 403)
  }

  if (await shouldSampleValidation(license.keyId)) {
    await logLicenseEvent({ licenseKeyId: license.keyId, type: 'validated', actor: 'registry', meta: { item }, req })
  }
  return new Response(await r2GetText(entry.key), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  })
}
