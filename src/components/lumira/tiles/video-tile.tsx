'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import type { ImageRef } from '@/lib/sanity/models'
import { BentoTile, TileEyebrow, type Span } from '../bento'

/**
 * video (SG §4.4): muted loop with a poster and a visible pause control (WCAG 2.2.2). Autoplay only
 * when on screen and motion is allowed; reduced motion shows the poster.
 */
export function VideoTile({
  src,
  poster,
  eyebrow,
  title,
  span,
}: {
  src: string
  poster: ImageRef | null
  eyebrow?: string | null
  title?: string | null
  span: Span
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(true)
  const [userPaused, setUserPaused] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !userPaused) void video.play().catch(() => {})
      else video.pause()
    })
    io.observe(video)
    return () => io.disconnect()
  }, [userPaused])

  const toggle = () => {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      setUserPaused(false)
      void video.play()
    } else {
      setUserPaused(true)
      video.pause()
    }
  }

  return (
    <BentoTile span={span} padding="none" className="min-h-[280px] md:min-h-0">
      {poster ? (
        <Image src={poster.url} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      ) : null}
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="relative z-10 mt-auto flex items-end justify-between gap-4 bg-linear-to-t from-scrim to-transparent p-5 text-white md:p-6">
        <div className="flex flex-col gap-1">
          {eyebrow ? <TileEyebrow className="text-inherit">{eyebrow}</TileEyebrow> : null}
          {title ? <p className="text-heading-4 text-balance">{title}</p> : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? 'Play video' : 'Pause video'}
          className="inline-flex size-10 shrink-0 pressable items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>
      </div>
    </BentoTile>
  )
}
