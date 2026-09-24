import { describe, expect, it } from 'vitest'
import { facetsOf, filterCatalog } from '@/lib/sanity/catalog-filter'
import { fixtureCards } from '@/lib/sanity/fixtures'

const slugs = (p: { slug: string }[]) => p.map((x) => x.slug)

describe('filterCatalog (FR-SF-04)', () => {
  it('filters by line and template type', () => {
    expect(slugs(filterCatalog(fixtureCards, { line: 'template', sort: 'newest' }))).toEqual([
      'docsmith',
      'launchpad',
      'folio',
    ])
    expect(slugs(filterCatalog(fixtureCards, { line: 'template', type: 'portfolio' }))).toEqual(['folio'])
  })

  it('matches any selected stack and every selected feature', () => {
    expect(slugs(filterCatalog(fixtureCards, { stack: ['fumadocs'] }))).toEqual(['docsmith'])
    const both = filterCatalog(fixtureCards, { features: ['dark-mode', 'figma'], sort: 'popular' })
    expect(slugs(both)).toEqual(['lumen-ui', 'folio'])
  })

  it('caps the starting price in whole dollars', () => {
    expect(filterCatalog(fixtureCards, { maxPrice: 60 }).every((p) => (p.priceFromCents ?? 0) <= 6000)).toBe(true)
  })

  it('sorts by price and by latest release', () => {
    const asc = filterCatalog(fixtureCards, { sort: 'price-asc' })
    expect(asc[0]!.slug).toBe('launchpad')
    expect(filterCatalog(fixtureCards, { sort: 'price-desc' })[0]!.slug).toBe('saas-starter')
    expect(filterCatalog(fixtureCards, { sort: 'updated' })[0]!.slug).toBe('saas-starter')
  })

  it('lists framework and styling facets', () => {
    const facets = facetsOf(fixtureCards)
    expect(facets.stack.map((s) => s.value)).toEqual(expect.arrayContaining(['nextjs', 'tailwind']))
    expect(facets.features).toContain('auth')
  })
})
