import { beforeAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import * as t from '@/db/schema'
import { sharedTestDb, type TestDb } from '../helpers/db'

vi.mock('@/db/client', async () => ({ db: (await (await import('../helpers/db')).sharedTestDb()).db }))

const clerkUser = {
  id: 'user_new',
  firstName: 'Grace',
  lastName: 'Hopper',
  primaryEmailAddressId: 'e1',
  emailAddresses: [
    { id: 'e1', emailAddress: 'Grace@Example.test', verification: { status: 'verified' } },
    { id: 'e2', emailAddress: 'unverified@example.test', verification: { status: 'unverified' } },
  ],
}
const getUser = vi.fn(async (id: string) => {
  if (id !== clerkUser.id) throw new Error('not found')
  return clerkUser
})
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: async () => ({ users: { getUser } }) }))

const { ensureUserRow } = await import('@/server/identity')

// The Clerk webhook cannot reach localhost and can lag in production: the signed-in user is
// mirrored lazily so support, admin and preferences always have a users row to join on.
describe('ensureUserRow', () => {
  let db: TestDb

  beforeAll(async () => {
    ;({ db } = await sharedTestDb())
    await db.insert(t.variants).values({ lsVariantId: 1, lsProductId: 1, tier: 'personal', priceCents: 1000 })
    // A guest order placed before the account existed.
    await db.insert(t.orders).values({
      lsOrderId: 1,
      orderNumber: 1,
      customerEmail: 'grace@example.test',
      status: 'paid',
      currency: 'USD',
      subtotalUsd: 1000,
      totalUsd: 1000,
      createdAt: new Date(),
    })
  })

  it('creates the row from Clerk and claims guest orders for verified addresses', async () => {
    await ensureUserRow('user_new')
    const row = await db.query.users.findFirst({ where: eq(t.users.id, 'user_new') })
    expect(row).toMatchObject({ email: 'grace@example.test', name: 'Grace Hopper', role: 'buyer' })
    const order = await db.query.orders.findFirst({ where: eq(t.orders.lsOrderId, 1) })
    expect(order?.userId).toBe('user_new')
  })

  it('is a no-op once the row exists (no Clerk round trip)', async () => {
    getUser.mockClear()
    await ensureUserRow('user_new')
    expect(getUser).not.toHaveBeenCalled()
    expect(await db.select().from(t.users).where(eq(t.users.id, 'user_new'))).toHaveLength(1)
  })

  it('never overwrites an existing row that owns the same email under another id', async () => {
    await db.insert(t.users).values({ id: 'user_other', email: 'dup@example.test', role: 'admin' })
    clerkUser.id = 'user_dup'
    clerkUser.emailAddresses = [{ id: 'e1', emailAddress: 'dup@example.test', verification: { status: 'unverified' } }]
    await ensureUserRow('user_dup')
    expect(await db.query.users.findFirst({ where: eq(t.users.id, 'user_other') })).toMatchObject({ role: 'admin' })
    expect(await db.query.users.findFirst({ where: eq(t.users.id, 'user_dup') })).toBeUndefined()
  })

  it('does nothing when Clerk does not know the user', async () => {
    await expect(ensureUserRow('user_ghost')).resolves.toBeUndefined()
    expect(await db.query.users.findFirst({ where: eq(t.users.id, 'user_ghost') })).toBeUndefined()
  })
})
