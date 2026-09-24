import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { seedDatabase } from '../../scripts/seed-data'
import { createTestDb, type TestDb } from '../helpers/db'

describe('seed dataset (P2.06)', () => {
  let db: TestDb
  let client: PGlite
  let close: () => Promise<void>
  let summary: Awaited<ReturnType<typeof seedDatabase>>

  beforeAll(async () => {
    ;({ db, client, close } = await createTestDb())
    summary = await seedDatabase(db, { adminId: 'user_seed_admin', adminEmail: 'admin@lumira.test' })
  }, 180_000)
  afterAll(() => close())

  const count = async (table: string, where = 'true') =>
    (await client.query<{ n: number }>(`select count(*)::int as n from app.${table} where ${where}`)).rows[0]!.n

  it('mirrors the fixture catalog with published and draft releases', async () => {
    expect(await count('products')).toBe(summary.products)
    expect(await count('variants', "tier = 'all_access'")).toBe(2)
    expect(await count('releases', "status = 'published'")).toBeGreaterThan(summary.products)
    expect(await count('releases', "status = 'draft'")).toBe(summary.products)
  })

  it('creates one admin and the synthetic buyers', async () => {
    expect(await count('users', "role = 'admin'")).toBe(1)
    expect(await count('users', "role = 'buyer'")).toBe(summary.buyers)
  })

  it('makes the admin charts non-empty', async () => {
    expect(summary.orders).toBeGreaterThan(100)
    expect(await count('orders')).toBe(summary.orders)
    expect(await count('subscription_invoices')).toBeGreaterThan(24)
    expect(await count('mrr_snapshots')).toBe(90)
    expect(await count('checkout_sessions', "status in ('abandoned', 'expired')")).toBeGreaterThan(0)
    expect(await count('download_events')).toBeGreaterThan(0)
    const { rows } = await client.query<{ mrr: number }>(
      `select mrr_cents as mrr from app.mrr_snapshots order by date desc limit 1`,
    )
    expect(rows[0]!.mrr).toBeGreaterThan(0)
  })

  it('keeps every license key encrypted and hashed, never plaintext', async () => {
    const { rows } = await client.query<{ c: string }>(`select key_ciphertext as c from app.license_keys limit 5`)
    expect(rows.every((r) => r.c.startsWith('v1:'))).toBe(true)
    expect(await count('license_keys')).toBe(await count('license_keys', 'key_hash is not null'))
  })

  it('is deterministic and re-runnable', async () => {
    const again = await seedDatabase(db, { adminId: 'user_seed_admin', adminEmail: 'admin@lumira.test' })
    expect(again).toEqual(summary)
  }, 180_000)
})
