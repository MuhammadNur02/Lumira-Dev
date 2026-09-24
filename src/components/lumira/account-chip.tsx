import Link from 'next/link'
import type { Route } from 'next'
import { auth } from '@clerk/nextjs/server'
import { AccountMenu } from './account-menu'

/**
 * Account chip (FR-GL-01). Reads the session, so it always renders inside a Suspense hole and the
 * header shell stays in the static prerender (NFR-PERF-07).
 */
export async function AccountChip() {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return (
      <Link
        prefetch={false}
        href={'/sign-in' as Route}
        className="inline-flex h-9 pressable items-center rounded-md px-3 text-body-sm font-medium text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        Sign in
      </Link>
    )
  }
  return <AccountMenu isAdmin={sessionClaims?.metadata?.role === 'admin'} />
}

export function AccountChipFallback() {
  return <span aria-hidden className="size-9 rounded-full" />
}
