'use client'

import { useId, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

// SG §5.11: 2 px lines, one y-axis, hairline grid, ≤ 24 px bars with 4 px data-end radius, legend
// for ≥ 2 series, and a "View as table" toggle plus an aria-describedby summary on every chart.

const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: cents >= 100_000 ? 0 : 2 })}`
const usdAxis = (cents: number) => {
  const v = cents / 100
  return v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1000
      ? `$${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}K`
      : `$${v}`
}
const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

type Bucket = 'day' | 'week' | 'month'
function bucketKey(iso: string, bucket: Bucket) {
  if (bucket === 'day') return iso
  const d = new Date(`${iso}T00:00:00Z`)
  if (bucket === 'month') return `${iso.slice(0, 7)}-01`
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000)
  return monday.toISOString().slice(0, 10)
}

function ViewToggle({ table, onChange }: { table: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!table)}
      aria-pressed={table}
      className="text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {table ? 'View as chart' : 'View as table'}
    </button>
  )
}

export type RevenuePoint = {
  day: string
  one_time_gross: number
  one_time_net: number
  subscription_gross: number
  subscription_net: number
  refunds: number
}

const revenueConfig = {
  oneTime: { label: 'One-time', color: 'var(--chart-1)' },
  subscription: { label: 'Subscription', color: 'var(--chart-2)' },
} satisfies ChartConfig

/** FR-AD-11: one-time vs subscription, stacked with 2 px surface gaps, gross/net toggle, table view. */
export function RevenueChart({ data, bucket }: { data: RevenuePoint[]; bucket: Bucket }) {
  const [basis, setBasis] = useState<'gross' | 'net'>('gross')
  const [table, setTable] = useState(false)
  const summaryId = useId()

  const grouped = new Map<string, { day: string; oneTime: number; subscription: number }>()
  for (const d of data) {
    const key = bucketKey(d.day, bucket)
    const row = grouped.get(key) ?? { day: key, oneTime: 0, subscription: 0 }
    row.oneTime += basis === 'gross' ? d.one_time_gross : d.one_time_net
    row.subscription += basis === 'gross' ? d.subscription_gross : d.subscription_net
    grouped.set(key, row)
  }
  const series = [...grouped.values()]
  const total = series.reduce((a, r) => a + r.oneTime + r.subscription, 0)
  const oneTime = series.reduce((a, r) => a + r.oneTime, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          type="single"
          variant="segmented"
          size="sm"
          value={basis}
          onValueChange={(v) => v && setBasis(v as 'gross' | 'net')}
          aria-label="Revenue basis"
        >
          <ToggleGroupItem value="gross">Gross</ToggleGroupItem>
          <ToggleGroupItem value="net">Net</ToggleGroupItem>
        </ToggleGroup>
        <ViewToggle table={table} onChange={setTable} />
      </div>
      <p id={summaryId} className="sr-only">
        {`${basis === 'gross' ? 'Gross' : 'Net'} revenue ${usd(total)} over ${series.length} ${bucket}s, of which one-time ${usd(oneTime)} and subscription ${usd(total - oneTime)}.`}
      </p>
      {table ? (
        <DataTableView
          head={['Period', 'One-time', 'Subscription', 'Total']}
          rows={series.map((r) => [r.day, usd(r.oneTime), usd(r.subscription), usd(r.oneTime + r.subscription)])}
        />
      ) : (
        <ChartContainer
          config={revenueConfig}
          className="aspect-auto h-72 w-full"
          aria-describedby={summaryId}
          role="img"
        >
          <BarChart data={series} barCategoryGap={2} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={shortDay} minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={usdAxis} width={56} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => shortDay(String(v))}
                  formatter={(v, name) =>
                    `${revenueConfig[name as keyof typeof revenueConfig]?.label ?? name} ${usd(Number(v))}`
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="oneTime"
              stackId="a"
              fill="var(--color-oneTime)"
              maxBarSize={24}
              stroke="var(--card)"
              strokeWidth={2}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="subscription"
              stackId="a"
              fill="var(--color-subscription)"
              maxBarSize={24}
              stroke="var(--card)"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}

/** Single- or dual-series trend (MRR, abandonment rate): 2 px line, 10 % area fill, crosshair tooltip. */
export function TrendChart({
  data,
  series,
  format,
  summary,
  percent = false,
}: {
  data: Record<string, number | string>[]
  series: { key: string; label: string; color: string }[]
  format: 'usd' | 'percent' | 'count'
  summary: string
  percent?: boolean
}) {
  const [table, setTable] = useState(false)
  const summaryId = useId()
  const config = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }]),
  ) satisfies ChartConfig
  const fmt = (v: number) =>
    format === 'usd' ? usd(v) : format === 'percent' ? `${(v * 100).toFixed(1)}%` : v.toLocaleString('en-US')
  const axis = (v: number) =>
    format === 'usd' ? usdAxis(v) : format === 'percent' ? `${Math.round(v * 100)}%` : String(v)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ViewToggle table={table} onChange={setTable} />
      </div>
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
      {table ? (
        <DataTableView
          head={['Date', ...series.map((s) => s.label)]}
          rows={data.map((d) => [String(d.date), ...series.map((s) => fmt(Number(d[s.key])))])}
        />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-describedby={summaryId} role="img">
          <AreaChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={shortDay} minTickGap={24} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={axis}
              width={56}
              domain={percent ? [0, 1] : ['auto', 'auto']}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => shortDay(String(v))}
                  formatter={(v, name) => `${config[String(name)]?.label ?? name} ${fmt(Number(v))}`}
                />
              }
            />
            {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
            {series.map((s) => (
              <Area
                key={s.key}
                dataKey={s.key}
                type="monotone"
                stroke={`var(--color-${s.key})`}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`var(--color-${s.key})`}
                fillOpacity={0.1}
                dot={false}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  )
}

/** FR-AD-13 waterfall: positive movements in --chart-1, negative in the diverging red, zero baseline. */
export function MovementsChart({ movements }: { movements: { label: string; value: number }[] }) {
  const [table, setTable] = useState(false)
  const summaryId = useId()
  const net = movements.reduce((a, m) => a + m.value, 0)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ViewToggle table={table} onChange={setTable} />
      </div>
      <p id={summaryId} className="sr-only">
        {`MRR movements in range: ${movements.map((m) => `${m.label} ${usd(m.value)}`).join(', ')}. Net ${usd(net)}.`}
      </p>
      {table ? (
        <DataTableView
          head={['Movement', 'MRR']}
          rows={[...movements.map((m) => [m.label, usd(m.value)]), ['Net', usd(net)]]}
        />
      ) : (
        <ChartContainer
          config={{ value: { label: 'MRR' } }}
          className="aspect-auto h-64 w-full"
          aria-describedby={summaryId}
          role="img"
        >
          <BarChart data={movements} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={usdAxis} width={56} />
            <ReferenceLine y={0} stroke="var(--chart-baseline)" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(v, _n, item) => `${(item.payload as { label: string }).label} ${usd(Number(v))}`}
                />
              }
            />
            <Bar dataKey="value" maxBarSize={24} radius={[4, 4, 0, 0]}>
              {movements.map((m) => (
                <Cell key={m.label} fill={m.value >= 0 ? 'var(--chart-1)' : 'var(--chart-negative)'} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}

function DataTableView({ head, rows, className }: { head: string[]; rows: string[][]; className?: string }) {
  return (
    <div className={cn('max-h-80 overflow-auto rounded-lg border border-border', className)}>
      <Table>
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            {head.map((h, i) => (
              <TableHead key={h} className={i ? 'text-right' : undefined}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((cell, j) => (
                <TableCell key={j} className={cn('tabular-nums', j && 'text-right')}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
