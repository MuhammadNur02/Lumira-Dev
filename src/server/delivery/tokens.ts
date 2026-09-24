import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { db, type DbOrTx } from '@/db/client'
import { downloadTokens } from '@/db/schema'
import { env } from '@/lib/env'

const secret = () => new TextEncoder().encode(env.DOWNLOAD_TOKEN_SECRET)
export const DOWNLOAD_TOKEN_TTL_MS = 72 * 60 * 60 * 1000

/** Email download link token (FR-DL-04): HS256 JWT whose `jti` lives in `download_tokens`; 72 h, ≤ 5 uses. */
export async function issueDownloadToken(input: { orderId: string; productId: string; releaseId?: string | null }) {
  const [row] = await db
    .insert(downloadTokens)
    .values({
      orderId: input.orderId,
      productId: input.productId,
      releaseId: input.releaseId ?? null,
      expiresAt: new Date(Date.now() + DOWNLOAD_TOKEN_TTL_MS),
    })
    .returning({ jti: downloadTokens.jti })
  return new SignJWT({ oid: input.orderId, pid: input.productId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(row!.jti)
    .setIssuedAt()
    .setExpirationTime('72h')
    .sign(secret())
}

/** Verifies the signature without consuming a use (renders the interstitial; scanner-safe GET). */
export async function peekDownloadToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] })
    if (!payload.jti) return undefined
    return db.query.downloadTokens.findFirst({
      where: and(eq(downloadTokens.jti, payload.jti), isNull(downloadTokens.revokedAt)),
    })
  } catch {
    return undefined
  }
}

/** Atomically consumes one use; undefined when expired, revoked or exhausted. Race-safe (single UPDATE). */
export async function redeemDownloadToken(token: string) {
  const peeked = await peekDownloadToken(token)
  if (!peeked) return undefined
  const [row] = await db
    .update(downloadTokens)
    .set({ uses: sql`${downloadTokens.uses} + 1` })
    .where(
      and(
        eq(downloadTokens.jti, peeked.jti),
        isNull(downloadTokens.revokedAt),
        gt(downloadTokens.expiresAt, new Date()),
        lt(downloadTokens.uses, downloadTokens.maxUses),
      ),
    )
    .returning()
  return row
}

/** Revokes every email token of an order (refunds, anomaly suspension FR-DL-06). */
export async function revokeDownloadTokens(orderId: string, tx: DbOrTx = db) {
  await tx
    .update(downloadTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(downloadTokens.orderId, orderId), isNull(downloadTokens.revokedAt)))
}
