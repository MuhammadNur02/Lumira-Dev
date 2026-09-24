import { ViewTransition } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LINE_LABEL } from '@/lib/format'
import type { ProductCard } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'
import { BentoTile, TileDescription, TileEyebrow, TileTitle, type Span } from '../bento'
import { PriceTag } from '../price-tag'
import { ProductMedia } from '../product-media'

/**
 * featuredProduct (SG §4.4): eyebrow (line · version), title, value prop, price-from and a `bleed`
 * screenshot clipped by the tile radius. Hero tiles get 32 px padding and may be the LCP element.
 */
export function FeaturedProductTile({
  product,
  span,
  hero = false,
  priority = false,
  morph = false,
}: {
  product: ProductCard
  span: Span
  hero?: boolean
  priority?: boolean
  morph?: boolean
}) {
  const media = (
    <ProductMedia
      poster={product.hero}
      video={product.video}
      priority={priority}
      sizes={hero ? '(min-width: 1024px) 60vw, 100vw' : '(min-width: 1024px) 40vw, 100vw'}
      className="rounded-xl border border-bento-border shadow-bento md:rounded-r-none md:rounded-b-none"
    />
  )
  return (
    <BentoTile span={span} interactive padding="none" className="min-h-[280px] md:min-h-0">
      <div className={cn('flex flex-col gap-3', hero ? 'p-6 md:p-8' : 'p-5 md:p-6')}>
        <TileEyebrow>
          {product.templateType ?? LINE_LABEL[product.line]}
          {product.latestRelease ? ` · v${product.latestRelease.version}` : ''}
        </TileEyebrow>
        <Link
          href={`/products/${product.slug}`}
          transitionTypes={['nav-forward']}
          className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none"
        >
          <TileTitle size={hero ? 'lg' : 'sm'}>{product.name}</TileTitle>
        </Link>
        <TileDescription className="max-w-[48ch]">{product.tagline}</TileDescription>
        <div className="flex items-center gap-3 text-body-sm">
          <PriceTag cents={product.priceFromCents} from />
          <span className="inline-flex items-center gap-1 text-caption text-brand-text">
            View {product.line === 'template' ? 'template' : 'product'} <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
      {/* Bleed: the screenshot runs off the bottom-right edge on md+; inset below md (SG §4.4, §4.8). */}
      <div className="mt-auto px-2 pb-2 md:pr-0 md:pb-0 md:pl-8">
        {morph ? (
          <ViewTransition name={`product-media-${product.slug}`} share="morph" default="none">
            {media}
          </ViewTransition>
        ) : (
          media
        )}
      </div>
    </BentoTile>
  )
}
