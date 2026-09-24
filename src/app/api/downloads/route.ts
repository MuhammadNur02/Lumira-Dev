import { after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { captureServer } from '@/lib/analytics/server'
import { presignDownload } from '@/lib/r2'
import { authorizeDownload, logDownload, readGuestScope } from '@/server/delivery'

const noStore = { 'Cache-Control': 'no-store' }

/**
 * Dashboard and success-page downloads (FR-DL-02…05): identity → entitlement → eligibility → rate
 * limit → log → 300 s pre-signed R2 GET. The file never passes through our functions (FR-DL-08).
 */
export async function POST(req: Request) {
  const body = z.object({ releaseId: z.uuid() }).safeParse(await req.json().catch(() => null))
  if (!body.success) return Response.json({ error: 'Invalid request' }, { status: 400, headers: noStore })

  const { userId } = await auth()
  const guest = userId ? null : await readGuestScope() // __Host-lumira_guest (P5.15)
  const identity = userId ? { userId } : guest ? { orderId: guest.orderId } : null
  if (!identity) return Response.json({ error: 'Sign in to download' }, { status: 401, headers: noStore })

  const channel = userId ? 'dashboard' : 'success_page'
  const decision = await authorizeDownload(identity, body.data.releaseId)
  await logDownload(decision, identity, channel, req)

  if (decision.status === 'rate_limited') {
    return Response.json(
      { error: 'Too many downloads. Try again shortly.' },
      { status: 429, headers: { ...noStore, 'Retry-After': String(decision.retryAfter) } },
    )
  }
  if (decision.status === 'denied')
    return Response.json(
      { error: decision.reason },
      { status: decision.reason === 'not_found' ? 404 : 403, headers: noStore },
    )

  let url: string
  try {
    url = await presignDownload(decision.release.r2Key, `${decision.product.slug}-${decision.release.semver}.zip`, 300)
  } catch {
    return Response.json(
      { error: 'We couldn’t prepare your download. Try again.', code: 'DL-R2' },
      { status: 503, headers: noStore },
    )
  }
  after(() =>
    captureServer({
      distinctId: userId ?? decision.entitlementId,
      event: 'download_granted',
      properties: { product_slug: decision.product.slug, version: decision.release.semver, channel },
    }),
  )
  return Response.json(
    { url, filename: `${decision.product.slug}-${decision.release.semver}.zip` },
    { headers: noStore },
  )
}
