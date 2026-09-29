'use client'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as m from 'motion/react-m'
import { LoaderCircle } from 'lucide-react'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

// Lumira patch of shadcn (StyleGuide §5.3, §5.4). See PATCHES.md.
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap select-none',
    'transition-[color,background-color,border-color,box-shadow] duration-150 ease-out',
    'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-button-ink hover:bg-primary/90',
        brand: 'bg-brand text-brand-foreground shadow-button-brand hover:shadow-button-brand-hover',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline:
          'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent',
        link: 'h-auto px-0 text-brand-text underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-[13px]',
        default: 'h-10 rounded-md px-4 text-sm',
        lg: 'h-12 rounded-lg px-6 text-[15px]',
        icon: 'size-10 rounded-md',
        'icon-sm': 'size-8 rounded-sm',
        'icon-xs': "size-6 rounded-xs [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Keeps the button's width and swaps the label for a spinner (SG §5.3). */
    loading?: boolean
    /** Screen-reader text while loading. */
    loadingLabel?: string
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel = 'Processing…',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)

  // Links styled as buttons: CSS spring press (generated linear() easing, §6.6). No JS needed.
  if (asChild) {
    return (
      <Slot.Root data-slot="button" data-variant={variant ?? 'default'} className={cn(classes, 'pressable')} {...props}>
        {children}
      </Slot.Root>
    )
  }

  const icon = typeof size === 'string' && size.startsWith('icon')
  return (
    <m.button
      data-slot="button"
      data-variant={variant ?? 'default'}
      className={classes}
      whileTap={loading || disabled ? undefined : { scale: icon ? 0.92 : 0.97 }}
      transition={spring.press}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...(props as React.ComponentProps<typeof m.button>)}
    >
      {loading ? (
        <>
          <span className="invisible contents">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            <span className="sr-only">{loadingLabel}</span>
          </span>
        </>
      ) : (
        children
      )}
    </m.button>
  )
}
