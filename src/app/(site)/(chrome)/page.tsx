import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Boxes, LayoutTemplate, MonitorSmartphone, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BentoBands } from '@/components/lumira/bento-bands'
import { BentoGrid, BentoTile, TileEyebrow, TileTitle } from '@/components/lumira/bento'
import { FaqList } from '@/components/lumira/faq-list'
import { JsonLd } from '@/components/lumira/json-ld'
import { PlanCards } from '@/components/lumira/plan-cards'
import { ProductGrid } from '@/components/lumira/product-grid'
import { SectionHeader } from '@/components/lumira/section-header'
import { ThemedImage } from '@/components/lumira/themed-image'
import { TestimonialTile } from '@/components/lumira/tiles/testimonial-tile'
import { PageTransition } from '@/components/motion/page-transition'
import { Reveal } from '@/components/motion/reveal'
import { env } from '@/lib/env'
import { buildMetadata } from '@/lib/seo'
import { getAllProducts, getChangelog, getHome, getSiteSettings } from '@/lib/sanity/fetchers'

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHome()
  return buildMetadata({
    title: 'Lumira — Premium web assets',
    description: home.hero?.lead ?? 'Boilerplates, UI kits and templates. Try every one live, own every version.',
    path: '/',
    seo: home.seo,
  })
}

const CATEGORIES = [
  {
    href: '/boilerplates',
    line: 'boilerplate',
    title: 'SaaS Boilerplates',
    body: 'Auth, billing and multi-tenancy, already wired.',
    icon: Rocket,
  },
  {
    href: '/ui-kits',
    line: 'ui_kit',
    title: 'UI Component Libraries',
    body: 'Blocks you install from a license-gated registry.',
    icon: Boxes,
  },
  {
    href: '/templates',
    line: 'template',
    title: 'Website Templates',
    body: 'Portfolio, landing, docs and blog sites.',
    icon: LayoutTemplate,
  },
] as const

