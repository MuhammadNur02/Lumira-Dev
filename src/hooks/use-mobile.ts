'use client'
import { useMediaQuery } from './use-media-query'

/** Below the `md` breakpoint (768 px). */
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}
