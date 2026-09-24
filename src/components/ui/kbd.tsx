import { cn } from '@/lib/utils'

// Lumira patch (SG §5.2/§5.3): mono 12 px, 20 px tall, rounded-xs, bordered, bottom inner edge.
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs border border-border bg-muted px-1 font-mono text-micro text-muted-foreground shadow-[inset_0_-1px_0_var(--border)] select-none',
        'in-data-[slot=tooltip-content]:border-transparent in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background',
        "[&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="kbd-group" className={cn('inline-flex items-center gap-1', className)} {...props} />
}

export { Kbd, KbdGroup }
