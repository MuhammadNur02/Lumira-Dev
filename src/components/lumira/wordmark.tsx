import { cn } from '@/lib/utils'

/** Lumira wordmark: a lumen mark (light catching a facet) + the name at weight 700 (SG §3.1). */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="6" className="fill-foreground" />
        <path d="M8 16.5V7.5h2.4v6.8H16v2.2H8Z" className="fill-background" />
        <circle cx="17" cy="7" r="2" className="fill-brand" />
      </svg>
      {compact ? (
        <span className="sr-only">Lumira</span>
      ) : (
        <span className="text-[17px] font-bold tracking-[-0.03em]">Lumira</span>
      )}
    </span>
  )
}
