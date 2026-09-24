import 'server-only'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

export const redis = new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })

type Window = Parameters<typeof Ratelimit.slidingWindow>[1]

const limiter = (prefix: string, tokens: number, window: Window) =>
  new Ratelimit({
    redis,
    prefix: `rl:${prefix}`,
    limiter: Ratelimit.slidingWindow(tokens, window),
    ephemeralCache: new Map(), // blocked identifiers are refused without a Redis round trip
    analytics: false,
  })

/** PRD NFR-SEC-10. Identifiers are hashed IPs, user ids or key hashes; never raw keys or IPs. */
export const ratelimit = {
  checkout: limiter('checkout', 20, '1 m'),
  checkoutOpenSessions: limiter('checkout:open', 3, '10 m'),
  downloadAsset: limiter('dl:asset', 10, '1 h'),
  downloadUser: limiter('dl:user', 60, '1 h'),
  downloadToken: limiter('dl:token', 20, '1 h'),
  licenseKey: limiter('lic:key', 30, '1 h'),
  licenseIp: limiter('lic:ip', 120, '1 h'),
  registryKey: limiter('reg:key', 300, '1 h'),
  discord: limiter('discord', 5, '1 h'),
  admin: limiter('admin', 60, '1 m'),
  // Account self-service (beyond NFR-SEC-10's list): key reveals and data exports.
  reveal: limiter('lic:reveal', 30, '10 m'),
  accountExport: limiter('account:export', 5, '1 h'),
  support: limiter('support', 5, '1 h'),
}

export type RateLimiterName = keyof typeof ratelimit
