import Link from 'next/link'
import type { Route } from 'next'
import { ArrowRight, BookOpen, Check, Minus } from 'lucide-react'
import { BentoGrid, BentoTile, TileEyebrow } from '@/components/lumira/bento'
import { InlineText } from '@/components/lumira/inline-text'
import { NewBadge, RelativeTime } from '@/components/lumira/relative-time'
import { StackBadge } from '@/components/lumira/stack-badge'
import { VersionPill } from '@/components/lumira/version-pill'
import { activationLabel, type PurchaseOption } from '@/components/commerce/purchase'
import { formatPrice, releaseAnchor, TIER_LABEL } from '@/lib/format'
import type { ChangelogEntry, FeatureTile, ProductDetail } from '@/lib/sanity/models'

export function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <header id={id} className="flex scroll-mt-28 flex-col gap-2">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="text-heading-2 text-balance">{title}</h2>
    </header>
  )
}

const FEATURE_SPAN = { lg: { md: 6, lg: 8 }, md: { md: 3, lg: 4 }, sm: { md: 3, lg: 4 } } as const

/**
 * Greedy row justification: when the next tile does not fit the current row, or the grid ends
 * mid-row, the previous tile widens to close the gap. Editors pick sizes freely in Sanity and the
 * grid never shows a hole (e.g. [8, 4, 4] on 12 columns becomes [8, 4, 12]). Every result is a sum
 * of the input spans, so it stays on the 4/8/12 (lg) and 3/6 (md) scales.
 */
export function justifyRows(widths: number[], cols: number): number[] {
  const out = [...widths]
  let used = 0
  out.forEach((w, i) => {
    if (used > 0 && used + w > cols) {
      out[i - 1]! += cols - used
      used = 0
    }
    used += w
    if (used === cols) used = 0
  })
  if (used > 0) out[out.length - 1]! += cols - used
  return out
}

/** Bento feature grid (FR-SF-07). Sizes come from Sanity; rows are justified so none is ragged. */
export function FeatureGrid({ features }: { features: FeatureTile[] }) {
  if (!features.length) return null
  const sizes = features.map((f) => FEATURE_SPAN[f.size ?? 'md'])
  const lg = justifyRows(
    sizes.map((s) => s.lg),
    12,
  )
  const md = justifyRows(
    sizes.map((s) => s.md),
    6,
  )
  return (
    <BentoGrid className="md:auto-rows-auto lg:grid-cols-12">
      {features.map((f, i) => {
        return (
          <BentoTile key={f.title} span={{ md: md[i] as 3 | 6, lg: lg[i] as 4 | 8 | 12 }} className="min-h-40 gap-3">
            {f.eyebrow ? <TileEyebrow>{f.eyebrow}</TileEyebrow> : null}
            <h3 className="text-heading-4 text-balance">{f.title}</h3>
            {f.body ? (
              <p className="text-body-sm text-pretty text-muted-foreground">
                <InlineText text={f.body} />
              </p>
            ) : null}
          </BentoTile>
        )
      })}
    </BentoGrid>
  )
}

