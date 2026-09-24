import 'server-only'

/** First hop of `x-forwarded-for` (Vercel sets it), falling back to `x-real-ip`. */
export function clientIp(source: Request | Headers): string {
  const headers = source instanceof Headers ? source : source.headers
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}

/** ISO country from Vercel's geo header, if present. */
export function clientCountry(source: Request | Headers): string | null {
  const headers = source instanceof Headers ? source : source.headers
  return headers.get('x-vercel-ip-country')
}

/** Accepts JSON or form-encoded bodies (the LS License API itself is form-encoded). Returns null on garbage. */
export async function readJsonOrForm(req: Request): Promise<Record<string, unknown> | null> {
  const type = req.headers.get('content-type') ?? ''
  try {
    if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
      return Object.fromEntries((await req.formData()).entries())
    }
    const body: unknown = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** 429 with `Retry-After` in seconds from an Upstash `reset` timestamp (ms). */
export function tooManyRequests(resetAtMs: number, message = 'Too many requests. Try again shortly.') {
  const retryAfter = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000))
  return Response.json({ error: message }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
}

/** Rejects bodies over `limit` bytes before parsing (webhooks are capped at 1 MB, NFR-SEC-10). */
export async function readTextCapped(req: Request, limit = 1_000_000): Promise<string | null> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > limit) return null
  const text = await req.text()
  return Buffer.byteLength(text, 'utf8') > limit ? null : text
}
