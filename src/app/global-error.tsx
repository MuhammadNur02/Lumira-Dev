'use client'

import { useEffect, useState } from 'react'
import { geistMono, geistSans } from './fonts'
import './globals.css'

/** Last-resort boundary when a root layout itself fails (FR-GL-07). Replaces the whole document. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
    void import('@sentry/nextjs').then((Sentry) => setEventId(Sentry.captureException(error)))
  }, [error])

  const reference = eventId ?? error.digest
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh items-center hero-glow">
        <main className="mx-auto flex max-w-[45rem] flex-col items-start gap-6 px-6 py-24">
          <span className="eyebrow">Error</span>
          <h1 className="text-display-lg text-balance">Lumira is having a moment.</h1>
          <p className="text-body-lg text-pretty text-muted-foreground">
            Something failed while loading the page. Try again in a few seconds.
          </p>
          {reference ? (
            <p className="text-caption text-muted-foreground">
              Reference code <span className="font-mono text-foreground">{reference}</span>
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 pressable items-center rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-button-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
