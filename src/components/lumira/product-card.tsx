import { ViewTransition } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { LINE_LABEL } from '@/lib/format'
import type { ProductCard as Product } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'
import { PriceTag } from './price-tag'
import { ProductMedia } from './product-media'
import { RelativeTime } from './relative-time'
import { StackBadge } from './stack-badge'

/**
 * Product card (FR-SF-05, P3.07). The poster and title carry the card ↔ PDP shared-element morph
 * (SG §6.5.3); the link is tagged `nav-forward`. Only one instance per page may carry the morph
 * names (`morph={false}` elsewhere).
 */
export function ProductCard({
  product,
  priority = false,
  morph = true,
  className,
}: {
  product: Product
  priority?: boolean
  morph?: boolean
  className?: string
}) {
  const media = (
    <ProductMedia
      poster={product.hero}
      video={product.video}
      priority={priority}
      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
      className="rounded-xl"
    />
  )
  const title = <h3 className="text-heading-4 text-balance">{product.name}</h3>

  return (
    <article
      data-spotlight
      className={cn(
        'group/card bento-light bento-surface flex flex-col p-2',
        'transition-[box-shadow,border-color,translate] duration-(--spring-snappy-duration) ease-spring-snappy',
        'pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:border-[color-mix(in_oklch,var(--foreground)_14%,transparent)] pointer-fine:hover:shadow-raised',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      {morph ? (
        <ViewTransition name={`product-media-${product.slug}`} share="morph" default="none">
          {media}
        </ViewTransition>
      ) : (
        media
      )}
      <div className="flex flex-1 flex-col gap-3 p-3 pt-4">
        <div className="flex items-center gap-2">
          <span className="eyebrow">{product.templateType ?? LINE_LABEL[product.line]}</span>
          {product.inAllAccess ? (
            <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-micro text-brand-subtle-foreground">
              All-Access
            </span>
          ) : null}
        </div>
        <Link
          href={`/products/${product.slug}`}
          transitionTypes={['nav-forward']}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          {morph ? (
            <ViewTransition name={`product-title-${product.slug}`} share="morph" default="none">
              {title}
            </ViewTransition>
          ) : (
            title
          )}
        </Link>
        <p className="line-clamp-2 text-body-sm text-pretty text-muted-foreground">{product.tagline}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
          {product.stack.slice(0, 3).map((s) => (
            <li key={s.slug}>
              <StackBadge item={s} showVersion={false} />
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="flex flex-col gap-0.5">
            <PriceTag cents={product.priceFromCents} from className="text-body" />
            {product.latestRelease ? (
              <RelativeTime
                date={product.latestRelease.releasedAt}
                prefix="Updated"
                className="text-micro text-muted-foreground"
              />
            ) : (
              <RelativeTime date={product.createdAt} prefix="Added" className="text-micro text-muted-foreground" />
            )}
          </div>
          <ArrowUpRight
            aria-hidden
            className="size-5 text-muted-foreground transition-transform duration-(--spring-snappy-duration) ease-spring-snappy group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5"
          />
        </div>
      </div>
    </article>
  )
}
