'use server'

import { after } from 'next/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { orders } from '@/db/schema'
import { captureServer } from '@/lib/analytics/server'
import { hashIp } from '@/lib/crypto'
import { clientIp } from '@/lib/http'
import { presignDownload } from '@/lib/r2'
import { ratelimit } from '@/lib/rate-limit'
import { authorizeDownload, downloadsForOrder, logDownload } from '@/server/delivery'
import { redeemDownloadToken } from '@/server/delivery/tokens'

export type RedeemState = { error: string | null }

/**
 * Email download link (FR-DL-04). Only this POST consumes a use; the GET interstitial never does,
 * so link-scanning mail gateways cannot burn the token. 20 attempts per hour per IP (NFR-SEC-10).
 */
export async function redeemDownload(token: string, _prev: RedeemState): Promise<RedeemState> {
  const h = await headers()
  const { success } = await ratelimit.downloadToken.limit(hashIp(clientIp(h)))
  if (!success) return { error: 'Too many download attempts. Try again in an hour, or download from your Library.' }

  const row = await redeemDownloadToken(token)
  if (!row)
    return { error: 'This download link has expired or reached its limit. Sign in to your Library to download.' }

  const identity = { orderId: row.orderId }
  const releaseId =
    row.releaseId ?? (await downloadsForOrder(row.orderId)).find((d) => d.productId === row.productId)?.release?.id
  if (!releaseId)
    return { error: 'This release is no longer available. Your Library lists every version you can download.' }

  const decision = await authorizeDownload(identity, releaseId)
  const order = await db.query.orders.findFirst({ where: eq(orders.id, row.orderId), columns: { customerEmail: true } })
  await logDownload(decision, identity, 'email_link', h, order?.customerEmail)

  if (decision.status === 'rate_limited') return { error: 'Too many downloads. Try again shortly.' }
  if (decision.status === 'denied') {
    return {
      error:
        decision.reason === 'major_version'
          ? 'This version is a new major release. Upgrade your license to download it.'
          : 'This download is no longer available for your order. Sign in to your Library for details.',
    }
  }

  let url: string
  try {
    url = await presignDownload(decision.release.r2Key, `${decision.product.slug}-${decision.release.semver}.zip`, 60)
  } catch {
    return {
      error:
        'We couldn’t prepare your download. Try again. If it keeps failing, contact support and mention code DL-R2.',
    }
  }
  after(() =>
    captureServer({
      distinctId: decision.entitlementId,
      event: 'download_granted',
      properties: { product_slug: decision.product.slug, version: decision.release.semver, channel: 'email_link' },
    }),
  )
  redirect(url as Route)
}
