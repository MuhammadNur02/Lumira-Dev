import { env } from '@/lib/env'
import { source, type DocsPage } from './source'

const publicPages = () => source.getPages().filter((p) => p.data.access !== 'licensed')

type Structured = { headings: { id: string; content: string }[]; contents: { heading?: string; content: string }[] }

function pageText(page: DocsPage): string {
  const data = page.data.structuredData as Structured | undefined
  if (!data) return ''
  const byHeading = new Map(data.headings.map((h) => [h.id, h.content]))
  let current: string | undefined
  const out: string[] = []
  for (const block of data.contents) {
    if (block.heading && block.heading !== current) {
      current = block.heading
      const title = byHeading.get(block.heading)
      if (title) out.push(`\n### ${title}`)
    }
    out.push(block.content)
  }
  return out.join('\n').trim()
}

/** `/llms.txt`: an index of public docs (FR-DOC-08). Licensed pages are never listed. */
export function llmsIndex(): string {
  const site = env.NEXT_PUBLIC_APP_URL
  const lines = [
    '# Lumira',
    '',
    '> Premium boilerplates, UI kits and templates. Public documentation index.',
    '',
    '## Docs',
    '',
  ]
  for (const p of publicPages())
    lines.push(`- [${p.data.title}](${site}${p.url})${p.data.description ? `: ${p.data.description}` : ''}`)
  return lines.join('\n') + '\n'
}

/** `/llms-full.txt`: full text of every public docs page. */
export function llmsFull(): string {
  const site = env.NEXT_PUBLIC_APP_URL
  return (
    publicPages()
      .map(
        (p) =>
          `# ${p.data.title}\nURL: ${site}${p.url}\n${p.data.description ? `\n${p.data.description}\n` : ''}\n${pageText(p)}`,
      )
      .join('\n\n---\n\n') + '\n'
  )
}
