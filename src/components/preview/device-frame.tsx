'use client'

import { useEffect, useRef, type RefObject } from 'react'
import * as m from 'motion/react-m'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEVICES, type DeviceKey, type Frame } from './devices'
import { useDeviceFrame } from './use-device-frame'

/**
 * The device frame (SG §7.2–§7.4, FR-LP-02). Width/height of the iframe are plain numbers applied
 * once per device; only the frame box, the iframe scale and its opacity animate. The iframe element
 * itself never remounts, so switching devices never reloads the demo.
 */
export function DeviceFrame({
  iframeRef,
  device,
  frame,
  src,
  displayUrl,
  title,
  visible,
  onLoad,
  onHide,
  onShow,
  onSettled,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>
  device: DeviceKey
  frame: Frame
  src: string
  displayUrl: string
  title: string
  visible: boolean
  onLoad: () => void
  onHide: () => void
  onShow: () => void
  onSettled?: () => void
}) {
  const { width, height, scale, opacity } = useDeviceFrame(frame, onSettled)
  const preset = device === 'fit' ? null : DEVICES[device]
  const bezel = preset?.bezel ?? 0
  const bar = preset?.bar ?? 0
  const radius = preset?.radius ?? 12
  const lastSrc = useRef<string | null>(null)
  const hideRef = useRef(onHide)
  const showRef = useRef(onShow)
  useEffect(() => {
    hideRef.current = onHide
    showRef.current = onShow
  }, [onHide, onShow])

  // FR-LP-09: Next keeps recently visited routes mounted but hidden via <Activity>; effects are
  // cleaned up while hidden, so park the demo on about:blank and restore it when shown again.
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    if (iframe.src === 'about:blank' && lastSrc.current) {
      iframe.src = lastSrc.current
      showRef.current()
    }
    return () => {
      lastSrc.current = iframe.src
      iframe.src = 'about:blank' // stop demo CPU, timers and audio while hidden
      hideRef.current()
    }
  }, [iframeRef])

  return (
    <m.div
      className={cn(
        'relative shrink-0 overflow-hidden bg-card shadow-modal focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-stage',
        device === 'desktop' && 'rounded-b-none',
      )}
      style={{ width, height, borderRadius: radius }}
    >
      {device === 'desktop' ? (
        <div className="absolute inset-x-0 top-0 flex h-9 items-center gap-3 border-b border-border bg-muted/60 px-3">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </span>
          <span className="mx-auto flex h-6 max-w-[60%] min-w-0 items-center gap-1.5 rounded-md bg-background px-3 font-mono text-micro text-muted-foreground">
            <Lock className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{displayUrl}</span>
          </span>
        </div>
      ) : null}
      <m.iframe
        ref={iframeRef}
        src={src}
        title={title}
        onLoad={onLoad}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow=""
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className="absolute origin-top-left border-0 bg-white"
        style={{
          left: bezel,
          top: bezel + bar,
          width: frame.vw,
          height: frame.vh,
          scale,
          opacity,
          borderRadius: Math.max(0, radius - bezel),
        }}
      />
    </m.div>
  )
}
