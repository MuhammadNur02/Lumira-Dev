import { Suspense, ViewTransition } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { BuyRail, MobileRailSpacer } from '@/components/commerce/buy-rail'
import { OwnershipAwareBuyRail } from '@/components/commerce/ownership-rail'
import { allAccessOption, licenseOptions } from '@/components/commerce/purchase'
import { FaqList } from '@/components/lumira/faq-list'
import { JsonLd } from '@/components/lumira/json-ld'
import { PortableText } from '@/components/lumira/portable-text'
import { PriceTag } from '@/components/lumira/price-tag'
import { ProductGrid } from '@/components/lumira/product-grid'
import { RelativeTime } from '@/components/lumira/relative-time'
import { ThemedImage } from '@/components/lumira/themed-image'
import { TrackView } from '@/components/lumira/track-view'
import { VersionPill } from '@/components/lumira/version-pill'
import { PageTransition } from '@/components/motion/page-transition'
import { env } from '@/lib/env'
import { LINE_LABEL, LINE_PATH } from '@/lib/format'
import { getProduct, getProductSlugs, getSiteSettings } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'
import {
  ChangelogExcerpt,
  DocsLinks,
  FeatureGrid,
  FileTree,
  LicenseTable,
  LighthouseScores,
  SectionTitle,
  StackTable,
} from './sections'

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  // Cache Components needs at least one param to validate the route (empty catalog → 404 placeholder).
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: '__placeholder__' }]
}

export async function generateMetadata({ params }: PageProps<'/products/[slug]'>): Promise<Metadata> {
  const product = await getProduct((await params).slug)
  if (!product) return { title: 'Product not found' }
  return buildMetadata({
    title: product.name,
    description: product.tagline,
    path: `/products/${product.slug}`,
    seo: product.seo,
  })
}

