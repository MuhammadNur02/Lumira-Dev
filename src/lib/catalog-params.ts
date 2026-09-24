import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
import { SORTS } from '@/lib/sanity/catalog-filter'

export const TEMPLATE_TYPES = ['portfolio', 'landing', 'docs', 'blog'] as const

/** URL state of every catalog route (FR-SF-04): shareable, back/forward-safe. */
export const catalogParams = {
  type: parseAsStringLiteral(TEMPLATE_TYPES),
  stack: parseAsArrayOf(parseAsString).withDefault([]),
  features: parseAsArrayOf(parseAsString).withDefault([]),
  maxPrice: parseAsInteger,
  sort: parseAsStringLiteral(SORTS).withDefault('updated'),
}

export const catalogCache = createSearchParamsCache(catalogParams)

/** Number of active facets; more than one makes the URL `noindex, follow` (NFR-SEO-06). */
export function facetCount(f: {
  type?: string | null
  stack?: string[]
  features?: string[]
  maxPrice?: number | null
}) {
  return (f.type ? 1 : 0) + (f.stack?.length ?? 0) + (f.features?.length ?? 0) + (f.maxPrice != null ? 1 : 0)
}
