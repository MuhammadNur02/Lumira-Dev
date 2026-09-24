import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { downloadEvents, licenseKeys, orders, releases, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { maskLicenseKey } from '@/lib/licensing/crypto'
import { ratelimit } from '@/lib/rate-limit'

/** "Export my data" (FR-BD-09): orders, masked keys and downloads as JSON. Keys are never exported in full. */
export async function GET() {
  const { userId } = await requireUser()
  if (!(await ratelimit.accountExport.limit(userId)).success) {
    return new Response('Too many exports. Try again in an hour.', {
      status: 429,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  const [user, orderRows, keyRows, downloadRows] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, email: true, name: true, createdAt: true, releaseEmails: true },
    }),
    db
      .select({
        number: orders.orderNumber,
        status: orders.status,
        currency: orders.currency,
        subtotalUsd: orders.subtotalUsd,
        discountUsd: orders.discountUsd,
        taxUsd: orders.taxUsd,
        totalUsd: orders.totalUsd,
        receiptUrl: orders.receiptUrl,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt)),
    db
      .select({
        keyShort: licenseKeys.keyShort,
        status: licenseKeys.status,
        activationLimit: licenseKeys.activationLimit,
        instancesCount: licenseKeys.instancesCount,
        createdAt: licenseKeys.createdAt,
      })
      .from(licenseKeys)
      .where(eq(licenseKeys.userId, userId)),
    db
      .select({
        version: releases.semver,
        productId: releases.productId,
        channel: downloadEvents.channel,
        status: downloadEvents.status,
        country: downloadEvents.country,
        createdAt: downloadEvents.createdAt,
      })
      .from(downloadEvents)
      .innerJoin(releases, eq(releases.id, downloadEvents.releaseId))
      .where(eq(downloadEvents.userId, userId))
      .orderBy(desc(downloadEvents.createdAt))
      .limit(5000),
  ])

  const body = {
    exportedAt: new Date().toISOString(),
    user,
    orders: orderRows,
    licenseKeys: keyRows.map(({ keyShort, ...rest }) => ({ key: maskLicenseKey(keyShort), ...rest })),
    downloads: downloadRows,
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="lumira-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
