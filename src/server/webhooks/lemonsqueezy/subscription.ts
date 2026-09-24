import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { db, type Tx } from '@/db/client'
import {
  checkoutSessions,
  entitlements,
  licenseKeys,
  paymentEvents,
  subscriptionInvoices,
  subscriptions,
  users,
  variants,
} from '@/db/schema'
import type {
  LsInvoiceAttributes,
  LsSubscriptionAttributes,
  LsSubscriptionStatus,
  LsWebhook,
} from '@/lib/billing/lemonsqueezy/types'
import { resolveBuyerByEmail } from '@/server/identity'
import { enqueueEmail, enqueueJob } from '@/server/outbox/enqueue'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SUSPENDED: LsSubscriptionStatus[] = ['unpaid', 'paused', 'expired']

/** Entitlement per LS status (Task.md P5.10 table). */
export function entitlementForStatus(
  status: LsSubscriptionStatus,
  a: { renews_at: string | null; ends_at: string | null },
) {
  const renews = a.renews_at ? new Date(a.renews_at) : null
  const ends = a.ends_at ? new Date(a.ends_at) : null
  switch (status) {
    case 'on_trial':
    case 'active':
    case 'past_due': // grace ≤ 14 days, dunning through subscription_payment_failed
      return { status: 'active' as const, validUntil: renews }
    case 'unpaid':
      return { status: 'suspended' as const, validUntil: renews }
    case 'paused':
      return { status: 'suspended' as const, validUntil: null }
    case 'cancelled': // access until the end of the paid period
      return { status: 'active' as const, validUntil: ends ?? renews }
    case 'expired': // historical access only: releases published before ends_at stay downloadable
      return { status: 'active' as const, validUntil: ends ?? renews ?? new Date() }
  }
}

async function enqueueKeyToggle(tx: Tx, lsOrderId: number, disabled: boolean, reason: string) {
  const keys = await tx
    .select({ lsLicenseKeyId: licenseKeys.lsLicenseKeyId })
    .from(licenseKeys)
    .where(eq(licenseKeys.lsOrderId, lsOrderId))
  for (const k of keys) {
    const kind = disabled ? 'license_key_disable' : 'license_key_enable'
    await enqueueJob(
      tx,
      kind,
      { lsLicenseKeyId: k.lsLicenseKeyId, reason },
      `${kind}:${reason}:${k.lsLicenseKeyId}:${Date.now()}`,
    )
  }
}

/**
 * All-Access lifecycle (F-04): created / updated / cancelled / resumed / expired / paused /
 * unpaused. Upserts the subscription and its single All-Access entitlement, then toggles the key,
 * the Discord role and the emails according to the transition.
 */
export async function onSubscriptionChanged(event: LsWebhook<LsSubscriptionAttributes>) {
  const a = event.data.attributes
  const name = event.meta.event_name
  const lsSubscriptionId = Number(event.data.id)
  const email = a.user_email.trim().toLowerCase()
  const custom = event.meta.custom_data ?? {}

  const variant = await db.query.variants.findFirst({ where: eq(variants.lsVariantId, a.variant_id) })
  if (!variant) throw new Error(`Unmapped LS variant ${a.variant_id}`)

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.lsSubscriptionId, lsSubscriptionId),
  })
  let userId = existing?.userId ?? null
  if (!userId) {
    const csId = typeof custom.cs_id === 'string' && UUID.test(custom.cs_id) ? custom.cs_id : null
    const session = csId
      ? await db.query.checkoutSessions.findFirst({ where: eq(checkoutSessions.id, csId) })
      : undefined
    userId = session?.userId ?? (await resolveBuyerByEmail(email, a.user_name)).id
  }

  const previous = existing?.status
  const pastDueSince = a.status === 'past_due' ? (existing?.pastDueSince ?? new Date()) : null
  const grant = entitlementForStatus(a.status, a)

  await db.transaction(async (tx) => {
    const [sub] = await tx
      .insert(subscriptions)
      .values({
        lsSubscriptionId,
        lsOrderId: a.order_id,
        userId,
        customerEmail: email,
        lsVariantId: a.variant_id,
        status: a.status,
        interval: variant.interval ?? 'month',
        unitPriceUsd: variant.priceCents,
        cardBrand: a.card_brand,
        cardLastFour: a.card_last_four,
        renewsAt: a.renews_at ? new Date(a.renews_at) : null,
        endsAt: a.ends_at ? new Date(a.ends_at) : null,
        trialEndsAt: a.trial_ends_at ? new Date(a.trial_ends_at) : null,
        pastDueSince,
        testMode: a.test_mode,
        createdAt: new Date(a.created_at),
      })
      .onConflictDoUpdate({
        target: subscriptions.lsSubscriptionId,
        set: {
          status: a.status,
          lsVariantId: a.variant_id,
          interval: variant.interval ?? 'month',
          cardBrand: a.card_brand,
          cardLastFour: a.card_last_four,
          renewsAt: a.renews_at ? new Date(a.renews_at) : null,
          endsAt: a.ends_at ? new Date(a.ends_at) : null,
          trialEndsAt: a.trial_ends_at ? new Date(a.trial_ends_at) : null,
          pastDueSince,
          userId: sql`coalesce(${subscriptions.userId}, excluded.user_id)`,
        },
      })
      .returning()
    if (!sub) return

    await tx
      .insert(entitlements)
      .values({
        userId,
        customerEmail: email,
        kind: 'all_access',
        tier: 'all_access',
        sourceSubscriptionId: sub.id,
        status: grant.status,
        validFrom: new Date(a.created_at),
        validUntil: grant.validUntil,
      })
      .onConflictDoUpdate({
        target: entitlements.sourceSubscriptionId,
        targetWhere: sql`source_subscription_id is not null`,
        set: { status: grant.status, validUntil: grant.validUntil },
      })

    // Link the subscription's license key when it arrived first (webhooks are order-agnostic, PRD R3).
    await tx
      .update(licenseKeys)
      .set({ subscriptionId: sub.id, userId: sql`coalesce(${licenseKeys.userId}, ${userId})` })
      .where(and(eq(licenseKeys.lsOrderId, a.order_id), sql`${licenseKeys.subscriptionId} is null`))

    const nowSuspended = SUSPENDED.includes(a.status)
    const wasSuspended = previous ? SUSPENDED.includes(previous) : false
    if (nowSuspended && !wasSuspended) {
      await enqueueKeyToggle(tx, a.order_id, true, `subscription_${a.status}`)
      if (userId)
        await enqueueJob(tx, 'discord_revoke', { userId }, `discord_revoke:${sub.id}:${a.status}:${a.updated_at}`)
    } else if (!nowSuspended && wasSuspended) {
      await enqueueKeyToggle(tx, a.order_id, false, `subscription_${a.status}`)
      if (userId)
        await enqueueJob(tx, 'discord_grant', { userId }, `discord_grant:${sub.id}:${a.status}:${a.updated_at}`)
    }

    const mrrUsd = (variant.interval === 'year' ? variant.priceCents / 12 : variant.priceCents) / 100
    if (name === 'subscription_created') {
      await enqueueEmail(tx, {
        template: 'all-access-welcome',
        to: email,
        payload: { subscriptionId: sub.id },
        idempotencyKey: `all-access-welcome:${sub.id}`,
      })
      await enqueueJob(
        tx,
        'analytics_capture',
        {
          event: 'subscription_started',
          distinctId: custom.ph_id || userId || sub.id,
          properties: { interval: sub.interval, mrr_usd: mrrUsd },
        },
        `subscription_started:${sub.id}`,
      )
      if (userId) await enqueueJob(tx, 'discord_grant', { userId }, `discord_grant:${sub.id}:created`)
    }
    if (name === 'subscription_cancelled' || name === 'subscription_expired') {
      await enqueueEmail(tx, {
        template: 'subscription-ended',
        to: email,
        payload: { subscriptionId: sub.id, state: a.status },
        idempotencyKey: `subscription-ended:${sub.id}:${a.status}`,
      })
    }
    if (name === 'subscription_expired') {
      await enqueueJob(
        tx,
        'analytics_capture',
        {
          event: 'subscription_churned',
          distinctId: userId || sub.id,
          properties: { interval: sub.interval, mrr_usd: mrrUsd },
        },
        `subscription_churned:${sub.id}`,
      )
    }
  })
}

