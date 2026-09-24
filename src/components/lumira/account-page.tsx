import { cn } from '@/lib/utils'

/** Page heading for Buyer Dashboard routes: `heading-2`, one lead line, optional actions. */
export function AccountPageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-heading-2 text-balance">{title}</h1>
        {description ? (
          <p className="max-w-[45rem] text-body-sm text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

/** Suspense fallback shaped like a stack of account cards. */
export function AccountSkeleton({ rows = 3, tall = false }: { rows?: number; tall?: boolean }) {
  return (
    <div role="status" className="flex flex-col gap-(--bento-gap)">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} aria-hidden className={cn('skeleton-shimmer rounded-3xl', tall ? 'h-64' : 'h-32')} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Plain account card: bento surface without the grid spans. */
export function AccountCard({
  className,
  as: Comp = 'section',
  ...props
}: React.ComponentProps<'section'> & { as?: 'section' | 'article' | 'div' | 'li' }) {
  const Tag = Comp as 'section'
  return <Tag className={cn('bento-light bento-surface flex flex-col gap-5 p-5 md:p-6', className)} {...props} />
}
