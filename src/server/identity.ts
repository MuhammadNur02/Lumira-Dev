import 'server-only'
import { cache } from 'react'
import { clerkClient } from '@clerk/nextjs/server'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { checkoutSessions, entitlements, licenseKeys, orders, subscriptions, users } from '@/db/schema'

/** FR-AD-01: the admin role must also be set in Postgres, not only in Clerk's public metadata. */
export async function isAdminInDatabase(userId: string): Promise<boolean> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true, deletedAt: true } })
  return row?.role === 'admin' && !row.deletedAt
}

function splitName(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || undefined }
}

/**
 * Guest checkout → account (F-13): find the Clerk user for an order email, or create one without a
 * password. Never signs anyone in; account access still needs proof of email ownership
 * (NFR-SEC-15). Called outside the webhook transaction because it talks to Clerk.
 */
export async function resolveBuyerByEmail(email: string, fullName?: string | null) {
  const normalized = email.trim().toLowerCase()
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalized) })
  if (existing) return existing

  const clerk = await clerkClient()
  const found = await clerk.users.getUserList({ emailAddress: [normalized], limit: 1 })
  const clerkUser =
    found.data[0] ??
    (await clerk.users.createUser({
      emailAddress: [normalized],
      ...splitName(fullName),
      skipPasswordRequirement: true,
    }))

  const [row] = await db
    .insert(users)
    .values({ id: clerkUser.id, email: normalized, name: fullName ?? null })
    .onConflictDoUpdate({ target: users.id, set: { email: normalized } })
    .returning()
  return row!
}

/**
 * Claim guest records for a *verified* email (F-13): orders, entitlements, license keys,
 * subscriptions and checkout sessions whose `user_id` is still null.
 */
export async function claimByVerifiedEmail(userId: string, email: string) {
  const normalized = email.trim().toLowerCase()
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ userId })
      .where(and(isNull(orders.userId), sql`lower(${orders.customerEmail}) = ${normalized}`))
    await tx
      .update(entitlements)
      .set({ userId })
      .where(and(isNull(entitlements.userId), sql`lower(${entitlements.customerEmail}) = ${normalized}`))
    await tx
      .update(licenseKeys)
      .set({ userId })
      .where(and(isNull(licenseKeys.userId), sql`lower(${licenseKeys.customerEmail}) = ${normalized}`))
    await tx
      .update(subscriptions)
      .set({ userId })
      .where(and(isNull(subscriptions.userId), sql`lower(${subscriptions.customerEmail}) = ${normalized}`))
    await tx
      .update(checkoutSessions)
      .set({ userId })
      .where(and(isNull(checkoutSessions.userId), sql`lower(${checkoutSessions.email}) = ${normalized}`))
  })
}

/**
 * Lazy Clerk → Postgres mirror for the signed-in user (complements the `user.created` webhook).
 * The webhook can lag, fail, or, in local development, never arrive (Clerk cannot reach localhost).
 * Without a row, support requests, the admin guard and email preferences have nothing to join on.
 * Reads the user from Clerk server-side (authoritative), inserts it as a buyer and claims guest
 * records for verified addresses, exactly as the webhook would. Deduplicated per request.
 */
export const ensureUserRow = cache(async (userId: string): Promise<void> => {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } })
  if (existing) return
  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId).catch(() => null)
  if (!user) return
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ?? user.emailAddresses[0]
  if (!primary) return
  const email = primary.emailAddress.trim().toLowerCase()
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null
  // `onConflictDoNothing` without a target also covers the unique email: a row created from a
  // guest checkout under another id is never overwritten here; the webhook reconciles it.
  await db.insert(users).values({ id: userId, email, name }).onConflictDoNothing()
  for (const address of user.emailAddresses) {
    if (address.verification?.status === 'verified') await claimByVerifiedEmail(userId, address.emailAddress)
  }
})
