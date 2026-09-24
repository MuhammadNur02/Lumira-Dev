'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { getPostHog } from '@/lib/analytics/track'

/**
 * Identity (FR-AN-02): `identify(clerkUserId)` after sign-in, `reset()` on sign-out. Only the Clerk
 * user id is sent; never an email or name. Retries briefly while PostHog is still loading.
 */
export function PostHogIdentify() {
  const { isLoaded, userId } = useAuth()
  const identified = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    let attempts = 0
    const timer = window.setInterval(() => {
      const posthog = getPostHog()
      if (!posthog && ++attempts < 20) return
      window.clearInterval(timer)
      if (!posthog) return
      if (userId && identified.current !== userId) {
        posthog.identify(userId)
        identified.current = userId
      } else if (!userId && identified.current) {
        posthog.reset()
        identified.current = null
      }
    }, 500)
    return () => window.clearInterval(timer)
  }, [isLoaded, userId])

  return null
}
