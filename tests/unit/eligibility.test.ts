import { describe, expect, it } from 'vitest'
import {
  ALL_ACCESS_GRACE_MS,
  coversProduct,
  evaluateEligibility,
  type EligibilityEntitlement,
  type EligibilityRelease,
} from '@/server/eligibility'

const NOW = new Date('2026-09-24T12:00:00Z')
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000)

const release = (over: Partial<EligibilityRelease> = {}): EligibilityRelease => ({
  productId: 'prod_saas',
  major: 2,
  status: 'published',
  publishedAt: days(-10),
  ...over,
})
const ent = (over: Partial<EligibilityEntitlement>): EligibilityEntitlement => ({
  id: 'ent_1',
  kind: 'license',
  status: 'active',
  productId: 'prod_saas',
  maxMajor: 2,
  validUntil: null,
  ...over,
})
const inCatalog = { inAllAccess: true }

describe('evaluateEligibility (PRD §7.3, Task.md P2.05)', () => {
  const cases: [
    string,
    EligibilityEntitlement[],
    EligibilityRelease,
    { inAllAccess: boolean },
    ReturnType<typeof evaluateEligibility>,
  ][] = [
    [
      'one-time license within the purchased major',
      [ent({})],
      release({ major: 2 }),
      inCatalog,
      { allowed: true, entitlementId: 'ent_1' },
    ],
    [
      'one-time license, an older major',
      [ent({ maxMajor: 3 })],
      release({ major: 1 }),
      inCatalog,
      { allowed: true, entitlementId: 'ent_1' },
    ],
    [
      'one-time license, the next major is denied',
      [ent({ maxMajor: 2 })],
      release({ major: 3 }),
      inCatalog,
      { allowed: false, reason: 'major_version' },
    ],
    [
      'comp grant without a major cap',
      [ent({ kind: 'comp', maxMajor: null })],
      release({ major: 9 }),
      inCatalog,
      { allowed: true, entitlementId: 'ent_1' },
    ],
    [
      'license for a different product',
      [ent({ productId: 'prod_other' })],
      release(),
      inCatalog,
      { allowed: false, reason: 'not_entitled' },
    ],
    [
      'All-Access active (renews in the future)',
      [ent({ kind: 'all_access', productId: null, maxMajor: null, validUntil: days(20) })],
      release({ major: 5 }),
      inCatalog,
      { allowed: true, entitlementId: 'ent_1' },
    ],
    [
      'All-Access with no end date',
      [ent({ kind: 'all_access', productId: null, maxMajor: null, validUntil: null })],
      release(),
      inCatalog,
      { allowed: true, entitlementId: 'ent_1' },
    ],
    [
      'All-Access expired: release published before valid_until',
      [ent({ kind: 'all_access', productId: null, maxMajor: null, validUntil: days(-5) })],
      release({ publishedAt: days(-30) }),
      inCatalog,
      { allowed: true, entitlementId: 'ent_1' },
    ],
    [
      'All-Access expired: release published after valid_until',
      [ent({ kind: 'all_access', productId: null, maxMajor: null, validUntil: days(-5) })],
      release({ publishedAt: days(-1) }),
      inCatalog,
      { allowed: false, reason: 'not_entitled' },
    ],
    [
      'All-Access does not cover products outside the catalog',
      [ent({ kind: 'all_access', productId: null, maxMajor: null, validUntil: days(20) })],
      release(),
      { inAllAccess: false },
      { allowed: false, reason: 'not_entitled' },
    ],
    [
      'suspended entitlement',
      [ent({ status: 'suspended' })],
      release(),
      inCatalog,
      { allowed: false, reason: 'not_entitled' },
    ],
    [
      'revoked entitlement (refund)',
      [ent({ status: 'revoked' })],
      release(),
      inCatalog,
      { allowed: false, reason: 'not_entitled' },
    ],
    ['yanked release', [ent({})], release({ status: 'yanked' }), inCatalog, { allowed: false, reason: 'withdrawn' }],
    [
      'draft release',
      [ent({})],
      release({ status: 'draft', publishedAt: null }),
      inCatalog,
      { allowed: false, reason: 'withdrawn' },
    ],
    ['no entitlements at all', [], release(), inCatalog, { allowed: false, reason: 'not_entitled' }],
    [
      'a later-major license wins over an expired pass',
      [
        ent({ id: 'pass', kind: 'all_access', productId: null, maxMajor: null, validUntil: days(-5) }),
        ent({ id: 'lic', maxMajor: 3 }),
      ],
      release({ major: 3, publishedAt: days(-1) }),
      inCatalog,
      { allowed: true, entitlementId: 'lic' },
    ],
  ]

  it.each(cases)('%s', (_name, entitlements, rel, product, expected) => {
    expect(evaluateEligibility(entitlements, rel, product, NOW)).toEqual(expected)
  })
})

describe('coversProduct', () => {
  const product = { id: 'prod_saas', inAllAccess: true }
  it('covers the licensed product only', () => {
    expect(coversProduct(ent({}), product, NOW)).toBe(true)
    expect(coversProduct(ent({ productId: 'x' }), product, NOW)).toBe(false)
  })
  it('honors the 14-day All-Access grace window', () => {
    const pastDue = ent({
      kind: 'all_access',
      productId: null,
      validUntil: new Date(NOW.getTime() - ALL_ACCESS_GRACE_MS + 1000),
    })
    const lapsed = ent({
      kind: 'all_access',
      productId: null,
      validUntil: new Date(NOW.getTime() - ALL_ACCESS_GRACE_MS - 1000),
    })
    expect(coversProduct(pastDue, product, NOW)).toBe(true)
    expect(coversProduct(lapsed, product, NOW)).toBe(false)
  })
  it('never covers suspended or revoked entitlements', () => {
    expect(coversProduct(ent({ status: 'suspended' }), product, NOW)).toBe(false)
    expect(coversProduct(ent({ status: 'revoked' }), product, NOW)).toBe(false)
  })
})
