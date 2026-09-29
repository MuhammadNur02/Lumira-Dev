import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-heading-2">{title}</h1>
        {description ? (
          <p className="max-w-[60rem] text-body-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/**
 * Route-level loading state for every admin page (each folder's loading.tsx re-exports it). Admin pages
 * await `requireAdmin()` before rendering, so a boundary inside each segment is what lets navigation
 * between them paint instantly; a boundary in the parent layout is already revealed and doesn't count.
 */
export function AdminPageSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-(--bento-gap)">
      <div aria-hidden className="flex flex-col gap-2">
        <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
        <div className="h-4 w-full max-w-[36rem] skeleton-shimmer rounded-md" />
      </div>
      <div aria-hidden className="h-96 skeleton-shimmer rounded-3xl" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Admin panel: bento surface, title row, body. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('bento-light bento-surface flex min-w-0 flex-col gap-4 p-5 md:p-6', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            {title ? <h2 className="text-heading-4">{title}</h2> : null}
            {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('min-w-0', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Definition({ text, label }: { text: string; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`How ${label} is calculated`}
        >
          <Info aria-hidden className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{text}</TooltipContent>
    </Tooltip>
  )
}

/** Inline SVG sparkline (SG §5.11): muted history, current period in --chart-1. No client JS. */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className={cn('h-8', className)} aria-hidden />
  const w = 120
  const h = 32
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 4)] as const)
  const path = (list: readonly (readonly [number, number])[]) =>
    list.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn('h-8 w-full overflow-visible', className)}
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d={path(pts.slice(0, -1))}
        fill="none"
        className="stroke-muted-foreground/60"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path(pts.slice(-2))}
        fill="none"
        className="stroke-chart-1"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * StatTile contract (SG §5.11): label · value · signed delta vs previous period, colored by
 * direction × goodness, always with an icon · 12-point sparkline.
 */
export function StatTile({
  label,
  value,
  current,
  previous,
  goodWhen = 'up',
  trend,
  definition,
  hero = false,
}: {
  label: string
  value: React.ReactNode
  current: number | null
  previous: number | null
  goodWhen?: 'up' | 'down'
  trend?: number[]
  definition?: string
  hero?: boolean
}) {
  const delta = current != null && previous != null && previous !== 0 ? (current - previous) / Math.abs(previous) : null
  const direction = delta == null || Math.abs(delta) < 0.0005 ? 'flat' : delta > 0 ? 'up' : 'down'
  const good = direction === 'flat' ? null : direction === goodWhen
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  return (
    <div className={cn('bento-light bento-surface flex min-w-0 flex-col gap-3 p-5', hero && 'md:col-span-2')}>
      <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <span>{label}</span>
        {definition ? <Definition text={definition} label={label} /> : null}
      </div>
      <span className={cn('tabular-nums', hero ? 'text-metric-hero' : 'text-metric')}>{value}</span>
      <div className="flex items-end justify-between gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-caption tabular-nums',
            good === true && 'text-success',
            good === false && 'text-destructive',
            good === null && 'text-muted-foreground',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {delta == null ? 'No prior data' : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`}
          <span className="sr-only"> vs previous period</span>
        </span>
        {trend ? <Sparkline values={trend} className="max-w-28" /> : null}
      </div>
      <span className="text-micro text-muted-foreground">vs previous period</span>
    </div>
  )
}

/** Horizontal bars ≤ 24 px thick (SG §5.11), text in text tokens. Server-rendered. */
export function BarList({
  items,
  format,
}: {
  items: { key: string; label: string; value: number; hint?: string }[]
  format: (v: number) => string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  if (!items.length) return <p className="text-body-sm text-muted-foreground">No data in this range.</p>
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.key} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-body-sm">
          <span className="truncate">{item.label}</span>
          <span className="h-5 rounded-l-none rounded-r-sm bg-muted" aria-hidden>
            <span className="block h-full rounded-r-sm bg-chart-1" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="text-muted-foreground tabular-nums">
            {format(item.value)}
            {item.hint ? <span className="ml-1.5 text-micro">{item.hint}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** SG §5.11 funnel: horizontal bars in the ordinal Lumen ramp, drop-off % between steps as text. */
export function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  const top = Math.max(1, steps[0]?.count ?? 1)
  const ramp = ['bg-funnel-1', 'bg-funnel-2', 'bg-funnel-3', 'bg-funnel-4']
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((step, i) => {
        const prev = steps[i - 1]
        const drop = prev && prev.count ? 1 - step.count / prev.count : null
        return (
          <li key={step.label} className="flex flex-col gap-1">
            {drop != null ? (
              <span className="pl-1 text-micro text-muted-foreground tabular-nums">
                ↓ {(drop * 100).toFixed(1)}% drop-off
              </span>
            ) : null}
            <div className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-body-sm">
              <span className="truncate">{step.label}</span>
              <span className="h-6 rounded-r-sm bg-muted" aria-hidden>
                <span
                  className={cn('block h-full rounded-r-sm', ramp[Math.min(i + (steps.length === 3 ? 1 : 0), 3)])}
                  style={{ width: `${Math.max(1, (step.count / top) * 100)}%` }}
                />
              </span>
              <span className="tabular-nums">{step.count.toLocaleString('en-US')}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function Unavailable({ what, fix }: { what: string; fix: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border p-4 text-body-sm">
      <span className="font-medium">{what} unavailable</span>
      <span className="text-muted-foreground">{fix}</span>
    </div>
  )
}
