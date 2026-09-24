import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { releaseAnchor } from '@/lib/format'
import type { ChangelogEntry } from '@/lib/sanity/models'
import { BentoTile, TileEyebrow, TileTitle, type Span } from '../bento'
import { RelativeTime } from '../relative-time'
import { VersionPill } from '../version-pill'

/** changelogTeaser (SG §4.4): the latest three releases with version pill and relative date. */
export function ChangelogTeaserTile({
  eyebrow,
  title,
  releases,
  span,
}: {
  eyebrow?: string | null
  title?: string | null
  releases: ChangelogEntry[]
  span: Span
}) {
  return (
    <BentoTile span={span} className="gap-4">
      <TileEyebrow>{eyebrow ?? 'Changelog'}</TileEyebrow>
      <TileTitle size="sm">{title ?? 'Recently shipped'}</TileTitle>
      <ol className="flex flex-col divide-y divide-border">
        {releases.slice(0, 3).map((r) => (
          <li key={r._id}>
            <Link
              href={`/changelog#${releaseAnchor(r.product.slug, r.version)}`}
              className="group/release flex flex-col gap-1 rounded-sm py-2.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {/* Version, product and date share one row so three releases fit a 2-row tile. */}
              <span className="flex min-w-0 items-center gap-2">
                <VersionPill version={r.version} />
                <span className="truncate text-caption text-foreground">{r.product.name}</span>
                <RelativeTime date={r.releasedAt} className="ml-auto shrink-0 text-micro text-muted-foreground" />
              </span>
              <span className="line-clamp-1 text-body-sm text-muted-foreground transition-colors group-hover/release:text-foreground">
                {r.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link
        href="/changelog"
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-sm text-caption text-brand-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Full changelog <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </BentoTile>
  )
}
