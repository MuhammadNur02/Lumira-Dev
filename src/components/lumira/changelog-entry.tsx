import Link from 'next/link'
import type { Route } from 'next'
import { TriangleAlert } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { formatDate, releaseAnchor } from '@/lib/format'
import type { ChangeKind, ChangelogEntry as Entry } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'
import { PortableText } from './portable-text'
import { NewBadge } from './relative-time'
import { VersionPill } from './version-pill'

export const KIND_LABEL: Record<ChangeKind, string> = {
  added: 'Added',
  improved: 'Improved',
  fixed: 'Fixed',
  removed: 'Removed',
  deprecated: 'Deprecated',
  security: 'Security',
  breaking: 'Breaking',
}

const KIND_TONE: Record<ChangeKind, string> = {
  added: 'bg-success-subtle text-success',
  improved: 'bg-info-subtle text-info',
  fixed: 'bg-muted text-muted-foreground',
  removed: 'bg-muted text-muted-foreground',
  deprecated: 'bg-warning-subtle text-warning',
  security: 'bg-destructive-subtle text-destructive',
  breaking: 'bg-destructive-subtle text-destructive',
}

/**
 * One release (FR-CL-02/03): stable anchor `#{product}-v2-3-0`, mono version pill, "New" under 14
 * days, a "Withdrawn" note for yanked releases (FR-CL-07). No download links, ever (FR-CL-08).
 */
export function ChangelogEntry({
  entry,
  showProduct = true,
  detailed = false,
  highlight = false,
}: {
  entry: Entry
  showProduct?: boolean
  detailed?: boolean
  highlight?: boolean
}) {
  const anchor = releaseAnchor(entry.product.slug, entry.version)
  const breaking = entry.changes.filter((c) => c.kind === 'breaking')
  return (
    <li
      id={anchor}
      data-changelog-entry
      data-product={entry.product.slug}
      data-kinds={[...new Set(entry.changes.map((c) => c.kind))].join(' ')}
      className="scroll-mt-28"
    >
      <article
        className={cn(
          'bento-surface flex flex-col gap-4 p-5 md:p-6',
          highlight && 'ring-1 ring-brand/40',
          entry.status === 'withdrawn' && 'opacity-70',
        )}
      >
        <header className="flex flex-wrap items-center gap-2">
          <a
            href={`#${anchor}`}
            className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Link to ${entry.product.name} v${entry.version}`}
          >
            <VersionPill version={entry.version} />
          </a>
          {showProduct ? (
            <Link
              href={`/products/${entry.product.slug}` as Route}
              className="text-caption text-foreground hover:underline"
            >
              {entry.product.name}
            </Link>
          ) : null}
          <span className="text-micro text-muted-foreground capitalize">{entry.type}</span>
          <NewBadge date={entry.releasedAt} />
          {entry.status === 'withdrawn' ? (
            <span className="rounded-full bg-destructive-subtle px-2 py-0.5 text-micro text-destructive">
              Withdrawn
            </span>
          ) : null}
          <time dateTime={entry.releasedAt} className="ml-auto text-micro text-muted-foreground tabular-nums">
            {formatDate(entry.releasedAt)}
          </time>
        </header>
        <h3 className="text-heading-4 text-balance">{entry.title}</h3>
        <p className="text-body-sm text-pretty text-muted-foreground">{entry.summary}</p>
        {entry.status === 'withdrawn' ? (
          <p className="text-caption text-destructive">
            This release was withdrawn and is no longer available for download.
          </p>
        ) : null}
        {detailed && breaking.length ? (
          <div role="note" className="flex gap-3 rounded-lg bg-destructive-subtle p-4 text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1 text-body-sm">
              <strong className="font-semibold">Breaking changes</strong>
              <ul className="list-disc pl-4">
                {breaking.map((c) => (
                  <li key={c.text}>{c.text}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {detailed ? <PortableText value={entry.highlights} className="text-body-sm" /> : null}
        {entry.changes.length ? (
          <ul className="flex flex-col gap-2">
            {entry.changes.map((c) => (
              <li key={`${c.kind}-${c.text}`} className="flex items-start gap-2 text-body-sm">
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full px-2 text-micro',
                    KIND_TONE[c.kind],
                  )}
                >
                  {KIND_LABEL[c.kind]}
                </span>
                <span className="text-pretty">
                  {c.text}
                  {c.docsPath ? (
                    <>
                      {' '}
                      <Link href={c.docsPath as Route} className="text-brand-text underline underline-offset-4">
                        Docs
                      </Link>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {detailed && entry.upgradeGuide?.length ? (
          <Accordion type="single" collapsible className="border-t border-border">
            <AccordionItem value="upgrade" className="border-0">
              <AccordionTrigger className="text-body-sm font-medium">
                Upgrade guide to v{entry.version}
              </AccordionTrigger>
              <AccordionContent>
                <PortableText value={entry.upgradeGuide} className="text-body-sm" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </article>
    </li>
  )
}
