import { Suspense } from 'react'
import { Download } from 'lucide-react'
import { AdminPageHeader, Funnel, Panel, Unavailable } from '@/components/admin/admin-ui'
import { TrendChart } from '@/components/admin/charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { parseRange, type DateRange } from '@/lib/admin/range'
import { formatDateTime, TIER_LABEL } from '@/lib/format'
import { abandonedCheckouts } from '@/server/admin/queries'
import {
  PREVIEW_FUNNEL,
  PREVIEW_LABELS,
  PURCHASE_FUNNEL,
  PURCHASE_LABELS,
  posthogFunnel,
} from '@/server/metrics/funnel'
import { abandonmentByDay } from '@/server/metrics/revenue'

export const metadata = { title: 'Conversion' }

export default async function ConversionPage({ searchParams }: PageProps<'/admin/conversion'>) {
  await requireAdmin()
  const range = parseRange(await searchParams)
  return (
    <>
      <AdminPageHeader
        title="Conversion"
        description={`${range.label} · PostHog funnels (cached 15 min) and checkout abandonment from Postgres`}
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/export/abandoned?from=${range.from}&to=${range.to}`} download>
              <Download aria-hidden /> Abandoned CSV
            </a>
          </Button>
        }
      />
      <div className="grid gap-(--bento-gap) xl:grid-cols-2">
        <Suspense fallback={<div className="h-72 skeleton-shimmer rounded-3xl" />}>
          <FunnelPanel title="Purchase funnel" events={PURCHASE_FUNNEL} labels={PURCHASE_LABELS} range={range} />
        </Suspense>
        <Suspense fallback={<div className="h-72 skeleton-shimmer rounded-3xl" />}>
          <FunnelPanel title="Preview engagement" events={PREVIEW_FUNNEL} labels={PREVIEW_LABELS} range={range} />
        </Suspense>
      </div>
      <Suspense fallback={<div className="h-[32rem] skeleton-shimmer rounded-3xl" />}>
        <Abandonment range={range} />
      </Suspense>
    </>
  )
}

async function FunnelPanel({
  title,
  events,
  labels,
  range,
}: {
  title: string
  events: string[]
  labels: string[]
  range: DateRange
}) {
  const steps = await posthogFunnel(events, range.from, range.to)
  return (
    <Panel title={title} description={labels.join(' → ')}>
      {steps ? (
        <Funnel steps={steps.map((s, i) => ({ label: labels[i] ?? s.name, count: s.count }))} />
      ) : (
        <Unavailable
          what="Funnel data"
          fix="Check POSTHOG_PERSONAL_API_KEY (query:read scope) and POSTHOG_PROJECT_ID on the Integrations page."
        />
      )}
    </Panel>
  )
}

async function Abandonment({ range }: { range: DateRange }) {
  const [days, rows] = await Promise.all([
    abandonmentByDay(range.from, range.to),
    abandonedCheckouts(range.from, range.to),
  ])
  const totals = days.reduce(
    (a, d) => ({ abandoned: a.abandoned + d.abandoned, completed: a.completed + d.completed }),
    { abandoned: 0, completed: 0 },
  )
  const rate = totals.abandoned + totals.completed ? totals.abandoned / (totals.abandoned + totals.completed) : 0
  return (
    <>
      <Panel
        title="Checkout abandonment"
        description={`${(rate * 100).toFixed(1)}% of ${totals.abandoned + totals.completed} sessions abandoned or expired`}
      >
        <TrendChart
          data={days.map((d) => ({
            date: d.day,
            rate: d.abandoned + d.completed ? d.abandoned / (d.abandoned + d.completed) : 0,
          }))}
          series={[{ key: 'rate', label: 'Abandonment rate', color: 'var(--chart-2)' }]}
          format="percent"
          percent
          summary={`Abandonment averaged ${(rate * 100).toFixed(1)}% across ${days.length} days.`}
        />
      </Panel>
      <Panel title="Abandoned checkouts" description="Latest 200 in range" bodyClassName="-mx-5 md:-mx-6">
        {rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0">
                <TableRow>
                  <TableHead className="pl-5 md:pl-6">Started</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="pr-5 md:pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="h-11">
                    <TableCell className="pl-5 whitespace-nowrap tabular-nums md:pl-6">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell>{r.product ?? (r.tier === 'all_access' ? 'All-Access' : 'Bundle')}</TableCell>
                    <TableCell>{TIER_LABEL[r.tier]}</TableCell>
                    <TableCell className="ph-no-capture">{r.email ?? '—'}</TableCell>
                    <TableCell className="font-mono text-caption">
                      {r.utm
                        ? Object.entries(r.utm)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(' ')
                        : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-caption">{r.discountCode ?? '—'}</TableCell>
                    <TableCell className="pr-5 md:pr-6">
                      <Badge variant={r.status === 'abandoned' ? 'warning' : 'neutral'}>
                        {r.status === 'abandoned' ? 'Abandoned' : 'Expired'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="px-5 text-body-sm text-muted-foreground md:px-6">No abandoned checkouts in this range.</p>
        )}
      </Panel>
    </>
  )
}
