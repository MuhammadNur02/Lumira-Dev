'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics/track'

/** `catalog_filtered` once per filter state change, never on the initial render (FR-AN-07). */
export function CatalogFilteredEvent({ filtersKey, resultCount }: { filtersKey: string; resultCount: number }) {
  const previous = useRef<string | null>(null)
  useEffect(() => {
    if (previous.current !== null && previous.current !== filtersKey) {
      track('catalog_filtered', {
        filters: JSON.parse(filtersKey) as Record<string, string | number | string[] | null>,
        result_count: resultCount,
      })
    }
    previous.current = filtersKey
  }, [filtersKey, resultCount])
  return null
}
