import { DemoMessage, HostMessage, type HostMessageInput } from './protocol'

/**
 * Host-side validation (FR-LP-06): accept a message only if it comes from the exact demo origin,
 * from *our* iframe's window, and matches the schema. Everything else is ignored silently.
 */
export function parseDemoMessage(
  event: { origin: string; source: unknown; data: unknown },
  expected: { origin: string; window: unknown },
): DemoMessage | null {
  if (event.origin !== expected.origin) return null
  if (!expected.window || event.source !== expected.window) return null
  const parsed = DemoMessage.safeParse(event.data)
  return parsed.success ? parsed.data : null
}

/** Posts to the demo with an explicit target origin, never '*'. */
export function postToDemo(target: Window | null | undefined, origin: string, message: HostMessageInput) {
  if (!target) return
  const full = HostMessage.parse({ source: 'lumira-host', v: 1, ...message })
  target.postMessage(full, origin)
}
