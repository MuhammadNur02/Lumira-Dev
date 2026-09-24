import { cn } from '@/lib/utils'

/** Branded full-page state for 404s and errors (FR-GL-07): hero glow, mono code, one clear action. */
export function ErrorState({
  code,
  title,
  body,
  reference,
  actions,
  children,
  className,
}: {
  code: string
  title: string
  body: React.ReactNode
  reference?: string | null
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('relative hero-glow', className)}>
      <div className="mx-auto flex max-w-[80rem] flex-col items-start gap-6 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <span className="eyebrow">{code}</span>
        <h1 className="max-w-[18ch] text-display-xl text-balance">{title}</h1>
        <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">{body}</p>
        {reference ? (
          <p className="text-caption text-muted-foreground">
            Reference code <span className="font-mono text-foreground">{reference}</span> — mention it if you contact{' '}
            <a className="text-brand-text underline underline-offset-4" href="mailto:support@lumira.dev">
              support@lumira.dev
            </a>
            .
          </p>
        ) : null}
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        {children}
      </div>
    </section>
  )
}
