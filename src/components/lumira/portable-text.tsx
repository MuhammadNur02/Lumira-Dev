import { PortableText as PT, type PortableTextComponents, type PortableTextBlock } from '@portabletext/react'
import { cn } from '@/lib/utils'

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className="text-pretty [&:not(:last-child)]:mb-4">{children}</p>,
    h2: ({ children }) => <h2 className="mt-8 mb-3 text-heading-2 text-balance">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-6 mb-2 text-heading-3 text-balance">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-5 mb-2 text-heading-4">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-2 border-brand pl-4 text-muted-foreground">{children}</blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-4 list-disc space-y-1.5 pl-5 marker:text-muted-foreground">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mb-4 list-decimal space-y-1.5 pl-5 marker:text-muted-foreground">{children}</ol>
    ),
  },
  marks: {
    code: ({ children }) => <code className="rounded-xs bg-muted px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
    link: ({ children, value }) => {
      const href = (value as { href?: string } | undefined)?.href ?? '#'
      const external = /^https?:\/\//.test(href)
      return (
        <a
          href={href}
          rel={external ? 'noopener noreferrer' : undefined}
          className="text-brand-text underline decoration-1 underline-offset-4"
        >
          {children}
        </a>
      )
    },
  },
}

/** Portable Text with Lumira prose styles: body 16/1.6, 45 rem measure, links always underlined. */
export function PortableText({
  value,
  className,
}: {
  value: PortableTextBlock[] | null | undefined
  className?: string
}) {
  if (!value?.length) return null
  return (
    <div className={cn('max-w-[45rem] text-body', className)}>
      <PT value={value} components={components} />
    </div>
  )
}

/** Plain text of Portable Text blocks (JSON-LD, meta descriptions, feeds). */
export function toPlainText(blocks: PortableTextBlock[] | null | undefined): string {
  return (blocks ?? [])
    .map((b) => ((b as { children?: { text?: string }[] }).children ?? []).map((c) => c.text ?? '').join(''))
    .join('\n\n')
}
