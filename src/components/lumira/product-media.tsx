'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { ImageRef } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'

type NetworkInformation = { saveData?: boolean }

/**
 * Card media (FR-SF-05, NFR-PERF-09): a 16:10 poster; the muted loop is fetched only after 80 ms of
 * hover intent, never under reduced motion or Save-Data, and pauses when the pointer leaves.
 */
export function ProductMedia({
  poster,
  video,
  sizes,
  priority = false,
  className,
}: {
  poster: ImageRef
  video: string | null
  sizes: string
  priority?: boolean
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [src, setSrc] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const allowed = () => {
    if (!video) return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false
    return !(navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData
  }

  const onEnter = () => {
    if (!allowed()) return
    timer.current = window.setTimeout(() => {
      setSrc(video)
      requestAnimationFrame(
        () =>
          void ref.current
            ?.play()
            .then(() => setPlaying(true))
            .catch(() => {}),
      )
    }, 80)
  }
  const onLeave = () => {
    window.clearTimeout(timer.current)
    ref.current?.pause()
    setPlaying(false)
  }

  return (
    <div
      className={cn('relative aspect-[16/10] overflow-hidden bg-stage', className)}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
    >
      <Image
        src={poster.url}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover object-top"
        placeholder={poster.lqip ? 'blur' : 'empty'}
        blurDataURL={poster.lqip ?? undefined}
      />
      {src ? (
        <video
          ref={ref}
          src={src}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          className={cn(
            'absolute inset-0 size-full object-cover object-top opacity-0 transition-opacity duration-200',
            playing && 'opacity-100',
          )}
        />
      ) : null}
    </div>
  )
}
