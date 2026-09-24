import type { MetadataRoute } from 'next'
import { source } from './source'

/** Public docs pages only (FR-DOC-07); licensed pages are `noindex` and stay out of the sitemap. */
export function publicDocsEntries(site: string): MetadataRoute.Sitemap {
  return source
    .getPages()
    .filter((p) => p.data.access !== 'licensed')
    .map((p) => ({
      url: `${site}${p.url}`,
      lastModified: p.data.updated ?? undefined,
      changeFrequency: 'monthly' as const,
    }))
}
