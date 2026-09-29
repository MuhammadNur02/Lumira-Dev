import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import type { Route } from 'next'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { ensureUserRow, isAdminInDatabase } from '@/server/identity'

/**
 * Authenticated buyer. Call at the top of every account page, route handler and Server Action (NFR-SEC-03).
 * Also mirrors the Clerk user into Postgres when the webhook has not yet (see ensureUserRow). Living here,
 * inside each page's Suspense boundary, keeps the account layout free of request-time awaits.
 */
export async function requireUser() {
  const { userId } = await auth.protect()
  await ensureUserRow(userId)
  return { userId }
}

/**
 * Admin guard (FR-AD-01): role claim → Postgres role → MFA. Call in every admin page, route handler
 * and Server Action; layouts are never the only guard. Memoized per request, so the layout and the
 * page share one Clerk lookup and one Postgres check.
 */
export const requireAdmin = cache(async () => {
  const { userId, sessionClaims } = await auth.protect()
  const user = await currentUser()
  // Fast path: check session claims if a custom JWT template maps public_metadata → metadata.
  // Fallback: read public_metadata from the Clerk user object (needed when no JWT template exists,
  // e.g. fresh dev setup). The Postgres check below is the authoritative guard either way.
  const claimsRole = sessionClaims?.metadata?.role
  if (claimsRole !== 'admin') {
    const metaRole = (user?.publicMetadata as Record<string, unknown> | undefined)?.role
    if (metaRole !== 'admin') notFound() // never reveal that /admin exists
  }
  if (!(await isAdminInDatabase(userId))) notFound()
  // In development, skip the MFA requirement (Clerk test accounts may not support 2FA)
  if (process.env.NODE_ENV !== 'development' && !user?.twoFactorEnabled)
    redirect('/account/settings/security?mfa=required' as Route)
  return { userId }
})
