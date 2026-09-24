// Seed dataset (P2.06), shared by `pnpm db:seed` (scripts/seed.ts) and the integration test that
// proves it loads into a freshly migrated database. Deterministic: the same PRNG seed every run.
import crypto from 'node:crypto'
import { sql } from 'drizzle-orm'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import * as t from '../src/db/schema'
import { encryptLicenseKey, hashLicenseKey } from '../src/lib/licensing/crypto'
import { fixtureBundles, fixtureChangelog, fixtureProducts, fixtureSiteSettings } from '../src/lib/sanity/fixtures'
import { snapshotMrr } from '../src/server/metrics/mrr'

const DAYS = 90
const BUYERS = 60

// Deterministic PRNG so every run produces the same dataset.
let state = 0x9e3779b9
const rand = () => {
  state |= 0
  state = (state + 0x6d2b79f5) | 0
  let r = Math.imul(state ^ (state >>> 15), 1 | state)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]!
const chance = (p: number) => rand() < p
const uuid = () => crypto.randomUUID()
const daysAgo = (d: number, hour = 12) =>
  new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() - d,
      hour,
      Math.floor(rand() * 60),
    ),
  )
const fakeKey = () =>
  [8, 4, 4, 4, 12].map((n) => crypto.randomBytes(n).toString('hex').slice(0, n).toUpperCase()).join('-')

const FIRST = [
  'Ada',
  'Linus',
  'Grace',
  'Ken',
  'Margaret',
  'Dennis',
  'Barbara',
  'Guido',
  'Radia',
  'Tim',
  'Frances',
  'Brendan',
]
const LAST = [
  'Lovelace',
  'Torvalds',
  'Hopper',
  'Thompson',
  'Hamilton',
  'Ritchie',
  'Liskov',
  'Rossum',
  'Perlman',
  'Berners',
  'Allen',
  'Eich',
]
const COUNTRIES = ['US', 'DE', 'GB', 'ID', 'IN', 'BR', 'FR', 'NL', 'CA', 'AU', 'JP', 'SE']

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts postgres-js (script) and PGlite (test) clients
export type SeedDb = PgDatabase<any, typeof t>

async function reset(db: SeedDb) {
  // Children first. audit_log is append-only for the app role; the seed runs as the owner.
  await db.execute(sql`
    truncate table app.mrr_subscription_days, app.mrr_snapshots, app.download_events, app.download_tokens,
      app.license_events, app.license_instances, app.license_keys, app.payment_events, app.subscription_invoices,
      app.entitlements, app.order_items, app.orders, app.subscriptions, app.checkout_sessions, app.discounts,
      app.discord_links, app.email_outbox, app.job_outbox, app.webhook_events, app.releases, app.variants,
      app.products, app.audit_log, app.users restart identity cascade`)
}

