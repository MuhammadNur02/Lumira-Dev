import { ViewTransition } from 'react'

const directional = { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' } as const

/**
 * Directional route transitions (SG §6.5.4). Wrap the content of every storefront `page.tsx`, never
 * a layout. Links deeper in the hierarchy pass `transitionTypes={['nav-forward']}`, links back up
 * pass `['nav-back']`; untyped navigations (browser back/forward) only play shared-element morphs.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  )
}
