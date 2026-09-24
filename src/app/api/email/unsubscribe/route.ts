import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { env } from '@/lib/env'
import { readUnsubscribeToken } from '@/server/releases/notify'

async function unsubscribe(req: Request) {
  const token = new URL(req.url).searchParams.get('t')
  const claims = token ? await readUnsubscribeToken(token) : null
  if (!claims) return null
  await db
    .update(users)
    .set({ releaseEmails: sql`${users.releaseEmails} || jsonb_build_object(${claims.productSlug}::text, false)` })
    .where(eq(users.id, claims.userId))
  return claims
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post), sent by mail clients. */
export async function POST(req: Request) {
  return (await unsubscribe(req)) ? new Response(null, { status: 204 }) : new Response('Invalid link', { status: 400 })
}

/** Link clicks from the email footer land on the preferences page with a confirmation. */
export async function GET(req: Request) {
  const done = await unsubscribe(req)
  const url = new URL('/account/settings', env.NEXT_PUBLIC_APP_URL)
  url.searchParams.set('unsubscribed', done ? done.productSlug : 'invalid')
  return Response.redirect(url, 303)
}
