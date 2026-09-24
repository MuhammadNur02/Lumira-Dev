'use client'
import { LazyMotion, MotionConfig } from 'motion/react'
import { spring } from '@/lib/motion/springs'

// Features (domMax: gestures, drag, layout) load asynchronously after hydration,
// so `m.*` components add almost nothing to first-load JS (NFR-PERF-04).
const loadFeatures = () => import('@/lib/motion/features').then((mod) => mod.default)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={spring.smooth}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}
