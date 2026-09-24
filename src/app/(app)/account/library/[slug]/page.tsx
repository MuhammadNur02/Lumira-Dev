import { Suspense } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'
import { ArrowLeft, BookOpen, Eye, History, Lock, Sparkles } from 'lucide-react'
import { DownloadButton } from '@/components/commerce/download-button'
import { AccountCard, AccountSkeleton } from '@/components/lumira/account-page'
import { CopyButton } from '@/components/lumira/copy-button'
import { VersionPill } from '@/components/lumira/version-pill'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireUser } from '@/lib/auth'
import { formatBytes, formatDate, formatPrice, LINE_LABEL, TIER_LABEL } from '@/lib/format'
import { getChangelog } from '@/lib/sanity/fetchers'
import { getLibrary, type LibraryItem } from '@/server/account/library'
import { MAJOR_UPGRADE_DISCOUNT_PERCENT, tierPrices, upgradeOptions } from '@/server/upgrades'
import { AccessBadge } from '../library-tile'
import { UpgradeButton } from './upgrade-button'

export default function AssetPage({ params }: PageProps<'/account/library/[slug]'>) {
  return (
    <>
      <Link
        href="/account/library"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden className="size-4" /> Library
      </Link>
      <Suspense fallback={<AccountSkeleton rows={3} />}>
        <Asset params={params} />
      </Suspense>
    </>
  )
}

export async function generateMetadata({ params }: PageProps<'/account/library/[slug]'>) {
  const { slug } = await params
  return { title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }
}

const semver = (v: string) => v.replace(/^v/, '').split('.').map(Number) as [number, number, number]
const newer = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)]
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

