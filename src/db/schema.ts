import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// Physical schema for PRD §7. Every table lives in schema `app`, which the Supabase Data API never
// exposes; RLS + the lumira_app role are added by the custom `security` migration (Task.md P2.04).
export const app = pgSchema('app')

// ---------- Enums ----------
export const userRole = app.enum('user_role', ['buyer', 'admin'])
export const productLine = app.enum('product_line', ['boilerplate', 'ui_kit', 'template'])
export const licenseTier = app.enum('license_tier', ['personal', 'team', 'extended', 'all_access'])
export const checkoutStatus = app.enum('checkout_status', ['initiated', 'completed', 'abandoned', 'expired'])
export const orderStatus = app.enum('order_status', ['pending', 'failed', 'paid', 'refunded', 'partial_refund'])
export const subscriptionStatus = app.enum('subscription_status', [
  'on_trial',
  'active',
  'paused',
  'past_due',
  'unpaid',
  'cancelled',
  'expired',
])
export const entitlementKind = app.enum('entitlement_kind', ['license', 'all_access', 'comp'])
export const entitlementStatus = app.enum('entitlement_status', ['active', 'suspended', 'revoked'])
export const licenseKeyStatus = app.enum('license_key_status', ['inactive', 'active', 'expired', 'disabled'])
export const licenseEventType = app.enum('license_event_type', [
  'issued',
  'activated',
  'deactivated',
  'validated',
  'validation_failed',
  'disabled',
  'enabled',
  'revealed',
  'limit_changed',
])
export const actorType = app.enum('actor_type', ['buyer', 'admin', 'system', 'cli', 'registry'])
export const instanceSource = app.enum('instance_source', ['cli', 'registry', 'dashboard', 'external'])
export const releaseStatus = app.enum('release_status', ['draft', 'published', 'yanked'])
export const downloadChannel = app.enum('download_channel', ['dashboard', 'success_page', 'email_link', 'admin'])
export const downloadStatus = app.enum('download_status', ['granted', 'denied', 'rate_limited'])
export const paymentEventType = app.enum('payment_event_type', [
  'payment_failed',
  'payment_recovered',
  'payment_refunded',
])
export const discountStatus = app.enum('discount_status', ['active', 'expired', 'deleted'])
export const emailStatus = app.enum('email_status', ['pending', 'sent', 'delivered', 'failed', 'bounced', 'complained'])
export const jobKind = app.enum('job_kind', [
  'license_keys_fetch',
  'license_key_disable',
  'license_key_enable',
  'discord_grant',
  'discord_revoke',
  'analytics_capture',
  'release_notify',
])
export const jobStatus = app.enum('job_status', ['pending', 'done', 'failed'])
export const webhookSource = app.enum('webhook_source', ['lemonsqueezy', 'clerk', 'sanity', 'resend'])
export const webhookStatus = app.enum('webhook_status', ['received', 'processed', 'failed', 'ignored'])
export const discordLinkStatus = app.enum('discord_link_status', ['active', 'revoked'])

const tz = { withTimezone: true } as const
const createdAt = () => timestamp(tz).defaultNow().notNull()
const updatedAt = () =>
  timestamp(tz)
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
/** Money is stored in integer cents, exactly as Lemon Squeezy reports it. */
const cents = () => integer()

