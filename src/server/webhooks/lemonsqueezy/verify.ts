import crypto from 'node:crypto'

/**
 * NFR-SEC-01: HMAC-SHA256 hex digest of the *raw* body with the signing secret, compared to
 * `X-Signature` in constant time after a length check.
 */
export function verifyLemonSqueezySignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const digest = Buffer.from(crypto.createHmac('sha256', secret).update(raw).digest('hex'), 'utf8')
  const given = Buffer.from(signature, 'utf8')
  return digest.length === given.length && crypto.timingSafeEqual(digest, given)
}

/** Plaintext license keys never reach the webhook ledger (FR-LIC-03); replays re-fetch them. */
export function redactLemonSqueezyEvent<T extends { data?: { type?: string; attributes?: Record<string, unknown> } }>(
  event: T,
): T {
  if (event.data?.type !== 'license-keys' || !event.data.attributes || !('key' in event.data.attributes)) return event
  return { ...event, data: { ...event.data, attributes: { ...event.data.attributes, key: '[redacted]' } } }
}
