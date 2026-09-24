import { fallbackPreset, PRESET_SPANS, TABLET_SPANS, validateBands, type Band, type Preset } from '@lumira/bento'
import type { BandDoc, ChangelogEntry, ProductCard, SiteSettings, TileDoc } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'
import { BentoGrid, LG_COLS, MD_COLS, ROWS, type Span } from './bento'
import { AllAccessTile } from './tiles/all-access-tile'
import { ChangelogTeaserTile } from './tiles/changelog-teaser-tile'
import { DocsTeaserTile } from './tiles/docs-teaser-tile'
import { FeaturedProductTile } from './tiles/featured-product-tile'
import { StackBadgesTile } from './tiles/stack-badges-tile'
import { StatTile } from './tiles/stat-tile'
import { TestimonialTile } from './tiles/testimonial-tile'
import { VideoTile } from './tiles/video-tile'

type Context = {
  catalog: ProductCard[]
  changelog: ChangelogEntry[]
  settings: SiteSettings
}

const LG = new Set([3, 4, 5, 6, 7, 8, 12])
const MD = new Set([2, 3, 4, 6])

const toBand = (b: BandDoc): Band => ({
  preset: b.preset,
  rows: b.rows,
  tiles: b.tiles.map((t) => ({
    kind: t.kind,
    cols: t.cols,
    rows: t.rows,
    hero: t.hero ?? undefined,
    stack: t.stack?.length ? t.stack.map((s) => ({ kind: s.kind, cols: t.cols, rows: s.rows })) : undefined,
  })),
})

/**
 * Render-time fallback (FR-SF-01): tiles keep their order and are regrouped in pairs that alternate
 * `lead-left` (8 · 4) and `golden-right` (5 · 7), two rows each.
 */
export function fallbackBands(bands: BandDoc[]): BandDoc[] {
  const tiles = bands.flatMap((b) => b.tiles.flatMap((t) => (t.stack?.length ? (t.stack as TileDoc[]) : [t])))
  const out: BandDoc[] = []
  for (let i = 0; i < tiles.length; i += 2) {
    const pair = tiles.slice(i, i + 2)
    const preset = fallbackPreset(out.length)
    const cols = pair.length === 1 ? [12] : PRESET_SPANS[preset].cols
    out.push({
      _key: `fallback-${i}`,
      preset,
      rows: 2,
      tiles: pair.map((t, j) => ({
        ...t,
        cols: cols[j]!,
        rows: 2,
        hero: preset === 'lead-left' && j === 0,
        stack: null,
      })),
    })
  }
  return out
}

/**
 * Mobile (4-col) widths: stat tiles pair up two-by-two in half-width rows. A run of consecutive
 * stat tiles with an odd count gives its last tile the full width, so a stat never sits alone
 * beside an empty half row (e.g. a lone "Catalog" stat between two full-width tiles).
 */
export function mobileBases(tiles: Pick<TileDoc, 'kind' | 'stack'>[]): (2 | 4)[] {
  const bases: (2 | 4)[] = tiles.map(() => 4)
  let run: number[] = []
  const flush = () => {
    const paired = run.length - (run.length % 2)
    run.forEach((idx, j) => (bases[idx] = j < paired ? 2 : 4))
    run = []
  }
  tiles.forEach((tile, i) => {
    if (tile.kind === 'stat' && !tile.stack?.length) run.push(i)
    else flush()
  })
  flush()
  return bases
}

function spanFor(
  preset: Preset,
  index: number,
  tile: Pick<TileDoc, 'kind' | 'cols'>,
  rows: 1 | 2 | 3,
  base: 2 | 4 = 4,
): Span {
  const md = TABLET_SPANS[preset]?.[index]
  return {
    base,
    md: (md && MD.has(md) ? md : 6) as Span['md'],
    lg: (LG.has(tile.cols) ? tile.cols : 12) as Span['lg'],
    rows,
  }
}

function statValue(tile: TileDoc, ctx: Context): string {
  switch (tile.stat?.source) {
    case 'assetCount':
      return String(ctx.catalog.length)
    case 'releaseCount':
      return String(ctx.changelog.filter((r) => r.status === 'published').length)
    default:
      return tile.stat?.value ?? '—'
  }
}