// ---------- Identity & catalog ----------
export const users = app.table(
  'users',
  {
    id: text().primaryKey(), // Clerk user ID
    email: text().notNull(),
    name: text(),
    role: userRole().notNull().default('buyer'),
    lsCustomerId: bigint({ mode: 'number' }),
    releaseEmails: jsonb().$type<Record<string, boolean>>().notNull().default({}),
    emailBouncedAt: timestamp(tz), // hard bounce from Resend (FR-EM-13), flagged in admin
    deletedAt: timestamp(tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
)

export const products = app.table(
  'products',
  {
    id: text().primaryKey(), // Sanity _id (published)
    slug: text().notNull(),
    name: text().notNull(),
    line: productLine().notNull(),
    inAllAccess: boolean().notNull().default(true),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('products_slug_uq').on(t.slug)],
)

export const variants = app.table(
  'variants',
  {
    lsVariantId: bigint({ mode: 'number' }).primaryKey(),
    lsProductId: bigint({ mode: 'number' }).notNull(),
    productId: text().references(() => products.id), // null for bundles and All-Access
    tier: licenseTier().notNull(),
    activationLimit: integer(), // null = unlimited
    priceCents: cents().notNull(),
    interval: text().$type<'month' | 'year'>(),
    bundleProductIds: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('variants_ls_product_idx').on(t.lsProductId)],
)

// ---------- Commerce ----------
export const checkoutSessions = app.table(
  'checkout_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => users.id),
    email: text(),
    lsVariantId: bigint({ mode: 'number' })
      .notNull()
      .references(() => variants.lsVariantId),
    lsCheckoutId: text(),
    status: checkoutStatus().notNull().default('initiated'),
    discountCode: text(),
    utm: jsonb().$type<Record<string, string>>(),
    phDistinctId: text(),
    ipHash: text(),
    orderId: uuid(),
    createdAt: createdAt(),
    completedAt: timestamp(tz),
  },
  (t) => [
    index('checkout_sessions_status_created_idx').on(t.status, t.createdAt),
    index('checkout_sessions_ip_created_idx').on(t.ipHash, t.createdAt),
  ],
)

export const orders = app.table(
  'orders',
  {
    id: uuid().primaryKey().defaultRandom(),
    lsOrderId: bigint({ mode: 'number' }).notNull(),
    orderNumber: integer().notNull(),
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    status: orderStatus().notNull(),
    currency: text().notNull(),
    subtotalUsd: cents().notNull(),
    discountUsd: cents().notNull().default(0),
    taxUsd: cents().notNull().default(0),
    totalUsd: cents().notNull(),
    discountCode: text(),
    receiptUrl: text(),
    checkoutSessionId: uuid().references(() => checkoutSessions.id),
    testMode: boolean().notNull().default(false),
    refundedAt: timestamp(tz),
    createdAt: timestamp(tz).notNull(), // LS created_at
  },
  (t) => [
    uniqueIndex('orders_ls_order_id_uq').on(t.lsOrderId),
    index('orders_user_idx').on(t.userId),
    index('orders_email_idx').on(t.customerEmail),
    index('orders_created_idx').on(t.createdAt),
  ],
)

export const orderItems = app.table(
  'order_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    lsOrderItemId: bigint({ mode: 'number' }).notNull(),
    lsVariantId: bigint({ mode: 'number' })
      .notNull()
      .references(() => variants.lsVariantId),
    priceUsd: cents().notNull(),
    quantity: integer().notNull().default(1),
  },
  (t) => [uniqueIndex('order_items_ls_uq').on(t.lsOrderItemId), index('order_items_order_idx').on(t.orderId)],
)

export const subscriptions = app.table(
  'subscriptions',
  {
    id: uuid().primaryKey().defaultRandom(),
    lsSubscriptionId: bigint({ mode: 'number' }).notNull(),
    lsOrderId: bigint({ mode: 'number' }).notNull(), // initial order; links the subscription's license key
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    lsVariantId: bigint({ mode: 'number' })
      .notNull()
      .references(() => variants.lsVariantId),
    status: subscriptionStatus().notNull(),
    interval: text().$type<'month' | 'year'>().notNull(),
    unitPriceUsd: cents().notNull(), // per interval, ex-tax (from the variant at sync time)
    cardBrand: text(),
    cardLastFour: text(),
    renewsAt: timestamp(tz),
    endsAt: timestamp(tz),
    trialEndsAt: timestamp(tz),
    pastDueSince: timestamp(tz),
    testMode: boolean().notNull().default(false),
    createdAt: timestamp(tz).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('subscriptions_ls_uq').on(t.lsSubscriptionId),
    index('subscriptions_status_idx').on(t.status),
    index('subscriptions_user_idx').on(t.userId),
    index('subscriptions_ls_order_idx').on(t.lsOrderId),
  ],
)

