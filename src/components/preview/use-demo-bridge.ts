'use client'

import { useCallback, useEffect, type RefObject } from 'react'
import { parseDemoMessage, postToDemo, type DemoMessage, type HostMessageInput } from '@lumira/preview-bridge'

/**
 * Host side of the postMessage bridge (SG §7.8): exact origin + `event.source` checks and
 * schema-validated payloads; outgoing messages always name the demo origin, never '*'.
 */
export function useDemoBridge(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  demoOrigin: string | null,
  onMessage: (message: DemoMessage) => void,
) {
  useEffect(() => {
    if (!demoOrigin) return
    const handler = (event: MessageEvent) => {
      const message = parseDemoMessage(event, { origin: demoOrigin, window: iframeRef.current?.contentWindow })
      if (message) onMessage(message)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [demoOrigin, iframeRef, onMessage])

  return useCallback(
    (message: HostMessageInput) => {
      if (demoOrigin) postToDemo(iframeRef.current?.contentWindow, demoOrigin, message)
    },
    [demoOrigin, iframeRef],
  )
}
