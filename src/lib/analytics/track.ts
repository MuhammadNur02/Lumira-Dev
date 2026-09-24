import type { PostHog } from 'posthog-js'
import type { ClientEventName, ClientEvents } from './events'

let client: PostHog | null = null
const queue: [string, Record<string, unknown>][] = []

/**
 * ~1 kB shim: PostHog loads after idle (FR-AN-01), so events fired earlier are queued (max 100)
 * and flushed once the SDK attaches.
 */
export function track<N extends ClientEventName>(name: N, props: ClientEvents[N]) {
  if (typeof window === 'undefined') return
  if (client) client.capture(name, props)
  else if (queue.length < 100) queue.push([name, props])
}

export function attachPostHog(instance: PostHog) {
  client = instance
  for (const [name, props] of queue.splice(0)) instance.capture(name, props)
}

export function getPostHog() {
  return client
}

/** PostHog's anonymous distinct id, forwarded to checkout so server events join the session. */
export function getDistinctId(): string | undefined {
  return client?.get_distinct_id()
}