export async function seedDatabase(
  db: SeedDb,
  opts: { adminId: string; adminEmail: string; log?: (msg: string) => void },
) {
  const log = opts.log ?? (() => {})
  state = 0x9e3779b9 // same dataset on every run, even within one process
  log('Resetting app schema…')
  await reset(db)

  // ---------- Catalog ----------
  log('Catalog…')
  await db.insert(t.products).values(
    fixtureProducts.map((p) => ({
      id: p._id,
      slug: p.slug,
      name: p.name,
      line: p.line,
      inAllAccess: p.inAllAccess,
      active: true,
    })),
  )
  type SeedVariant = {
    lsVariantId: number
    lsProductId: number
    productId: string | null
    tier: t.LicenseTier
    activationLimit: number | null
    priceCents: number
  }
  const variantRows: SeedVariant[] = fixtureProducts.flatMap((p) =>
    p.licenses.map((l) => ({
      lsVariantId: l.lsVariantId,
      lsProductId: l.lsProductId,
      productId: p._id,
      tier: l.tier,
      activationLimit: l.activationLimit,
      priceCents: l.priceCents ?? 0,
    })),
  )
  const aa = fixtureSiteSettings.allAccess!
  variantRows.push(
    {
      lsVariantId: aa.monthly!.lsVariantId!,
      lsProductId: aa.lsProductId!,
      productId: null,
      tier: 'all_access',
      activationLimit: aa.activationLimit,
      priceCents: aa.monthly!.priceCents!,
    },
    {
      lsVariantId: aa.yearly!.lsVariantId!,
      lsProductId: aa.lsProductId!,
      productId: null,
      tier: 'all_access',
      activationLimit: aa.activationLimit,
      priceCents: aa.yearly!.priceCents!,
    },
  )
  await db.insert(t.variants).values(
    variantRows.map((v) => ({
      ...v,
      interval: v.tier === 'all_access' ? (v.priceCents > 10_000 ? ('year' as const) : ('month' as const)) : null,
    })),
  )
  for (const bundle of fixtureBundles) {
    await db.insert(t.variants).values({
      lsVariantId: bundle.lsVariantId,
      lsProductId: bundle.lsProductId,
      productId: null,
      tier: bundle.tier,
      priceCents: bundle.priceCents ?? 0,
      bundleProductIds: bundle.includes.map((p) => p._id),
    })
  }

  const releaseRows = fixtureChangelog.map((entry) => {
    const product = fixtureProducts.find((p) => p.slug === entry.product.slug)!
    const [major, minor, patch] = entry.version.replace(/^v/, '').split('.').map(Number) as [number, number, number]
    return {
      id: uuid(),
      productId: product._id,
      semver: `${major}.${minor}.${patch}`,
      major,
      minor,
      patch,
      r2Key: `products/${product.slug}/${major}.${minor}.${patch}.zip`,
      sizeBytes: 8_000_000 + Math.floor(rand() * 60_000_000),
      sha256: crypto.createHash('sha256').update(`${product.slug}@${entry.version}`).digest('hex'),
      status: 'published' as const,
      sanityReleaseId: entry._id,
      publishedAt: new Date(entry.releasedAt),
    }
  })
  await db.insert(t.releases).values(releaseRows)
  // One draft per product so the admin release list shows the upload → publish flow.
  await db.insert(t.releases).values(
    fixtureProducts.map((p) => {
      const latest = releaseRows
        .filter((r) => r.productId === p._id)
        .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)[0]
      const [major, minor] = latest ? [latest.major, latest.minor + 1] : [1, 0]
      return {
        productId: p._id,
        semver: `${major}.${minor}.0`,
        major,
        minor,
        patch: 0,
        r2Key: `products/${p.slug}/${major}.${minor}.0.zip`,
        sizeBytes: 12_000_000,
        sha256: crypto.createHash('sha256').update(`${p.slug}@draft`).digest('hex'),
        status: 'draft' as const,
      }
    }),
  )

  // ---------- People ----------
  log('Users…')
  await db
    .insert(t.users)
    .values({ id: opts.adminId, email: opts.adminEmail.toLowerCase(), name: 'Lumira Admin', role: 'admin' })
  const buyers = Array.from({ length: BUYERS }, (_, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`
    return {
      id: `user_seed_${String(i + 1).padStart(3, '0')}`,
      email: `buyer${i + 1}@example.test`,
      name,
      createdAt: daysAgo(DAYS + 5 - Math.floor(rand() * DAYS)),
    }
  })
  await db.insert(t.users).values(buyers)

  // ---------- One-time orders ----------
  log('Orders, keys, activations, downloads…')
  const oneTime = variantRows.filter((v) => v.tier !== 'all_access')
  let orderNumber = 1000
  let lsId = 900_000
  for (let day = DAYS; day >= 0; day--) {
    // A gentle upward trend with weekly seasonality.
    const expected = 1.2 + (DAYS - day) / 45 + (new Date(daysAgo(day)).getUTCDay() % 6 === 0 ? -0.6 : 0.3)
    const count = Math.max(0, Math.round(expected + (rand() - 0.5) * 2))
    for (let n = 0; n < count; n++) {
      const buyer = pick(buyers)
      const variant = pick(oneTime)
      const createdAt = daysAgo(day, 8 + Math.floor(rand() * 14))
      const discount = chance(0.2) ? Math.round(variant.priceCents * 0.3) : 0
      const subtotal = variant.priceCents
      const tax = chance(0.4) ? Math.round((subtotal - discount) * 0.2) : 0
      const refunded = chance(0.04)
      const lsOrderId = ++lsId

      const [cs] = await db
        .insert(t.checkoutSessions)
        .values({
          userId: buyer.id,
          email: buyer.email,
          lsVariantId: variant.lsVariantId,
          status: 'completed',
          createdAt,
          completedAt: createdAt,
          utm: chance(0.3) ? { source: pick(['x', 'newsletter', 'google']) } : null,
        })
        .returning({ id: t.checkoutSessions.id })
      const [order] = await db
        .insert(t.orders)
        .values({
          lsOrderId,
          orderNumber: ++orderNumber,
          userId: buyer.id,
          customerEmail: buyer.email,
          status: refunded ? 'refunded' : 'paid',
          currency: 'USD',
          subtotalUsd: subtotal,
          discountUsd: discount,
          taxUsd: tax,
          totalUsd: subtotal - discount + tax,
          discountCode: discount ? 'LAUNCH30' : null,
          receiptUrl: `https://app.lemonsqueezy.com/my-orders/seed-${lsOrderId}`,
          checkoutSessionId: cs!.id,
          refundedAt: refunded ? new Date(createdAt.getTime() + 3 * 86_400_000) : null,
          createdAt,
        })
        .returning({ id: t.orders.id })
      await db
        .update(t.checkoutSessions)
        .set({ orderId: order!.id })
        .where(sql`id = ${cs!.id}`)
      const [item] = await db
        .insert(t.orderItems)
        .values({
          orderId: order!.id,
          lsOrderItemId: lsOrderId * 10,
          lsVariantId: variant.lsVariantId,
          priceUsd: subtotal - discount,
        })
        .returning({ id: t.orderItems.id })

      const productReleases = releaseRows.filter((r) => r.productId === variant.productId)
      const maxMajor = Math.max(1, ...productReleases.map((r) => r.major))
      const [ent] = await db
        .insert(t.entitlements)
        .values({
          userId: buyer.id,
          customerEmail: buyer.email,
          kind: 'license',
          productId: variant.productId,
          tier: variant.tier,
          maxMajor,
          sourceOrderItemId: item!.id,
          status: refunded ? 'revoked' : 'active',
          validFrom: createdAt,
          createdAt,
        })
        .onConflictDoNothing()
        .returning({ id: t.entitlements.id })

      const plain = fakeKey()
      const instances = refunded ? 0 : Math.min(variant.activationLimit ?? 3, Math.floor(rand() * 3))
      const [key] = await db
        .insert(t.licenseKeys)
        .values({
          lsLicenseKeyId: lsOrderId,
          lsOrderId,
          lsOrderItemId: lsOrderId * 10,
          lsProductId: variant.lsProductId,
          orderId: order!.id,
          userId: buyer.id,
          customerEmail: buyer.email,
          keyCiphertext: encryptLicenseKey(plain),
          keyHash: hashLicenseKey(plain),
          keyShort: `XXXX-${plain.slice(-12)}`,
          status: refunded ? 'disabled' : instances > 0 ? 'active' : 'inactive',
          activationLimit: variant.activationLimit,
          instancesCount: instances,
          createdAt,
        })
        .returning({ id: t.licenseKeys.id })
      await db.insert(t.licenseEvents).values({ licenseKeyId: key!.id, type: 'issued', actor: 'system', createdAt })
      for (let i = 0; i < instances; i++) {
        const at = new Date(createdAt.getTime() + (i + 1) * 3_600_000)
        const [inst] = await db
          .insert(t.licenseInstances)
          .values({
            lsInstanceId: uuid(),
            licenseKeyId: key!.id,
            name: pick(['acme-web', 'client-portal', 'marketing-site', 'internal-tools']),
            source: pick(['cli', 'cli', 'registry'] as const),
            lastValidatedAt: at,
            createdAt: at,
          })
          .returning({ id: t.licenseInstances.id })
        await db.insert(t.licenseEvents).values({
          licenseKeyId: key!.id,
          type: 'activated',
          actor: 'cli',
          instanceId: inst!.id,
          country: pick(COUNTRIES),
          createdAt: at,
        })
      }

      const latest = productReleases.sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch)[0]
      if (latest && ent && !refunded) {
        const downloads = 1 + Math.floor(rand() * 3)
        for (let d = 0; d < downloads; d++) {
          await db.insert(t.downloadEvents).values({
            releaseId: latest.id,
            userId: buyer.id,
            customerEmail: buyer.email,
            entitlementId: ent.id,
            channel: d === 0 ? pick(['success_page', 'email_link'] as const) : 'dashboard',
            status: 'granted',
            country: pick(COUNTRIES),
            createdAt: new Date(createdAt.getTime() + d * 86_400_000),
          })
        }
      }
      if (refunded) {
        await db.insert(t.paymentEvents).values({
          type: 'payment_refunded',
          userId: buyer.id,
          orderId: order!.id,
          amountUsd: subtotal - discount,
          createdAt: new Date(createdAt.getTime() + 3 * 86_400_000),
        })
      }
    }
    // Abandoned checkouts feed the conversion page.
    for (let n = 0; n < Math.round(rand() * 4); n++) {
      const v = pick(variantRows)
      await db.insert(t.checkoutSessions).values({
        lsVariantId: v.lsVariantId,
        status: chance(0.5) ? 'abandoned' : 'expired',
        createdAt: daysAgo(day, Math.floor(rand() * 23)),
      })
    }
  }

  // ---------- All-Access subscriptions ----------
  log('Subscriptions and invoices…')
  const monthly = variantRows.find((v) => v.lsVariantId === aa.monthly!.lsVariantId)!
  const yearly = variantRows.find((v) => v.lsVariantId === aa.yearly!.lsVariantId)!
  for (const [i, buyer] of buyers.slice(0, 24).entries()) {
    const variant = i % 4 === 0 ? yearly : monthly
    const interval = variant === yearly ? 'year' : 'month'
    const start = DAYS - Math.floor(rand() * DAYS)
    const createdAt = daysAgo(start)
    const status = pick(['active', 'active', 'active', 'active', 'cancelled', 'past_due', 'expired'] as const)
    const lsSubscriptionId = 700_000 + i
    const [sub] = await db
      .insert(t.subscriptions)
      .values({
        lsSubscriptionId,
        lsOrderId: 800_000 + i,
        userId: buyer.id,
        customerEmail: buyer.email,
        lsVariantId: variant.lsVariantId,
        status,
        interval,
        unitPriceUsd: variant.priceCents,
        cardBrand: pick(['visa', 'mastercard', 'amex']),
        cardLastFour: String(1000 + Math.floor(rand() * 9000)),
        renewsAt: status === 'active' || status === 'past_due' ? new Date(Date.now() + 14 * 86_400_000) : null,
        endsAt:
          status === 'cancelled'
            ? new Date(Date.now() + 10 * 86_400_000)
            : status === 'expired'
              ? daysAgo(Math.floor(start / 2))
              : null,
        pastDueSince: status === 'past_due' ? daysAgo(3) : null,
        createdAt,
      })
      .returning({ id: t.subscriptions.id })
    await db.insert(t.entitlements).values({
      userId: buyer.id,
      customerEmail: buyer.email,
      kind: 'all_access',
      tier: 'all_access',
      sourceSubscriptionId: sub!.id,
      status: status === 'expired' ? 'revoked' : 'active',
      validFrom: createdAt,
      validUntil: status === 'expired' ? daysAgo(Math.floor(start / 2)) : null,
      createdAt,
    })
    const periodDays = interval === 'year' ? 365 : 30
    for (let d = start, n = 0; d >= 0; d -= periodDays, n++) {
      const tax = Math.round(variant.priceCents * 0.1)
      await db.insert(t.subscriptionInvoices).values({
        lsInvoiceId: lsSubscriptionId * 100 + n,
        subscriptionId: sub!.id,
        status: 'paid',
        billingReason: n === 0 ? 'initial' : 'renewal',
        subtotalUsd: variant.priceCents,
        taxUsd: tax,
        totalUsd: variant.priceCents + tax,
        createdAt: daysAgo(d),
      })
    }
    if (status === 'past_due') {
      await db.insert(t.paymentEvents).values({
        type: 'payment_failed',
        userId: buyer.id,
        subscriptionId: sub!.id,
        amountUsd: variant.priceCents,
        attempt: 1,
        createdAt: daysAgo(3),
      })
    }
  }

  // ---------- MRR history ----------
  log('MRR snapshots…')
  // Approximates history by replaying today's subscription states over each subscription's lifetime.
  for (let day = DAYS; day >= 1; day--) {
    const date = daysAgo(day).toISOString().slice(0, 10)
    await db.execute(sql`
      insert into app.mrr_subscription_days (subscription_id, date, mrr_cents)
      select s.id, ${date}::date,
             case s.interval when 'year' then round(s.unit_price_usd / 12.0)::int else s.unit_price_usd end
      from app.subscriptions s
      where s.created_at::date <= ${date}::date
        and (s.ends_at is null or s.ends_at::date > ${date}::date)
      on conflict do nothing`)
    await snapshotMrr(db, date)
  }

  return { products: fixtureProducts.length, buyers: BUYERS, orders: orderNumber - 1000 }
}
