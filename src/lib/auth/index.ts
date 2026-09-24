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
  if (sessionClaims?.metadata?.role !== 'admin') notFound() // never reveal that /admin exists
  if (!(await isAdminInDatabase(userId))) notFound()
  const user = await currentUser()
  if (!user?.twoFactorEnabled) redirect('/account/settings/security?mfa=required' as Route)
  return { userId }
}
