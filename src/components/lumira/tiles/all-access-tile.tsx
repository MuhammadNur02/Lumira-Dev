import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import type { SiteSettings } from '@/lib/sanity/models'
import { BentoTile, TileEyebrow, TileTitle, type Span } from '../bento'
import { BorderBeam } from '../border-beam'

/**
 * allAccessPromo (SG §4.4): the one brand-filled tile per viewport (R7) with the border beam. Plan
 * price and the live asset count come from Sanity and the catalog.
 */
export function AllAccessTile({
  title,
  body,
  pass,
  assetCount,
  span,
}: {
  title?: string | null
  body?: string | null
  pass: SiteSettings['allAccess']
  assetCount: number
  span: Span
}) {
  const monthly = pass?.monthly?.priceCents
  return (
    <BentoTile
      span={span}
      tone="brand"
      interactive
      padding="lg"
      className="min-h-[280px] justify-between gap-6 md:min-h-0"
    >
      <BorderBeam />
      <div className="flex flex-col gap-3">
        <TileEyebrow>All-Access Pass</TileEyebrow>
        <TileTitle>{title ?? 'Every asset. Every release.'}</TileTitle>
        <p className="max-w-[40ch] text-body-sm text-pretty">
          {body ?? `All ${assetCount} assets today and everything we ship next, with Team rights.`}
        </p>
      </div>
      <ul className="grid gap-2 text-body-sm">
        {(pass?.perks ?? []).slice(0, 3).map((perk) => (
          <li key={perk} className="flex items-center gap-2">
            <Check className="size-4 shrink-0" aria-hidden /> {perk}
          </li>
        ))}
      </ul>
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-1">
          <span className="text-metric">{monthly != null ? formatPrice(monthly) : '—'}</span>
          <span className="text-caption">/month</span>
        </p>
        <Link
          href="/all-access"
          transitionTypes={['nav-forward']}
          className="inline-flex items-center gap-1 rounded-sm text-caption font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
        >
          See the pass <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </BentoTile>
  )
}
