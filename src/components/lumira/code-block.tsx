import { highlight, type HighlightLang } from '@/lib/highlight'
import { cn } from '@/lib/utils'
import { CopyButton } from './copy-button'

/** Shiki code block with a copy button (SG §5.9): `rounded-lg`, mono 14/1.7, dual theme. */
export async function CodeBlock({
  code,
  lang = 'tsx',
  title,
  className,
  copy = true,
}: {
  code: string
  lang?: HighlightLang
  title?: string
  className?: string
  copy?: boolean
}) {
  const html = await highlight(code.trim(), lang)
  return (
    <figure className={cn('overflow-hidden rounded-lg border border-bento-border bg-muted/40', className)}>
      {title || copy ? (
        <figcaption className="flex h-10 items-center justify-between gap-2 border-b border-bento-border pr-1 pl-4">
          <span className="truncate font-mono text-micro text-muted-foreground">{title ?? lang}</span>
          {copy ? <CopyButton value={code.trim()} label={`Copy ${title ?? 'code'}`} /> : null}
        </figcaption>
      ) : null}
      <div className="px-4 py-3 [&_pre]:outline-none" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}
