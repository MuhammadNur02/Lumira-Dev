'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { emailOutbox, entitlements, licenseKeys, products, users } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { billing } from '@/lib/billing'
import { adminAction, needsReverification, withAudit } from '@/server/admin/audit'
import { invalidateLicenseCache, logLicenseEvent } from '@/server/licensing'
import { drainOutboxes } from '@/server/outbox/dispatch'

const path = (userId: string) => `/admin/customers/${userId}`

/** FR-AD-41: resend = a new outbox row with a fresh idempotency key; the original stays for the record. */
export async function resendEmail(emailId: string) {
  return adminAction(async () => {
    const row = await db.query.emailOutbox.findFirst({ where: eq(emailOutbox.id, z.uuid().parse(emailId)) })
    if (!row) throw new Error('Email not found')
    if ((row.payload as { redacted?: boolean }).redacted)
      throw new Error('This email is older than 90 days; its payload was redacted.')
    const user = await db.query.users.findFirst({ where: eq(users.email, row.to), columns: { id: true } })
    await withAudit({ action: 'email.resent', targetType: 'email', targetId: row.id }, async () => {
      const [copy] = await db
        .insert(emailOutbox)
        .values({
          template: row.template,
          to: row.to,
          payload: row.payload,
          idempotencyKey: `resend:${row.id}:${crypto.randomUUID()}`,
        })
        .returning({ id: emailOutbox.id })
      return copy
    })
    await drainOutboxes({ limit: 5 })
    if (user) revalidatePath(path(user.id))
  })
}

const Comp = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  tier: z.enum(['personal', 'team', 'extended']),
  reason: z.string().trim().min(3).max(300),
})

/** Complimentary entitlement (support, partners). Always with a reason. */
export async function grantComp(raw: z.input<typeof Comp>) {
  return adminAction(async () => {
    const input = Comp.parse(raw)
    const { userId: adminId } = await requireAdmin()
    const [user, product] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, input.userId) }),
      db.query.products.findFirst({ where: eq(products.id, input.productId) }),
    ])
    if (!user || !product) throw new Error('Customer or product not found')
    await withAudit(
      { action: 'entitlement.comp_granted', targetType: 'user', targetId: user.id, reason: input.reason },
      async () => {
        const [row] = await db
          .insert(entitlements)
          .values({
            userId: user.id,
            customerEmail: user.email,
            kind: 'comp',
            productId: product.id,
            tier: input.tier,
            grantedBy: adminId,
          })
          .returning()
        return row
      },
    )
    revalidatePath(path(user.id))
  })
}

/** Destructive: step-up reverification, audited with before/after. */
export async function revokeEntitlement(entitlementId: string, reason: string) {
  const reverify = await needsReverification()
  if (reverify) return reverify
  return adminAction(async () => {
    const before = await db.query.entitlements.findFirst({ where: eq(entitlements.id, z.uuid().parse(entitlementId)) })
    if (!before) throw new Error('Entitlement not found')
    if (before.status === 'revoked') throw new Error('Already revoked')
    await withAudit(
      {
        action: 'entitlement.revoked',
        targetType: 'entitlement',
        targetId: before.id,
        before,
        reason: z.string().trim().min(3).max(300).parse(reason),
      },
      async () => {
        const [after] = await db
          .update(entitlements)
          .set({ status: 'revoked' })
          .where(eq(entitlements.id, before.id))
          .returning()
        return after
      },
    )
    if (before.userId) revalidatePath(path(before.userId))
  })
}

/** Raising limits is a privilege change: reverification + `PATCH /v1/license-keys/{id}` + local mirror. */
export async function setActivationLimit(keyId: string, limit: number | null, reason: string) {
  const reverify = await needsReverification()
  if (reverify) return reverify
  return adminAction(async () => {
    const { userId: adminId } = await requireAdmin()
    const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.id, z.uuid().parse(keyId)) })
    if (!key) throw new Error('License key not found')
    const next = limit === null ? null : z.number().int().min(1).max(1000).parse(limit)
    await withAudit(
      {
        action: 'license_key.limit_changed',
        targetType: 'license_key',
        targetId: key.id,
        before: { activationLimit: key.activationLimit },
        reason: z.string().trim().min(3).max(300).parse(reason),
      },
      async () => {
        await billing.updateLicenseKey(key.lsLicenseKeyId, { activation_limit: next })
        await db
          .update(licenseKeys)
          .set({ activationLimit: next })
          .where(and(eq(licenseKeys.id, key.id)))
        await logLicenseEvent({
          licenseKeyId: key.id,
          type: 'limit_changed',
          actor: 'admin',
          actorUserId: adminId,
          meta: { from: key.activationLimit, to: next },
          headers: await headers(),
        })
        await invalidateLicenseCache(key.keyHash)
        return { activationLimit: next }
      },
    )
    if (key.userId) revalidatePath(path(key.userId))
  })
}
