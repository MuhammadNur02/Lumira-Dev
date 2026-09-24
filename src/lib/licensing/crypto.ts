import 'server-only'
import crypto from 'node:crypto'
import { env } from '@/lib/env'

/** Key ring: new ciphertexts use the current version; older versions stay decryptable (rotation runbook). */
const KEYS: Record<string, () => Buffer> = {
  v1: () => Buffer.from(env.LICENSE_ENCRYPTION_KEY, 'base64'), // 32 bytes
}
const CURRENT = 'v1'

/** AES-256-GCM with a random 96-bit IV (FR-LIC-03): `v1:<iv>:<ciphertext>:<tag>` (base64url). */
export function encryptLicenseKey(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEYS[CURRENT]!(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [
    CURRENT,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join(':')
}

export function decryptLicenseKey(payload: string): string {
  const [version, iv, ciphertext, tag] = payload.split(':')
  const key = version ? KEYS[version] : undefined
  if (!key || !iv || !ciphertext || !tag) throw new Error('Unsupported license ciphertext')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
}

/** HMAC-SHA256 lookup hash (FR-LIC-03): find a key without decrypting anything. */
export const hashLicenseKey = (key: string) =>
  crypto.createHmac('sha256', env.LICENSE_HASH_PEPPER).update(key.trim()).digest('hex')

/** Masked display from LS `key_short` (SG §5.6): `••••••••-••••-••••-••••-••••••••4d51`. */
export const maskLicenseKey = (keyShort: string) => `••••••••-••••-••••-••••-••••••••${keyShort.slice(-4)}`
