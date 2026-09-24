import { Suspense, ViewTransition } from 'react'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { FilterBar, FilterBarFallback } from '@/components/lumira/filter-bar'
import { ProductCard } from '@/components/lumira/product-card'
import { ProductGrid } from '@/components/lumira/product-grid'
import { SectionHeader } from '@/components/lumira/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/motion/page-transition'
import { catalogCache } from '@/lib/catalog-params'
import { facetsOf } from '@/lib/sanity/catalog-filter'
import { getAllProducts, getCatalog } from '@/lib/sanity/fetchers'
import type { ProductLine, TemplateType } from '@/lib/sanity/models'
import { PAGE_SIZE } from './constants'
import { CatalogFilteredEvent } from './catalog-event'
import { LoadMore } from './load-more'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/** Shared catalog route body (FR-SF-03/04): static header + filter shell, results stream per URL. */
export function CatalogView({
  line,
  fixedType,
  eyebrow,
  title,
  lead,
  searchParams,
}: {
  line: ProductLine
  fixedType?: TemplateType
  eyebrow: string
  title: string
  lead: string
  searchParams: SearchParams
}) {
  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-10 px-4 pt-16 pb-8 sm:px-6 lg:px-8 lg:pt-24">
          <SectionHeader as="h1" eyebrow={eyebrow} title={title} lead={lead} />
          <Suspense fallback={<FilterBarFallback />}>
            <Filters line={line} showType={line === 'template' && !fixedType} />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto max-w-[80rem] px-4 pb-24 sm:px-6 lg:px-8">
        <Suspense fallback={<CatalogGridSkeleton />}>
          <CatalogResults line={line} fixedType={fixedType} searchParams={searchParams} />
        </Suspense>
      </div>
    </PageTransition>
  )
}

async function Filters({ line, showType }: { line: ProductLine; showType: boolean }) {
  const all = (await getAllProducts()).filter((p) => p.line === line)
  return <FilterBar facets={facetsOf(all)} showType={showType} />
}

async function CatalogResults({
  line,
  fixedType,
  searchParams,
}: {
  line: ProductLine
  fixedType?: TemplateType
  searchParams: SearchParams
}) {
  const parsed = catalogCache.parse(await searchParams)
  const filters = {
    line,
    type: fixedType ?? parsed.type,
    stack: parsed.stack,
    features: parsed.features,
    maxPrice: parsed.maxPrice,
    sort: parsed.sort,
  }
  const products = await getCatalog(filters)
  const key = JSON.stringify(filters)
  const firstPage = products.slice(0, PAGE_SIZE)

  return (
    <>
      <CatalogFilteredEvent filtersKey={key} resultCount={products.length} />
      <p className="sr-only" role="status">
        {products.length} {products.length === 1 ? 'result' : 'results'}
      </p>
      {/* Crossfade between filter states on the same route (SG §6.5.2 `collection-content`). */}
      <ViewTransition key={key} name="collection-content" share="auto" enter="auto" default="none">
        {products.length ? (
          <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-3">
            {firstPage.map((p, i) => (
              <ProductCard key={p._id} product={p} priority={i < 3} />
            ))}
            {products.length > PAGE_SIZE ? (
              <LoadMore
                filters={{ ...filters, type: filters.type ?? null, maxPrice: filters.maxPrice ?? null }}
                initialOffset={PAGE_SIZE}
              />
            ) : null}
          </div>
        ) : (
          <CatalogEmpty line={line} />
        )}
      </ViewTransition>
    </>
  )
}

async function CatalogEmpty({ line }: { line: ProductLine }) {
  const picks = (await getCatalog({ line, sort: 'popular' })).slice(0, 3)
  return (
    <div className="flex flex-col gap-12">
      <Empty className="bento-surface">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No matches for these filters</EmptyTitle>
          <EmptyDescription>Loosen a filter or clear them to see everything in this category.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="?" scroll={false}>
              Clear filters
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
      {picks.length ? (
        <div className="flex flex-col gap-6">
          <h2 className="eyebrow">Popular picks</h2>
          <ProductGrid products={picks} morph={false} />
        </div>
      ) : null}
    </div>
  )
}

export function CatalogGridSkeleton() {
  return (
    <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="bento-surface flex flex-col gap-4 p-2">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <div className="flex flex-col gap-3 p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
