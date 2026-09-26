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

const directionOffsets = {
  up: { x: 0, y: 32 },
  down: { x: 0, y: -32 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
} as const

/**
 * Directional scroll-triggered slide-in. Fades in + slides from the given direction.
 * Uses `reveal` spring for a slightly snappier entrance than `Reveal`.
 */
export function SlideIn({
  direction = 'up',
  distance,
  index = 0,
  delay = 0,
  amount = 0.1,
  children,
  className,
  style,
}: {
  direction?: keyof typeof directionOffsets
  /** Override the default 32 px travel distance. */
  distance?: number
  index?: number
  delay?: number
  amount?: number | 'some' | 'all'
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const offset = directionOffsets[direction]
  const d = distance ?? Math.abs(offset.x || offset.y)
  const initial = {
    opacity: 0,
    x: offset.x ? (offset.x > 0 ? d : -d) : 0,
    y: offset.y ? (offset.y > 0 ? d : -d) : 0,
  }

  return (
    <m.div
      data-reveal
      className={className}
      style={style}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ ...spring.reveal, delay: delay + Math.min(index, 7) * 0.06 }}
    >
      {children}
    </m.div>
  )
}
