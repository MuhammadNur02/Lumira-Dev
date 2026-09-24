'use client'

import { useEffect, useState } from 'react'
import { animate, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'

const FORMATTERS = {
  integer: (n: number) => Math.round(n).toLocaleString('en-US'),
  usd: (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n),
  percent: (n: number) => `${n.toFixed(1)}%`,
}

/**
 * KPI number ticker (SG §6.4.7): counts up with the `gentle` spring; tabular digits only while
 * moving, proportional at rest; the final value immediately under reduced motion.
 */
export function NumberTicker({ value, format = 'integer' }: { value: number; format?: keyof typeof FORMATTERS }) {
  const fmt = FORMATTERS[format]
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => fmt(v))
  const reduce = useReducedMotion()
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (reduce) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, {
      ...spring.gentle,
      onPlay: () => setRunning(true),
      onComplete: () => setRunning(false),
    })
    return () => controls.stop()
  }, [value, reduce, mv])

  return (
    <>
      <m.span aria-hidden className={running ? 'tabular-nums' : undefined}>
        {text}
      </m.span>
      <span className="sr-only">{fmt(value)}</span>
    </>
  )
}
