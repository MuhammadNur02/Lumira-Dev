import type { Metadata } from 'next'
import { catalogCache, facetCount } from '@/lib/catalog-params'
import { buildMetadata } from '@/lib/seo'

/** Faceted URLs with more than one facet are `noindex, follow`, canonical to the category root (NFR-SEO-06). */
export async function catalogMetadata(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  base: { title: string; description: string; path: string },
): Promise<Metadata> {
  const f = catalogCache.parse(await searchParams)
  return buildMetadata({ ...base, noindex: facetCount(f) > 1 })
}
