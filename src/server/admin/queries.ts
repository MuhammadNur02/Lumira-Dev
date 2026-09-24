import 'server-only'
import { and, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  auditLog,
  checkoutSessions,
  downloadEvents,
  emailOutbox,
  entitlements,
  licenseEvents,
  licenseInstances,
  licenseKeys,
  orders,
  paymentEvents,
  products,
  releases,
  subscriptions,
  users,
  variants,
  webhookEvents,
} from '@/db/schema'
import { hashLicenseKey } from '@/lib/licensing/crypto'

// Read models for the admin pages. Admin pages call requireAdmin() before any of these.

const rows = <T>(result: unknown) => Array.from(result as ArrayLike<T>).map((r) => ({ ...r }))
const inRange = (column: Parameters<typeof gte>[0], from: string, to: string) =>
  and(
    gte(column, new Date(`${from}T00:00:00Z`)),
    lt(column, new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000)),
  )

// ---------- Search (⌘K, customers) ----------
export type SearchHit = { kind: 'customer' | 'order' | 'license'; label: string; detail: string; href: string }

/** Email or name (prefix), order number, or a full license key (matched by HMAC hash, never stored plain). */
export async function adminSearch(q: string): Promise<SearchHit[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const hits: SearchHit[] = []
  const orderNo = /^#?\d{3,9}$/.test(query) ? Number(query.replace('#', '')) : null
  if (orderNo) {
    const found = await db.select().from(orders).where(eq(orders.orderNumber, orderNo)).limit(5)
    for (const o of found)
      hits.push({
        kind: 'order',
        label: `Order #${o.orderNumber}`,
        detail: o.customerEmail,
        href: o.userId ? `/admin/customers/${o.userId}` : `/admin/customers?q=${encodeURIComponent(o.customerEmail)}`,
      })
  }
  if (/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(query)) {
    const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.keyHash, hashLicenseKey(query)) })
    if (key)
      hits.push({
        kind: 'license',
        label: `License ••••${key.keyShort.slice(-4)}`,
        detail: key.customerEmail,
        href: key.userId
          ? `/admin/customers/${key.userId}`
          : `/admin/customers?q=${encodeURIComponent(key.customerEmail)}`,
      })
  }
  const pattern = `%${query.replace(/[%_]/g, '')}%`
  const people = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(or(ilike(users.email, pattern), ilike(users.name, pattern)))
    .limit(8)
  for (const u of people)
    hits.push({ kind: 'customer', label: u.name ?? u.email, detail: u.email, href: `/admin/customers/${u.id}` })
  return hits
}

// ---------- Customers ----------
export async function customerList(q: string | undefined, offset = 0) {
  const pattern = q ? `%${q.trim().replace(/[%_]/g, '')}%` : null
  return rows<{
    id: string
    email: string
    name: string | null
    ltv: number
    orders: number
    subscription: string | null
    last_activity: string | null
    bounced: boolean
    created_at: string
  }>(
    await db.execute(sql`
      select u.id, u.email, u.name, u.created_at::text,
             coalesce((select sum(o.total_usd - o.tax_usd) from app.orders o where o.user_id = u.id and o.status in ('paid', 'partial_refund') and not o.test_mode), 0)
               + coalesce((select sum(i.total_usd - i.tax_usd) from app.subscription_invoices i join app.subscriptions s on s.id = i.subscription_id where s.user_id = u.id and i.status = 'paid' and not i.test_mode), 0) as ltv,
             (select count(*) from app.orders o where o.user_id = u.id)::int as orders,
             (select s.status::text from app.subscriptions s where s.user_id = u.id order by s.created_at desc limit 1) as subscription,
             greatest(
               (select max(created_at) from app.orders o where o.user_id = u.id),
               (select max(created_at) from app.download_events d where d.user_id = u.id)
             )::text as last_activity,
             u.email_bounced_at is not null as bounced
      from app.users u
      where u.role = 'buyer' and u.deleted_at is null
        ${pattern ? sql`and (u.email ilike ${pattern} or u.name ilike ${pattern})` : sql``}
      order by ltv desc, u.created_at desc
      limit 50 offset ${offset}`),
  ).map((r) => ({ ...r, ltv: Number(r.ltv) }))
}

