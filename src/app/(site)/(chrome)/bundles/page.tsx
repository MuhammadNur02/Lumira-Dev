import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BentoGrid, BentoTile, TileDescription, TileEyebrow, TileTitle } from '@/components/lumira/bento'
import { PriceTag } from '@/components/lumira/price-tag'
import { SectionHeader } from '@/components/lumira/section-header'
import { PageTransition } from '@/components/motion/page-transition'
import { bundleSavings, formatPrice, TIER_LABEL } from '@/lib/format'
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
        <BentoGrid className="md:auto-rows-auto">
          {bundles.map((b) => {
            const { separate, savings, percent } = bundleSavings(b)
            const shown = b.includes.slice(0, 3)
            return (
              <BentoTile key={b._id} span={{ md: 6, lg: 6 }} interactive className="gap-6">
                <div className="flex flex-col gap-2">
                  <TileEyebrow>
                    {b.includes.length} assets · {TIER_LABEL[b.tier]} license
                  </TileEyebrow>
                  <Link
                    href={`/bundles/${b.slug}`}
                    transitionTypes={['nav-forward']}
                    className="after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none"
                  >
                    <TileTitle>{b.name}</TileTitle>
                  </Link>
                  {b.tagline ? <TileDescription>{b.tagline}</TileDescription> : null}
                </div>
                {/* What's inside: the included assets' posters, so the set reads at a glance. */}
                <ul className="grid grid-cols-3 gap-3" aria-label={`Included in ${b.name}`}>
                  {shown.map((p) => (
                    <li key={p._id} className="flex min-w-0 flex-col gap-2">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-bento-border bg-stage">
                        <Image
                          src={p.hero.url}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 12rem, 30vw"
                          className="object-cover object-top"
                        />
                      </div>
                      <span className="truncate text-caption text-muted-foreground">{p.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-end justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <PriceTag cents={b.priceCents} original={separate || null} className="text-body-lg" />
                    {savings > 0 ? (
                      <span className="text-caption text-success">
                        Save {formatPrice(savings)} ({percent}%) versus buying separately
                      </span>
                    ) : null}
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </div>
              </BentoTile>
            )
          })}
        </BentoGrid>
      </div>
    </PageTransition>
  )
}