export const subscriptionInvoices = app.table(
  'subscription_invoices',
  {
    id: uuid().primaryKey().defaultRandom(),
    lsInvoiceId: bigint({ mode: 'number' }).notNull(),
    subscriptionId: uuid()
      .notNull()
      .references(() => subscriptions.id),
    status: text().notNull(), // paid | pending | void | refunded | partial_refund
    billingReason: text().notNull(), // initial | renewal | updated
    subtotalUsd: cents().notNull(),
    discountUsd: cents().notNull().default(0),
    taxUsd: cents().notNull(),
    totalUsd: cents().notNull(),
    testMode: boolean().notNull().default(false),
    createdAt: timestamp(tz).notNull(),
  },
  (t) => [
    uniqueIndex('subscription_invoices_ls_uq').on(t.lsInvoiceId),
    index('subscription_invoices_created_idx').on(t.createdAt),
  ],
)

export const paymentEvents = app.table(
  'payment_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    type: paymentEventType().notNull(),
    userId: text().references(() => users.id),
    subscriptionId: uuid().references(() => subscriptions.id),
    orderId: uuid().references(() => orders.id),
    amountUsd: cents(),
    attempt: integer(),
    lsInvoiceId: bigint({ mode: 'number' }),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('payment_events_type_created_idx').on(t.type, t.createdAt),
    uniqueIndex('payment_events_invoice_type_uq')
      .on(t.lsInvoiceId, t.type)
      .where(sql`ls_invoice_id is not null`),
  ],
)

export const entitlements = app.table(
  'entitlements',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    kind: entitlementKind().notNull(),
    productId: text().references(() => products.id), // null for all_access
    tier: licenseTier(),
    maxMajor: integer(), // one-time: latest major at purchase time
    sourceOrderItemId: uuid().references(() => orderItems.id),
    sourceSubscriptionId: uuid().references(() => subscriptions.id),
    status: entitlementStatus().notNull().default('active'),
    validFrom: timestamp(tz).notNull().defaultNow(),
    validUntil: timestamp(tz),
    grantedBy: text(), // admin user id for `comp` grants
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('entitlements_user_idx').on(t.userId, t.status),
    index('entitlements_email_idx').on(t.customerEmail),
    uniqueIndex('entitlements_item_product_uq').on(t.sourceOrderItemId, t.productId),
    uniqueIndex('entitlements_subscription_uq')
      .on(t.sourceSubscriptionId)
      .where(sql`source_subscription_id is not null`),
  ],
)

// ---------- Licensing ----------
export const licenseKeys = app.table(
  'license_keys',
  {
    id: uuid().primaryKey().defaultRandom(),
    lsLicenseKeyId: bigint({ mode: 'number' }).notNull(),
    lsOrderId: bigint({ mode: 'number' }).notNull(),
    lsOrderItemId: bigint({ mode: 'number' }).notNull(),
    lsProductId: bigint({ mode: 'number' }).notNull(),
    orderId: uuid().references(() => orders.id), // linked once order_created is ingested
    subscriptionId: uuid().references(() => subscriptions.id),
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    keyCiphertext: text().notNull(), // v1:<iv>:<ciphertext>:<tag> (base64url)
    keyHash: text().notNull(), // HMAC-SHA256(key, pepper), hex
    keyShort: text().notNull(), // LS key_short, for masked display
    status: licenseKeyStatus().notNull(),
    activationLimit: integer(), // null = unlimited
    instancesCount: integer().notNull().default(0),
    expiresAt: timestamp(tz),
    createdAt: timestamp(tz).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('license_keys_ls_uq').on(t.lsLicenseKeyId),
    uniqueIndex('license_keys_hash_uq').on(t.keyHash),
    index('license_keys_user_idx').on(t.userId),
    index('license_keys_ls_order_idx').on(t.lsOrderId),
  ],
)

