import { cn } from '@/lib/utils'

/** Matches final geometry exactly (CLS budget); shimmer is static under reduced motion (SG §5.3). */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden className={cn('skeleton-shimmer rounded-md', className)} {...props} />
}

export { Skeleton }
