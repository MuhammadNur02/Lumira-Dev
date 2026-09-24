import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import Link from 'next/link'
import { getAllProducts, getChangelog } from '@/lib/sanity/fetchers'
import { releaseAnchor } from '@/lib/format'
import { AccountChip, AccountChipFallback } from './account-chip'
import { CommandMenu } from './command-menu'
import { HeaderShell } from './header-shell'
import { MobileNav } from './mobile-nav'
import { SiteNav } from './site-nav'
import { ThemeToggle } from './theme-toggle'
import { Wordmark } from './wordmark'

async function paletteData() {
  'use cache'
  // Without an explicit profile this falls back to `default` (15 min) and drags every page that
  // renders the header down with it. Freshness comes from the webhook-driven tags (NFR-PERF-06).
  cacheLife('max')
  cacheTag('catalog', 'changelog')
  const [products, releases] = await Promise.all([getAllProducts(), getChangelog()])
  return {
    products: products.map((p) => ({ name: p.name, slug: p.slug, line: p.line, tagline: p.tagline })),
    releases: releases
      .filter((r) => r.status === 'published')
      .slice(0, 20)
      .map((r) => ({
        product: r.product.name,
        productSlug: r.product.slug,
        version: r.version,
        title: r.title,
        anchor: releaseAnchor(r.product.slug, r.version),
      })),
  }
}

/**
 * Global header (FR-GL-01). Static apart from the account chip, which streams into its Suspense
 * hole, so every storefront page keeps a cacheable shell.
 */
export async function SiteHeader() {
  const data = await paletteData()
  return (
    <HeaderShell>
      <Link
        href="/"
        className="-ml-1 rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <Wordmark />
        <span className="sr-only">Lumira home</span>
      </Link>
      <SiteNav className="ml-4" />
      <div className="ml-auto flex items-center gap-1.5">
        <CommandMenu data={data} />
        <ThemeToggle />
        <Suspense fallback={<AccountChipFallback />}>
          <AccountChip />
        </Suspense>
        <MobileNav />
      </div>
    </HeaderShell>
  )
}
