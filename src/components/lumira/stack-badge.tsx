import type { StackItem } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'

/**
 * Stack badge: 14 px monochrome mark + label + version in mono (SG §5.3). Logos are the vendors'
 * official marks stored as `currentColor` SVG in Sanity; without one, a neutral initial is shown.
 */
export function StackBadge({
  item,
  showVersion = true,
  className,
}: {
  item: StackItem
  showVersion?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-bento-border bg-card px-2 font-mono text-micro text-foreground',
        className,
      )}
    >
      {item.logo ? (
        <span
          aria-hidden
          className="inline-flex size-3.5 [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: item.logo }}
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex size-3.5 items-center justify-center rounded-xs bg-muted text-[9px] leading-none"
        >
          {item.name.slice(0, 1)}
        </span>
      )}
      <span>{item.name}</span>
      {showVersion && item.version ? <span className="text-muted-foreground">{item.version}</span> : null}
    </span>
  )
}
