import 'server-only'
import { Client } from '@upstash/qstash'
import { SignJWT, jwtVerify } from 'jose'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { entitlements, products, releases, users } from '@/db/schema'
import { ReleaseAvailableEmail } from '@/emails/simple-emails'
import { env } from '@/lib/env'
import { getChangelog } from '@/lib/sanity/fetchers'
import { evaluateEligibility } from '@/server/eligibility'

const unsubSecret = () => new TextEncoder().encode(env.DOWNLOAD_TOKEN_SECRET)

/** Fan-out through QStash; `deduplicationId` makes a double publish a no-op (P7.12). */
export async function publishReleaseNotify(releaseId: string) {
  const client = new Client({ token: env.QSTASH_TOKEN })
  await client.publishJSON({
    url: `${env.NEXT_PUBLIC_APP_URL}/api/queue/release-notify`,
    body: { releaseId },
    deduplicationId: `release-notify:${releaseId}`,
    retries: 3,
  })
}

export type ReleaseRecipient = {
  userId: string
  email: string
  name: string | null
  productSlug: string
  productId: string
}

/** Owners entitled to this release with release emails on for the product (FR-EM-04), excluding bounced and deleted users. */
export async function eligibleReleaseRecipients(releaseId: string): Promise<ReleaseRecipient[]> {
  const [found] = await db
    .select({ release: releases, product: products })
    .from(releases)
    .innerJoin(products, eq(products.id, releases.productId))
    .where(eq(releases.id, releaseId))
    .limit(1)
  if (!found || found.release.status !== 'published') return []

  const rows = await db
    .select({ entitlement: entitlements, user: users })
    .from(entitlements)
    .innerJoin(users, eq(users.id, entitlements.userId))
    .where(
      and(
        eq(entitlements.status, 'active'),
        or(eq(entitlements.productId, found.product.id), eq(entitlements.kind, 'all_access')),
        isNull(users.deletedAt),
        isNull(users.emailBouncedAt),
        sql`coalesce((${users.releaseEmails} ->> ${found.product.slug})::boolean, true)`,
      ),
    )

  const byUser = new Map<
    string,
    { user: (typeof rows)[number]['user']; ents: (typeof rows)[number]['entitlement'][] }
  >()
  for (const r of rows) {
    const entry = byUser.get(r.user.id) ?? { user: r.user, ents: [] }
    entry.ents.push(r.entitlement)
    byUser.set(r.user.id, entry)
  }
  return [...byUser.values()]
    .filter(({ ents }) => evaluateEligibility(ents, found.release, found.product).allowed)
    .map(({ user }) => ({
      userId: user.id,
      email: user.email,
      name: user.name,
      productSlug: found.product.slug,
      productId: found.product.id,
    }))
}

export async function unsubscribeToken(userId: string, productSlug: string) {
  return new SignJWT({ uid: userId, p: productSlug, typ: 'unsub' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(unsubSecret())
}

export async function readUnsubscribeToken(token: string): Promise<{ userId: string; productSlug: string } | null> {
  try {
    const { payload } = await jwtVerify(token, unsubSecret(), { algorithms: ['HS256'] })
    if (payload.typ !== 'unsub' || typeof payload.uid !== 'string' || typeof payload.p !== 'string') return null
    return { userId: payload.uid, productSlug: payload.p }
  } catch {
    return null
  }
}

/** One Resend batch item. Links only to the authenticated Library, never download tokens (FR-EM-04). */
export async function renderReleaseEmail(recipient: ReleaseRecipient, releaseId: string) {
  const release = await db.query.releases.findFirst({ where: eq(releases.id, releaseId) })
  if (!release) throw new Error(`Release ${releaseId} not found`)
  const entry = (await getChangelog(recipient.productSlug)).find((r) => r.version === release.semver)
  const product = await db.query.products.findFirst({ where: eq(products.id, release.productId) })
  const token = await unsubscribeToken(recipient.userId, recipient.productSlug)
  const unsubscribeUrl = `${env.NEXT_PUBLIC_APP_URL}/api/email/unsubscribe?t=${encodeURIComponent(token)}`
  return {
    from: env.EMAIL_FROM_NEWS,
    to: recipient.email,
    replyTo: 'support@lumira.dev',
    subject: `${product?.name ?? 'Lumira'} v${release.semver}${entry ? `: ${entry.title}` : ''}`,
    headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    react: (
      <ReleaseAvailableEmail
        productName={product?.name ?? 'Lumira'}
        version={release.semver}
        title={entry?.title ?? 'A new release is available'}
        highlights={(entry?.changes ?? []).slice(0, 5).map((c) => c.text)}
        upgradeGuideUrl={
          entry?.upgradeGuide?.length ? `${env.NEXT_PUBLIC_APP_URL}/products/${recipient.productSlug}/changelog` : null
        }
        libraryUrl={`${env.NEXT_PUBLIC_APP_URL}/account/library/${recipient.productSlug}`}
        unsubscribeUrl={unsubscribeUrl}
        appUrl={env.NEXT_PUBLIC_APP_URL}
      />
    ),
  }
}
