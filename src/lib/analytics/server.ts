import 'server-only'
import { PostHog } from 'posthog-node'
import { env } from '@/lib/env'
import type { ServerEventName, ServerEvents } from './events'

/**
 * Server-side events (FR-AN-03). Call inside `after()` so the flush never delays the response.
 * Serverless functions freeze after responding, hence `flushAt: 1` and an awaited shutdown.
 */
export async function captureServer<N extends ServerEventName>(input: {
  distinctId: string
  event: N
  properties: ServerEvents[N]
}) {
  if (!env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return
  const client = new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    host: 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  try {
    client.capture({ distinctId: input.distinctId, event: input.event, properties: input.properties })
  } finally {
    await client.shutdown()
  }
}
