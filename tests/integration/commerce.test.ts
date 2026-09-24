import crypto from 'node:crypto'
import fs from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'
import * as t from '@/db/schema'
import type { LsOrderAttributes, LsWebhook } from '@/lib/billing/lemonsqueezy/types'
import { sharedTestDb, type TestDb } from '../helpers/db'

vi.mock('@/db/client', async () => ({ db: (await (await import('../helpers/db')).sharedTestDb()).db }))

const { verifyLemonSqueezySignature, redactLemonSqueezyEvent } = await import('@/server/webhooks/lemonsqueezy/verify')
const { onOrderCreated } = await import('@/server/webhooks/lemonsqueezy/order-created')
const { onOrderRefunded } = await import('@/server/webhooks/lemonsqueezy/order-refunded')
const { canDownload } = await import('@/server/entitlements')
const { issueDownloadToken, peekDownloadToken, redeemDownloadToken } = await import('@/server/delivery/tokens')

const RAW = fs.readFileSync('tests/fixtures/lemonsqueezy/order_created.json', 'utf8')
const SECRET = 'lumira-test-signing-secret'
const CS = '00000000-0000-4000-8000-000000000001'

function order(
  id: number,
  variantId: number,
  overrides: Partial<LsOrderAttributes> = {},
  custom?: Record<string, string>,
): LsWebhook<LsOrderAttributes> {
  const base = JSON.parse(RAW) as LsWebhook<LsOrderAttributes>
  base.data.id = String(id)
  base.data.attributes = {
    ...base.data.attributes,
    order_number: id - 909000,
    first_order_item: {
      ...base.data.attributes.first_order_item,
      id: id + 10_000,
      order_id: id,
      variant_id: variantId,
    },
    ...overrides,
  }
  if (custom) base.meta.custom_data = custom
  return base
}

