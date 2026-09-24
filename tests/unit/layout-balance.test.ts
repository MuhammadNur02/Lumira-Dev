import { describe, expect, it } from 'vitest'
import { justifyRows } from '@/app/(site)/(chrome)/products/[slug]/sections'
import { mobileBases } from '@/components/lumira/bento-bands'

describe('justifyRows (PDP feature grid)', () => {
  it('widens the last tile to close a ragged final row', () => {
    expect(justifyRows([8, 4, 4], 12)).toEqual([8, 4, 12])
    expect(justifyRows([4, 4], 12)).toEqual([4, 8])
    expect(justifyRows([4], 12)).toEqual([12])
  })

  it('widens the previous tile when the next one does not fit', () => {
    expect(justifyRows([8, 8], 12)).toEqual([12, 12])
    expect(justifyRows([4, 8, 8], 12)).toEqual([4, 8, 12])
  })

  it('leaves already-balanced grids alone', () => {
    expect(justifyRows([8, 4, 4, 8], 12)).toEqual([8, 4, 4, 8])
    expect(justifyRows([4, 4, 4], 12)).toEqual([4, 4, 4])
    expect(justifyRows([3, 3, 6], 6)).toEqual([3, 3, 6])
  })

  it('keeps every row summing to the column count', () => {
    for (const widths of [[8, 4, 4], [4, 8, 8], [4, 4, 4, 4], [8, 8, 4], [4]]) {
      const out = justifyRows(widths, 12)
      let row = 0
      for (const w of out) {
        row += w
        expect(row).toBeLessThanOrEqual(12)
        if (row === 12) row = 0
      }
      expect(row).toBe(0)
    }
  })
})

describe('mobileBases (home bento on phones)', () => {
  const t = (kind: string) => ({ kind, stack: null }) as never

  it('pairs consecutive stat tiles two by two', () => {
    expect(mobileBases([t('allAccessPromo'), t('stat'), t('stat')])).toEqual([4, 2, 2])
  })

  it('gives a lone stat tile the full width', () => {
    expect(mobileBases([t('featuredProduct'), t('stat'), t('docsTeaser')])).toEqual([4, 4, 4])
  })

  it('makes the odd one out in a run full width', () => {
    expect(mobileBases([t('stat'), t('stat'), t('stat')])).toEqual([2, 2, 4])
  })
})