export async function customerDetail(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!user) return null
  const [ents, keys, subs, anomalies] = await Promise.all([
    db
      .select({ entitlement: entitlements, productName: products.name })
      .from(entitlements)
      .leftJoin(products, eq(products.id, entitlements.productId))
      .where(eq(entitlements.userId, userId))
      .orderBy(desc(entitlements.createdAt)),
    db.select().from(licenseKeys).where(eq(licenseKeys.userId, userId)).orderBy(desc(licenseKeys.createdAt)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt)),
    downloadAnomalies(userId),
  ])
  const [ltv] = rows<{ ltv: number }>(
    await db.execute(sql`
      select (coalesce((select sum(o.total_usd - o.tax_usd) from app.orders o where o.user_id = ${userId} and o.status in ('paid', 'partial_refund') and not o.test_mode), 0)
        + coalesce((select sum(i.total_usd - i.tax_usd) from app.subscription_invoices i join app.subscriptions s on s.id = i.subscription_id where s.user_id = ${userId} and i.status = 'paid' and not i.test_mode), 0))::int as ltv`),
  )
  return { user, entitlements: ents, keys, subscriptions: subs, ltv: ltv?.ltv ?? 0, anomalous: anomalies.length > 0 }
}

export type TimelineItem = { kind: string; at: string; data: Record<string, unknown> }

/** FR-AD-41 unified timeline, newest first (Task.md P7.08), plus Clerk sign-ins from the webhook ledger. */
export async function customerTimeline(userId: string, email: string, offset = 0): Promise<TimelineItem[]> {
  return rows<TimelineItem>(
    await db.execute(sql`
      select kind, at::text as at, data from (
        select 'order' as kind, o.created_at as at,
               jsonb_build_object('orderNumber', o.order_number, 'totalUsd', o.total_usd, 'status', o.status) as data
        from app.orders o where o.user_id = ${userId}
        union all
        select 'refund', o.refunded_at, jsonb_build_object('orderNumber', o.order_number, 'totalUsd', o.total_usd)
        from app.orders o where o.user_id = ${userId} and o.refunded_at is not null
        union all
        select 'payment_' || p.type, p.created_at, jsonb_build_object('amountUsd', p.amount_usd, 'attempt', p.attempt)
        from app.payment_events p where p.user_id = ${userId}
        union all
        select 'subscription_' || s.status, s.updated_at, jsonb_build_object('interval', s.interval, 'lsSubscriptionId', s.ls_subscription_id)
        from app.subscriptions s where s.user_id = ${userId}
        union all
        select 'license_' || e.type, e.created_at,
               jsonb_build_object('key', '••••' || right(k.key_short, 4), 'instance', i.name, 'country', e.country, 'actor', e.actor)
        from app.license_events e
        join app.license_keys k on k.id = e.license_key_id
        left join app.license_instances i on i.id = e.instance_id
        where k.user_id = ${userId}
        union all
        select 'download_' || d.status, d.created_at,
               jsonb_build_object('product', p.name, 'version', r.semver, 'channel', d.channel, 'country', d.country)
        from app.download_events d join app.releases r on r.id = d.release_id join app.products p on p.id = r.product_id
        where d.user_id = ${userId}
        union all
        select 'email_' || m.status, m.created_at, jsonb_build_object('template', m.template, 'id', m.id)
        from app.email_outbox m where m.to = ${email}
        union all
        select 'discord_' || l.status, coalesce(l.revoked_at, l.granted_at), jsonb_build_object('username', l.discord_username)
        from app.discord_links l where l.user_id = ${userId}
        union all
        select 'sign_in', w.received_at, jsonb_build_object()
        from app.webhook_events w
        where w.source = 'clerk' and w.event_name = 'session.created' and w.payload -> 'data' ->> 'user_id' = ${userId}
      ) t
      where at is not null
      order by at desc
      limit 100 offset ${offset}`),
  )
}

// ---------- Activity logs ----------
/** Anomaly flags (FR-AD-42): > 30 downloads or > 5 countries in any 24 h window per user. */
export async function downloadAnomalies(userId?: string) {
  return rows<{ user_id: string; downloads: number; countries: number }>(
    await db.execute(sql`
      select user_id, count(*)::int as downloads, count(distinct country)::int as countries
      from app.download_events
      where created_at > now() - interval '24 hours' and user_id is not null ${userId ? sql`and user_id = ${userId}` : sql``}
      group by user_id
      having count(*) > 30 or count(distinct country) > 5`),
  )
}

export async function downloadLog(
  from: string,
  to: string,
  filters: { channel?: string; status?: string; product?: string },
) {
  const where: SQL[] = [inRange(downloadEvents.createdAt, from, to)!]
  if (filters.channel) where.push(eq(downloadEvents.channel, filters.channel as never))
  if (filters.status) where.push(eq(downloadEvents.status, filters.status as never))
  if (filters.product) where.push(eq(products.slug, filters.product))
  return db
    .select({
      id: downloadEvents.id,
      at: downloadEvents.createdAt,
      channel: downloadEvents.channel,
      status: downloadEvents.status,
      denyReason: downloadEvents.denyReason,
      country: downloadEvents.country,
      userId: downloadEvents.userId,
      email: downloadEvents.customerEmail,
      product: products.name,
      version: releases.semver,
    })
    .from(downloadEvents)
    .innerJoin(releases, eq(releases.id, downloadEvents.releaseId))
    .innerJoin(products, eq(products.id, releases.productId))
    .where(and(...where))
    .orderBy(desc(downloadEvents.createdAt))
    .limit(500)
}

