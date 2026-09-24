import { cn } from '@/lib/utils'

/** Semver pill: Geist Mono, `rounded-md`, hairline (SG §3.5, §5.2). */
export function VersionPill({ version, className, ...props }: { version: string } & React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-md border border-border bg-muted px-2 font-mono text-micro text-foreground tabular-nums',
        className,
      )}
      {...props}
    >
      v{version.replace(/^v/, '')}
    </span>
  )
}
