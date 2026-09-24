import { createFromSource } from 'fumadocs-core/search/server'
import { source } from '@/lib/docs/source'

// Orama search over /docs (FR-DOC-04). Licensed pages contribute their title and description only,
// never body content, so searching a phrase that exists only inside a licensed page returns nothing.
export const { GET } = createFromSource(source, {
  buildIndex(page) {
    const licensed = page.data.access === 'licensed'
    return {
      id: page.url,
      url: page.url,
      title: page.data.title ?? '',
      description: page.data.description,
      tag: page.data.product,
      structuredData: licensed ? { headings: [], contents: [] } : page.data.structuredData,
    }
  },
})
