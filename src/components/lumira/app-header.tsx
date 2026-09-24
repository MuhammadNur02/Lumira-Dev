import Link from 'next/link'
import { Suspense } from 'react'
import { AccountChip, AccountChipFallback } from './account-chip'
import { ThemeToggle } from './theme-toggle'
import { Wordmark } from './wordmark'

/** Compact header for the `(app)` root layout. Links back to the storefront are full page loads. */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border glass-bar"
      style={{ viewTransitionName: 'site-header' }}
    >
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4 sm:px-6">
        <Link
          prefetch={false}
          href="/"
          className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Wordmark />
          <span className="sr-only">Lumira store</span>
        </Link>
        {children}
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Suspense fallback={<AccountChipFallback />}>
            <AccountChip />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
