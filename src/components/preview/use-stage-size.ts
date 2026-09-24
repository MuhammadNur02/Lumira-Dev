'use client'

import { useEffect, useState, type RefObject } from 'react'

/** Stage size from a ResizeObserver, batched to one update per animation frame (SG §7.3). */
export function useStageSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const measure = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      setSize((prev) =>
        prev && prev.w === Math.round(rect.width) && prev.h === Math.round(rect.height)
          ? prev
          : { w: Math.round(rect.width), h: Math.round(rect.height) },
      )
    }
    const ro = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(measure)
    })
    ro.observe(el)
    measure()
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [ref])

  return size
}
