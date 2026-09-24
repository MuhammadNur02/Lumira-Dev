'use client'

import { useCallback } from 'react'

const done = new Set<string>()

/** Inserts `<link rel="preconnect">` for an origin on first intent (NFR-PERF-10). */
export function usePreconnect(origin: string | null | undefined) {
  return useCallback(() => {
    if (!origin || done.has(origin)) return
    done.add(origin)
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }, [origin])
}