/** Stack & versions from the latest release's compatibility (FR-SF-07). */
export function StackTable({ product }: { product: ProductDetail }) {
  const compat = product.latestRelease?.compatibility
  const rows = [
    { label: 'Next.js', value: compat?.next },
    { label: 'React', value: compat?.react },
    { label: 'Tailwind CSS', value: compat?.tailwind },
    { label: 'Node.js', value: compat?.node },
  ].filter((r) => r.value)
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-wrap gap-2" aria-label="Stack">
        {product.stack.map((s) => (
          <li key={s.slug}>
            <StackBadge item={s} />
          </li>
        ))}
      </ul>
      {rows.length ? (
        <div className="overflow-hidden rounded-xl border border-bento-border">
          <table className="w-full text-body-sm tabular-nums">
            {/* Visible header row: says why this list differs from the stack badges above. */}
            <caption className="caption-top border-b border-border px-4 py-3 text-left text-caption text-muted-foreground">
              Tested with v{product.latestRelease?.version}
            </caption>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <th scope="row" className="h-11 px-4 text-left font-normal text-muted-foreground">
                    {r.label}
                  </th>
                  <td className="h-11 px-4 text-right font-mono text-micro">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export function FileTree({ tree }: { tree: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-bento-border bg-muted/40 p-5 font-mono text-[13px] leading-6 text-muted-foreground">
      <code>{tree}</code>
    </pre>
  )
}

const LH_LABEL = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  bestPractices: 'Best practices',
  seo: 'SEO',
} as const

/** Demo Lighthouse scores (FR-SF-07): measured in each demo's CI (FR-LP-11). */
export function LighthouseScores({
  scores,
}: {
  scores: NonNullable<NonNullable<ProductDetail['demo']>['lighthouse']>
}) {
  const entries = (Object.keys(LH_LABEL) as (keyof typeof LH_LABEL)[]).filter((k) => scores[k] != null)
  if (!entries.length) return null
  return (
    <dl className="grid grid-cols-2 gap-(--bento-gap) md:grid-cols-4">
      {entries.map((k) => {
        const v = scores[k]!
        return (
          <div key={k} className="bento-surface flex flex-col gap-1 p-5">
            <dt className="text-caption text-muted-foreground">{LH_LABEL[k]}</dt>
            <dd className={`text-metric ${v >= 90 ? 'text-success' : v >= 50 ? 'text-warning' : 'text-destructive'}`}>
              {v}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** License comparison (FR-SF-07): tiers + All-Access, prices synced from Lemon Squeezy (FR-SF-09). */
export function LicenseTable({ options, allAccess }: { options: PurchaseOption[]; allAccess: PurchaseOption | null }) {
  const cols = allAccess ? [...options, allAccess] : options
  const perks = [...new Set(cols.flatMap((c) => c.rights))]
  return (
    <div className="overflow-x-auto rounded-xl border border-bento-border">
      <table className="w-full min-w-[36rem] text-body-sm">
        <caption className="sr-only">License comparison</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="h-12 px-4 text-left text-caption font-normal text-muted-foreground">
              <span className="sr-only">Feature</span>
            </th>
            {cols.map((c) => (
              <th key={c.tier} scope="col" className="h-12 px-4 text-left text-body-sm font-semibold">
                {c.tier === 'all_access' ? 'All-Access' : TIER_LABEL[c.tier]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="h-11 px-4 text-left font-normal text-muted-foreground">
              Price
            </th>
            {cols.map((c) => (
              <td key={c.tier} className="h-11 px-4 font-medium tabular-nums">
                {formatPrice(c.priceCents)}
                {c.interval ? (
                  <span className="text-micro text-muted-foreground">/{c.interval === 'month' ? 'mo' : 'yr'}</span>
                ) : null}
              </td>
            ))}
          </tr>
          <tr className="border-b border-border">
            <th scope="row" className="h-11 px-4 text-left font-normal text-muted-foreground">
              Activations
            </th>
            {cols.map((c) => (
              <td key={c.tier} className="h-11 px-4 tabular-nums">
                {activationLabel(c.activationLimit)}
              </td>
            ))}
          </tr>
          {perks.map((perk) => (
            <tr key={perk} className="border-b border-border last:border-0">
              <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                {perk}
              </th>
              {cols.map((c) => (
                <td key={c.tier} className="px-4 py-3">
                  {c.rights.includes(perk) ? (
                    <Check className="size-4 text-success" aria-label="Included" />
                  ) : (
                    <Minus className="size-4 text-muted-foreground" aria-label="Not included" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChangelogExcerpt({ slug, releases }: { slug: string; releases: ChangelogEntry[] }) {
  if (!releases.length) return null
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col divide-y divide-border rounded-xl border border-bento-border">
        {releases.map((r) => (
          <li key={r._id} className="flex flex-col gap-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <VersionPill version={r.version} />
              <NewBadge date={r.releasedAt} />
              {r.status === 'withdrawn' ? <span className="text-micro text-destructive">Withdrawn</span> : null}
              <RelativeTime date={r.releasedAt} className="ml-auto text-micro text-muted-foreground" />
            </div>
            <h3 className="text-heading-4">{r.title}</h3>
            <p className="text-body-sm text-pretty text-muted-foreground">{r.summary}</p>
          </li>
        ))}
      </ol>
      <Link
        href={`/products/${slug}/changelog#${releaseAnchor(slug, releases[0]!.version)}`}
        transitionTypes={['nav-forward']}
        className="inline-flex w-fit items-center gap-1 rounded-sm text-caption text-brand-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Full changelog <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

const DOCS_LINKS: Record<ProductDetail['line'], { path: string; label: string }[]> = {
  boilerplate: [
    { path: '', label: 'Getting started' },
    { path: '/installation', label: 'Installation' },
    { path: '/environment', label: 'Environment variables' },
    { path: '/activation', label: 'Activating your license' },
    { path: '/deployment', label: 'Deployment' },
  ],
  ui_kit: [
    { path: '', label: 'Overview' },
    { path: '/registry', label: 'Registry install' },
    { path: '/theming', label: 'Theming' },
  ],
  template: [
    { path: '', label: 'Setup' },
    { path: '/editing-content', label: 'Editing content' },
    { path: '/deploy', label: 'Deploy' },
  ],
}

export function DocsLinks({ slug, line }: { slug: string; line: ProductDetail['line'] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {DOCS_LINKS[line].map((l) => (
        <li key={l.path}>
          <Link
            href={`/docs/${slug}${l.path}` as Route}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-bento-border px-4 text-body-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <BookOpen className="size-4 text-muted-foreground" aria-hidden /> {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}
