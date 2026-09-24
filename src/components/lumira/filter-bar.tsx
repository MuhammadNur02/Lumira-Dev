'use client'

import { useTransition } from 'react'
import { useQueryStates } from 'nuqs'
import { LoaderCircle, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { catalogParams, TEMPLATE_TYPES } from '@/lib/catalog-params'
import type { CatalogSort } from '@/lib/sanity/catalog-filter'
import { cn } from '@/lib/utils'

const SORT_LABEL: Record<CatalogSort, string> = {
  updated: 'Recently updated',
  newest: 'Newest',
  popular: 'Popular',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
}
const FEATURE_LABEL: Record<string, string> = {
  auth: 'Auth',
  payments: 'Payments',
  i18n: 'i18n',
  cms: 'CMS',
  'dark-mode': 'Dark mode',
  animations: 'Animations',
  'multi-tenant': 'Multi-tenant',
  figma: 'Figma file',
}
const PRICE_CAPS = [50, 100, 200, 500]

type Facets = { stack: { value: string; label: string }[]; features: string[] }

/**
 * Catalog filters (FR-SF-04): URL state through nuqs with `shallow: false`, so the server re-renders
 * the grid; chips update optimistically inside a transition.
 */
export function FilterBar({ facets, showType }: { facets: Facets; showType: boolean }) {
  const [pending, startTransition] = useTransition()
  const [filters, setFilters] = useQueryStates(catalogParams, {
    shallow: false,
    startTransition,
    history: 'push',
    scroll: false,
  })
  const toggle = (key: 'stack' | 'features', value: string) =>
    void setFilters((f) => ({ [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }))

  const active = Boolean(filters.type || filters.stack.length || filters.features.length || filters.maxPrice)

  return (
    <div className="flex flex-col gap-4" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        {showType ? (
          <Chips
            label="Type"
            options={TEMPLATE_TYPES.map((t) => ({ value: t, label: t[0]!.toUpperCase() + t.slice(1) }))}
            isOn={(v) => filters.type === v}
            onToggle={(v) =>
              void setFilters({ type: filters.type === v ? null : (v as (typeof TEMPLATE_TYPES)[number]) })
            }
          />
        ) : null}
        {facets.stack.length ? (
          <Chips
            label="Stack"
            options={facets.stack}
            isOn={(v) => filters.stack.includes(v)}
            onToggle={(v) => toggle('stack', v)}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {facets.features.length ? (
          <Chips
            label="Features"
            options={facets.features.map((f) => ({ value: f, label: FEATURE_LABEL[f] ?? f }))}
            isOn={(v) => filters.features.includes(v)}
            onToggle={(v) => toggle('features', v)}
          />
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {pending ? (
            <LoaderCircle
              className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-label="Updating results"
            />
          ) : null}
          <Select
            value={filters.maxPrice ? String(filters.maxPrice) : 'any'}
            onValueChange={(v) => void setFilters({ maxPrice: v === 'any' ? null : Number(v) })}
          >
            <SelectTrigger size="sm" aria-label="Maximum price">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any price</SelectItem>
              {PRICE_CAPS.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  Under ${p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.sort} onValueChange={(v) => void setFilters({ sort: v as CatalogSort })}>
            <SelectTrigger size="sm" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_LABEL) as CatalogSort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {active ? (
        <button
          type="button"
          onClick={() => void setFilters({ type: null, stack: [], features: [], maxPrice: null })}
          className="inline-flex w-fit items-center gap-1 rounded-sm text-caption text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden /> Clear filters
        </button>
      ) : null}
    </div>
  )
}

function Chips({
  label,
  options,
  isOn,
  onToggle,
}: {
  label: string
  options: { value: string; label: string }[]
  isOn: (value: string) => boolean
  onToggle: (value: string) => void
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden className="mr-1 text-micro text-muted-foreground">
        {label}
      </span>
      {options.map((o) => {
        const on = isOn(o.value)
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              'inline-flex h-8 pressable items-center rounded-full border px-3 text-caption',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              on
                ? 'border-transparent bg-foreground text-background'
                : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </fieldset>
  )
}

export function FilterBarFallback() {
  return <div aria-hidden className="h-[5.5rem]" />
}
