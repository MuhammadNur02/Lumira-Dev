import Link from 'next/link'
import type { Route } from 'next'
import { SlideIn } from '@/components/motion/reveal'
import { getSiteSettings } from '@/lib/sanity/fetchers'
import { TrackedLink } from './tracked-link'
import { Wordmark } from './wordmark'

const COLUMNS: { title: string; links: { href: Route; label: string }[] }[] = [
  {
    title: 'Products',
    links: [
      { href: '/boilerplates', label: 'Boilerplates' },
      { href: '/ui-kits', label: 'UI Kits' },
      { href: '/templates', label: 'Templates' },
      { href: '/bundles', label: 'Bundles' },
      { href: '/all-access', label: 'All-Access Pass' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs' as Route, label: 'Docs' },
      { href: '/changelog', label: 'Changelog' },
      { href: '/blog', label: 'Blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/license', label: 'License' },
      { href: '/refund-policy', label: 'Refunds' },
      { href: '/terms', label: 'Terms' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
]

const linkClass =
  'rounded-sm text-body-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

/** Global footer (FR-GL-04): products, resources, legal, affiliates with the rate from Sanity, MoR line. */
export async function SiteFooter() {
  const settings = await getSiteSettings()
  return (
    <footer className="overflow-hidden border-t border-border">
      <div className="mx-auto grid max-w-[80rem] gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <SlideIn direction="up" index={0}>
          <div className="flex flex-col gap-4">
            <Wordmark />
            <p className="max-w-[32ch] text-body-sm text-pretty text-muted-foreground">
              Premium boilerplates, UI kits and templates. Try every one live, own every version.
            </p>
            <TrackedLink
              href="/affiliates"
              event="affiliate_link_clicked"
              props={{ placement: 'footer' }}
              className="w-fit rounded-sm text-body-sm font-medium text-brand-text underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Affiliates · Earn {settings.affiliate.commissionRate}%
            </TrackedLink>
          </div>
        </SlideIn>
        {COLUMNS.map((col, i) => (
          <SlideIn key={col.title} direction="up" index={i + 1}>
            <nav aria-label={col.title} className="flex flex-col gap-3">
              <h2 className="eyebrow">{col.title}</h2>
              {col.links.map((l) => (
                <Link key={l.href} href={l.href} className={`${linkClass} w-fit`}>
                  {l.label}
                </Link>
              ))}
              {col.title === 'Resources' && settings.statusUrl ? (
                <a href={settings.statusUrl} className={`${linkClass} w-fit`} rel="noopener">
                  Status
                </a>
              ) : null}
            </nav>
          </SlideIn>
        ))}
      </div>
      {/* Padding on the outer box, rule on the inner one: the hairline spans exactly the content
          width, aligned with the columns above instead of running into the gutters. */}
      <SlideIn direction="up" delay={0.2}>
        <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 border-t border-border py-6 text-micro text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>Payments, tax and invoicing are handled by Lemon Squeezy, our Merchant of Record.</p>
            <div className="flex items-center gap-4">
              {settings.social.map((s) => (
                <a key={s.url} href={s.url} rel="noopener me" className={linkClass}>
                  {s.label}
                </a>
              ))}
              <a href={`mailto:${settings.supportEmail}`} className={linkClass}>
                {settings.supportEmail}
              </a>
            </div>
          </div>
        </div>
      </SlideIn>
    </footer>
  )
}
