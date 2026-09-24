import { describe, expect, it } from 'vitest'
import { centroid, fallbackPreset, validateBands, type Band } from './index'

// SG §4.3 worked example
const leadLeft: Band = {
  preset: 'lead-left',
  rows: 2,
  tiles: [
    { kind: 'featuredProduct', cols: 8, rows: 2, hero: true },
    { kind: 'stat', cols: 4, rows: 2 },
  ],
}
const goldenRight: Band = {
  preset: 'golden-right',
  rows: 2,
  tiles: [
    { kind: 'testimonial', cols: 5, rows: 2 },
    { kind: 'video', cols: 7, rows: 2 },
  ],
}
const goldenLeft: Band = {
  preset: 'golden-left',
  rows: 2,
  tiles: [
    { kind: 'video', cols: 7, rows: 2 },
    { kind: 'docsTeaser', cols: 5, rows: 2 },
  ],
}

describe('centroid (SG §4.3)', () => {
  it('matches the worked example', () => {
    expect(centroid(leadLeft)).toBeCloseTo(5.71, 2)
    expect(centroid(goldenRight)).toBeCloseTo(6.5, 2)
    expect(centroid(goldenLeft)).toBeCloseTo(5.3, 2)
  })

  it('weights stacked composites by their children', () => {
    const stacked: Band = {
      preset: 'stacked-right',
      rows: 2,
      tiles: [
        { kind: 'featuredProduct', cols: 7, rows: 2, hero: true },
        {
          kind: 'stat',
          cols: 5,
          rows: 2,
          stack: [
            { kind: 'stat', cols: 5, rows: 1 },
            { kind: 'testimonial', cols: 5, rows: 1 },
          ],
        },
      ],
    }
    // left: 7*2*1 = 14 at x=3.5 · right: 5*1*0.8 + 5*1*0.7 = 7.5 at x=9.5
    expect(centroid(stacked)).toBeCloseTo((3.5 * 14 + 9.5 * 7.5) / 21.5, 6)
  })
})

describe('validateBands (R1–R5)', () => {
  it('accepts the balanced worked example (mean 6.11)', () => {
    expect(validateBands([leadLeft, goldenRight])).toEqual([])
  })

  it('rejects two bands leaning left (mean 5.51)', () => {
    expect(validateBands([leadLeft, goldenLeft])).toEqual(['bands 0–1: both lean left (centroids 5.71 and 5.30)'])
  })

  it('rejects a repeated preset', () => {
    const errors = validateBands([leadLeft, { ...leadLeft }])
    expect(errors).toContain('band 1: repeats preset "lead-left"')
  })

  it('rejects a 13-column band', () => {
    const wide: Band = {
      ...goldenRight,
      tiles: [
        { kind: 'testimonial', cols: 6, rows: 2 },
        { kind: 'video', cols: 7, rows: 2 },
      ],
    }
    expect(validateBands([wide])).toContain('band 0: columns sum to 13, expected 12')
  })

  it('rejects two heroes in one band', () => {
    const twoHeroes: Band = {
      preset: 'golden-left',
      rows: 2,
      tiles: [
        { kind: 'featuredProduct', cols: 7, rows: 2, hero: true },
        { kind: 'featuredProduct', cols: 5, rows: 2, hero: true },
      ],
    }
    expect(validateBands([twoHeroes])).toContain('band 0: more than one hero tile')
  })

  it('rejects a hero smaller than twice the smallest tile', () => {
    const weakHero: Band = {
      preset: 'golden-left',
      rows: 2,
      tiles: [
        { kind: 'featuredProduct', cols: 7, rows: 2, hero: true },
        { kind: 'stat', cols: 5, rows: 2 },
      ],
    }
    expect(validateBands([weakHero])).toContain('band 0: hero must be at least 2× the smallest tile')
  })

  it('rejects more than four tiles', () => {
    const crowded: Band = {
      preset: 'rhythm',
      rows: 1,
      tiles: Array.from({ length: 6 }, () => ({ kind: 'stat' as const, cols: 2, rows: 1 })),
    }
    expect(validateBands([crowded])).toContain('band 0: more than 4 tiles')
  })

  it('rejects tiles that do not span the band height', () => {
    const short: Band = {
      ...goldenRight,
      tiles: [
        { kind: 'testimonial', cols: 5, rows: 1 },
        { kind: 'video', cols: 7, rows: 2 },
      ],
    }
    expect(validateBands([short])).toContain('band 0: a tile spans 1 rows, band has 2')
  })

  it('accepts stacked composites whose children sum to the band height', () => {
    const stacked: Band = {
      preset: 'stacked-left',
      rows: 2,
      tiles: [
        {
          kind: 'stat',
          cols: 5,
          rows: 2,
          stack: [
            { kind: 'stat', cols: 5, rows: 1 },
            { kind: 'stat', cols: 5, rows: 1 },
          ],
        },
        { kind: 'featuredProduct', cols: 7, rows: 2 },
      ],
    }
    expect(validateBands([stacked])).toEqual([])
  })

  it('allows rhythm at most once per page', () => {
    const rhythm: Band = {
      preset: 'rhythm',
      rows: 1,
      tiles: [
        { kind: 'stat', cols: 4, rows: 1 },
        { kind: 'stat', cols: 4, rows: 1 },
        { kind: 'stat', cols: 4, rows: 1 },
      ],
    }
    expect(validateBands([rhythm, goldenRight, rhythm])).toContain('the rhythm preset is used more than once')
  })

  it('accepts an empty page', () => {
    expect(validateBands([])).toEqual([])
  })
})

describe('fallbackPreset', () => {
  it('alternates lead-left and golden-right', () => {
    expect([0, 1, 2, 3].map(fallbackPreset)).toEqual(['lead-left', 'golden-right', 'lead-left', 'golden-right'])
  })
})

describe('balance edge cases', () => {
  it('rejects a pair whose mean centroid leaves 6 ± 0.5', () => {
    const farLeft: Band = {
      preset: 'feature-left',
      rows: 2,
      tiles: [
        { kind: 'allAccessPromo', cols: 6, rows: 2, hero: true },
        { kind: 'stackBadges', cols: 3, rows: 2 },
        { kind: 'changelogTeaser', cols: 3, rows: 2 },
      ],
    }
    const alsoLeft: Band = {
      preset: 'lead-left',
      rows: 2,
      tiles: [
        { kind: 'featuredProduct', cols: 8, rows: 2, hero: true },
        { kind: 'docsTeaser', cols: 4, rows: 2 },
      ],
    }
    expect(validateBands([farLeft, alsoLeft]).some((e) => e.includes('outside 6 ± 0.5'))).toBe(true)
  })

  it('treats near-symmetric bands as neutral', () => {
    const rhythm: Band = {
      preset: 'rhythm',
      rows: 1,
      tiles: [
        { kind: 'stat', cols: 4, rows: 1 },
        { kind: 'stat', cols: 4, rows: 1 },
        { kind: 'stat', cols: 4, rows: 1 },
      ],
    }
    expect(validateBands([leadLeft, rhythm])).toEqual([])
  })

  it('rejects two bands leaning right', () => {
    const leadRight: Band = {
      preset: 'lead-right',
      rows: 2,
      tiles: [
        { kind: 'stat', cols: 4, rows: 2 },
        { kind: 'featuredProduct', cols: 8, rows: 2, hero: true },
      ],
    }
    expect(validateBands([leadRight, goldenRight])[0]).toMatch(/both lean right/)
  })
})
