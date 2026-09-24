import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MonitorSmartphone } from 'lucide-react'
import { CheckoutButton } from '@/components/commerce/checkout-button'
import { PriceTag } from '@/components/lumira/price-tag'
import { SectionHeader } from '@/components/lumira/section-header'
import { ProductCard } from '@/components/lumira/product-card'
import { PageTransition } from '@/components/motion/page-transition'
import { formatPrice, TIER_LABEL } from '@/lib/format'
import { getBundle, getBundles } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export async function generateStaticParams() {
  const bundles = await getBundles()
  return bundles.length ? bundles.map((b) => ({ slug: b.slug })) : [{ slug: '__placeholder__' }]
}

export async function generateMetadata({ params }: PageProps<'/bundles/[slug]'>): Promise<Metadata> {
  const bundle = await getBundle((await params).slug)
  if (!bundle) return { title: 'Bundle' }
  return buildMetadata({
    title: bundle.name,
    description: bundle.tagline ?? `${bundle.name} bundle`,
    path: `/bundles/${bundle.slug}`,
    seo: bundle.seo,
  })
}

/** Bundle page (FR-SF-12): included assets with preview links and savings versus individual prices. */
export default async function BundlePage({ params }: PageProps<'/bundles/[slug]'>) {
  const bundle = await getBundle((await params).slug)
  if (!bundle) notFound()
  const separate = bundle.includes.reduce(
    (sum, p) => sum + (p.licenses.find((l) => l.tier === bundle.tier)?.priceCents ?? 0),
    0,
  )
  const savings = bundle.priceCents != null && separate > bundle.priceCents ? separate - bundle.priceCents : 0

  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto grid max-w-[80rem] gap-10 px-4 pt-16 pb-12 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8 lg:pt-24">
          <SectionHeader
            as="h1"
            eyebrow={`Bundle · ${TIER_LABEL[bundle.tier]} license`}
            title={bundle.name}
            lead={bundle.tagline}
          />
          <div className="bento-surface flex h-fit flex-col gap-4 p-6">
            <PriceTag cents={bundle.priceCents} original={separate || null} className="text-metric" />
            {savings > 0 ? (
              <p className="text-caption text-success">Save {formatPrice(savings)} versus buying separately.</p>
            ) : null}
            <CheckoutButton variantId={bundle.lsVariantId} fallbackUrl={bundle.buyUrl} className="w-full">
              Buy bundle
            </CheckoutButton>
            <p className="text-micro text-muted-foreground">
              One license key per asset. Tax/VAT calculated at checkout.
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[80rem] flex-col gap-6 px-4 pb-24 sm:px-6 lg:px-8">
        <h2 className="eyebrow">Included</h2>
        <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-3">
          {bundle.includes.map((p) => (
            <div key={p._id} className="flex flex-col gap-2">
              <ProductCard product={p} morph={false} />
              <Link
                href={`/products/${p.slug}/preview?entry=card`}
                transitionTypes={['nav-forward']}
                className="inline-flex w-fit items-center gap-1.5 rounded-sm px-2 text-caption text-brand-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <MonitorSmartphone className="size-3.5" aria-hidden /> Live Preview
              </Link>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
