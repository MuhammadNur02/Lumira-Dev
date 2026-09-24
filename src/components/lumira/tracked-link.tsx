'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { track } from '@/lib/analytics/track'
import type { ClientEventName, ClientEvents } from '@/lib/analytics/events'

/** A link that fires one typed analytics event on click (FR-AN-07). */
export function TrackedLink<N extends ClientEventName>({
  href,
  event,
  props,
  external = false,
  ...rest
}: Omit<React.ComponentProps<'a'>, 'href'> & { href: string; event: N; props: ClientEvents[N]; external?: boolean }) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    track(event, props)
    rest.onClick?.(e)
  }
  if (external || href.startsWith('http')) return <a href={href} {...rest} onClick={onClick} />
  return <Link href={href as Route} {...rest} onClick={onClick} />
}
