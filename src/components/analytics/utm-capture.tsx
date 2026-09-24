'use client'

import { useEffect } from 'react'
import { UTM_STORAGE_KEY } from '@/lib/billing/use-checkout'

/** Keeps the landing page's UTM parameters for the checkout session (FR-CO-02, PRD §3.2 Stage 1). */
export function UtmCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    for (const key of ['source', 'medium', 'campaign', 'content', 'term']) {
      const value = params.get(`utm_${key}`)
      if (value) utm[key] = value.slice(0, 200)
    }
    if (Object.keys(utm).length === 0) return
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm))
    } catch {
      // storage unavailable: attribution is best-effort
    }
  }, [])
  return null
}
