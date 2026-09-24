import { describe, expect, it } from 'vitest'
import { scrubEvent, scrubString } from '@/lib/observability/scrub'

const KEY = '38b1460a-5104-4067-a91d-77b872934d51'

describe('Sentry scrubbing (P1.11, NFR-SEC-05)', () => {
  it('redacts UUID-shaped license keys and emails in strings', () => {
    expect(scrubString(`activate ${KEY.toUpperCase()} for ines@example.com`)).toBe(
      'activate [redacted-key] for [redacted-email]',
    )
  })

  it('redacts messages, exception values, breadcrumbs, request bodies and user identity', () => {
    const event = scrubEvent({
      message: `failed for ${KEY}`,
      exception: { values: [{ value: `bad key ${KEY}` }] },
      breadcrumbs: [{ message: `POST /activate ${KEY}`, data: { email: 'a@b.co' } }],
      request: {
        url: `https://lumira.dev/api?k=${KEY}`,
        data: JSON.stringify({ license_key: KEY }),
        cookies: { session: 'x' },
        headers: { cookie: 'x', authorization: `Bearer ${KEY}`, accept: '*/*' },
      },
      user: { id: 'user_1', email: 'a@b.co', ip_address: '1.2.3.4' },
    })
    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain(KEY)
    expect(serialized).not.toContain('a@b.co')
    expect(event.request?.cookies).toBeUndefined()
    expect(event.request?.headers).toEqual({ accept: '*/*' })
    expect(event.user).toEqual({ id: 'user_1' })
  })

  it('survives circular references', () => {
    const a: Record<string, unknown> = { note: KEY }
    a.self = a
    expect(() => scrubEvent({ extra: a })).not.toThrow()
  })
})
