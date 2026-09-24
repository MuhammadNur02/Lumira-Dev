import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import type { SiteSettings } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'
import { BorderBeam } from './border-beam'

type Pass = SiteSettings['allAccess']
export type PlanKey = 'monthly' | 'yearly'

/**
 * All-Access plans (FR-SF-13). The yearly card is the one brand-filled element in view (SG §2.7).
 * `cta` renders the purchase control per plan; by default it links to the pass page.
 */
export function PlanCards({
  pass,
  cta,
  className,
}: {
  pass: Pass
  cta?: (plan: PlanKey, variantId: number | null) => React.ReactNode
  className?: string
}) {
  const monthly = pass?.monthly?.priceCents ?? null
  const yearly = pass?.yearly?.priceCents ?? null
  const savings = monthly && yearly ? Math.round((1 - yearly / (monthly * 12)) * 100) : null

  const plans: {
    key: PlanKey
    title: string
    price: number | null
    interval: string
    note: string
    variantId: number | null
  }[] = [
    {
      key: 'monthly',
      title: 'Monthly',
      price: monthly,
      interval: '/month',
      note: 'Cancel anytime from your billing portal.',
      variantId: pass?.monthly?.lsVariantId ?? null,
    },
    {
      key: 'yearly',
      title: 'Yearly',
      price: yearly,
      interval: '/year',
      note: savings && savings > 0 ? `Save ${savings}% versus monthly.` : 'Billed once a year.',
      variantId: pass?.yearly?.lsVariantId ?? null,
    },
  ]

  return (
    <div className={cn('grid gap-(--bento-gap) md:grid-cols-2', className)}>
      {plans.map((plan) => {
        const featured = plan.key === 'yearly'
        return (
          <article
            key={plan.key}
            className={cn(
              'bento-light bento-surface flex flex-col gap-6 p-6 md:p-8',
              featured && 'bg-brand text-brand-foreground [--bento-border:var(--bento-border-on-brand)]',
            )}
          >
            {featured ? <BorderBeam /> : null}
            <div className="flex items-center justify-between">
              <h3 className="text-heading-4">{plan.title}</h3>
              {featured && savings && savings > 0 ? (
                <span className="rounded-full bg-brand-foreground/15 px-2.5 py-0.5 text-micro">Best value</span>
              ) : null}
            </div>
            <p className="flex items-baseline gap-1">
              <span className="text-metric-hero">{formatPrice(plan.price)}</span>
              <span className={cn('text-caption', featured ? 'text-brand-foreground' : 'text-muted-foreground')}>
                {plan.interval}
              </span>
            </p>
            <p className={cn('text-body-sm', featured ? 'text-brand-foreground' : 'text-muted-foreground')}>
              {plan.note}
            </p>
            <ul className="grid gap-2 text-body-sm">
              {(pass?.perks ?? []).map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {perk}
                </li>
              ))}
              {pass?.activationLimit ? (
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> {pass.activationLimit} activations
                </li>
              ) : null}
            </ul>
            <div className="mt-auto">
              {cta ? (
                cta(plan.key, plan.variantId)
              ) : (
                <Button size="lg" variant={featured ? 'secondary' : 'default'} className="w-full" asChild>
                  <Link href="/all-access" transitionTypes={['nav-forward']}>
                    Get All-Access
                  </Link>
                </Button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
