'use server'

import { updateTag } from 'next/cache'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { and, eq, ne } from 'drizzle-orm'
import semver from 'semver'
import { z } from 'zod'
import { db } from '@/db/client'
import { downloadEvents, downloadTokens, releases } from '@/db/schema'
import { env } from '@/lib/env'
import { r2Write } from '@/lib/r2'
import { sanityWrite } from '@/lib/sanity/client'
import { adminAction, needsReverification, withAudit } from '@/server/admin/audit'
import { getProductOrThrow } from '@/server/catalog'
import { syncVariantsFromLs } from '@/server/catalog/variant-sync'
import { publishReleaseNotify } from '@/server/releases/notify'

/** Read-your-writes inside the Server Action (Task.md P7.12). */
function invalidateProduct(slug: string) {
  updateTag(`release:${slug}`)
  updateTag(`product:${slug}`)
  updateTag('changelog')
  updateTag('catalog')
}

/** FR-AD-51: "Sync from Lemon Squeezy" (prices and activation limits → Sanity + Postgres). */
export async function syncPrices() {
  return adminAction(async () => {
    const result = await withAudit(
      { action: 'catalog.prices_synced', targetType: 'catalog', targetId: 'variants' },
      async () => {
        const { lines, changedSlugs } = await syncVariantsFromLs()
        return {
          updated: lines.filter((l) => l.status === 'updated').length,
          missing: lines.filter((l) => l.status === 'missing_in_ls').map((l) => l.lsVariantId),
          changedSlugs,
        }
      },
    )
    for (const slug of result.changedSlugs) updateTag(`product:${slug}`)
    updateTag('catalog')
    updateTag('site-settings')
    updateTag('bundle')
    return result
  })
}

const Publish = z.object({
  releaseId: z.uuid(),
  title: z.string().trim().min(3).max(80),
  summary: z.string().trim().min(10).max(280),
  changes: z
    .array(
      z.object({
        kind: z.enum(['added', 'improved', 'fixed', 'removed', 'deprecated', 'security', 'breaking']),
        text: z.string().trim().min(2).max(200),
      }),
    )
    .max(50)
    .default([]),
  notify: z.boolean().default(true),
})

/**
 * P7.12 / FR-AD-53: writes the Sanity `release` (rich notes are edited in the Studio afterwards),
 * marks the Postgres release published, invalidates the changelog and PDP, and optionally fans out
 * the release email through QStash (deduplicated by release id).
 */
export async function publishRelease(raw: z.input<typeof Publish>) {
  return adminAction(async () => {
    const input = Publish.parse(raw)
    const release = await db.query.releases.findFirst({ where: eq(releases.id, input.releaseId) })
    if (!release) throw new Error('Release not found')
    if (release.status !== 'draft') throw new Error(`v${release.semver} is already ${release.status}`)
    const product = await getProductOrThrow(release.productId)

    const previous = await db
      .select({ semver: releases.semver })
      .from(releases)
      .where(
        and(eq(releases.productId, release.productId), eq(releases.status, 'published'), ne(releases.id, release.id)),
      )
    const latest = previous.map((r) => r.semver).sort(semver.rcompare)[0]
    const type = !latest
      ? 'major'
      : ((semver.diff(release.semver, latest) ?? 'patch').replace(/^pre/, '') as 'major' | 'minor' | 'patch')
    if (type === 'major' && latest && !input.changes.some((c) => c.kind === 'breaking')) {
      throw new Error('A major release needs at least one "breaking" change (and an upgrade guide in the Studio).')
    }

    const publishedAt = new Date()
    const sanityId = `release-${release.id}`
    await withAudit(
      { action: 'release.published', targetType: 'release', targetId: release.id, before: { status: release.status } },
      async () => {
        await sanityWrite.createOrReplace({
          _id: sanityId,
          _type: 'release',
          product: { _type: 'reference', _ref: product.id },
          version: release.semver,
          type,
          releasedAt: publishedAt.toISOString(),
          title: input.title,
          summary: input.summary,
          changes: input.changes.map((c, i) => ({ _key: `c${i}`, _type: 'change', ...c })),
          releaseId: release.id,
          status: 'published',
        })
        const [after] = await db
          .update(releases)
          .set({ status: 'published', publishedAt, sanityReleaseId: sanityId })
          .where(eq(releases.id, release.id))
          .returning({ status: releases.status, publishedAt: releases.publishedAt })
        return { ...after, notify: input.notify }
      },
    )
    invalidateProduct(product.slug)
    if (input.notify) await publishReleaseNotify(release.id)
    return { version: release.semver, notified: input.notify }
  })
}

/** FR-AD-54 yank: hidden from new downloads and marked withdrawn in the changelog, but retained. */
export async function yankRelease(releaseId: string, reason: string) {
  return adminAction(async () => {
    const release = await db.query.releases.findFirst({ where: eq(releases.id, z.uuid().parse(releaseId)) })
    if (!release || release.status !== 'published') throw new Error('Only published releases can be yanked')
    const product = await getProductOrThrow(release.productId)
    await withAudit(
      {
        action: 'release.yanked',
        targetType: 'release',
        targetId: release.id,
        before: { status: release.status },
        reason: z.string().trim().min(3).max(300).parse(reason),
      },
      async () => {
        const [after] = await db
          .update(releases)
          .set({ status: 'yanked' })
          .where(eq(releases.id, release.id))
          .returning({ status: releases.status })
        if (release.sanityReleaseId)
          await sanityWrite.patch(release.sanityReleaseId).set({ status: 'withdrawn' }).commit()
        return after
      },
    )
    invalidateProduct(product.slug)
  })
}

/**
 * Hard delete (FR-AD-54): typed confirmation + reverification, audited. Only drafts or releases
 * nobody downloaded can be deleted: history that buyers touched is yanked instead.
 */
export async function deleteRelease(releaseId: string, confirmation: string) {
  const reverify = await needsReverification()
  if (reverify) return reverify
  return adminAction(async () => {
    const release = await db.query.releases.findFirst({ where: eq(releases.id, z.uuid().parse(releaseId)) })
    if (!release) throw new Error('Release not found')
    if (confirmation !== release.semver) throw new Error(`Type ${release.semver} to confirm`)
    const [used] = await db
      .select({ id: downloadEvents.id })
      .from(downloadEvents)
      .where(eq(downloadEvents.releaseId, release.id))
      .limit(1)
    if (used) throw new Error('This release has download history. Yank it instead.')
    const product = await getProductOrThrow(release.productId)
    await withAudit(
      { action: 'release.deleted', targetType: 'release', targetId: release.id, before: release },
      async () => {
        await r2Write().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: release.r2Key }))
        await db.delete(downloadTokens).where(eq(downloadTokens.releaseId, release.id))
        await db.delete(releases).where(eq(releases.id, release.id))
        if (release.sanityReleaseId) await sanityWrite.delete(release.sanityReleaseId)
        return { deleted: release.semver }
      },
    )
    invalidateProduct(product.slug)
  })
}
