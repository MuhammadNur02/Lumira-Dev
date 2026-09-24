import Link from 'next/link'
import type { Route } from 'next'
import { auth } from '@clerk/nextjs/server'
import { Lock } from 'lucide-react'
import { ownsProduct } from '@/server/entitlements'

/**
 * Licensed docs (F-08, FR-DOC-05): the static shell holds only the teaser; the body streams for
 * owners. For everyone else the body is never rendered, so it is absent from the HTML and the RSC
 * payload alike.
 */
export async function LicensedGate({ product, children }: { product: string; children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId || !(await ownsProduct(userId, product).catch(() => false)))
    return <LicensedTeaser product={product} signedIn={Boolean(userId)} />
  return children
}

export function LicensedTeaser({ product, signedIn = false }: { product: string; signedIn?: boolean }) {
  return (
    <div className="not-prose my-6 flex flex-col items-start gap-4 rounded-xl border border-bento-border bg-card p-6 shadow-bento">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
        <Lock className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-heading-4">This page is for license holders</p>
        <p className="text-body-sm text-muted-foreground">
          {signedIn
            ? 'Your account does not own this product yet. Buy a license to read the full guide.'
            : 'Sign in with the email you used at checkout to read the full guide.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {signedIn ? null : (
          <Link
            prefetch={false}
            href={'/sign-in' as Route}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-button-ink"
          >
            Sign in
          </Link>
        )}
        <Link
          prefetch={false}
          href={`/products/${product}#licenses`}
          className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
        >
          See licenses
        </Link>
      </div>
    </div>
  )
}