export async function paymentLog(from: string, to: string) {
  return db
    .select({
      id: paymentEvents.id,
      type: paymentEvents.type,
      at: paymentEvents.createdAt,
      amount: paymentEvents.amountUsd,
      attempt: paymentEvents.attempt,
      userId: paymentEvents.userId,
      email: users.email,
      subscriptionStatus: subscriptions.status,
      renewsAt: subscriptions.renewsAt,
    })
    .from(paymentEvents)
    .leftJoin(users, eq(users.id, paymentEvents.userId))
    .leftJoin(subscriptions, eq(subscriptions.id, paymentEvents.subscriptionId))
    .where(inRange(paymentEvents.createdAt, from, to))
    .orderBy(desc(paymentEvents.createdAt))
    .limit(500)
}

export async function licenseActivityLog(from: string, to: string, type?: string) {
  return db
    .select({
      id: licenseEvents.id,
      type: licenseEvents.type,
      actor: licenseEvents.actor,
      at: licenseEvents.createdAt,
      country: licenseEvents.country,
      keyShort: licenseKeys.keyShort,
      userId: licenseKeys.userId,
      email: licenseKeys.customerEmail,
      instance: licenseInstances.name,
      source: licenseInstances.source,
    })
    .from(licenseEvents)
    .innerJoin(licenseKeys, eq(licenseKeys.id, licenseEvents.licenseKeyId))
    .leftJoin(licenseInstances, eq(licenseInstances.id, licenseEvents.instanceId))
    .where(and(inRange(licenseEvents.createdAt, from, to), type ? eq(licenseEvents.type, type as never) : undefined))
    .orderBy(desc(licenseEvents.createdAt))
    .limit(500)
}

export async function emailLog(from: string, to: string, status?: string) {
  return db
    .select({
      id: emailOutbox.id,
      template: emailOutbox.template,
      to: emailOutbox.to,
      status: emailOutbox.status,
      attempts: emailOutbox.attempts,
      lastError: emailOutbox.lastError,
      createdAt: emailOutbox.createdAt,
      sentAt: emailOutbox.sentAt,
    })
    .from(emailOutbox)
    .where(and(inRange(emailOutbox.createdAt, from, to), status ? eq(emailOutbox.status, status as never) : undefined))
    .orderBy(desc(emailOutbox.createdAt))
    .limit(500)
}

