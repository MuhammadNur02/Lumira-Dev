import { describe, expect, it } from 'vitest'
import { decryptLicenseKey, encryptLicenseKey, hashLicenseKey, maskLicenseKey } from '@/lib/licensing/crypto'

const KEY = '38B1460A-5104-4067-A91D-77B872934D51'

describe('license key storage (FR-LIC-03)', () => {
  it('round-trips through AES-256-GCM with the versioned format', () => {
    const payload = encryptLicenseKey(KEY)
    expect(payload).toMatch(/^v1:[\w-]+:[\w-]+:[\w-]+$/)
    expect(payload).not.toContain(KEY)
    expect(decryptLicenseKey(payload)).toBe(KEY)
  })

  it('uses a fresh IV every time', () => {
    expect(encryptLicenseKey(KEY)).not.toBe(encryptLicenseKey(KEY))
  })

  it('rejects tampered ciphertexts and unknown versions', () => {
    const [v, iv, ct, tag] = encryptLicenseKey(KEY).split(':') as [string, string, string, string]
    const flipped = ct.slice(0, -1) + (ct.endsWith('A') ? 'B' : 'A')
    expect(() => decryptLicenseKey([v, iv, flipped, tag].join(':'))).toThrow()
    expect(() => decryptLicenseKey(['v9', iv, ct, tag].join(':'))).toThrow(/Unsupported/)
    expect(() => decryptLicenseKey('garbage')).toThrow(/Unsupported/)
  })

  it('hashes deterministically for lookups, ignoring surrounding whitespace, never equal to the key', () => {
    expect(hashLicenseKey(KEY)).toBe(hashLicenseKey(`  ${KEY}\n`))
    expect(hashLicenseKey(KEY)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashLicenseKey(KEY)).not.toBe(hashLicenseKey(KEY.toLowerCase()))
  })

  it('masks to the last four characters of key_short', () => {
    expect(maskLicenseKey('XXXX-77B872934D51')).toBe('••••••••-••••-••••-••••-••••••••4D51')
  })
})
