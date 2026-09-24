import { Suspense } from 'react'
import { AdminPageHeader, Panel, StatTile } from '@/components/admin/admin-ui'
import { MovementsChart, TrendChart } from '@/components/admin/charts'
import { requireAdmin } from '@/lib/auth'
import { DEFINITIONS } from '@/lib/admin/definitions'
import { parseRange, type DateRange } from '@/lib/admin/range'
import { formatCompact } from '@/lib/format'
import { churn, kpis, mrrSeries, sampled } from '@/server/metrics/revenue'

export const metadata = { title: 'Subscriptions' }

const money = (cents: number) => formatCompact(cents / 100, { currency: true })
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)

export default async function SubscriptionsPage({ searchParams }: PageProps<'/admin/subscriptions'>) {
  await requireAdmin()
  const range = parseRange(await searchParams)
  return (
    <>
      <AdminPageHeader
        title="Subscriptions"
        description={`${range.label} · All-Access MRR, movements and churn from daily snapshots`}
      />
      <Suspense fallback={<div className="h-[36rem] skeleton-shimmer rounded-3xl" />}>
        <Content range={range} />
      </Suspense>
    </>
  )
}

async function Content({ range }: { range: DateRange }) {
  const [now, prev, series, churnNow, churnPrev] = await Promise.all([
    kpis(range.from, range.to),
    kpis(range.prevFrom, range.prevTo),
    mrrSeries(range.from, range.to),
    churn(range.from, range.to),
    churn(range.prevFrom, range.prevTo),
  ])
  const sum = (key: 'new' | 'expansion' | 'reactivated' | 'contraction' | 'churned') =>
    series.reduce((a, p) => a + p[key], 0)
  const movements = [
    { label: 'New', value: sum('new') },
    { label: 'Expansion', value: sum('expansion') },
    { label: 'Reactivation', value: sum('reactivated') },
    { label: 'Contraction', value: -sum('contraction') },
    { label: 'Churn', value: -sum('churned') },
  ]
  const last = series.at(-1)
  return (
    <>
      <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          hero
          label="MRR"
          value={money(now.mrr)}
          current={now.mrr}
          previous={prev.mrr || null}
          trend={sampled(series.map((p) => p.mrr))}
          definition={DEFINITIONS.mrr}
        />
        <StatTile
          label="Active subscribers"
          value={now.activeSubscribers.toLocaleString('en-US')}
          current={now.activeSubscribers}
          previous={prev.activeSubscribers}
          trend={sampled(series.map((p) => p.subs))}
          definition={DEFINITIONS.subscribers}
        />
        <StatTile
          label="Logo churn"
          value={pct(churnNow.logoChurn)}
          current={churnNow.logoChurn}
          previous={churnPrev.logoChurn}
          goodWhen="down"
          definition={DEFINITIONS.logoChurn}
        />
        <StatTile
          label="Revenue churn"
          value={pct(churnNow.revenueChurn)}
          current={churnNow.revenueChurn}
          previous={churnPrev.revenueChurn}
          goodWhen="down"
          definition={DEFINITIONS.revenueChurn}
        />
      </div>
      <div className="grid gap-(--bento-gap) xl:grid-cols-2">
        <Panel title="MRR trend" description="Yearly plans normalized ÷ 12">
          {series.length ? (
            <TrendChart
              data={series.map((p) => ({ date: p.date, mrr: p.mrr }))}
              series={[{ key: 'mrr', label: 'MRR', color: 'var(--chart-1)' }]}
              format="usd"
              summary={`MRR ${last ? money(last.mrr) : '$0'} on ${last?.date ?? range.to}, ${series.length} daily snapshots.`}
            />
          ) : (
            <p className="text-body-sm text-muted-foreground">
              No snapshots in this range yet. The mrr-snapshot cron writes one per day.
            </p>
          )}
        </Panel>
        <Panel title="MRR movements" description="New, expansion and reactivation vs contraction and churn">
          <MovementsChart movements={movements} />
        </Panel>
      </div>
    </>
  )
}
