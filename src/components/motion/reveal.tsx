'use client'

import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'

/**
 * Scroll entrance (SG §6.4.6): `gentle` fade + 12 px rise, 40 ms stagger capped at 8 items, once.
 * Below the fold only; never wrap the LCP element. `[data-reveal]` stays visible without JS.
 */
export function Reveal({
  index = 0,
  children,
  className,
}: {
  index?: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <m.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring.gentle, delay: Math.min(index, 7) * 0.04 }}
    >
      {children}
    </m.div>
  )
}
