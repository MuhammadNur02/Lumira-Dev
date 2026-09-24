import type { Instrumentation } from 'next'

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  const [Sentry, { scrubEvent }] = await Promise.all([import('@sentry/nextjs'), import('@/lib/observability/scrub')])
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1,
    sendDefaultPii: false,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
  })
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(...args)
}
