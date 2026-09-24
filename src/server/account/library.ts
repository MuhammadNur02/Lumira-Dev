import 'server-only'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  discordLinks,
  downloadEvents,
  entitlements,
  licenseEvents,
  licenseKeys,
  products,
  releases,
  type Entitlement,
  type LicenseTier,
  type Product,
  type Release,
} from '@/db/schema'
import { coversProduct, evaluateEligibility } from '@/server/eligibility'

export type LibraryRelease = Pick<
  Release,
  'id' | 'semver' | 'major' | 'minor' | 'patch' | 'sizeBytes' | 'sha256' | 'publishedAt' | 'sanityReleaseId'
> & {
  eligible: boolean
  lockedReason: 'major_version' | null
}

export type LibraryItem = {
  product: Pick<Product, 'id' | 'slug' | 'name' | 'line'>
  /** Best access for display: the highest tier, or All-Access "Included". */
  access: { kind: 'license' | 'comp'; tier: LicenseTier | null } | { kind: 'all_access' }
  releases: LibraryRelease[]
  latestEligible: LibraryRelease | null
  latest: LibraryRelease | null
  lastDownloaded: string | null
  updateAvailable: boolean
  /** Newer major the buyer can upgrade into (F-06). */
  lockedMajor: number | null
}

const TIER_RANK: Record<LicenseTier, number> = { personal: 0, team: 1, extended: 2, all_access: 3 }
const bySemverDesc = (a: Release, b: Release) => b.major - a.major || b.minor - a.minor || b.patch - a.patch

async function activeEntitlements(userId: string) {
  return db
    .select()
    .from(entitlements)
    .where(and(eq(entitlements.userId, userId), eq(entitlements.status, 'active')))
}

/**
 * Owned assets for `/account/library` (FR-BD-02). All-Access members see the whole All-Access
 * catalog as "Included". Every version flag uses the same PRD §7.3 predicate as `/api/downloads`.
 */
export async function getLibrary(userId: string, onlySlug?: string): Promise<LibraryItem[]> {
  const ents = await activeEntitlements(userId)
  if (!ents.length) return []

  const pass = ents.find((e) => e.kind === 'all_access')
  const directIds = [...new Set(ents.filter((e) => e.kind !== 'all_access' && e.productId).map((e) => e.productId!))]
  if (!pass && !directIds.length) return []
  const catalog = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.active, true),
        onlySlug ? eq(products.slug, onlySlug) : undefined,
        pass ? undefined : inArray(products.id, directIds),
      ),
    )
  const owned = catalog.filter((p) => directIds.includes(p.id) || (pass && coversProduct(pass, p)))
  if (!owned.length) return []

  const ids = owned.map((p) => p.id)
  const [allReleases, downloads] = await Promise.all([
    db
      .select()
      .from(releases)
      .where(and(inArray(releases.productId, ids), eq(releases.status, 'published'))),
    db
      .select({ productId: releases.productId, semver: releases.semver, at: downloadEvents.createdAt })
      .from(downloadEvents)
      .innerJoin(releases, eq(releases.id, downloadEvents.releaseId))
      .where(
        and(eq(downloadEvents.userId, userId), eq(downloadEvents.status, 'granted'), inArray(releases.productId, ids)),
      )
      .orderBy(desc(downloadEvents.createdAt))
      .limit(500),
  ])

  return owned
    .map((product) => {
      const relevant = ents.filter((e) => e.kind === 'all_access' || e.productId === product.id)
      const list = allReleases
        .filter((r) => r.productId === product.id)
        .sort(bySemverDesc)
        .map((r) => toLibraryRelease(r, relevant, product))
      const latestEligible = list.find((r) => r.eligible) ?? null
      const latest = list[0] ?? null
      const lastDownloaded = downloads.find((d) => d.productId === product.id)?.semver ?? null
      const lastRow = lastDownloaded ? list.find((r) => r.semver === lastDownloaded) : null
      return {
        product: { id: product.id, slug: product.slug, name: product.name, line: product.line },
        access: accessFor(relevant, product),
        releases: list,
        latestEligible,
        latest,
        lastDownloaded,
        updateAvailable: Boolean(
          lastRow && latestEligible && latestEligible.id !== lastRow.id && compare(latestEligible, lastRow) > 0,
        ),
        lockedMajor: latest && !latest.eligible && latest.lockedReason === 'major_version' ? latest.major : null,
      } satisfies LibraryItem
    })
    .sort(
      (a, b) => Number(b.updateAvailable) - Number(a.updateAvailable) || a.product.name.localeCompare(b.product.name),
    )
}

function toLibraryRelease(r: Release, ents: Entitlement[], product: Product): LibraryRelease {
  const result = evaluateEligibility(ents, r, product)
  return {
    id: r.id,
    semver: r.semver,
    major: r.major,
    minor: r.minor,
    patch: r.patch,
    sizeBytes: r.sizeBytes,
    sha256: r.sha256,
    publishedAt: r.publishedAt,
    sanityReleaseId: r.sanityReleaseId,
    eligible: result.allowed,
    lockedReason: !result.allowed && result.reason === 'major_version' ? 'major_version' : null,
  }
}

function accessFor(ents: Entitlement[], product: Product): LibraryItem['access'] {
  const direct = ents.filter((e) => e.kind !== 'all_access' && e.productId === product.id)
  if (!direct.length) return { kind: 'all_access' }
  const best = direct.sort((a, b) => TIER_RANK[b.tier ?? 'personal'] - TIER_RANK[a.tier ?? 'personal'])[0]!
  return { kind: best.kind === 'comp' ? 'comp' : 'license', tier: best.tier }
}

const compare = (a: Pick<Release, 'major' | 'minor' | 'patch'>, b: Pick<Release, 'major' | 'minor' | 'patch'>) =>
  a.major - b.major || a.minor - b.minor || a.patch - b.patch

/** Onboarding checklist (FR-BD-10) from real events. */
export async function onboardingProgress(userId: string) {
  const [downloaded, activated, discord] = await Promise.all([
    db.query.downloadEvents.findFirst({
      where: and(eq(downloadEvents.userId, userId), eq(downloadEvents.status, 'granted')),
      columns: { id: true },
    }),
    db
      .select({ id: licenseEvents.id })
      .from(licenseEvents)
      .innerJoin(licenseKeys, eq(licenseKeys.id, licenseEvents.licenseKeyId))
      .where(and(eq(licenseKeys.userId, userId), eq(licenseEvents.type, 'activated')))
      .limit(1),
    db.query.discordLinks.findFirst({ where: eq(discordLinks.userId, userId), columns: { status: true } }),
  ])
  return { downloaded: Boolean(downloaded), activated: activated.length > 0, discord: discord?.status === 'active' }
}
