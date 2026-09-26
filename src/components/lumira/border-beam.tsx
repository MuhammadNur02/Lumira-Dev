'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Border beam: animated conic edge light that sweeps along the border perimeter.
 * Pauses when off-screen, disabled under reduced motion.
 */
export function BorderBeam({
  className,
  glow = true,
  duration = 7,
}: {
  className?: string
  glow?: boolean
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const beam = ref.current
    if (!beam) return
    const io = new IntersectionObserver(([entry]) => {
      beam.style.setProperty('--beam-state', entry?.isIntersecting ? 'running' : 'paused')
    })
    io.observe(beam)
    return () => io.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn('border-beam', glow && 'border-beam-glow', className)}
      style={{ animationDuration: `${duration}s` }}
    />
  )
}
