import { validateBands } from '@lumira/bento'
import { describe, expect, it } from 'vitest'
import { fixtureCards, fixtureChangelog, fixtureHome, fixtureProducts } from '@/lib/sanity/fixtures'

describe('seed content', () => {
  it('home bands pass the Bento composition rules (StyleGuide §4.3)', () => {
    const bands = fixtureHome.bands.map((b) => ({
      preset: b.preset,
      rows: b.rows,
      tiles: b.tiles.map((t) => ({ kind: t.kind, cols: t.cols, rows: t.rows, hero: t.hero ?? undefined })),
    }))
    expect(validateBands(bands)).toEqual([])
  })

  it('every product has three license tiers with unique variant ids', () => {
    const ids = fixtureProducts.flatMap((p) => p.licenses.map((l) => l.lsVariantId))
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of fixtureProducts) expect(p.licenses.map((l) => l.tier)).toEqual(['personal', 'team', 'extended'])
  })

  it('derives the latest release from the changelog', () => {
    const saas = fixtureCards.find((p) => p.slug === 'saas-starter')!
    expect(saas.latestRelease?.version).toBe('2.3.1')
    expect(fixtureChangelog[0]!.releasedAt >= fixtureChangelog.at(-1)!.releasedAt).toBe(true)
  })

  it('never ships fabricated testimonials', () => {
    expect(fixtureHome.testimonials).toEqual([])
  })
})
