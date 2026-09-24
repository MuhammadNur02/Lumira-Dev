import { cn } from '@/lib/utils'

/** Eyebrow + `display-lg` headline + lead (SG §3.2). One display size per section. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  as: Heading = 'h2',
  align = 'left',
  className,
  children,
}: {
  eyebrow?: string
  title: React.ReactNode
  lead?: React.ReactNode
  as?: 'h1' | 'h2'
  align?: 'left' | 'center'
  className?: string
  children?: React.ReactNode
}) {
  return (
    <header className={cn('flex flex-col gap-4', align === 'center' && 'items-center text-center', className)}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <Heading className="max-w-[22ch] text-display-lg text-balance">{title}</Heading>
      {lead ? <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">{lead}</p> : null}
      {children}
    </header>
  )
}
