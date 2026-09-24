'use client'

import { useState } from 'react'
import { useMotionValueEvent, useScroll } from 'motion/react'
import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

/**
 * Glass header that condenses 72 → 56 px once the page scrolls past 8 px (SG §6.4.10). Height is a
 * documented size animation: threshold-driven, never scroll-linked. Anchored across View
 * Transitions through `view-transition-name: site-header`.
 */
export function HeaderShell({ children, className }: { children: React.ReactNode; className?: string }) {
  const { scrollY } = useScroll()
  const [condensed, setCondensed] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => setCondensed(y > 8))

  return (
    <m.header
      data-slot="site-header"
      data-condensed={condensed || undefined}
      style={{ viewTransitionName: 'site-header' }}
      initial={false}
      animate={{ height: condensed ? 56 : 72 }}
      transition={spring.snappy}
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color] duration-200',
        condensed ? 'border-border/60 glass-bar' : 'border-transparent bg-background',
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-[80rem] items-center gap-3 px-4 sm:px-6 lg:px-8">{children}</div>
    </m.header>
  )
}
