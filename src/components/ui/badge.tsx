import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

// Lumira patch (StyleGuide §5.3): 24 px pill, caption type. Status variants pair their subtle
// background with the status text token and are always rendered with an icon + label.
const badgeVariants = cva(
  [
    'inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2.5 whitespace-nowrap',
    'text-caption transition-colors',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ],
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground',
        brand: 'bg-brand-subtle text-brand-subtle-foreground',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        info: 'bg-info-subtle text-info',
        danger: 'bg-destructive-subtle text-destructive',
        outline: 'border border-border text-foreground',
        /** Semver: mono, `rounded-md`, bordered (§5.2). */
        version: 'rounded-md border border-border bg-muted px-2 font-mono text-micro text-foreground tabular-nums',
        /** Stack: 14 px logo + label. */
        stack: 'border border-bento-border bg-card px-2 font-mono text-micro text-foreground [&>svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'
  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? 'neutral'}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
