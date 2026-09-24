// Bento Grid 2.0 composition rules (StyleGuide §4.3). Shared by the storefront renderer and by
// Sanity Studio validation, so an editor cannot publish a band the site would reject.

export type TileKind =
  | 'featuredProduct'
  | 'video'
  | 'allAccessPromo'
  | 'stat'
  | 'testimonial'
  | 'changelogTeaser'
  | 'docsTeaser'
  | 'stackBadges'

export type BandTile = { kind: TileKind; cols: number; rows: number; hero?: boolean; stack?: BandTile[] }
export type Band = { preset: string; rows: 1 | 2 | 3; tiles: BandTile[] }

export const PRESETS = [
  'lead-left',
  'lead-right',
  'golden-left',
  'golden-right',
  'feature-left',
  'feature-right',
  'stacked-right',
  'stacked-left',
  'centered',
  'rhythm',
] as const
export type Preset = (typeof PRESETS)[number]

/**
 * Desktop column spans per preset, left to right (SG §4.3 table). A `stacked` slot holds two
 * 1-row tiles in one column span.
 */
export const PRESET_SPANS: Record<Preset, { cols: number[]; stackedSlot?: number; rows: (1 | 2 | 3)[] }> = {
  'lead-left': { cols: [8, 4], rows: [2, 3] },
  'lead-right': { cols: [4, 8], rows: [2, 3] },
  'golden-left': { cols: [7, 5], rows: [2] },
  'golden-right': { cols: [5, 7], rows: [2] },
  'feature-left': { cols: [6, 3, 3], rows: [2] },
  'feature-right': { cols: [3, 3, 6], rows: [2] },
  'stacked-right': { cols: [7, 5], stackedSlot: 1, rows: [2] },
  'stacked-left': { cols: [5, 7], stackedSlot: 0, rows: [2] },
  centered: { cols: [3, 6, 3], rows: [2] },
  rhythm: { cols: [4, 4, 4], rows: [1, 2] },
}

/** Tablet (6-column) spans, same order as PRESET_SPANS (SG §4.3). */
export const TABLET_SPANS: Record<Preset, number[]> = {
  'lead-left': [4, 2],
  'lead-right': [2, 4],
  'golden-left': [4, 2],
  'golden-right': [2, 4],
  'feature-left': [6, 3, 3],
  'feature-right': [3, 3, 6],
  'stacked-right': [4, 2],
  'stacked-left': [2, 4],
  centered: [6, 3, 3],
  rhythm: [2, 2, 2],
}

export const EMPHASIS: Record<TileKind, number> = {
  allAccessPromo: 1.2,
  featuredProduct: 1,
  video: 1,
  stat: 0.8,
  testimonial: 0.7,
  changelogTeaser: 0.6,
  docsTeaser: 0.6,
  stackBadges: 0.6,
}

/** Minimum desktop spans per tile kind (SG §4.4): [cols, rows]. */
export const MIN_SPAN: Record<TileKind, [number, number]> = {
  featuredProduct: [5, 2],
  stat: [3, 1],
  testimonial: [4, 2],
  stackBadges: [4, 1],
  changelogTeaser: [4, 2],
  docsTeaser: [5, 2],
  allAccessPromo: [4, 2],
  video: [5, 2],
}

const mass = (t: BandTile): number =>
  t.stack ? t.stack.reduce((sum, c) => sum + t.cols * c.rows * EMPHASIS[c.kind], 0) : t.cols * t.rows * EMPHASIS[t.kind]

/** Weighted horizontal centroid of a band on a 0–12 axis (6 = page center). */
export function centroid(band: Band): number {
  let x = 0
  let moment = 0
  let total = 0
  for (const t of band.tiles) {
    const m = mass(t)
    moment += (x + t.cols / 2) * m
    total += m
    x += t.cols
  }
  return moment / total
}

/** -1 leans left, 1 leans right, 0 is balanced (within 0.1 of the page center). */
const lean = (c: number): -1 | 0 | 1 => (Math.abs(c - 6) <= 0.1 ? 0 : c < 6 ? -1 : 1)

/** Rules R1–R5. Returns human-readable errors; an empty array means the page is balanced. */
export function validateBands(bands: Band[]): string[] {
  const errors: string[] = []
  const area = (t: BandTile) => t.cols * t.rows

  bands.forEach((band, i) => {
    const cols = band.tiles.reduce((s, t) => s + t.cols, 0)
    if (cols !== 12) errors.push(`band ${i}: columns sum to ${cols}, expected 12`)
    if (band.tiles.length > 4) errors.push(`band ${i}: more than 4 tiles`)

    for (const t of band.tiles) {
      const rows = t.stack ? t.stack.reduce((s, c) => s + c.rows, 0) : t.rows
      if (rows !== band.rows) errors.push(`band ${i}: a tile spans ${rows} rows, band has ${band.rows}`)
    }

    const heroes = band.tiles.filter((t) => t.hero)
    if (heroes.length > 1) errors.push(`band ${i}: more than one hero tile`)
    const hero = heroes[0]
    if (hero && area(hero) < 2 * Math.min(...band.tiles.map(area))) {
      errors.push(`band ${i}: hero must be at least 2× the smallest tile`)
    }

    const prev = bands[i - 1]
    if (prev) {
      if (prev.preset === band.preset) errors.push(`band ${i}: repeats preset "${band.preset}"`)
      const [a, b] = [centroid(prev), centroid(band)]
      const mean = (a + b) / 2
      if (Math.abs(mean - 6) > 0.5) {
        errors.push(`bands ${i - 1}–${i}: centroid ${mean.toFixed(2)} is outside 6 ± 0.5`)
      } else if (lean(a) !== 0 && lean(a) === lean(b)) {
        // R3 "alternate their heavy side". The SG §4.3 worked example rejects 5.71 / 5.30 (mean 5.51)
        // "because both bands lean left", although 5.51 sits inside 6 ± 0.5, so the alternation is
        // checked explicitly. Near-symmetric bands (±0.1) are neutral and pair with anything.
        errors.push(
          `bands ${i - 1}–${i}: both lean ${lean(a) < 0 ? 'left' : 'right'} (centroids ${a.toFixed(2)} and ${b.toFixed(2)})`,
        )
      }
    }
  })

  if (bands.filter((b) => b.preset === 'rhythm').length > 1) errors.push('the rhythm preset is used more than once')
  return errors
}

/**
 * Render-time fallback (FR-SF-01, Task.md P3.03): when a page fails validation, alternate
 * `lead-left` / `golden-right` and keep the tiles in their original order.
 */
export function fallbackPreset(index: number): 'lead-left' | 'golden-right' {
  return index % 2 === 0 ? 'lead-left' : 'golden-right'
}
