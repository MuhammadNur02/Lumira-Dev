'use client'

import { useEffect, useRef } from 'react'

/**
 * Bento spotlight (SG §4.7): one delegated `pointermove` listener per grid writes `--mx` / `--my`
 * on the hovered `[data-spotlight]` tile in a requestAnimationFrame batch. Fine pointers only, off
 * under reduced motion. Renders a hidden marker so it never occupies a grid cell.
 */
export function Spotlight() {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const grid = marker.current?.parentElement
    if (!grid) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!fine.matches || reduced.matches) return

    let frame = 0
    let pending: { tile: HTMLElement; x: number; y: number } | null = null
    const flush = () => {
      frame = 0
      if (!pending) return
      pending.tile.style.setProperty('--mx', `${pending.x}px`)
      pending.tile.style.setProperty('--my', `${pending.y}px`)
      pending = null
    }
    const onMove = (event: PointerEvent) => {
      const tile = (event.target as Element | null)?.closest<HTMLElement>('[data-spotlight]')
      if (!tile || !grid.contains(tile)) return
      const rect = tile.getBoundingClientRect()
      pending = { tile, x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (!frame) frame = requestAnimationFrame(flush)
    }
    grid.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      grid.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return <span ref={marker} hidden />
}
