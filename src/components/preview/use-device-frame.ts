'use client'

import { useEffect, useRef } from 'react'
import { animate, useMotionValue } from 'motion/react'
import { spring } from '@/lib/motion/springs'
import type { Frame } from './devices'

/**
 * Device switch choreography (SG §7.4): the iframe's CSS viewport changes once (a single reflow),
 * opacity dips to 0.6 to mask it, and the frame box and iframe scale animate with the same `smooth`
 * spring so bezel and content stay locked. Instant under reduced motion.
 */
export function useDeviceFrame(frame: Frame, onSettled?: () => void) {
  const width = useMotionValue(frame.vw * frame.scale + frame.chromeX)
  const height = useMotionValue(frame.vh * frame.scale + frame.chromeY)
  const scale = useMotionValue(frame.scale)
  const opacity = useMotionValue(1)
  const settled = useRef(onSettled)
  useEffect(() => {
    settled.current = onSettled
  }, [onSettled])

  useEffect(() => {
    const w = frame.vw * frame.scale + frame.chromeX
    const h = frame.vh * frame.scale + frame.chromeY
    if (width.get() === w && height.get() === h && scale.get() === frame.scale) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      width.set(w)
      height.set(h)
      scale.set(frame.scale)
      settled.current?.()
      return
    }
    const dip = animate(opacity, 0.6, { duration: 0.09, ease: 'easeOut' })
    const controls = [
      animate(width, w, spring.smooth),
      animate(height, h, spring.smooth),
      animate(scale, frame.scale, spring.smooth),
    ]
    let cancelled = false
    void Promise.all(controls).then(() => {
      if (cancelled) return
      animate(opacity, 1, { duration: 0.12 })
      settled.current?.()
    })
    return () => {
      cancelled = true
      dip.stop()
      controls.forEach((c) => c.stop())
    }
  }, [frame.vw, frame.vh, frame.scale, frame.chromeX, frame.chromeY, width, height, scale, opacity])

  return { width, height, scale, opacity }
}
