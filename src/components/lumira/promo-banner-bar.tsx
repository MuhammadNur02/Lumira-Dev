'use client'

import { useSyncExternalStore } from 'react'
import { Tag, X } from 'lucide-react'

const storageKey = (id: string) => `lumira:promo-dismissed:${id}`
const listeners = new Set<() => void>()

function readDismissed(id: string) {
  try {
    return localStorage.getItem(storageKey(id)) === '1'
  } catch {
    return false
  }
}

/** Dismissible top bar; the dismissal is a per-browser convenience kept in localStorage. */
export function PromoBannerBar({
  id,
  code,
  text,
  href,
}: {
  id: string
  code: string | null
  text: string
  href?: string | null
}) {
  const dismissed = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => readDismissed(id),
    () => false,
  )
  if (dismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(id), '1')
    } catch {
      // storage unavailable: dismiss for this render only
    }
    listeners.forEach((l) => l())
  }

  const body = (
    <>
      <Tag className="size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
      {code ? (
        <span className="rounded-xs bg-brand-foreground/15 px-1.5 font-mono text-micro tracking-wider">{code}</span>
      ) : null}
    </>
  )

  return (
    <div className="relative bg-brand text-brand-foreground">
      <div className="mx-auto flex max-w-[80rem] items-center justify-center gap-2 px-12 py-2 text-caption">
        {href ? (
          <a
            href={href}
            className="inline-flex items-center gap-2 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-foreground focus-visible:outline-none"
          >
            {body}
          </a>
        ) : (
          <p className="inline-flex items-center gap-2">{body}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss promotion"
        className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-sm hover:bg-brand-foreground/10 focus-visible:ring-2 focus-visible:ring-brand-foreground focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
