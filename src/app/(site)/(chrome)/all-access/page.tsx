import { Check, Minus } from 'lucide-react'
import { CheckoutButton } from '@/components/commerce/checkout-button'
import { FaqList } from '@/components/lumira/faq-list'
import { PlanCards } from '@/components/lumira/plan-cards'
import { ProductGrid } from '@/components/lumira/product-grid'
import { SectionHeader } from '@/components/lumira/section-header'
import { PageTransition } from '@/components/motion/page-transition'
import { Reveal } from '@/components/motion/reveal'
import { getAllProducts, getHome, getSiteSettings } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'All-Access Pass',
  description: 'Every current and future Lumira asset with Team rights, and every release while your pass is active.',
  path: '/all-access',
})

const COMPARISON = [
  { label: 'Assets included', oneTime: 'The one you buy', pass: 'Every current and future asset' },
  { label: 'Updates', oneTime: 'Within the purchased major version', pass: 'Every release while active' },
  { label: 'Rights', oneTime: 'Personal, Team or Extended', pass: 'Team rights on everything' },
  { label: 'Activations', oneTime: '1 / 5 / 25 per asset', pass: '10 across the catalog' },
  { label: 'After it ends', oneTime: 'Yours forever', pass: 'Keep releases published while active' },
]

/** All-Access (FR-SF-13): plans, live asset count, comparison with one-time licenses, FAQ. */
export default async function AllAccessPage() {
  const [settings, catalog, home] = await Promise.all([getSiteSettings(), getAllProducts(), getHome()])
  const included = catalog.filter((p) => p.inAllAccess)
  const pass = settings.allAccess

  return (
    <PageTransition>
      <section className="hero-glow">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-12 px-4 pt-16 pb-16 sm:px-6 lg:px-8 lg:pt-24">
          <SectionHeader
            as="h1"
            eyebrow="All-Access Pass"
            title="Everything Lumira makes, as it ships."
            lead={`${included.length} assets today, every future release, Team rights on all of it. Cancel anytime; releases published while you're a member stay yours to download.`}
          />
          <PlanCards
            pass={pass}
            cta={(plan, variantId) => (
              <CheckoutButton
                variantId={variantId}
                fallbackUrl={pass?.[plan]?.buyUrl}
                variant={plan === 'yearly' ? 'secondary' : 'default'}
                className="w-full"
              >
                {plan === 'yearly' ? 'Start yearly' : 'Start monthly'}
              </CheckoutButton>
            )}
          />
          <p className="text-caption text-muted-foreground">
            Tax/VAT calculated at checkout. Manage or cancel from your billing portal.
          </p>
        </div>
      </section>

      <section className="mx-auto flex max-w-[80rem] flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Compare" title="Pass or one-time license?" />
        <div className="overflow-x-auto rounded-xl border border-bento-border">
          <table className="w-full min-w-[36rem] text-body-sm">
            <caption className="sr-only">All-Access compared with one-time licenses</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="h-12 px-4 text-left font-normal text-muted-foreground">
                  <span className="sr-only">Aspect</span>
                </th>
                <th scope="col" className="h-12 px-4 text-left font-semibold">
                  One-time license
                </th>
                <th scope="col" className="h-12 px-4 text-left font-semibold">
                  All-Access
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                    {row.label}
                  </th>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <Minus className="size-4 text-muted-foreground" aria-hidden /> {row.oneTime}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <Check className="size-4 text-success" aria-hidden /> {row.pass}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto flex max-w-[80rem] flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Included" title={`All ${included.length} assets`} />
        <Reveal>
          <ProductGrid products={included} morph={false} />
        </Reveal>
      </section>

      {home.faq.length ? (
        <section className="mx-auto grid max-w-[80rem] gap-12 px-4 py-16 pb-24 sm:px-6 lg:grid-cols-[5fr_7fr] lg:px-8">
          <SectionHeader eyebrow="FAQ" title="Before you subscribe" />
          <FaqList items={home.faq} />
        </section>
      ) : null}
    </PageTransition>
  )
}
