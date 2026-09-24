/**
 * Redaction for error reports (NFR-SEC-05, Task.md P1.11): license keys are UUID-shaped, so every
 * UUID-shaped string and every email address is masked in messages, breadcrumbs, request bodies and
 * extra data before an event leaves the process.
 */
const LICENSE_KEY = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

export function scrubString(value: string): string {
  return value.replace(LICENSE_KEY, '[redacted-key]').replace(EMAIL, '[redacted-email]')
}

/** Deep-copies JSON-like values with every string scrubbed. Cycles and depth are bounded. */
export function scrubValue<T>(value: T, depth = 0, seen = new WeakSet<object>()): T {
  if (typeof value === 'string') return scrubString(value) as T
  if (value === null || typeof value !== 'object' || depth > 8) return value
  if (seen.has(value)) return '[circular]' as T
  seen.add(value)
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1, seen)) as T
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) out[k] = scrubValue(v, depth + 1, seen)
  return out as T
}

type EventLike = {
  message?: string
  exception?: { values?: { value?: string }[] }
  breadcrumbs?: unknown[]
  request?: {
    data?: unknown
    query_string?: unknown
    cookies?: unknown
    headers?: Record<string, string>
    url?: string
  }
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
  user?: { email?: string | null; ip_address?: string | null; [k: string]: unknown }
}

/** Sentry `beforeSend` / `beforeSendTransaction` hook. */
export function scrubEvent<E extends object>(input: E): E {
  const event = input as EventLike
  if (event.message) event.message = scrubString(event.message)
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = scrubString(ex.value)
  if (event.breadcrumbs) event.breadcrumbs = scrubValue(event.breadcrumbs)
  if (event.request) {
    if (event.request.url) event.request.url = scrubString(event.request.url)
    event.request.data = scrubValue(event.request.data)
    event.request.query_string = scrubValue(event.request.query_string)
    delete event.request.cookies
    if (event.request.headers) {
      delete event.request.headers.cookie
      delete event.request.headers.authorization
    }
  }
  if (event.extra) event.extra = scrubValue(event.extra)
  if (event.contexts) event.contexts = scrubValue(event.contexts)
  if (event.user) {
    delete event.user.email
    delete event.user.ip_address
  }
  return input
}
