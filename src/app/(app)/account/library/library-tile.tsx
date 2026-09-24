import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { ArrowRight, ArrowUpCircle, BookOpen, History, Sparkles } from 'lucide-react'
import { DownloadButton } from '@/components/commerce/download-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LINE_LABEL, TIER_LABEL } from '@/lib/format'
import type { ProductCard } from '@/lib/sanity/models'
import type { LibraryItem } from '@/server/account/library'

export function AccessBadge({ access }: { access: LibraryItem['access'] }) {
  if (access.kind === 'all_access') {
    return (
      <Badge variant="brand">
        <Sparkles aria-hidden /> Included
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      {access.kind === 'comp' ? 'Complimentary' : `${TIER_LABEL[access.tier ?? 'personal']} license`}
    </Badge>
  )
}

/** One owned asset (FR-BD-02): cover, tier, owned vs latest version, update flag, Download · Docs · Changelog. */
export function LibraryTile({
  item,
  card,
  priority,
}: {
  item: LibraryItem
  card: ProductCard | undefined
  priority?: boolean
}) {
  const { product, latestEligible, latest } = item
  return (
    <li className="bento-light bento-surface flex flex-col overflow-hidden">
      <Link
        href={`/account/library/${product.slug}` as Route}
        className="group/cover relative block aspect-[16/10] overflow-hidden border-b border-bento-border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        aria-label={`${product.name} details`}
      >
        {card ? (
          <Image
            src={card.hero.url}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
            placeholder={card.hero.lqip ? 'blur' : 'empty'}
            blurDataURL={card.hero.lqip ?? undefined}
            className="object-cover transition-transform duration-(--spring-gentle-duration) ease-spring-gentle motion-reduce:transition-none pointer-fine:group-hover/cover:scale-[1.02]"
          />
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{LINE_LABEL[product.line]}</span>
          <AccessBadge access={item.access} />
          {item.updateAvailable ? (
            <Badge variant="info">
              <ArrowUpCircle aria-hidden /> Update available
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-heading-4">
            <Link
              href={`/account/library/${product.slug}` as Route}
              className="hover:underline hover:underline-offset-4"
            >
              {product.name}
            </Link>
          </h2>
          <p className="text-caption text-muted-foreground">
            {item.lastDownloaded ? (
              <>
                You have <span className="font-mono text-foreground">v{item.lastDownloaded}</span>
                {latestEligible && latestEligible.semver !== item.lastDownloaded ? (
                  <>
                    {' '}
                    · latest <span className="font-mono text-foreground">v{latestEligible.semver}</span>
                  </>
                ) : (
                  ' · up to date'
                )}
              </>
            ) : latestEligible ? (
              <>
                Latest <span className="font-mono text-foreground">v{latestEligible.semver}</span> · not downloaded yet
              </>
            ) : (
              'First release coming soon'
            )}
          </p>
          {item.lockedMajor !== null && latest ? (
            <p className="text-caption text-warning">
              v{latest.major} is out. Your license covers v{latestEligible?.major ?? latest.major - 1}.
            </p>
          ) : null}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2">
          {latestEligible ? (
            <DownloadButton
              releaseId={latestEligible.id}
              version={latestEligible.semver}
              sizeBytes={latestEligible.sizeBytes}
              productSlug={product.slug}
              size="sm"
            />
          ) : null}
          <Button asChild variant="ghost" size="sm">
            <a href={`/docs/${product.slug}`}>
              <BookOpen aria-hidden /> Docs
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href={`/products/${product.slug}/changelog`}>
              <History aria-hidden /> Changelog
            </a>
          </Button>
          <Button asChild variant="link" size="sm" className="ml-auto">
            <Link href={`/account/library/${product.slug}` as Route}>
              All versions <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  )
}
