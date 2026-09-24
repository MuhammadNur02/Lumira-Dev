'use client'
import { useCallback, useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. Returns `serverValue` during SSR and hydration. */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

export const useReducedMotionPreference = () => useMediaQuery('(prefers-reduced-motion: reduce)')
