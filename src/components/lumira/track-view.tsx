'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics/track'
import type { ClientEventName, ClientEvents } from '@/lib/analytics/events'

/** Fires one typed analytics event when mounted (e.g. `product_viewed` on a PDP). */
export function TrackView<N extends ClientEventName>({ event, props }: { event: N; props: ClientEvents[N] }) {
  const key = JSON.stringify(props)
  useEffect(() => {
    track(event, JSON.parse(key) as ClientEvents[N])
  }, [event, key])
  return null
}
