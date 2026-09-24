'use server'

import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { adminSearch, type SearchHit } from '@/server/admin/queries'

/** Admin ⌘K (FR-AD-02): read-only, so it is not audited. */
export async function searchAdmin(q: string): Promise<SearchHit[]> {
  await requireAdmin()
  const query = z.string().max(200).safeParse(q)
  return query.success ? adminSearch(query.data) : []
}