export const licenseInstances = app.table(
  'license_instances',
  {
    id: uuid().primaryKey().defaultRandom(),
    lsInstanceId: text().notNull(), // UUID issued by LS
    licenseKeyId: uuid()
      .notNull()
      .references(() => licenseKeys.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    source: instanceSource().notNull(),
    lastValidatedAt: timestamp(tz),
    deactivatedAt: timestamp(tz),
    createdAt: timestamp(tz).notNull(),
  },
  (t) => [
    uniqueIndex('license_instances_ls_uq').on(t.lsInstanceId),
    index('license_instances_key_idx').on(t.licenseKeyId),
  ],
)

export const licenseEvents = app.table(
  'license_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    licenseKeyId: uuid()
      .notNull()
      .references(() => licenseKeys.id),
    type: licenseEventType().notNull(),
    actor: actorType().notNull(),
    actorUserId: text(),
    instanceId: uuid().references(() => licenseInstances.id),
    ipHash: text(),
    country: text(),
    userAgent: text(),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index('license_events_key_created_idx').on(t.licenseKeyId, t.createdAt),
    index('license_events_type_created_idx').on(t.type, t.createdAt),
  ],
)

// ---------- Delivery ----------
export const releases = app.table(
  'releases',
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: text()
      .notNull()
      .references(() => products.id),
    semver: text().notNull(),
    major: integer().notNull(),
    minor: integer().notNull(),
    patch: integer().notNull(),
    r2Key: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    sha256: text().notNull(),
    status: releaseStatus().notNull().default('draft'),
    sanityReleaseId: text(),
    publishedAt: timestamp(tz),
    createdBy: text().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('releases_product_semver_uq').on(t.productId, t.semver),
    uniqueIndex('releases_r2_key_uq').on(t.r2Key),
    index('releases_product_published_idx').on(t.productId, t.publishedAt),
  ],
)

export const downloadTokens = app.table(
  'download_tokens',
  {
    jti: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    productId: text()
      .notNull()
      .references(() => products.id),
    releaseId: uuid().references(() => releases.id), // null = latest eligible release
    maxUses: integer().notNull().default(5),
    uses: integer().notNull().default(0),
    expiresAt: timestamp(tz).notNull(),
    revokedAt: timestamp(tz),
    createdAt: createdAt(),
  },
  (t) => [index('download_tokens_order_idx').on(t.orderId)],
)

export const downloadEvents = app.table(
  'download_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    releaseId: uuid()
      .notNull()
      .references(() => releases.id),
    userId: text().references(() => users.id),
    customerEmail: text(),
    entitlementId: uuid().references(() => entitlements.id),
    channel: downloadChannel().notNull(),
    status: downloadStatus().notNull(),
    denyReason: text(),
    ipHash: text(),
    country: text(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index('download_events_user_created_idx').on(t.userId, t.createdAt),
    index('download_events_release_idx').on(t.releaseId),
    index('download_events_created_idx').on(t.createdAt),
  ],
)

// ---------- Marketing & growth ----------
export const discounts = app.table(
  'discounts',
  {
    id: uuid().primaryKey().defaultRandom(),
    lsDiscountId: bigint({ mode: 'number' }).notNull(),
    code: text().notNull(),
    name: text().notNull(),
    amount: integer().notNull(), // percent (30) or cents (1500)
    amountType: text().$type<'percent' | 'fixed'>().notNull(),
    duration: text().$type<'once' | 'repeating' | 'forever'>(),
    durationInMonths: integer(),
    variantIds: bigint({ mode: 'number' })
      .array()
      .notNull()
      .default(sql`'{}'::bigint[]`),
    maxRedemptions: integer(),
    startsAt: timestamp(tz),
    expiresAt: timestamp(tz),
    status: discountStatus().notNull().default('active'),
    testMode: boolean().notNull().default(false),
    createdBy: text().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('discounts_ls_uq').on(t.lsDiscountId),
    // "Edit" = delete + re-create with the same code, so uniqueness applies to live codes only
    uniqueIndex('discounts_code_live_uq')
      .on(t.code)
      .where(sql`status <> 'deleted'`),
  ],
)

