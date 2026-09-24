import { ArrowUpRight, CalendarClock, Percent, Wallet } from 'lucide-react'
import { BentoGrid, BentoTile, TileEyebrow } from '@/components/lumira/bento'
import { FaqList } from '@/components/lumira/faq-list'
import { block } from '@/lib/sanity/portable'
import { SectionHeader } from '@/components/lumira/section-header'
import { TrackedLink } from '@/components/lumira/tracked-link'
import { PageTransition } from '@/components/motion/page-transition'
import { env } from '@/lib/env'
import { getSiteSettings } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Affiliates',
  description: 'Earn a commission on every Lumira sale you refer. Payouts through Lemon Squeezy.',
  path: '/affiliates',
})

/** Affiliate program (FR-GS-01): commission, cookie window, payouts through LS, FAQ, hub CTA. */
export default async function AffiliatesPage() {
  const settings = await getSiteSettings()
  const { commissionRate, cookieDays, payoutNote } = settings.affiliate
  const hub = `https://${env.NEXT_PUBLIC_LS_STORE_SLUG}.lemonsqueezy.com/affiliates`
  const faq = [
    {
      _id: 'aff-attribution',
      question: 'How is a sale attributed to me?',
      answer: [
        block(
          `Share any Lumira link with your ?aff= code. A visitor who buys within ${cookieDays} days is credited to you, including purchases made through the checkout overlay.`,
        ),
      ],
    },
    {
      _id: 'aff-payouts',
      question: 'How and when am I paid?',
      answer: [block(payoutNote ?? 'Lemon Squeezy pays commissions monthly once they clear the refund window.')],
    },
    {
      _id: 'aff-subscriptions',
      question: 'Do All-Access subscriptions count?',
      answer: [block('Yes. The first payment of a referred All-Access subscription earns the same commission rate.')],
    },
  ]

  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto flex max-w-[80rem] flex-col gap-8 px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24">
          <SectionHeader
            as="h1"
            eyebrow="Affiliates"
            title={`Earn ${commissionRate}% on every sale you refer.`}
            lead="Recommend tools you trust. Sign up in the Lemon Squeezy Affiliate Hub, share your link and get paid monthly."
          >
            <TrackedLink
              href={hub}
              event="affiliate_link_clicked"
              props={{ placement: 'affiliates_page' }}
              className="inline-flex h-12 w-fit pressable items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-button-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              Join the program <ArrowUpRight className="size-4" aria-hidden />
            </TrackedLink>
          </SectionHeader>
        </div>
      </div>
      <div className="mx-auto flex max-w-[80rem] flex-col gap-16 px-4 pb-24 sm:px-6 lg:px-8">
        <BentoGrid>
          <BentoTile span={{ md: 2, lg: 4, rows: 1 }} className="justify-between gap-4">
            <Percent className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <div>
              <TileEyebrow>Commission</TileEyebrow>
              <p className="text-metric">{commissionRate}%</p>
            </div>
          </BentoTile>
          <BentoTile span={{ md: 2, lg: 4, rows: 1 }} className="justify-between gap-4">
            <CalendarClock className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <div>
              <TileEyebrow>Cookie window</TileEyebrow>
              <p className="text-metric">{cookieDays} days</p>
            </div>
          </BentoTile>
          <BentoTile span={{ md: 2, lg: 4, rows: 1 }} className="justify-between gap-4">
            <Wallet className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <div>
              <TileEyebrow>Payouts</TileEyebrow>
              <p className="text-body-sm text-muted-foreground">Monthly, through Lemon Squeezy</p>
            </div>
          </BentoTile>
        </BentoGrid>
        <section className="grid gap-12 lg:grid-cols-[5fr_7fr]">
          <SectionHeader eyebrow="FAQ" title="How the program works" />
          <FaqList items={faq} />
        </section>
      </div>
    </PageTransition>
  )
}
