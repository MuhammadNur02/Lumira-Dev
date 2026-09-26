import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import type { Route } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isAdminInDatabase } from '@/server/identity'

/** Authenticated buyer. Call at the top of every account page, route handler and Server Action (NFR-SEC-03). */
export async function requireUser() {
  const { userId } = await auth.protect()
  return { userId }
}

/**
 * Admin guard (FR-AD-01): role claim → Postgres role → MFA. Call in every admin page, route handler
 * and Server Action; layouts are never the only guard.
 */
export async function requireAdmin() {
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
}