export const discordLinks = app.table(
  'discord_links',
  {
    userId: text()
      .primaryKey()
      .references(() => users.id),
    discordUserId: text().notNull(),
    discordUsername: text(),
    status: discordLinkStatus().notNull().default('active'),
    grantedAt: timestamp(tz).notNull().defaultNow(),
    revokedAt: timestamp(tz),
  },
  (t) => [uniqueIndex('discord_links_discord_uq').on(t.discordUserId)],
)

// ---------- Reliability ----------
export const emailOutbox = app.table(
  'email_outbox',
  {
    id: uuid().primaryKey().defaultRandom(),
    template: text().notNull(),
    to: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(), // references only, never secrets
    idempotencyKey: text().notNull(),
    status: emailStatus().notNull().default('pending'),
    resendId: text(),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp(tz).notNull().defaultNow(),
    lastError: text(),
    sentAt: timestamp(tz),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('email_outbox_idem_uq').on(t.idempotencyKey),
    index('email_outbox_due_idx').on(t.status, t.nextAttemptAt),
    index('email_outbox_resend_idx').on(t.resendId),
    index('email_outbox_to_idx').on(t.to),
  ],
)

export const jobOutbox = app.table(
  'job_outbox',
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: jobKind().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text().notNull(),
    status: jobStatus().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp(tz).notNull().defaultNow(),
    lastError: text(),
    doneAt: timestamp(tz),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('job_outbox_idem_uq').on(t.idempotencyKey),
    index('job_outbox_due_idx').on(t.status, t.nextAttemptAt),
  ],
)

export const webhookEvents = app.table(
  'webhook_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    source: webhookSource().notNull(),
    eventName: text().notNull(),
    idempotencyKey: text().notNull(),
    payload: jsonb().notNull(),
    status: webhookStatus().notNull().default('received'),
    error: text(),
    attempts: integer().notNull().default(1),
    durationMs: integer(),
    receivedAt: timestamp(tz).notNull().defaultNow(),
    processedAt: timestamp(tz),
  },
  (t) => [
    uniqueIndex('webhook_events_idem_uq').on(t.idempotencyKey),
    index('webhook_events_source_received_idx').on(t.source, t.receivedAt),
  ],
)

// ---------- Analytics ----------
export const mrrSnapshots = app.table('mrr_snapshots', {
  date: date({ mode: 'string' }).primaryKey(),
  mrrCents: integer().notNull(),
  activeSubscriptions: integer().notNull(),
  newCents: integer().notNull(),
  expansionCents: integer().notNull(),
  contractionCents: integer().notNull(),
  churnedCents: integer().notNull(),
  reactivatedCents: integer().notNull(),
})

export const mrrSubscriptionDays = app.table(
  'mrr_subscription_days',
  {
    subscriptionId: uuid()
      .notNull()
      .references(() => subscriptions.id),
    date: date({ mode: 'string' }).notNull(),
    mrrCents: integer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.subscriptionId, t.date] })],
)

export const auditLog = app.table(
  'audit_log',
  {
    id: uuid().primaryKey().defaultRandom(),
    actorUserId: text()
      .notNull()
      .references(() => users.id),
    action: text().notNull(), // e.g. 'license_key.limit_changed'
    targetType: text().notNull(),
    targetId: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    reason: text(),
    ipHash: text(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_target_idx').on(t.targetType, t.targetId), index('audit_log_created_idx').on(t.createdAt)],
)

// ---------- Inferred row types ----------
export type User = typeof users.$inferSelect
export type Product = typeof products.$inferSelect
export type Variant = typeof variants.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Entitlement = typeof entitlements.$inferSelect
export type LicenseKey = typeof licenseKeys.$inferSelect
export type LicenseInstance = typeof licenseInstances.$inferSelect
export type Release = typeof releases.$inferSelect
export type Discount = typeof discounts.$inferSelect
export type WebhookEvent = typeof webhookEvents.$inferSelect
export type LicenseTier = (typeof licenseTier.enumValues)[number]
export type ProductLine = (typeof productLine.enumValues)[number]
export type JobKind = (typeof jobKind.enumValues)[number]