/** Product Detail Page (FR-SF-07…11). Static shell; only the purchase rail streams personal state. */
export default async function ProductPage({ params }: PageProps<'/products/[slug]'>) {
  const { slug } = await params
  const [product, settings] = await Promise.all([getProduct(slug), getSiteSettings()])
  if (!product) notFound()

  const options = licenseOptions(product.licenses)
  const pass = product.inAllAccess ? allAccessOption(settings.allAccess) : null
  const railProduct = {
    slug: product.slug,
    name: product.name,
    inAllAccess: product.inAllAccess,
    demoOrigin: product.demo?.origin ?? null,
  }
  const url = `${env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`
  const categoryPath = LINE_PATH[product.line]

  return (
    <PageTransition>
      <TrackView
        event="product_viewed"
        props={{
          product_slug: product.slug,
          line: product.line,
          price_from_usd: product.priceFromCents == null ? null : product.priceFromCents / 100,
        }}
      />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': ['Product', 'SoftwareApplication'],
            name: product.name,
            description: product.tagline,
            image: product.hero.url.startsWith('http')
              ? product.hero.url
              : `${env.NEXT_PUBLIC_APP_URL}${product.hero.url}`,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Web',
            brand: { '@type': 'Brand', name: 'Lumira' },
            softwareVersion: product.latestRelease?.version,
            offers: options
              .filter((o) => o.priceCents != null)
              .map((o) => ({
                '@type': 'Offer',
                name: `${product.name} — ${o.tier} license`,
                price: (o.priceCents! / 100).toFixed(2),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url,
              })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: env.NEXT_PUBLIC_APP_URL },
              {
                '@type': 'ListItem',
                position: 2,
                name: LINE_LABEL[product.line],
                item: `${env.NEXT_PUBLIC_APP_URL}${categoryPath}`,
              },
              { '@type': 'ListItem', position: 3, name: product.name, item: url },
            ],
          },
        ]}
      />

      <div className="hero-glow">
        <div className="mx-auto grid max-w-[80rem] gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 lg:px-8 lg:pt-14">
          <div className="flex min-w-0 flex-col gap-16">
            {/* Hero */}
            <section className="flex flex-col gap-6">
              <nav aria-label="Breadcrumb">
                <Link
                  href={categoryPath}
                  transitionTypes={['nav-back']}
                  className="inline-flex items-center gap-1 rounded-sm text-caption text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <ChevronLeft className="size-4" aria-hidden /> {LINE_LABEL[product.line]}s
                </Link>
              </nav>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow">{product.templateType ?? LINE_LABEL[product.line]}</span>
                  {product.latestRelease ? <VersionPill version={product.latestRelease.version} /> : null}
                  {product.latestRelease ? (
                    <RelativeTime
                      date={product.latestRelease.releasedAt}
                      prefix="Updated"
                      className="text-micro text-muted-foreground"
                    />
                  ) : null}
                </div>
                <ViewTransition name={`product-title-${product.slug}`} share="morph" default="none">
                  <h1 className="text-display-xl text-balance">{product.name}</h1>
                </ViewTransition>
                <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">{product.tagline}</p>
                <PriceTag cents={product.priceFromCents} from className="text-body-lg" />
              </div>
              <ViewTransition name={`product-media-${product.slug}`} share="morph" default="none">
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-bento-border bg-stage shadow-bento">
                  {/* The PDP LCP element: eager, high priority, one variant only (SG §2.4). */}
                  <ThemedImage
                    image={product.hero}
                    fill
                    priority
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-cover object-top"
                  />
                </div>
              </ViewTransition>
              <PortableText value={product.description} className="text-muted-foreground" />
            </section>

            {product.features.length ? (
              <section className="flex flex-col gap-6">
                <SectionTitle eyebrow="Features" title="What's built in" />
                <FeatureGrid features={product.features} />
              </section>
            ) : null}

            <section className="flex flex-col gap-6">
              <SectionTitle eyebrow="Stack" title="Stack & versions" />
              <StackTable product={product} />
            </section>

            {product.fileTree ? (
              <section className="flex flex-col gap-6">
                <SectionTitle eyebrow="What's included" title="Project structure" />
                <FileTree tree={product.fileTree} />
              </section>
            ) : null}

            {product.demo?.lighthouse ? (
              <section className="flex flex-col gap-6">
                <SectionTitle eyebrow="Performance" title="Demo Lighthouse scores" />
                <LighthouseScores scores={product.demo.lighthouse} />
              </section>
            ) : null}

            <section className="flex flex-col gap-6">
              <SectionTitle id="licenses" eyebrow="Licensing" title="Compare licenses" />
              <LicenseTable options={options} allAccess={pass} />
              <p className="text-caption text-muted-foreground">
                Prices in USD. Tax/VAT calculated at checkout. Read the full{' '}
                <Link href="/license" className="text-brand-text underline underline-offset-4">
                  license terms
                </Link>
                .
              </p>
            </section>

            {product.recentReleases.length ? (
              <section className="flex flex-col gap-6">
                <SectionTitle eyebrow="Changelog" title="Recent releases" />
                <ChangelogExcerpt slug={product.slug} releases={product.recentReleases} />
              </section>
            ) : null}

            <section className="flex flex-col gap-6">
              <SectionTitle eyebrow="Docs" title="Documentation" />
              <DocsLinks slug={product.slug} line={product.line} />
            </section>

            {product.faq.length ? (
              <section className="flex flex-col gap-6">
                <SectionTitle eyebrow="FAQ" title="Questions" />
                <FaqList items={product.faq} />
              </section>
            ) : null}
          </div>

          <Suspense fallback={<BuyRail product={railProduct} options={options} allAccess={pass} />}>
            <OwnershipAwareBuyRail product={railProduct} options={options} allAccess={pass} />
          </Suspense>
        </div>
      </div>

      {product.related.length ? (
        <section className="mx-auto flex max-w-[80rem] flex-col gap-8 px-4 pb-24 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="Related" title="You might also like" />
          <ProductGrid products={product.related} morph={false} />
        </section>
      ) : null}
      <MobileRailSpacer />
    </PageTransition>
  )
}