export async function webhookList(source?: string, status?: string) {
  return db
    .select({
      id: webhookEvents.id,
      source: webhookEvents.source,
      eventName: webhookEvents.eventName,
      status: webhookEvents.status,
      error: webhookEvents.error,
      attempts: webhookEvents.attempts,
      durationMs: webhookEvents.durationMs,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .where(
      and(
        source ? eq(webhookEvents.source, source as never) : undefined,
        status ? eq(webhookEvents.status, status as never) : undefined,
      ),
    )
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(500)
}

export async function auditList(
  from: string,
  to: string,
  filters: { actor?: string; action?: string; target?: string },
) {
  return db
    .select({ entry: auditLog, actorEmail: users.email })
    .from(auditLog)
    .innerJoin(users, eq(users.id, auditLog.actorUserId))
    .where(
      and(
        inRange(auditLog.createdAt, from, to),
        filters.actor ? ilike(users.email, `%${filters.actor.replace(/[%_]/g, '')}%`) : undefined,
        filters.action ? ilike(auditLog.action, `${filters.action.replace(/[%_]/g, '')}%`) : undefined,
        filters.target ? eq(auditLog.targetId, filters.target) : undefined,
      ),
    )
    .orderBy(desc(auditLog.createdAt))
    .limit(500)
}

export async function abandonedCheckouts(from: string, to: string, limit = 200) {
  return db
    .select({
      id: checkoutSessions.id,
      status: checkoutSessions.status,
      createdAt: checkoutSessions.createdAt,
      email: sql<string | null>`coalesce(${checkoutSessions.email}, ${users.email})`,
      utm: checkoutSessions.utm,
      discountCode: checkoutSessions.discountCode,
      tier: variants.tier,
      product: products.name,
    })
    .from(checkoutSessions)
    .innerJoin(variants, eq(variants.lsVariantId, checkoutSessions.lsVariantId))
    .leftJoin(products, eq(products.id, variants.productId))
    .leftJoin(users, eq(users.id, checkoutSessions.userId))
    .where(
      and(inArray(checkoutSessions.status, ['abandoned', 'expired']), inRange(checkoutSessions.createdAt, from, to)),
    )
    .orderBy(desc(checkoutSessions.createdAt))
    .limit(limit)
}

// ---------- Recent activity (overview feed) ----------
export async function recentActivity() {
  return rows<{ kind: string; at: string; label: string; href: string | null }>(
    await db.execute(sql`
      select * from (
        select 'order' as kind, o.created_at as at, 'Order #' || o.order_number || ' · ' || o.customer_email as label,
               case when o.user_id is null then null else '/admin/customers/' || o.user_id end as href
        from app.orders o order by o.created_at desc limit 10
      ) a
      union all
      select * from (
        select 'payment_failed', p.created_at, 'Payment failed · attempt ' || coalesce(p.attempt, 1),
               case when p.user_id is null then null else '/admin/customers/' || p.user_id end
        from app.payment_events p where p.type = 'payment_failed' order by p.created_at desc limit 5
      ) b
      union all
      select * from (
        select 'activation', e.created_at, 'Activation · ••••' || right(k.key_short, 4) || coalesce(' · ' || e.country, ''),
               case when k.user_id is null then null else '/admin/customers/' || k.user_id end
        from app.license_events e join app.license_keys k on k.id = e.license_key_id
        where e.type = 'activated' order by e.created_at desc limit 10
      ) c
      order by at desc limit 15`),
  ).map((r) => ({ ...r, at: new Date(r.at).toISOString() }))
}

// ---------- Products & releases ----------
export async function productStats() {
  return rows<{
    id: string
    slug: string
    name: string
    line: string
    active: boolean
    latest: string | null
    drafts: number
    downloads_30d: number
    revenue_30d: number
    keys: number
    activated_keys: number
  }>(
    await db.execute(sql`
      select p.id, p.slug, p.name, p.line::text, p.active,
             (select r.semver from app.releases r where r.product_id = p.id and r.status = 'published'
               order by r.major desc, r.minor desc, r.patch desc limit 1) as latest,
             (select count(*) from app.releases r where r.product_id = p.id and r.status = 'draft')::int as drafts,
             (select count(*) from app.download_events d join app.releases r on r.id = d.release_id
               where r.product_id = p.id and d.status = 'granted' and d.created_at > now() - interval '30 days')::int as downloads_30d,
             (select coalesce(sum(oi.price_usd), 0) from app.order_items oi join app.orders o on o.id = oi.order_id
               join app.variants v on v.ls_variant_id = oi.ls_variant_id
               where v.product_id = p.id and o.status in ('paid', 'partial_refund') and not o.test_mode
                 and o.created_at > now() - interval '30 days')::int as revenue_30d,
             (select count(*) from app.license_keys k join app.variants v on v.ls_product_id = k.ls_product_id
               where v.product_id = p.id)::int as keys,
             (select count(distinct k.id) from app.license_keys k join app.variants v on v.ls_product_id = k.ls_product_id
               join app.license_events e on e.license_key_id = k.id and e.type = 'activated'
               where v.product_id = p.id)::int as activated_keys
      from app.products p order by p.name`),
  )
}

export async function productReleases(productId: string) {
  return db
    .select()
    .from(releases)
    .where(eq(releases.productId, productId))
    .orderBy(desc(releases.major), desc(releases.minor), desc(releases.patch))
}

// ---------- Discounts ----------
export async function discountList() {
  return rows<{
    id: string
    code: string
    name: string
    amount: number
    amount_type: 'percent' | 'fixed'
    duration: string | null
    variant_ids: number[]
    max_redemptions: number | null
    starts_at: string | null
    expires_at: string | null
    status: 'active' | 'expired' | 'deleted'
    test_mode: boolean
    expired: boolean
    redemptions: number
    revenue: number
    discount_given: number
    created_at: string
  }>(
    await db.execute(sql`
      select d.id, d.code, d.name, d.amount, d.amount_type, d.duration, d.variant_ids, d.max_redemptions,
             d.starts_at::text, d.expires_at::text, d.status, d.test_mode, d.created_at::text,
             coalesce(d.expires_at < now(), false) as expired,
             (select count(*) from app.orders o where upper(o.discount_code) = d.code and o.status in ('paid', 'partial_refund', 'refunded'))::int as redemptions,
             (select coalesce(sum(o.total_usd - o.tax_usd), 0) from app.orders o where upper(o.discount_code) = d.code and o.status in ('paid', 'partial_refund'))::int as revenue,
             (select coalesce(sum(o.discount_usd), 0) from app.orders o where upper(o.discount_code) = d.code and o.status in ('paid', 'partial_refund'))::int as discount_given
      from app.discounts d
      where d.status <> 'deleted' and d.code not like 'UP%'
      order by d.created_at desc`),
  )
}

export async function variantOptions() {
  return db
    .select({ id: variants.lsVariantId, tier: variants.tier, name: products.name })
    .from(variants)
    .leftJoin(products, eq(products.id, variants.productId))
    .where(eq(variants.active, true))
    .orderBy(products.name)
}
