import { releaseAnchor } from './format'
import type { ChangelogEntry } from './sanity/models'

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

/** Atom feed for the changelog (FR-CL-04). Only published releases; no download URLs (FR-CL-08). */
export function atomFeed({
  site,
  title,
  selfPath,
  htmlPath,
  releases,
}: {
  site: string
  title: string
  selfPath: string
  htmlPath: string
  releases: ChangelogEntry[]
}): Response {
  const published = releases.filter((r) => r.status === 'published')
  const entries = published
    .map((r) => {
      const anchor = releaseAnchor(r.product.slug, r.version)
      const link = `${site}${htmlPath}#${anchor}`
      return (
        `<entry><id>${xml(link)}</id><title>${xml(`${r.product.name} v${r.version}: ${r.title}`)}</title>` +
        `<updated>${new Date(r.releasedAt).toISOString()}</updated><link href="${xml(link)}"/>` +
        `<summary>${xml(r.summary)}</summary></entry>`
      )
    })
    .join('')
  const updated = new Date(published[0]?.releasedAt ?? '2026-01-01T00:00:00Z').toISOString()
  return new Response(
    `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${xml(title)}</title>` +
      `<id>${xml(site + htmlPath)}</id><link rel="self" href="${xml(site + selfPath)}"/><link href="${xml(site + htmlPath)}"/>` +
      `<updated>${updated}</updated><author><name>Lumira</name></author>${entries}</feed>`,
    {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=3600',
      },
    },
  )
}
