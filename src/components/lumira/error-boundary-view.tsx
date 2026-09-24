'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from './error-state'

/** Shared body of every `error.tsx`: reports to Sentry (when configured) and shows its event id. */
export function ErrorBoundaryView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [eventId, setEventId] = useState<string | null>(null)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
    let cancelled = false
    void import('@sentry/nextjs').then((Sentry) => {
      const id = Sentry.captureException(error)
      if (!cancelled) setEventId(id)
    })
    return () => {
      cancelled = true
    }
  }, [error])

  return (
    <ErrorState
      code="Error"
      title="Something went wrong on our side."
      body="The page failed to load. Try again; if it keeps failing, contact support with the reference code below."
      reference={eventId ?? error.digest ?? null}
      actions={
        <>
          <Button size="lg" onClick={reset}>
            <RotateCcw aria-hidden /> Try again
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/">Back to the store</Link>
          </Button>
        </>
      }
    />
  )
}
