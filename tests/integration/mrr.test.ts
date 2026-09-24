import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import * as t from '@/db/schema'
import { snapshotMrr } from '@/server/metrics/mrr'
import { createTestDb, type TestDb } from '../helpers/db'

// P7.03 / P7.14: movement classification (new, expansion, contraction, churn, reactivation) and
// idempotency of the daily snapshot, against the real migrations.
describe('MRR snapshots', () => {
  let db: TestDb
  let client: PGlite
  let close: () => Promise<void>

  const snap = async (date: string) =>
    (
      await client.query<{
        mrr: number
        subs: number
        new: number
        exp: number
        con: number
        churn: number
        react: number
      }>(
        `select mrr_cents as mrr, active_subscriptions as subs, new_cents as new, expansion_cents as exp,
              contraction_cents as con, churned_cents as churn, reactivated_cents as react
       from app.mrr_snapshots where date = $1`,
        [date],
      )
    ).rows[0]!

  beforeAll(async () => {
    ;({ db, client, close } = await createTestDb())
    await db.insert(t.variants).values([
      { lsVariantId: 1, lsProductId: 10, tier: 'all_access', priceCents: 3900, interval: 'month' },
      { lsVariantId: 2, lsProductId: 10, tier: 'all_access', priceCents: 39000, interval: 'year' },
    ])
    await db.insert(t.subscriptions).values({
      lsSubscriptionId: 100,
      lsOrderId: 1000,
      customerEmail: 'a@example.test',
      lsVariantId: 1,
      status: 'active',
      interval: 'month',
      unitPriceUsd: 3900,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    })
  })
  afterAll(() => close())

  it('counts a first subscription as new', async () => {
    await snapshotMrr(db, '2026-01-01')
    expect(await snap('2026-01-01')).toMatchObject({ mrr: 3900, subs: 1, new: 3900, exp: 0, churn: 0 })
  })

  it('classifies expansion and normalizes yearly plans ÷ 12', async () => {
    await db.update(t.subscriptions).set({ unitPriceUsd: 5000 }).where(eq(t.subscriptions.lsSubscriptionId, 100))
    await db.insert(t.subscriptions).values({
      lsSubscriptionId: 200,
      lsOrderId: 2000,
      customerEmail: 'b@example.test',
      lsVariantId: 2,
      status: 'active',
      interval: 'year',
      unitPriceUsd: 39000,
      createdAt: new Date('2026-01-02T10:00:00Z'),
    })
    await snapshotMrr(db, '2026-01-02')
    expect(await snap('2026-01-02')).toMatchObject({ mrr: 5000 + 3250, subs: 2, new: 3250, exp: 1100, con: 0 })
  })

  it('is idempotent', async () => {
    const before = await snap('2026-01-02')
    await snapshotMrr(db, '2026-01-02')
    expect(await snap('2026-01-02')).toEqual(before)
  })

  it('classifies contraction and churn', async () => {
    await db.update(t.subscriptions).set({ unitPriceUsd: 3000 }).where(eq(t.subscriptions.lsSubscriptionId, 100))
    await db.update(t.subscriptions).set({ status: 'expired' }).where(eq(t.subscriptions.lsSubscriptionId, 200))
    await snapshotMrr(db, '2026-01-03')
    expect(await snap('2026-01-03')).toMatchObject({ mrr: 3000, subs: 1, con: 2000, churn: 3250, new: 0 })
  })

  it('classifies a returning subscription as reactivation, not new', async () => {
    await db.update(t.subscriptions).set({ status: 'active' }).where(eq(t.subscriptions.lsSubscriptionId, 200))
    await snapshotMrr(db, '2026-01-04')
    expect(await snap('2026-01-04')).toMatchObject({ react: 3250, new: 0 })
  })

  it('keeps past-due subscriptions for 14 days only', async () => {
    await db
      .update(t.subscriptions)
      .set({ status: 'past_due', pastDueSince: new Date('2025-12-01T00:00:00Z') })
      .where(eq(t.subscriptions.lsSubscriptionId, 100))
    await snapshotMrr(db, '2026-01-05')
    expect((await snap('2026-01-05')).mrr).toBe(3250)
  })
})
