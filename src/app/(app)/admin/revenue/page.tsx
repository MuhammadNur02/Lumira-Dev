import { Suspense } from 'react'
import { Download } from 'lucide-react'
import { AdminPageHeader, BarList, Panel, StatTile } from '@/components/admin/admin-ui'
import { RevenueChart } from '@/components/admin/charts'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/auth'
import { DEFINITIONS } from '@/lib/admin/definitions'
import { bucketFor, parseRange, type DateRange } from '@/lib/admin/range'
import { formatCompact, LINE_LABEL } from '@/lib/format'
import { kpis, revenueByDay, revenueByProduct, sparkline } from '@/server/metrics/revenue'

export const metadata = { title: 'Revenue' }

const money = (cents: number) => formatCompact(cents / 100, { currency: true })
const LINES = { ...LINE_LABEL, bundle: 'Bundles', all_access: 'All-Access' } as Record<string, string>

export default async function RevenuePage({ searchParams }: PageProps<'/admin/revenue'>) {
  await requireAdmin()
  const range = parseRange(await searchParams)
  const qs = `from=${range.from}&to=${range.to}`
  return (
    <>
      <AdminPageHeader
        title="Revenue"
        description={`${range.label} · one-time and subscription revenue, refunds and estimated payout`}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/export/revenue?${qs}`} download>
              <Download aria-hidden /> CSV
            </a>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-[40rem] skeleton-shimmer rounded-3xl" />}>
        <Content range={range} />
      </Suspense>
    </>
  )
}

async function Content({ range }: { range: DateRange }) {
  const [now, prev, days, slices] = await Promise.all([
    kpis(range.from, range.to),
    kpis(range.prevFrom, range.prevTo),
    revenueByDay(range.from, range.to),
    revenueByProduct(range.from, range.to),
  ])
  const refunds = days.reduce((a, d) => a + d.refunds, 0)
  const byLine = new Map<string, number>()
  for (const s of slices) byLine.set(s.line, (byLine.get(s.line) ?? 0) + s.gross)

  return (
    <>
      <div className="grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Gross revenue"
          value={money(now.gross)}
          current={now.gross}
          previous={prev.gross}
          trend={sparkline(days.map((d) => d.one_time_gross + d.subscription_gross))}
          definition={DEFINITIONS.gross}
        />
        <StatTile
          label="Net revenue"
          value={money(now.net)}
          current={now.net}
          previous={prev.net}
          definition={DEFINITIONS.net}
        />
        <StatTile label="Refunds" value={money(refunds)} current={refunds} previous={null} goodWhen="down" />
        <StatTile
          label="Estimated payout"
          value={money(now.payout)}
          current={now.payout}
          previous={prev.payout}
          definition={DEFINITIONS.payout}
        />
      </div>
      <Panel title="Revenue over time" description="Stacked one-time vs subscription">
        <RevenueChart data={days} bucket={bucketFor(range.days)} />
      </Panel>
      <div className="grid gap-(--bento-gap) lg:grid-cols-2">
        <Panel title="By line" description="Gross, incl. tax">
          <BarList
            items={[...byLine].map(([line, value]) => ({ key: line, label: LINES[line] ?? line, value }))}
            format={money}
          />
        </Panel>
        <Panel title="By product" description="Gross from order items (net of discounts)">
          <BarList
            items={slices.map((s) => ({
              key: s.key,
              label: s.label,
              value: s.gross,
              hint: `${s.orders} ${s.orders === 1 ? 'order' : 'orders'}`,
            }))}
            format={money}
          />
        </Panel>
      </div>
    </>
  )
}
