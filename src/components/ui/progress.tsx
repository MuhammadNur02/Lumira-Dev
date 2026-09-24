'use client'

import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Usage meter (SG §5.3): 6 px `brand-subtle` track, `brand` fill; ≥ 80 % → warning, 100 % → destructive.
 * Always pair it with a text label such as "5 of 5 activations used".
 */
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const tone = pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-warning' : 'bg-brand'
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn('relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-brand-subtle', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          'size-full flex-1 rounded-full transition-transform duration-(--spring-smooth-duration) ease-spring-smooth motion-reduce:transition-none',
          tone,
        )}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
