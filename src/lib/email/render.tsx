import 'server-only'
import type { ReactElement } from 'react'
import { and, desc, eq, inArray, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  entitlements,
  licenseKeys,
  orderItems,
  orders,
  products,
  releases,
  subscriptions,
  users,
  variants,
} from '@/db/schema'
import OrderConfirmationEmail, { type OrderConfirmationProps } from '@/emails/order-confirmation'
import {
  AdminAlertEmail,
  SupportRequestEmail,
  AllAccessWelcomeEmail,
  LicenseKeyReadyEmail,
  PaymentFailedEmail,
  RefundProcessedEmail,
  SubscriptionEndedEmail,
} from '@/emails/simple-emails'
import { billing } from '@/lib/billing'
import { env } from '@/lib/env'
import { formatBytes, formatDate, formatMoney, TIER_LABEL } from '@/lib/format'
import { decryptLicenseKey } from '@/lib/licensing/crypto'
import { createLibrarySignInLink } from '@/server/auth/library-link'
import { issueDownloadToken } from '@/server/delivery/tokens'
import type { EmailTemplate } from '@/server/outbox/enqueue'

export type RenderedEmail = {
  subject: string
  react: ReactElement
  from?: string
  replyTo?: string
  headers?: Record<string, string>
  /** Merged into `email_outbox.payload` after a successful send (references only, never secrets). */
  payloadPatch?: Record<string, unknown>
}

const app = () => env.NEXT_PUBLIC_APP_URL
const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? null
const ACTIVATES = new Set(['boilerplate', 'ui_kit'])

async function orderConfirmation(orderId: string): Promise<RenderedEmail> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order) throw new Error(`Order ${orderId} not found`)
  const user = order.userId ? await db.query.users.findFirst({ where: eq(users.id, order.userId) }) : undefined

  const granted = await db
    .select({ entitlement: entitlements, product: products })
    .from(entitlements)
    .innerJoin(orderItems, eq(orderItems.id, entitlements.sourceOrderItemId))
    .innerJoin(products, eq(products.id, entitlements.productId))
    .where(and(eq(orderItems.orderId, orderId), eq(entitlements.status, 'active')))

  const keys = await db.select().from(licenseKeys).where(eq(licenseKeys.lsOrderId, order.lsOrderId))
  const productLsIds = await db
    .select({ productId: variants.productId, lsProductId: variants.lsProductId })
    .from(variants)
    .where(inArray(variants.productId, granted.map((g) => g.product.id).concat('')))

  const items: OrderConfirmationProps['items'] = []
  for (const { entitlement, product } of granted) {
    const [release] = await db
      .select()
      .from(releases)
      .where(
        and(
          eq(releases.productId, product.id),
          eq(releases.status, 'published'),
          entitlement.maxMajor != null ? lte(releases.major, entitlement.maxMajor) : undefined,
        ),
      )
      .orderBy(desc(releases.major), desc(releases.minor), desc(releases.patch))
      .limit(1)
    const token = release ? await issueDownloadToken({ orderId, productId: product.id, releaseId: release.id }) : null
    const lsIds = new Set(productLsIds.filter((v) => v.productId === product.id).map((v) => v.lsProductId))
    const key = keys.find((k) => lsIds.has(k.lsProductId)) ?? (keys.length === 1 ? keys[0] : undefined)
    items.push({
      productName: product.name,
      tier: TIER_LABEL[entitlement.tier ?? 'personal'],
      version: release?.semver ?? null,
      sizeLabel: release ? formatBytes(release.sizeBytes) : null,
      downloadUrl: token ? `${app()}/d/${token}` : null,
      docsUrl: `${app()}/docs/${product.slug}`,
      licenseKey: key ? decryptLicenseKey(key.keyCiphertext) : null,
      activationCommand: ACTIVATES.has(product.line) ? 'npx lumira@latest activate' : null,
    })
  }

  return {
    subject:
      items.length === 1
        ? `Your ${items[0]!.productName} license and download`
        : `Your Lumira order #${order.orderNumber}`,
    react: (
      <OrderConfirmationEmail
        firstName={firstName(user?.name)}
        orderNumber={order.orderNumber}
        receiptUrl={order.receiptUrl}
        libraryUrl={await createLibrarySignInLink(order.userId)}
        appUrl={app()}
        items={items}
      />
    ),
    payloadPatch: { withoutKey: items.some((i) => !i.licenseKey) },
  }
}

async function licenseKeyReady(licenseKeyId: string): Promise<RenderedEmail> {
  const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.id, licenseKeyId) })
  if (!key) throw new Error(`License key ${licenseKeyId} not found`)
  const [variant] = await db
    .select({ product: products })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.lsProductId, key.lsProductId))
    .limit(1)
  const name = variant?.product.name ?? 'your Lumira asset'
  return {
    subject: `Your ${name} license key is ready`,
    react: (
      <LicenseKeyReadyEmail
        productName={name}
        licenseKey={decryptLicenseKey(key.keyCiphertext)}
        activationCommand={variant && ACTIVATES.has(variant.product.line) ? 'npx lumira@latest activate' : null}
        docsUrl={`${app()}/docs/${variant?.product.slug ?? ''}`}
        libraryUrl={await createLibrarySignInLink(key.userId)}
        appUrl={app()}
      />
    ),
  }
}