async function Asset({ params }: { params: PageProps<'/account/library/[slug]'>['params'] }) {
  const [{ userId }, { slug }] = await Promise.all([requireUser(), params])
  const [item] = await getLibrary(userId, slug)
  if (!item) notFound()

  const [changelog, options] = await Promise.all([
    getChangelog(slug),
    item.access.kind === 'license' ? upgradeOptions(userId, item.product.id) : null,
  ])
  const prices = options ? await tierPrices(item.product.id, options.higher) : new Map()
  const notes = new Map(changelog.map((entry) => [entry.version.replace(/^v/, ''), entry]))
  const since =
    item.lastDownloaded && item.latestEligible
      ? changelog.filter(
          (e) => newer(e.version, item.lastDownloaded!) > 0 && newer(e.version, item.latestEligible!.semver) <= 0,
        )
      : []

  return (
    <div className="flex flex-col gap-(--bento-gap)">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">{LINE_LABEL[item.product.line]}</span>
            <AccessBadge access={item.access} />
          </div>
          <h1 className="text-heading-2 text-balance">{item.product.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.latestEligible ? (
            <DownloadButton
              releaseId={item.latestEligible.id}
              version={item.latestEligible.semver}
              sizeBytes={item.latestEligible.sizeBytes}
              productSlug={item.product.slug}
            />
          ) : null}
        </div>
      </header>

      {item.lockedMajor !== null && options ? <MajorUpgrade item={item} /> : null}

      {since.length ? (
        <AccountCard aria-labelledby="since-title">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden strokeWidth={1.75} className="size-5 text-brand-text" />
            <h2 id="since-title" className="text-heading-4">
              What’s new since v{item.lastDownloaded}
            </h2>
          </div>
          <ol className="flex flex-col gap-4">
            {since.map((entry) => (
              <li key={entry._id} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <VersionPill version={entry.version} />
                  <span className="font-medium">{entry.title}</span>
                </div>
                <p className="text-body-sm text-pretty text-muted-foreground">{entry.summary}</p>
              </li>
            ))}
          </ol>
          <a
            className="text-body-sm text-brand-text underline-offset-4 hover:underline"
            href={`/products/${item.product.slug}/changelog`}
          >
            Full changelog →
          </a>
        </AccountCard>
      ) : null}

      <AccountCard aria-labelledby="releases-title" className="px-0 md:px-0">
        <h2 id="releases-title" className="px-5 text-heading-4 md:px-6">
          Release history
        </h2>
        {item.releases.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 md:pl-6">Version</TableHead>
                  <TableHead>Released</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>SHA-256</TableHead>
                  <TableHead className="min-w-[16rem]">Notes</TableHead>
                  <TableHead className="pr-5 text-right md:pr-6">
                    <span className="sr-only">Download</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {item.releases.map((release) => {
                  const entry = notes.get(release.semver)
                  return (
                    <TableRow key={release.id}>
                      <TableCell className="pl-5 md:pl-6">
                        <VersionPill version={release.semver} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {release.publishedAt ? formatDate(release.publishedAt) : '—'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatBytes(release.sizeBytes)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <code className="font-mono text-caption text-muted-foreground" title={release.sha256}>
                            {release.sha256.slice(0, 12)}…
                          </code>
                          <CopyButton
                            value={release.sha256}
                            label={`Copy SHA-256 for v${release.semver}`}
                            copiedLabel="Checksum copied"
                            className="size-7"
                          />
                        </span>
                      </TableCell>
                      <TableCell className="text-body-sm text-muted-foreground">
                        <span className="line-clamp-2">{entry?.summary ?? entry?.title ?? '—'}</span>
                      </TableCell>
                      <TableCell className="pr-5 text-right md:pr-6">
                        {release.eligible ? (
                          <DownloadButton
                            releaseId={release.id}
                            version={release.semver}
                            sizeBytes={release.sizeBytes}
                            productSlug={item.product.slug}
                            variant="outline"
                            size="sm"
                          />
                        ) : (
                          <Badge variant="neutral">
                            <Lock aria-hidden /> Upgrade to unlock
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="px-5 text-body-sm text-muted-foreground md:px-6">
            The first release is on its way. We’ll email you when it’s ready.
          </p>
        )}
      </AccountCard>

      <div className="grid gap-(--bento-gap) md:grid-cols-2">
        {options?.higher.length ? (
          <AccountCard aria-labelledby="tier-title">
            <div className="flex flex-col gap-1">
              <h2 id="tier-title" className="text-heading-4">
                Need more seats or rights?
              </h2>
              <p className="text-body-sm text-pretty text-muted-foreground">
                You own the {TIER_LABEL[options.tier]} license. Upgrade and we credit what you paid.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.higher.map((tier) => (
                <UpgradeButton
                  key={tier}
                  productSlug={item.product.slug}
                  target={{ kind: 'tier', tier: tier as 'team' | 'extended' }}
                  variant="outline"
                >
                  Upgrade to {TIER_LABEL[tier]}
                  {prices.get(tier)
                    ? ` · from ${formatPrice(Math.max(100, prices.get(tier)! - options.pricePaid))}`
                    : ''}
                </UpgradeButton>
              ))}
            </div>
          </AccountCard>
        ) : null}
        <AccountCard aria-labelledby="links-title">
          <h2 id="links-title" className="text-heading-4">
            Quick links
          </h2>
          <ul className="flex flex-col gap-2 text-body-sm">
            <li>
              <a
                className="inline-flex items-center gap-2 hover:underline hover:underline-offset-4"
                href={`/docs/${item.product.slug}`}
              >
                <BookOpen aria-hidden className="size-4 text-muted-foreground" /> Documentation
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 hover:underline hover:underline-offset-4"
                href={`/products/${item.product.slug}/changelog`}
              >
                <History aria-hidden className="size-4 text-muted-foreground" /> Changelog
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-2 hover:underline hover:underline-offset-4"
                href={`/products/${item.product.slug}/preview`}
              >
                <Eye aria-hidden className="size-4 text-muted-foreground" /> Live Preview
              </a>
            </li>
            <li>
              <Link
                className="inline-flex items-center gap-2 hover:underline hover:underline-offset-4"
                href={'/account/licenses' as Route}
              >
                <Lock aria-hidden className="size-4 text-muted-foreground" /> License keys & activations
              </Link>
            </li>
          </ul>
        </AccountCard>
      </div>
    </div>
  )
}

function MajorUpgrade({ item }: { item: LibraryItem }) {
  return (
    <AccountCard aria-labelledby="major-title" className="border-brand/30 bg-brand-subtle/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="major-title" className="text-heading-4">
            v{item.lockedMajor} is here
          </h2>
          <p className="text-body-sm text-pretty text-muted-foreground">
            Your license covers every v{item.latestEligible?.major ?? (item.lockedMajor ?? 1) - 1} release. Owners
            upgrade to v{item.lockedMajor} at {MAJOR_UPGRADE_DISCOUNT_PERCENT}% off.
          </p>
        </div>
        <UpgradeButton productSlug={item.product.slug} target={{ kind: 'major' }} size="default">
          Get v{item.lockedMajor}
        </UpgradeButton>
      </div>
    </AccountCard>
  )
}
