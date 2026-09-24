'use server'

import { z } from 'zod'
import { SORTS } from '@/lib/sanity/catalog-filter'
import { getCatalog } from '@/lib/sanity/fetchers'
import type { ProductCard } from '@/lib/sanity/models'
import { PAGE_SIZE } from './constants'

const Input = z.object({
  line: z.enum(['boilerplate', 'ui_kit', 'template']).nullable(),
  type: z.enum(['portfolio', 'landing', 'docs', 'blog']).nullable(),
  stack: z.array(z.string().max(40)).max(10),
  features: z.array(z.string().max(40)).max(10),
  maxPrice: z.number().int().positive().nullable(),
  sort: z.enum(SORTS),
  offset: z.number().int().min(0).max(1000),
})

/** "Load more" cursor pagination (FR-SF-06). Reads the same cached catalog as the page. */
export async function loadMoreProducts(
  raw: z.input<typeof Input>,
): Promise<{ items: ProductCard[]; next: number | null }> {
  const { offset, ...filters } = Input.parse(raw)
  const all = await getCatalog(filters)
  const items = all.slice(offset, offset + PAGE_SIZE)
  const next = offset + PAGE_SIZE < all.length ? offset + PAGE_SIZE : null
  return { items, next }
}
