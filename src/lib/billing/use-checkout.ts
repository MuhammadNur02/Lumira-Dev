'use client'

import { useCallback, useState } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { startCheckout } from '@/app/(site)/_actions/start-checkout'
import { getDistinctId } from '@/lib/analytics/track'
import { useLemonCheckout } from './lemonsqueezy/use-lemon-checkout'

export const UTM_STORAGE_KEY = 'lumira:utm'

function readUtm(): Partial<Record<'source' | 'medium' | 'campaign' | 'content' | 'term', string>> | undefined {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : undefined
  } catch {
    return undefined
  }
}

/**
 * Buy flow (PRD Stage 3): Server Action → Lemon.js overlay. If the LS API is down, fall back to
 * the hosted checkout link from Sanity with the session id in custom data (PRD §6.7).
 */
export function useCheckout() {
  const { warm, open, hasAffiliate } = useLemonCheckout()
  const { resolvedTheme } = useTheme()
  const [pendingVariant, setPendingVariant] = useState<number | null>(null)

  const buy = useCallback(
    async (variantId: number, fallbackUrl?: string | null) => {
      if (pendingVariant) return
      setPendingVariant(variantId)
      try {
        const res = await startCheckout({
          variantId,
          phDistinctId: getDistinctId(),
          utm: readUtm(),
          theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          hasAffiliate: hasAffiliate(),
        })
        if (res.ok) {
          await open(res.url, res.checkoutSessionId)
          return
        }
        if (res.error === 'rate_limited') {
          toast.error('Too many checkout attempts. Wait a minute and try again.')
        } else if (fallbackUrl) {
          window.location.assign(fallbackUrl)
        } else {
          toast.error('Checkout is temporarily unavailable. Try again in a moment.', {
            description: 'If it keeps failing, email support@lumira.dev and mention code CO-503.',
          })
        }
      } catch {
        if (fallbackUrl) window.location.assign(fallbackUrl)
        else toast.error('Checkout is temporarily unavailable. Try again in a moment.')
      } finally {
        setPendingVariant(null)
      }
    },
    [hasAffiliate, open, pendingVariant, resolvedTheme],
  )

  return { buy, warm, pendingVariant }
}
