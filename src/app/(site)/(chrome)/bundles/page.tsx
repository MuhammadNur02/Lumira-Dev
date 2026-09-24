import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BentoGrid, BentoTile, TileDescription, TileEyebrow, TileTitle } from '@/components/lumira/bento'
import { PriceTag } from '@/components/lumira/price-tag'
import { SectionHeader } from '@/components/lumira/section-header'
import { PageTransition } from '@/components/motion/page-transition'
import { TIER_LABEL } from '@/lib/format'
import { getBundles } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Bundles',
  description: 'Curated sets of Lumira assets at a lower price than buying each one.',
  path: '/bundles',
})

export default async function BundlesPage() {
  const bundles = await getBundles()
  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto max-w-[80rem] px-4 pt-16 pb-10 sm:px-6 lg:px-8 lg:pt-24">
          <SectionHeader
            as="h1"
            eyebrow="Bundles"
            title="Buy the set, save on each."
            lead="Several assets in one checkout, each with its own license key."
          />
        </div>
      </div>
      <div className="mx-auto max-w-[80rem] px-4 pb-24 sm:px-6 lg:px-8">
        <BentoGrid>
          {bundles.map((b) => (
            <BentoTile key={b._id} span={{ md: 6, lg: 6, rows: 2 }} interactive className="justify-between gap-6">
              <div className="flex flex-col gap-2">
                <TileEyebrow>
                  {b.includes.length} assets · {TIER_LABEL[b.tier]} license
                </TileEyebrow>
                <Link
                  href={`/bundles/${b.slug}`}
                  transitionTypes={['nav-forward']}
                  className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                >
                  <TileTitle>{b.name}</TileTitle>
                </Link>
                {b.tagline ? <TileDescription>{b.tagline}</TileDescription> : null}
              </div>
              <div className="flex items-end justify-between">
                <PriceTag cents={b.priceCents} className="text-body-lg" />
                <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
              </div>
            </BentoTile>
          ))}
        </BentoGrid>
      </div>
    </PageTransition>
  )
}
