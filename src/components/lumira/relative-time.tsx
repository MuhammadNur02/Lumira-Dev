'use client'

import { useSyncExternalStore } from 'react'
import { formatDate, formatRelative } from '@/lib/format'

const subscribe = () => () => {}

/**
 * Cached pages are prerendered once, so "3 days ago" computed on the server would go stale. The
 * server renders the absolute date; the client upgrades it to relative time after hydration.
 */
export function RelativeTime({ date, prefix, className }: { date: string; prefix?: string; className?: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => formatRelative(date),
    () => formatDate(date),
  )
  return (
    <time dateTime={date} title={formatDate(date)} className={className}>
      {prefix ? `${prefix} ` : ''}
      {label}
    </time>
  )
}

/** "New" for releases under 14 days old (FR-CL-02); evaluated in the browser for the same reason. */
export function NewBadge({ date, className }: { date: string; className?: string }) {
  const fresh = useSyncExternalStore(
    subscribe,
    () => Date.now() - new Date(date).getTime() < 14 * 24 * 60 * 60 * 1000,
    () => false,
  )
  if (!fresh) return null
  return (
    <span
      className={
        className ??
        'inline-flex h-5 items-center rounded-full bg-brand-subtle px-2 text-micro text-brand-subtle-foreground'
      }
    >
      New
    </span>
  )
}