async function subscriptionEmail(
  template: 'all-access-welcome' | 'payment-failed' | 'subscription-ended',
  payload: Record<string, unknown>,
): Promise<RenderedEmail> {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, String(payload.subscriptionId)) })
  if (!sub) throw new Error(`Subscription ${String(payload.subscriptionId)} not found`)
  const user = sub.userId ? await db.query.users.findFirst({ where: eq(users.id, sub.userId) }) : undefined

  if (template === 'all-access-welcome') {
    const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.lsOrderId, sub.lsOrderId) })
    return {
      subject: 'Welcome to the Lumira All-Access Pass',
      react: (
        <AllAccessWelcomeEmail
          firstName={firstName(user?.name)}
          plan={sub.interval === 'year' ? 'Yearly' : 'Monthly'}
          renewsOn={sub.renewsAt ? formatDate(sub.renewsAt) : null}
          licenseKey={key ? decryptLicenseKey(key.keyCiphertext) : null}
          libraryUrl={await createLibrarySignInLink(sub.userId)}
          appUrl={app()}
        />
      ),
      payloadPatch: { withoutKey: !key },
    }
  }
  if (template === 'payment-failed') {
    // The update-payment URL is signed and short-lived: fetched now, never stored (PRD §6.6).
    const { updatePaymentMethod } = await billing.getSubscriptionUrls(sub.lsSubscriptionId)
    return {
      subject: 'Action needed: your All-Access payment failed',
      react: (
        <PaymentFailedEmail
          amount={formatMoney(sub.unitPriceUsd)}
          updatePaymentUrl={updatePaymentMethod}
          nextAttempt={sub.renewsAt ? formatDate(sub.renewsAt) : null}
          appUrl={app()}
        />
      ),
    }
  }
  const state = payload.state === 'expired' ? 'expired' : 'cancelled'
  return {
    subject: state === 'cancelled' ? 'Your All-Access Pass is cancelled' : 'Your All-Access Pass has ended',
    react: (
      <SubscriptionEndedEmail
        state={state}
        endsOn={sub.endsAt ? formatDate(sub.endsAt) : null}
        resumeUrl={state === 'cancelled' ? `${app()}/account/billing` : `${app()}/all-access`}
        appUrl={app()}
      />
    ),
  }
}

async function refundProcessed(orderId: string): Promise<RenderedEmail> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order) throw new Error(`Order ${orderId} not found`)
  return {
    subject: `Refund processed for order #${order.orderNumber}`,
    react: (
      <RefundProcessedEmail
        orderNumber={order.orderNumber}
        amount={formatMoney(order.totalUsd)}
        receiptUrl={order.receiptUrl}
        appUrl={app()}
      />
    ),
  }
}

/** FR-GS-08: buyer message to support with order and license context; replies go to the buyer. */
async function supportRequest(payload: Record<string, unknown>): Promise<RenderedEmail> {
  const user = await db.query.users.findFirst({ where: eq(users.id, String(payload.userId)) })
  if (!user) throw new Error('Support request from an unknown user')
  const order = payload.orderId
    ? await db.query.orders.findFirst({
        where: and(eq(orders.id, String(payload.orderId)), eq(orders.userId, user.id)),
      })
    : undefined
  const key = payload.licenseKeyId
    ? await db.query.licenseKeys.findFirst({
        where: and(eq(licenseKeys.id, String(payload.licenseKeyId)), eq(licenseKeys.userId, user.id)),
      })
    : undefined
  const context = [
    `User: ${user.id}`,
    order ? `Order: #${order.orderNumber} · ${order.status} · ${formatMoney(order.totalUsd)}` : null,
    key
      ? `License: ••••${key.keyShort.slice(-4)} · ${key.status} · ${key.instancesCount}/${key.activationLimit ?? '∞'} activations`
      : null,
  ].filter((line): line is string => Boolean(line))
  return {
    subject: `[Support] ${String(payload.subject).slice(0, 120)}`,
    replyTo: user.email,
    react: <SupportRequestEmail from={user.email} message={String(payload.message)} context={context} appUrl={app()} />,
  }
}

/** Loads everything at send time (FR-EM-10): keys decrypted here only, never stored in the outbox. */
export async function renderTemplate(template: string, payload: Record<string, unknown>): Promise<RenderedEmail> {
  switch (template as EmailTemplate) {
    case 'order-confirmation':
      return orderConfirmation(String(payload.orderId))
    case 'license-key-ready':
      return licenseKeyReady(String(payload.licenseKeyId))
    case 'all-access-welcome':
    case 'payment-failed':
    case 'subscription-ended':
      return subscriptionEmail(template as 'all-access-welcome' | 'payment-failed' | 'subscription-ended', payload)
    case 'refund-processed':
      return refundProcessed(String(payload.orderId))
    case 'admin-alert':
      return {
        subject: `[Lumira] ${String(payload.title)}`,
        react: (
          <AdminAlertEmail
            title={String(payload.title)}
            lines={(payload.lines as string[] | undefined) ?? []}
            url={`${app()}${String(payload.path ?? '/admin')}`}
            appUrl={app()}
          />
        ),
      }
    case 'support-request':
      return supportRequest(payload)
    default:
      throw new Error(`Unknown email template ${template}`)
  }
}
