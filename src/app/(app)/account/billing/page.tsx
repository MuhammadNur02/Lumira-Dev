import { Suspense } from 'react'
import { desc, eq } from 'drizzle-orm'
import { ArrowUpRight, CircleCheck, CircleX, CreditCard, PauseCircle, Sparkles, TriangleAlert } from 'lucide-react'
import { db } from '@/db/client'
import { subscriptionInvoices, subscriptions, type Subscription } from '@/db/schema'
import { AccountCard, AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireUser } from '@/lib/auth'
import { formatDate, formatMoney } from '@/lib/format'

export const metadata = { title: 'Billing' }

const STATUS: Record<
  Subscription['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; icon: typeof CircleCheck }
> = {
  on_trial: { label: 'Trial', variant: 'info', icon: Sparkles },
  active: { label: 'Active', variant: 'success', icon: CircleCheck },
  paused: { label: 'Paused', variant: 'neutral', icon: PauseCircle },
  past_due: { label: 'Past due', variant: 'warning', icon: TriangleAlert },
  unpaid: { label: 'Unpaid', variant: 'danger', icon: CircleX },
  cancelled: { label: 'Cancelled', variant: 'warning', icon: CircleX },
  expired: { label: 'Expired', variant: 'danger', icon: CircleX },
}

export default function BillingPage({ searchParams }: PageProps<'/account/billing'>) {
  return (
    <>
      <AccountPageHeader
        title="Billing"
        description="Your All-Access Pass. Card changes and cancellations happen securely on Lemon Squeezy."
      />
      <Suspense fallback={<AccountSkeleton rows={2} />}>
        <BillingContent searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function BillingContent({ searchParams }: { searchParams: PageProps<'/account/billing'>['searchParams'] }) {
  const [{ userId }, params] = await Promise.all([requireUser(), searchParams])
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
    orderBy: desc(subscriptions.createdAt),
  })

  if (!sub) {
    return (
      <AccountCard className="items-start">
        <Sparkles aria-hidden strokeWidth={1.5} className="size-6 text-brand-text" />
        <div className="flex flex-col gap-1">
          <h2 className="text-heading-4">No active subscription</h2>
          <p className="max-w-[45rem] text-body-sm text-pretty text-muted-foreground">
            One-time licenses don’t need billing management; their invoices are in Orders. The All-Access Pass unlocks
            every current and future asset with Team rights.
          </p>
        </div>
        <Button asChild variant="brand">
          <a href="/all-access">Explore All-Access</a>
        </Button>
      </AccountCard>
    )
  }

  const invoices = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.subscriptionId, sub.id))
    .orderBy(desc(subscriptionInvoices.createdAt))
    .limit(24)
  const status = STATUS[sub.status]
  const Icon = status.icon
  const manageable = sub.status !== 'expired'

  return (
    <div className="flex flex-col gap-(--bento-gap)">
      {params.portal === 'unavailable' ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden />
          <AlertTitle>The billing portal is unavailable right now</AlertTitle>
          <AlertDescription>
            Try again in a minute. If it keeps failing, contact support and mention code BL-503.
          </AlertDescription>
        </Alert>
      ) : null}
      {sub.status === 'past_due' || sub.status === 'unpaid' ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>Your last payment didn’t go through</AlertTitle>
          <AlertDescription>
            Lemon Squeezy will retry your card. Update your payment method to keep All-Access; downloads stay available
            for 14 days while we retry.
          </AlertDescription>
        </Alert>
      ) : null}

      <AccountCard aria-labelledby="plan-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 id="plan-title" className="text-heading-4">
                All-Access Pass · {sub.interval === 'year' ? 'Yearly' : 'Monthly'}
              </h2>
              <Badge variant={status.variant}>
                <Icon aria-hidden /> {status.label}
              </Badge>
              {sub.testMode ? <Badge variant="outline">Test mode</Badge> : null}
            </div>
            <p className="text-body-sm text-muted-foreground">
              {formatMoney(sub.unitPriceUsd)} per {sub.interval} before tax
              {sub.status === 'cancelled' && sub.endsAt
                ? ` · access ends ${formatDate(sub.endsAt)}`
                : sub.status === 'on_trial' && sub.trialEndsAt
                  ? ` · trial ends ${formatDate(sub.trialEndsAt)}`
                  : sub.renewsAt && sub.status !== 'expired'
                    ? ` · renews ${formatDate(sub.renewsAt)}`
                    : sub.endsAt
                      ? ` · ended ${formatDate(sub.endsAt)}`
                      : ''}
            </p>
          </div>
          {manageable ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="/account/billing/portal?to=payment">
                  <CreditCard aria-hidden /> Update payment method
                </a>
              </Button>
              <Button asChild>
                <a href="/account/billing/portal">
                  Manage billing <ArrowUpRight aria-hidden />
                </a>
              </Button>
            </div>
          ) : (
            <Button asChild variant="brand">
              <a href="/all-access">Rejoin All-Access</a>
            </Button>
          )}
        </div>
        {sub.cardBrand && sub.cardLastFour ? (
          <p className="flex items-center gap-2 text-body-sm">
            <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            <span className="capitalize">{sub.cardBrand}</span>
            <span className="font-mono tabular-nums">•••• {sub.cardLastFour}</span>
          </p>
        ) : null}
      </AccountCard>

      {invoices.length ? (
        <AccountCard aria-labelledby="invoices-title" className="px-0 md:px-0">
          <h2 id="invoices-title" className="px-5 text-heading-4 md:px-6">
            Invoices
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 md:pl-6">Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-5 md:pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="pl-5 whitespace-nowrap md:pl-6">{formatDate(inv.createdAt)}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{inv.billingReason}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(inv.totalUsd)}</TableCell>
                    <TableCell className="pr-5 capitalize md:pr-6">{inv.status.replace('_', ' ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="px-5 text-caption text-muted-foreground md:px-6">Download invoice PDFs from Manage billing.</p>
        </AccountCard>
      ) : null}
    </div>
  )
}
