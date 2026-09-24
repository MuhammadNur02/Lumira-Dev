'use client'

import { useEffect, useRef } from 'react'

/**
 * Border beam (SG §4.7): the All-Access tile only, one per page. The conic sweep (bento.css) pauses
 * while off-screen and is removed entirely under reduced motion.
 */
export function BorderBeam() {
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

  return <span ref={ref} aria-hidden className="border-beam" />
}
