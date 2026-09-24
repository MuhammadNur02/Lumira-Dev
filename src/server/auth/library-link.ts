import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'
import { env } from '@/lib/env'

/**
 * One-click Library sign-in (F-13, NFR-SEC-15): a single-use Clerk sign-in token valid 7 days,
 * redeemed on /auth/continue only after an explicit click (scanner-safe). Falls back to the plain
 * Library URL (email-code sign-in) if Clerk is unavailable.
 */
export async function createLibrarySignInLink(userId: string | null | undefined): Promise<string> {
  const fallback = `${env.NEXT_PUBLIC_APP_URL}/account/library`
  if (!userId) return fallback
  try {
    const client = await clerkClient()
    const { token } = await client.signInTokens.createSignInToken({ userId, expiresInSeconds: 7 * 24 * 60 * 60 })
    return `${env.NEXT_PUBLIC_APP_URL}/auth/continue?ticket=${encodeURIComponent(token)}`
  } catch {
    return fallback
  }
}