/** Home (FR-SF-02): Bento hero → New & Updated → categories → Live Preview → All-Access → proof → FAQ → CTA. */
export default async function HomePage() {
  const [home, catalog, changelog, settings] = await Promise.all([
    getHome(),
    getAllProducts(),
    getChangelog(),
    getSiteSettings(),
  ])
  const fresh = [...catalog]
    .sort((a, b) =>
      (b.latestRelease?.releasedAt ?? b.createdAt).localeCompare(a.latestRelease?.releasedAt ?? a.createdAt),
    )
    .slice(0, 3)
  const teaser = home.previewTeaser

  return (
    <PageTransition>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Lumira',
            url: env.NEXT_PUBLIC_APP_URL,
            logo: `${env.NEXT_PUBLIC_APP_URL}/icon.svg`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Lumira',
            url: env.NEXT_PUBLIC_APP_URL,
            potentialAction: {
              '@type': 'SearchAction',
              target: `${env.NEXT_PUBLIC_APP_URL}/templates?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      {/* Hero: text is the LCP candidate, so nothing here animates in (SG §6.4.6). */}
      <section className="hero-glow">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-6 px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24 lg:pb-16">
          {home.hero?.eyebrow ? <span className="eyebrow">{home.hero.eyebrow}</span> : null}
          <h1 className="max-w-[16ch] text-display-2xl text-balance">
            {home.hero?.title ?? 'Ship on foundations you can trust.'}
          </h1>
          {home.hero?.lead ? (
            <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">{home.hero.lead}</p>
          ) : null}
          {/* Phones: two equal full-width buttons (ragged stacked widths read as unfinished). */}
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
            <Button size="lg" asChild>
              <Link href="/templates" transitionTypes={['nav-forward']}>
                Browse the catalog
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/all-access" transitionTypes={['nav-forward']}>
                All-Access Pass
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Featured" className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8">
        <BentoBands bands={home.bands} catalog={catalog} changelog={changelog} settings={settings} />
      </section>

      <section className="mx-auto flex max-w-[80rem] flex-col gap-12 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <SectionHeader
          eyebrow="New & updated"
          title="Recently shipped"
          lead="Sorted by latest release. Every purchase includes every release within its major version."
        />
        <Reveal>
          <ProductGrid products={fresh} morph={false} />
        </Reveal>
      </section>

      <section className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">Categories</h2>
        <BentoGrid>
          {CATEGORIES.map((c, i) => {
            const count = catalog.filter((p) => p.line === c.line).length
            return (
              <BentoTile
                key={c.href}
                span={{ md: i === 0 ? 6 : 3, lg: 4, rows: 1 }}
                interactive
                className="justify-between gap-6"
              >
                <c.icon className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                <div className="flex flex-col gap-1">
                  <TileEyebrow>
                    {count} {count === 1 ? 'asset' : 'assets'}
                  </TileEyebrow>
                  <Link
                    href={c.href}
                    transitionTypes={['nav-forward']}
                    className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                  >
                    <TileTitle size="sm">{c.title}</TileTitle>
                  </Link>
                  <p className="text-body-sm text-muted-foreground">{c.body}</p>
                </div>
              </BentoTile>
            )
          })}
        </BentoGrid>
      </section>

      {teaser ? (
        <section className="mx-auto grid max-w-[80rem] items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[5fr_7fr] lg:px-8 lg:py-32">
          <SectionHeader eyebrow="Live Preview" title={teaser.title ?? 'Drive it before you buy it'} lead={teaser.body}>
            {teaser.product ? (
              <div>
                <Button size="lg" variant="secondary" asChild>
                  <Link href={`/products/${teaser.product.slug}/preview`} transitionTypes={['nav-forward']}>
                    <MonitorSmartphone aria-hidden /> Open Live Preview
                  </Link>
                </Button>
              </div>
            ) : null}
          </SectionHeader>
          <Reveal>
            <div className="bento-surface stage-dots p-4 md:p-8">
              {teaser.video ? (
                <video
                  src={teaser.video}
                  poster={teaser.poster?.url}
                  muted
                  loop
                  playsInline
                  controls
                  preload="none"
                  className="aspect-[16/10] w-full rounded-xl shadow-modal"
                />
              ) : teaser.poster ? (
                <ThemedImage
                  image={teaser.poster}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="h-auto w-full rounded-xl shadow-modal"
                />
              ) : null}
            </div>
          </Reveal>
        </section>
      ) : null}

      <section className="mx-auto flex max-w-[80rem] flex-col gap-12 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <SectionHeader
          eyebrow="All-Access Pass"
          title="Every asset, every release, one subscription."
          lead={`All ${catalog.length} assets today and everything we ship next, with Team rights on all of it.`}
        />
        <Reveal>
          <PlanCards pass={settings.allAccess} />
        </Reveal>
      </section>

      {home.testimonials.length ? (
        <section className="mx-auto max-w-[80rem] px-4 pb-24 sm:px-6 lg:px-8">
          <h2 className="mb-6 eyebrow">From buyers</h2>
          <BentoGrid>
            {home.testimonials.slice(0, 3).map((t) => (
              <TestimonialTile key={t._id} testimonial={t} span={{ md: 6, lg: 4, rows: 2 }} />
            ))}
          </BentoGrid>
        </section>
      ) : null}

      {home.faq.length ? (
        <section className="mx-auto grid max-w-[80rem] gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[5fr_7fr] lg:px-8">
          <SectionHeader eyebrow="FAQ" title="Questions, answered plainly." />
          <FaqList items={home.faq} />
        </section>
      ) : null}

      <section className="border-t border-border hero-glow">
        <div className="mx-auto flex max-w-[80rem] flex-col items-start gap-6 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <h2 className="max-w-[18ch] text-display-lg text-balance">
            {home.closingCta?.title ?? 'Own every version, from day one.'}
          </h2>
          {home.closingCta?.body ? (
            <p className="max-w-[45rem] text-body-lg text-muted-foreground">{home.closingCta.body}</p>
          ) : null}
          <Button size="lg" asChild>
            <Link href="/templates" transitionTypes={['nav-forward']}>
              Find your starting point <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </PageTransition>
  )
}
