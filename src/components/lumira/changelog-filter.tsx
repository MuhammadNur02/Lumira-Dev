'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SAFE = /^[a-z0-9-]+$/

/**
 * Changelog filters (FR-CL-02). The timeline stays server-rendered and cached; filtering is a
 * generated stylesheet keyed on `data-product` / `data-kinds`, so it costs no re-render.
 */
export function ChangelogFilter({
  products,
  kinds,
}: {
  products: { slug: string; name: string }[]
  kinds: { value: string; label: string }[]
}) {
  const [{ product, kind }, set] = useQueryStates(
    { product: parseAsString, kind: parseAsString },
    { history: 'replace', scroll: false },
  )
  const p = product && SAFE.test(product) ? product : null
  const k = kind && SAFE.test(kind) ? kind : null
  const match = `${p ? `[data-product="${p}"]` : ''}${k ? `[data-kinds~="${k}"]` : ''}`
  const css = match
    ? `[data-changelog-entry]:not(${match}){display:none}[data-month]:not(:has([data-changelog-entry]${match})){display:none}`
    : ''

  return (
    <div className="flex flex-wrap items-center gap-2">
      <style>{css}</style>
      <Select value={p ?? 'all'} onValueChange={(v) => void set({ product: v === 'all' ? null : v })}>
        <SelectTrigger aria-label="Filter by product" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All products</SelectItem>
          {products.map((x) => (
            <SelectItem key={x.slug} value={x.slug}>
              {x.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={k ?? 'all'} onValueChange={(v) => void set({ kind: v === 'all' ? null : v })}>
        <SelectTrigger aria-label="Filter by change kind" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All changes</SelectItem>
          {kinds.map((x) => (
            <SelectItem key={x.value} value={x.value}>
              {x.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
