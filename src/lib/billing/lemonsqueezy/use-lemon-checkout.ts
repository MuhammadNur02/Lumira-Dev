'use client'

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { track } from '@/lib/analytics/track'

type LemonEvent = { event: string; data?: unknown }

declare global {
  interface Window {
    createLemonSqueezy?: () => void
    LemonSqueezy?: {
      Setup(options: { eventHandler: (event: LemonEvent) => void }): void
      Url: { Open(url: string): void; Close(): void }
      Affiliate: { GetID(): string | undefined; Build(url: string): string }
    }
  }
}

let loading: Promise<void> | null = null

/** Lemon.js loads lazily, only when a buyer shows purchase intent (FR-CO-03, NFR-PERF-05). */
function loadLemonJs() {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://app.lemonsqueezy.com/js/lemon.js'
    s.defer = true
    s.onload = () => {
      window.createLemonSqueezy?.()
      resolve()
    }
    s.onerror = () => {
      loading = null
      reject(new Error('lemon.js failed to load'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export function useLemonCheckout() {
  const router = useRouter()
  const session = useRef<string | null>(null)

  /** Call on hover/focus of any Buy button so the overlay opens instantly on click. */
  const warm = useCallback(() => {
    void loadLemonJs().catch(() => {})
  }, [])

  const open = useCallback(
    async (url: string, checkoutSessionId: string) => {
      session.current = checkoutSessionId
      try {
        await loadLemonJs()
        const ls = window.LemonSqueezy
        if (!ls) throw new Error('lemon.js unavailable')
        ls.Setup({
          eventHandler: ({ event }) => {
            if (event !== 'Checkout.Success') return // Lemon.js emits no "closed" event for checkout
            track('checkout_success_client', { cs_id: session.current })
            ls.Url.Close()
            router.push(`/checkout/success?cs=${session.current}` as Route)
          },
        })
        ls.Url.Open(ls.Affiliate.Build(url)) // keeps ?aff= attribution on API-created checkouts (FR-CO-04)
      } catch {
        window.location.assign(url) // hosted checkout; redirect_url brings the buyer back
      }
    },
    [router],
  )

  /** Whether the affiliate script stored a referral for this visitor. */
  const hasAffiliate = useCallback(() => Boolean(window.LemonSqueezy?.Affiliate.GetID()), [])

  return { warm, open, hasAffiliate }
}
