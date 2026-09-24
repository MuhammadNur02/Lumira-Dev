import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeRedis } from '../mocks/fake-redis'

const fake = new FakeRedis()
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {
      return fake
    }
  },
}))

describe('ratelimit (NFR-SEC-10)', () => {
  beforeEach(() => {
    fake.store.clear()
    vi.useFakeTimers()
    // Start of a window, so no weighted carry-over from a previous bucket.
    vi.setSystemTime(new Date('2026-09-24T10:00:00.000Z'))
  })

  it('refuses the 21st checkout call from one IP within a minute', async () => {
    const { ratelimit } = await import('@/lib/rate-limit')
    const results = []
    for (let i = 0; i < 21; i++) results.push(await ratelimit.checkout.limit(`ip-hash-${'a'}`))
    expect(results.slice(0, 20).every((r) => r.success)).toBe(true)
    expect(results[20]!.success).toBe(false)
    expect(results[20]!.remaining).toBe(0)
  })

  it('keeps separate budgets per identifier', async () => {
    const { ratelimit } = await import('@/lib/rate-limit')
    for (let i = 0; i < 20; i++) await ratelimit.checkout.limit('ip-a')
    expect((await ratelimit.checkout.limit('ip-b')).success).toBe(true)
  })

  it('allows 10 downloads of one asset per hour, then answers with a reset time', async () => {
    const { ratelimit } = await import('@/lib/rate-limit')
    for (let i = 0; i < 10; i++) expect((await ratelimit.downloadAsset.limit('user_1:prod_1')).success).toBe(true)
    const refused = await ratelimit.downloadAsset.limit('user_1:prod_1')
    expect(refused.success).toBe(false)
    expect(refused.reset).toBeGreaterThan(Date.now())
  })
})
