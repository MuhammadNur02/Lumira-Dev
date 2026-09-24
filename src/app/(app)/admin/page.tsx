import { Suspense } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { CircleAlert, KeyRound, Receipt } from 'lucide-react'
import { AdminPageHeader, Panel, StatTile } from '@/components/admin/admin-ui'
import { RevenueChart } from '@/components/admin/charts'
import { NumberTicker } from '@/components/motion/number-ticker'
import { RelativeTime } from '@/components/lumira/relative-time'
import { requireAdmin } from '@/lib/auth'
import { DEFINITIONS } from '@/lib/admin/definitions'
import { bucketFor, parseRange, type DateRange } from '@/lib/admin/range'
import { formatCompact } from '@/lib/format'
import { recentActivity } from '@/server/admin/queries'
import { uniqueVisitors } from '@/server/metrics/funnel'
import { kpis, mrrSeries, revenueByDay, sampled, sparkline } from '@/server/metrics/revenue'

export const metadata = { title: 'Overview' }

const money = (cents: number) => formatCompact(cents / 100, { currency: true })
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)

export default async function AdminOverview({ searchParams }: PageProps<'/admin'>) {
  await requireAdmin()
  const range = parseRange(await searchParams)
  return (
    <>
      <AdminPageHeader title="Overview" description={`${range.label} · ${range.from} → ${range.to} (UTC)`} />
      <Suspense fallback={<TilesSkeleton />}>
        <Kpis range={range} />
      </Suspense>
      <div className="grid gap-(--bento-gap) xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Suspense fallback={<div className="h-96 skeleton-shimmer rounded-3xl" />}>
          <Revenue range={range} />
        </Suspense>
        <Suspense fallback={<div className="h-96 skeleton-shimmer rounded-3xl" />}>
          <Activity />
        </Suspense>
      </div>
    </>
  )
}

function TilesSkeleton() {
  return (
    <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-36 skeleton-shimmer rounded-3xl" />
      ))}
    </div>
  )
}

async function Kpis({ range }: { range: DateRange }) {
  const [now, prev, days, mrr, visitors, prevVisitors] = await Promise.all([
    kpis(range.from, range.to),
    kpis(range.prevFrom, range.prevTo),
    revenueByDay(range.from, range.to),
    mrrSeries(range.from, range.to),
    uniqueVisitors(range.from, range.to),
    uniqueVisitors(range.prevFrom, range.prevTo),
  ])
  const gross = days.map((d) => d.one_time_gross + d.subscription_gross)
  const net = days.map((d) => d.one_time_net + d.subscription_net - d.refunds)
  const conversion = visitors ? now.orders / visitors : null
  const prevConversion = prevVisitors ? prev.orders / prevVisitors : null

  return (
    <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        hero
        label="MRR"
        value={<NumberTicker value={now.mrr / 100} format="usd" />}
        current={now.mrr}
        previous={prev.mrr || null}
        trend={sampled(mrr.map((m) => m.mrr))}
        definition={DEFINITIONS.mrr}
      />
      <StatTile
        label="Gross revenue"
        value={money(now.gross)}
        current={now.gross}
        previous={prev.gross}
        trend={sparkline(gross)}
        definition={DEFINITIONS.gross}
      />
      <StatTile
        label="Net revenue"
        value={money(now.net)}
        current={now.net}
        previous={prev.net}
        trend={sparkline(net)}
        definition={DEFINITIONS.net}
      />
      <StatTile
        label="Active subscribers"
        value={now.activeSubscribers.toLocaleString('en-US')}
        current={now.activeSubscribers}
        previous={prev.activeSubscribers}
        definition={DEFINITIONS.subscribers}
      />
      <StatTile
        label="Orders"
        value={now.orders.toLocaleString('en-US')}
        current={now.orders}
        previous={prev.orders}
        trend={sparkline(days.map((d) => d.orders))}
        definition={DEFINITIONS.orders}
      />
      <StatTile
        label="AOV"
        value={now.aov == null ? '—' : money(now.aov)}
        current={now.aov}
        previous={prev.aov}
        definition={DEFINITIONS.aov}
      />
      <StatTile
        label="Conversion rate"
        value={pct(conversion)}
        current={conversion}
        previous={prevConversion}
        definition={DEFINITIONS.conversion}
      />
      <StatTile
        label="Checkout abandonment"
        value={pct(now.abandonmentRate)}
        current={now.abandonmentRate}
        previous={prev.abandonmentRate}
        goodWhen="down"
        definition={DEFINITIONS.abandonment}
      />
      <StatTile
        label="Refund rate"
        value={pct(now.refundRate)}
        current={now.refundRate}
        previous={prev.refundRate}
        goodWhen="down"
        definition={DEFINITIONS.refundRate}
      />
      <StatTile
        label="Estimated payout"
        value={money(now.payout)}
        current={now.payout}
        previous={prev.payout}
        definition={DEFINITIONS.payout}
      />
    </div>
  )
}

async function Revenue({ range }: { range: DateRange }) {
  const days = await revenueByDay(range.from, range.to)
  return (
    <Panel title="Revenue" description="One-time vs subscription, UTC days">
      <RevenueChart data={days} bucket={bucketFor(range.days)} />
    </Panel>
  )
}

const ICONS = { order: Receipt, payment_failed: CircleAlert, activation: KeyRound } as const

async function Activity() {
  const items = await recentActivity()
  return (
    <Panel title="Recent activity">
      {items.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item, i) => {
            const Icon = ICONS[item.kind as keyof typeof ICONS] ?? Receipt
            const body = (
              <>
                <Icon
                  aria-hidden
                  strokeWidth={1.75}
                  className={
                    item.kind === 'payment_failed'
                      ? 'size-4 shrink-0 text-destructive'
                      : 'size-4 shrink-0 text-muted-foreground'
                  }
                />
                <span className="ph-no-capture min-w-0 flex-1 truncate">{item.label}</span>
                <RelativeTime date={item.at} className="shrink-0 text-caption text-muted-foreground" />
              </>
            )
            return (
              <li key={`${item.kind}-${item.at}-${i}`} className="py-2.5 text-body-sm first:pt-0 last:pb-0">
                {item.href ? (
                  <Link
                    href={item.href as Route}
                    className="flex items-center gap-3 hover:underline hover:underline-offset-4"
                  >
                    {body}
                  </Link>
                ) : (
                  <span className="flex items-center gap-3">{body}</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-body-sm text-muted-foreground">No activity yet.</p>
      )}
    </Panel>
  )
}
