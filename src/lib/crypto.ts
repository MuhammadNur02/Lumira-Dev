import 'server-only'
import crypto from 'node:crypto'
import { env } from '@/lib/env'

/** IPs are never stored raw (PRD NFR-SEC-13): HMAC-SHA256 with a server-side salt, truncated. */
export const hashIp = (ip: string) =>
  crypto.createHmac('sha256', env.IP_HASH_SALT).update(ip).digest('hex').slice(0, 32)

/** Constant-time comparison of two strings of possibly different lengths. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

/** SHA-256 hex digest. */
export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex')