describe('Lemon Squeezy webhooks → commerce state (P5.17)', () => {
  let db: TestDb
  const count = async (table: typeof t.orders | typeof t.orderItems | typeof t.entitlements | typeof t.emailOutbox) =>
    (await db.select().from(table as typeof t.orders)).length

  beforeAll(async () => {
    ;({ db } = await sharedTestDb())
    await db.insert(t.users).values({ id: 'user_a', email: 'ada@example.test', name: 'Ada' })
    await db.insert(t.products).values([
      { id: 'p-lumen', slug: 'lumen-ui', name: 'Lumen UI', line: 'ui_kit' },
      { id: 'p-folio', slug: 'folio', name: 'Folio', line: 'template' },
    ])
    await db.insert(t.variants).values([
      {
        lsVariantId: 501,
        lsProductId: 30001,
        productId: 'p-lumen',
        tier: 'team',
        priceCents: 14900,
        activationLimit: 5,
      },
      {
        lsVariantId: 502,
        lsProductId: 30009,
        productId: null,
        tier: 'personal',
        priceCents: 19900,
        bundleProductIds: ['p-lumen', 'p-folio'],
      },
      {
        lsVariantId: 503,
        lsProductId: 30010,
        productId: null,
        tier: 'all_access',
        priceCents: 3900,
        interval: 'month',
      },
    ])
    await db.insert(t.releases).values([
      {
        productId: 'p-lumen',
        semver: '2.1.0',
        major: 2,
        minor: 1,
        patch: 0,
        r2Key: 'products/p-lumen/2.1.0.zip',
        sizeBytes: 1000,
        sha256: 'a'.repeat(64),
        status: 'published',
        publishedAt: new Date('2026-09-01'),
      },
      {
        productId: 'p-folio',
        semver: '1.0.0',
        major: 1,
        minor: 0,
        patch: 0,
        r2Key: 'products/p-folio/1.0.0.zip',
        sizeBytes: 1000,
        sha256: 'b'.repeat(64),
        status: 'published',
        publishedAt: new Date('2026-09-01'),
      },
    ])
    await db
      .insert(t.checkoutSessions)
      .values({ id: CS, userId: 'user_a', email: 'ada@example.test', lsVariantId: 501, discountCode: 'LAUNCH30' })
  })

  it('verifies the HMAC over the raw body in constant time and redacts keys before storage', () => {
    const signature = crypto.createHmac('sha256', SECRET).update(RAW).digest('hex')
    expect(verifyLemonSqueezySignature(RAW, signature, SECRET)).toBe(true)
    expect(verifyLemonSqueezySignature(`${RAW} `, signature, SECRET)).toBe(false) // re-serialized body fails
    expect(verifyLemonSqueezySignature(RAW, signature.slice(0, -2), SECRET)).toBe(false)
    expect(verifyLemonSqueezySignature(RAW, null, SECRET)).toBe(false)
    expect(verifyLemonSqueezySignature(RAW, signature, 'other-secret')).toBe(false)
    const redacted = redactLemonSqueezyEvent({
      data: { type: 'license-keys', attributes: { key: 'SECRET-KEY', key_short: 'XXXX-1234' } },
    })
    expect(redacted.data.attributes).toEqual({ key: '[redacted]', key_short: 'XXXX-1234' })
  })

  it('order_created: order, item, entitlement pinned to the current major, completed session and outbox rows', async () => {
    await onOrderCreated(order(910001, 501))
    const [o] = await db.select().from(t.orders).where(eq(t.orders.lsOrderId, 910001))
    expect(o).toMatchObject({
      userId: 'user_a',
      customerEmail: 'ada@example.test',
      status: 'paid',
      totalUsd: 16390,
      discountCode: 'LAUNCH30',
      testMode: true,
    })
    const ents = await db.select().from(t.entitlements).where(eq(t.entitlements.userId, 'user_a'))
    expect(ents).toHaveLength(1)
    expect(ents[0]).toMatchObject({
      productId: 'p-lumen',
      tier: 'team',
      kind: 'license',
      maxMajor: 2,
      status: 'active',
    })
    const session = await db.query.checkoutSessions.findFirst({ where: eq(t.checkoutSessions.id, CS) })
    expect(session).toMatchObject({ status: 'completed', orderId: o!.id })
    const jobs = await db.select({ kind: t.jobOutbox.kind }).from(t.jobOutbox)
    expect(jobs.map((j) => j.kind).sort()).toEqual(['analytics_capture', 'discord_grant', 'license_keys_fetch'])
    expect(await db.select().from(t.emailOutbox)).toHaveLength(1)
  })

  it('is idempotent across three identical deliveries', async () => {
    await onOrderCreated(order(910001, 501))
    await onOrderCreated(order(910001, 501))
    expect(await count(t.orders)).toBe(1)
    expect(await count(t.orderItems)).toBe(1)
    expect(await count(t.entitlements)).toBe(1)
    expect(await count(t.emailOutbox)).toBe(1)
  })

  it('expands bundles and leaves All-Access initial orders to subscription_created', async () => {
    await onOrderCreated(
      order(910002, 502, { user_email: 'ada@example.test' }, { cs_id: '00000000-0000-4000-8000-00000000000f' }),
    )
    const bundle = await db.query.orders.findFirst({ where: eq(t.orders.lsOrderId, 910002) })
    // Unknown cs_id falls back to email identity; ada@example.test is already a Lumira user.
    expect(bundle?.userId).toBe('user_a')
    const items = await db.select().from(t.orderItems).where(eq(t.orderItems.orderId, bundle!.id))
    const ents = await db.select().from(t.entitlements).where(eq(t.entitlements.sourceOrderItemId, items[0]!.id))
    expect(ents.map((e) => e.productId).sort()).toEqual(['p-folio', 'p-lumen'])

    await onOrderCreated(
      order(910003, 503, { user_email: 'ada@example.test' }, { cs_id: '00000000-0000-4000-8000-00000000000e' }),
    )
    const aa = await db.query.orders.findFirst({ where: eq(t.orders.lsOrderId, 910003) })
    const aaItems = await db.select().from(t.orderItems).where(eq(t.orderItems.orderId, aa!.id))
    expect(
      await db.select().from(t.entitlements).where(eq(t.entitlements.sourceOrderItemId, aaItems[0]!.id)),
    ).toHaveLength(0)
  })

  it('lets a guest scoped to the order download the owned major and nothing newer', async () => {
    const o = await db.query.orders.findFirst({ where: eq(t.orders.lsOrderId, 910001) })
    const [v2] = await db.select().from(t.releases).where(eq(t.releases.semver, '2.1.0'))
    const [v3] = await db
      .insert(t.releases)
      .values({
        productId: 'p-lumen',
        semver: '3.0.0',
        major: 3,
        minor: 0,
        patch: 0,
        r2Key: 'products/p-lumen/3.0.0.zip',
        sizeBytes: 1000,
        sha256: 'c'.repeat(64),
        status: 'published',
        publishedAt: new Date(),
      })
      .returning()
    expect((await canDownload({ orderId: o!.id }, v2!.id)).result).toMatchObject({ allowed: true })
    expect((await canDownload({ orderId: o!.id }, v3!.id)).result).toEqual({ allowed: false, reason: 'major_version' })
    expect((await canDownload({ userId: 'someone_else' }, v2!.id)).result).toEqual({
      allowed: false,
      reason: 'not_entitled',
    })
  })

  it('email download tokens: GET-style peeks never consume; 10 parallel redeems of a 5-use token → exactly 5', async () => {
    const o = await db.query.orders.findFirst({ where: eq(t.orders.lsOrderId, 910001) })
    const token = await issueDownloadToken({ orderId: o!.id, productId: 'p-lumen' })
    for (let i = 0; i < 5; i++) expect(await peekDownloadToken(token)).toBeTruthy()
    const [row] = await db.select().from(t.downloadTokens).where(eq(t.downloadTokens.orderId, o!.id))
    expect(row!.uses).toBe(0)

    const results = await Promise.all(Array.from({ length: 10 }, () => redeemDownloadToken(token)))
    expect(results.filter(Boolean)).toHaveLength(5)
    expect(await redeemDownloadToken(token)).toBeUndefined()
    expect(await peekDownloadToken(`${token.slice(0, -2)}xx`)).toBeUndefined() // tampered signature
  })

  it('a full refund revokes entitlements and email links, disables keys and emails the buyer', async () => {
    const o = await db.query.orders.findFirst({ where: eq(t.orders.lsOrderId, 910001) })
    await db.insert(t.licenseKeys).values({
      lsLicenseKeyId: 55001,
      lsOrderId: 910001,
      lsOrderItemId: 920001,
      lsProductId: 30001,
      orderId: o!.id,
      userId: 'user_a',
      customerEmail: 'ada@example.test',
      keyCiphertext: 'v1:x:y:z',
      keyHash: 'h'.repeat(64),
      keyShort: 'XXXX-ABCD',
      status: 'active',
      createdAt: new Date(),
    })
    const fresh = await issueDownloadToken({ orderId: o!.id, productId: 'p-lumen' })

    await onOrderRefunded(
      order(910001, 501, { status: 'refunded', refunded: true, refunded_at: '2026-09-21T10:00:00Z' }),
    )

    expect((await db.query.orders.findFirst({ where: eq(t.orders.id, o!.id) }))?.status).toBe('refunded')
    const [item] = await db.select().from(t.orderItems).where(eq(t.orderItems.orderId, o!.id))
    const [ent] = await db.select().from(t.entitlements).where(eq(t.entitlements.sourceOrderItemId, item!.id))
    expect(ent!.status).toBe('revoked')
    expect(await redeemDownloadToken(fresh)).toBeUndefined()
    const jobs = await db
      .select()
      .from(t.jobOutbox)
      .where(and(eq(t.jobOutbox.kind, 'license_key_disable')))
    expect(jobs).toHaveLength(1)
    const emails = await db.select().from(t.emailOutbox).where(eq(t.emailOutbox.template, 'refund-processed'))
    expect(emails).toHaveLength(1)
  })
})
