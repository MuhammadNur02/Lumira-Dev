import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { downloadEvents, entitlements, orderItems, products, releases } from '@/db/schema'
import { hashIp } from '@/lib/crypto'
import { env } from '@/lib/env'
import { clientCountry, clientIp } from '@/lib/http'
import { ratelimit } from '@/lib/rate-limit'
import { canDownload, type DownloadIdentity } from '@/server/entitlements'

export type { DownloadIdentity }
export type Decision =
  | {
      status: 'granted'
      release: typeof releases.$inferSelect
      product: typeof products.$inferSelect
      entitlementId: string
    }
  | { status: 'denied'; reason: 'not_found' | 'withdrawn' | 'not_entitled' | 'major_version'; releaseId?: string }
  | { status: 'rate_limited'; retryAfter: number; releaseId: string }

/** PRD §7.3 eligibility + NFR-SEC-10 limits (10/h per user per asset, 60/h per user). */
export async function authorizeDownload(identity: DownloadIdentity, releaseId: string): Promise<Decision> {
  const { result, release, product } = await canDownload(identity, releaseId)
  if (!result.allowed || !release || !product) {
    return { status: 'denied', reason: result.allowed ? 'not_found' : result.reason, releaseId: release?.id }
  }
  const subject = 'userId' in identity ? identity.userId : `order:${identity.orderId}`
  const [perAsset, perUser] = await Promise.all([
    ratelimit.downloadAsset.limit(`${subject}:${product.id}`),
    ratelimit.downloadUser.limit(subject),
  ])
  if (!perAsset.success || !perUser.success) {
    return {
      status: 'rate_limited',
      retryAfter: Math.max(1, Math.ceil((Math.max(perAsset.reset, perUser.reset) - Date.now()) / 1000)),
      releaseId,
    }
  }
  return { status: 'granted', release, product, entitlementId: result.entitlementId }
}

/** Every attempt is logged with its channel (FR-DL-04), IP hashed (NFR-SEC-13). */
export async function logDownload(
  decision: Decision,
  identity: DownloadIdentity,
  channel: 'dashboard' | 'success_page' | 'email_link' | 'admin',
  source: Request | Headers,
  customerEmail?: string | null,
) {
  const releaseId = decision.status === 'granted' ? decision.release.id : decision.releaseId
  if (!releaseId) return // unknown release: nothing to attach the event to
  const headers = source instanceof Headers ? source : source.headers
  await db.insert(downloadEvents).values({
    releaseId,
    userId: 'userId' in identity ? identity.userId : null,
    customerEmail: customerEmail ?? null,
    entitlementId: decision.status === 'granted' ? decision.entitlementId : null,
    channel,
    status: decision.status,
    denyReason: decision.status === 'denied' ? decision.reason : null,
    ipHash: hashIp(clientIp(headers)),
    country: clientCountry(headers),
    userAgent: headers.get('user-agent')?.slice(0, 300) ?? null,
  })
}

const guestSecret = () => new TextEncoder().encode(env.GUEST_SCOPE_SECRET)
export const GUEST_COOKIE = '__Host-lumira_guest'

/** Success-page guest scope (P5.15): HS256 `{ orderId }`, 30 minutes, HttpOnly. */
export async function issueGuestScope(orderId: string) {
  const token = await new SignJWT({ oid: orderId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(guestSecret())
  const jar = await cookies()
  jar.set(GUEST_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 60 })
}

export async function readGuestScope(): Promise<{ orderId: string } | null> {
  const token = (await cookies()).get(GUEST_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, guestSecret(), { algorithms: ['HS256'] })
    return typeof payload.oid === 'string' ? { orderId: payload.oid } : null
  } catch {
    return null
  }
}

/** Latest release each of an order's entitlements may download (success page, emails). */
export async function downloadsForOrder(orderId: string) {
  const granted = await db
    .select({ entitlement: entitlements, product: products })
    .from(entitlements)
    .innerJoin(orderItems, eq(orderItems.id, entitlements.sourceOrderItemId))
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(orderItems.orderId, orderId), eq(entitlements.status, 'active')))
  if (!granted.length) return []
  const all = await db
    .select()
    .from(releases)
    .where(
      and(
        inArray(
          releases.productId,
          granted.map((g) => g.product.id),
        ),
        eq(releases.status, 'published'),
      ),
    )
  return granted.map(({ entitlement, product }) => {
    const eligible = all
      .filter((r) => r.productId === product.id && (entitlement.maxMajor == null || r.major <= entitlement.maxMajor))
      .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)
    const latest = eligible[0]
    return {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      line: product.line,
      tier: entitlement.tier,
      release: latest
        ? { id: latest.id, version: latest.semver, sizeBytes: latest.sizeBytes, sha256: latest.sha256 }
        : null,
    }
  })
}
