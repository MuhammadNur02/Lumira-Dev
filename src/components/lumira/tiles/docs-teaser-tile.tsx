import Link from 'next/link'
import type { Route } from 'next'
import { ArrowRight } from 'lucide-react'
import { BentoTile, TileEyebrow, TileTitle, type Span } from '../bento'
import { CodeBlock } from '../code-block'
import { InlineText } from '../inline-text'

/** docsTeaser (SG §4.4): a server-highlighted snippet with a copy button + a docs link. */
export function DocsTeaserTile({
  eyebrow,
  title,
  body,
  snippet,
  href,
  span,
}: {
  eyebrow?: string | null
  title?: string | null
  body?: string | null
  snippet: string
  href: string
  span: Span
}) {
  return (
    <BentoTile span={span} className="gap-4">
      <TileEyebrow>{eyebrow ?? 'Docs'}</TileEyebrow>
      <TileTitle size="sm">{title ?? 'Read the docs'}</TileTitle>
      {body ? (
        <p className="text-body-sm text-muted-foreground">
          <InlineText text={body} />
        </p>
      ) : null}
      <CodeBlock code={snippet} lang="bash" title="Terminal" />
      <Link
        href={href as Route}
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-sm text-caption text-brand-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Getting started <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </BentoTile>
  )
}
