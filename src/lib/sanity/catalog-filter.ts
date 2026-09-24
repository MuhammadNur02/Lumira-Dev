import type { ProductCard, ProductLine, TemplateType } from './models'

export const SORTS = ['updated', 'newest', 'popular', 'price-asc', 'price-desc'] as const
export type CatalogSort = (typeof SORTS)[number]

export type CatalogFilters = {
  line?: ProductLine | null
  type?: TemplateType | null
  stack?: string[]
  features?: string[]
  maxPrice?: number | null // whole dollars
  sort?: CatalogSort
}

const releasedAt = (p: ProductCard) => p.latestRelease?.releasedAt ?? p.createdAt

/** Server-side catalog filtering and sorting (FR-SF-04). Pure, so every facet is unit-tested. */
export function filterCatalog(products: readonly ProductCard[], f: CatalogFilters): ProductCard[] {
  const stack = new Set(f.stack ?? [])
  const features = f.features ?? []
  const result = products.filter(
    (p) =>
      (!f.line || p.line === f.line) &&
      (!f.type || p.templateType === f.type) &&
      (stack.size === 0 || p.stack.some((s) => stack.has(s.slug))) &&
      features.every((feature) => p.capabilities.includes(feature)) &&
      (f.maxPrice == null || (p.priceFromCents ?? Infinity) <= f.maxPrice * 100),
  )

  const by: Record<CatalogSort, (a: ProductCard, b: ProductCard) => number> = {
    updated: (a, b) => releasedAt(b).localeCompare(releasedAt(a)),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    popular: (a, b) => b.popularity - a.popularity,
    'price-asc': (a, b) => (a.priceFromCents ?? Infinity) - (b.priceFromCents ?? Infinity),
    'price-desc': (a, b) => (b.priceFromCents ?? -Infinity) - (a.priceFromCents ?? -Infinity),
  }
  return result.sort((a, b) => by[f.sort ?? 'updated'](a, b) || a.name.localeCompare(b.name))
}

/** Facet values present in a set of products, for the filter bar. */
export function facetsOf(products: readonly ProductCard[]) {
  const stack = new Map<string, string>()
  const features = new Set<string>()
  for (const p of products) {
    for (const s of p.stack) if (s.kind === 'framework' || s.kind === 'styling') stack.set(s.slug, s.name)
    for (const c of p.capabilities) features.add(c)
  }
  return {
    stack: [...stack].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
    features: [...features].sort(),
  }
}
