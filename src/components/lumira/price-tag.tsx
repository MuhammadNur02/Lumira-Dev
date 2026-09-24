import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Price in USD with proportional figures; the symbol never splits from the amount (SG §3.4).
 * `from` renders "from $149"; `original` renders a struck-through price for promos.
 */
export function PriceTag({
  cents,
  from = false,
  original,
  interval,
  className,
}: {
  cents: number | null
  from?: boolean
  original?: number | null
  interval?: 'month' | 'year'
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 whitespace-nowrap', className)}>
      {from ? <span className="text-caption text-muted-foreground">from</span> : null}
      {original != null && original !== cents ? (
        <span className="text-muted-foreground line-through decoration-1">
          <span className="sr-only">Was </span>
          {formatPrice(original)}
        </span>
      ) : null}
      <span className="font-semibold text-foreground">{formatPrice(cents)}</span>
      {interval ? (
        <span className="text-caption text-muted-foreground">/{interval === 'month' ? 'mo' : 'yr'}</span>
      ) : null}
    </span>
  )
}