function renderTile(tile: TileDoc | Omit<TileDoc, 'cols' | 'stack'>, span: Span, ctx: Context, first: boolean) {
  switch (tile.kind) {
    case 'featuredProduct':
      return tile.product ? (
        <FeaturedProductTile product={tile.product} span={span} hero={Boolean(tile.hero)} priority={first} />
      ) : null
    case 'stat':
      return (
        <StatTile
          span={span}
          eyebrow={tile.eyebrow}
          value={statValue(tile as TileDoc, ctx)}
          label={tile.stat?.label ?? ''}
        />
      )
    case 'testimonial':
      return tile.testimonial ? <TestimonialTile testimonial={tile.testimonial} span={span} /> : null
    case 'stackBadges': {
      const stack =
        tile.product?.stack ??
        [...new Map(ctx.catalog.flatMap((p) => p.stack).map((s) => [s.slug, s])).values()].slice(0, 8)
      return <StackBadgesTile span={span} eyebrow={tile.eyebrow} title={tile.title} stack={stack} />
    }
    case 'changelogTeaser':
      return (
        <ChangelogTeaserTile
          span={span}
          eyebrow={tile.eyebrow}
          title={tile.title}
          releases={ctx.changelog.filter((r) => r.status === 'published')}
        />
      )
    case 'docsTeaser':
      return (
        <DocsTeaserTile
          span={span}
          eyebrow={tile.eyebrow}
          title={tile.title}
          body={tile.body}
          snippet={tile.snippet ?? 'npx lumira@latest activate'}
          href={tile.href ?? (tile.product ? `/docs/${tile.product.slug}` : '/docs')}
        />
      )
    case 'allAccessPromo':
      return (
        <AllAccessTile
          span={span}
          title={tile.title}
          body={tile.body}
          pass={ctx.settings.allAccess}
          assetCount={ctx.catalog.length}
        />
      )
    case 'video':
      return tile.video ? (
        <VideoTile span={span} src={tile.video} poster={tile.poster} eyebrow={tile.eyebrow} title={tile.title} />
      ) : null
    default:
      return null
  }
}

/** Home Bento hero (FR-SF-01): Sanity bands → presets, validated again at render (SG §4.3). */
export function BentoBands({ bands, ...ctx }: { bands: BandDoc[] } & Context) {
  const errors = validateBands(bands.map(toBand))
  if (errors.length) {
    // Never ship a broken layout: regroup and report (Task.md P3.03).
    console.warn(JSON.stringify({ level: 'warn', msg: 'bento_bands_invalid', errors }))
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import('@sentry/nextjs').then((Sentry) =>
        Sentry.captureMessage(`Home bands failed validation: ${errors.join('; ')}`, 'warning'),
      )
    }
  }
  const render = errors.length ? fallbackBands(bands) : bands

  // The first featured product is the LCP candidate: eager, high priority (P3.05).
  const lcpKey = render.flatMap((b) => b.tiles).find((t) => t.kind === 'featuredProduct' && t.product)?._key
  return (
    <div className="flex flex-col gap-(--bento-gap)">
      {render.map((band) => {
        const bases = mobileBases(band.tiles)
        return (
          <BentoGrid key={band._key} data-preset={band.preset}>
            {band.tiles.map((tile, i) => {
              const span = spanFor(band.preset, i, tile, band.rows, bases[i])
              if (tile.stack?.length) {
                return (
                  <div
                    key={tile._key}
                    className={cn(
                      'col-span-4 flex flex-col gap-(--bento-gap) [&>*]:flex-1',
                      span.md && MD_COLS[span.md],
                      LG_COLS[span.lg],
                      ROWS[band.rows],
                    )}
                  >
                    {tile.stack.map((child) => (
                      <div key={child._key} className="contents">
                        {renderTile(child, { base: 4, lg: 12 }, ctx, false)}
                      </div>
                    ))}
                  </div>
                )
              }
              return <Slot key={tile._key}>{renderTile(tile, span, ctx, tile._key === lcpKey)}</Slot>
            })}
          </BentoGrid>
        )
      })}
    </div>
  )
}

function Slot({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