/**
 * Invoice events (F-12, P5.10): invoices for revenue metrics, payment events for dunning, and the
 * MRR unit price refreshed from what the customer actually paid (P7.03).
 */
export async function onSubscriptionPayment(event: LsWebhook<LsInvoiceAttributes>) {
  const a = event.data.attributes
  const name = event.meta.event_name
  const lsInvoiceId = Number(event.data.id)
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.lsSubscriptionId, a.subscription_id) })
  if (!sub) throw new Error(`Invoice for unknown LS subscription ${a.subscription_id}`) // subscription_created pending → retry

  await db.transaction(async (tx) => {
    await tx
      .insert(subscriptionInvoices)
      .values({
        lsInvoiceId,
        subscriptionId: sub.id,
        status: a.status,
        billingReason: a.billing_reason,
        subtotalUsd: a.subtotal_usd,
        discountUsd: a.discount_total_usd,
        taxUsd: a.tax_usd,
        totalUsd: a.total_usd,
        testMode: a.test_mode,
        createdAt: new Date(a.created_at),
      })
      .onConflictDoUpdate({ target: subscriptionInvoices.lsInvoiceId, set: { status: a.status } })

    const event = (type: 'payment_failed' | 'payment_recovered' | 'payment_refunded') =>
      tx
        .insert(paymentEvents)
        .values({
          type,
          userId: sub.userId,
          subscriptionId: sub.id,
          amountUsd: a.total_usd,
          lsInvoiceId,
          meta: { billingReason: a.billing_reason },
        })
        .onConflictDoNothing()

    switch (name) {
      case 'subscription_payment_success':
        await tx
          .update(subscriptions)
          .set({ pastDueSince: null, unitPriceUsd: Math.max(0, a.subtotal_usd - a.discount_total_usd) })
          .where(eq(subscriptions.id, sub.id))
        break
      case 'subscription_payment_failed':
        await event('payment_failed')
        await enqueueEmail(tx, {
          template: 'payment-failed',
          to: sub.customerEmail,
          payload: { subscriptionId: sub.id, invoiceId: lsInvoiceId },
          idempotencyKey: `payment-failed:${lsInvoiceId}`,
        })
        break
      case 'subscription_payment_recovered':
        await event('payment_recovered')
        await tx.update(subscriptions).set({ pastDueSince: null }).where(eq(subscriptions.id, sub.id))
        break
      case 'subscription_payment_refunded':
        await event('payment_refunded')
        break
    }
  })
}

/** `customer_updated`: link the LS customer id to the Lumira user with that email. */
export async function onCustomerUpdated(event: LsWebhook<{ email?: string }>) {
  const email = event.data.attributes.email?.trim().toLowerCase()
  if (!email) return
  await db
    .update(users)
    .set({ lsCustomerId: Number(event.data.id) })
    .where(and(eq(users.email, email), sql`${users.lsCustomerId} is null`))
}
