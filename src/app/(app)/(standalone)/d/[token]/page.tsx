import Link from 'next/link'
import type { Route } from 'next'
import { eq } from 'drizzle-orm'
import { FileArchive } from 'lucide-react'
import { db } from '@/db/client'
import { releases } from '@/db/schema'
import { Button } from '@/components/ui/button'
import { formatBytes, LINE_LABEL } from '@/lib/format'
import { downloadsForOrder } from '@/server/delivery'
import { peekDownloadToken } from '@/server/delivery/tokens'
import { DownloadForm } from './download-form'

export const metadata = { title: 'Download', referrer: 'no-referrer' }

/**
 * Scanner-safe interstitial (FR-DL-04): rendering never consumes a use. The token lives in the path,
 * so `referrer: no-referrer` keeps it out of third-party Referer headers.
 */
export default async function EmailDownloadPage({ params }: PageProps<'/d/[token]'>) {
  const { token } = await params
  const row = await peekDownloadToken(token)
  const usable = row && row.expiresAt > new Date() && row.uses < row.maxUses

  if (!usable) {
    return (
      <Shell>
        <h1 className="text-heading-3">This download link has expired</h1>
        <p className="text-body-sm text-pretty text-muted-foreground">
          Email links work for 72 hours and up to {row?.maxUses ?? 5} downloads. Sign in to your Library to download
          every version you own.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link prefetch={false} href={'/sign-in?redirect_url=/account/library' as Route}>
            Sign in to your Library
          </Link>
        </Button>
      </Shell>
    )
  }

  const item = (await downloadsForOrder(row.orderId)).find((d) => d.productId === row.productId)
  const pinned = row.releaseId ? await db.query.releases.findFirst({ where: eq(releases.id, row.releaseId) }) : null
  const release = pinned
    ? { version: pinned.semver, sizeBytes: pinned.sizeBytes, sha256: pinned.sha256 }
    : item?.release

  if (!item || !release) {
    return (
      <Shell>
        <h1 className="text-heading-3">This release isn’t available</h1>
        <p className="text-body-sm text-pretty text-muted-foreground">
          Your Library lists every version your license covers.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link prefetch={false} href="/account/library">
            Open your Library
          </Link>
        </Button>
      </Shell>
    )
  }

  const remaining = row.maxUses - row.uses
  return (
    <Shell>
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg border border-bento-border bg-muted">
          <FileArchive aria-hidden strokeWidth={1.5} className="size-5 text-muted-foreground" />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="eyebrow">{LINE_LABEL[item.line]}</span>
          <h1 className="truncate text-heading-4">{item.productName}</h1>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">Version</dt>
        <dd className="text-right font-mono tabular-nums">v{release.version}</dd>
        <dt className="text-muted-foreground">Size</dt>
        <dd className="text-right tabular-nums">{formatBytes(release.sizeBytes)}</dd>
        <dt className="text-muted-foreground">SHA-256</dt>
        <dd className="truncate text-right font-mono text-caption" title={release.sha256}>
          {release.sha256.slice(0, 16)}…
        </dd>
      </dl>
      <DownloadForm token={token} label={`Download v${release.version} · ${formatBytes(release.sizeBytes)}`} />
      <p className="text-caption text-muted-foreground">
        {remaining} of {row.maxUses} downloads left on this link. Your Library has unlimited access.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[440px] flex-col px-4 py-16 sm:py-24">
      <div className="bento-surface flex flex-col gap-6 p-8">{children}</div>
    </div>
  )
}
