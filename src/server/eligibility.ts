/**
 * Download eligibility (PRD §7.3), as a pure function so every rule is table-testable.
 *
 * canDownload(user, release) :=
 *   release.status = 'published'
 *   AND EXISTS e IN entitlements(user) WHERE e.status = 'active' AND (
 *         ( e.kind IN ('license', 'comp') AND e.product_id = release.product_id
 *           AND (e.max_major IS NULL OR release.major <= e.max_major) )
 *      OR ( e.kind = 'all_access' AND release.product_id IN all_access_catalog
 *           AND release.published_at <= COALESCE(e.valid_until, now()) ) )
 */
export type EligibilityEntitlement = {
  id: string
  kind: 'license' | 'all_access' | 'comp'
  status: 'active' | 'suspended' | 'revoked'
  productId: string | null
  maxMajor: number | null
  validUntil: Date | null
}

export type EligibilityRelease = {
  productId: string
  major: number
  status: 'draft' | 'published' | 'yanked'
  publishedAt: Date | null
}

export type EligibilityResult =
  { allowed: true; entitlementId: string } | { allowed: false; reason: 'withdrawn' | 'not_entitled' | 'major_version' }

export function evaluateEligibility(
  entitlements: readonly EligibilityEntitlement[],
  release: EligibilityRelease,
  product: { inAllAccess: boolean },
  now: Date = new Date(),
): EligibilityResult {
  if (release.status !== 'published' || !release.publishedAt) return { allowed: false, reason: 'withdrawn' }
  const publishedAt = release.publishedAt

  const active = entitlements.filter((e) => e.status === 'active')
  const match = active.find((e) =>
    e.kind === 'all_access'
      ? product.inAllAccess && publishedAt.getTime() <= (e.validUntil ?? now).getTime()
      : e.productId === release.productId && (e.maxMajor === null || release.major <= e.maxMajor),
  )
  if (match) return { allowed: true, entitlementId: match.id }

  const ownsOlderMajor = active.some((e) => e.kind !== 'all_access' && e.productId === release.productId)
  return { allowed: false, reason: ownsOlderMajor ? 'major_version' : 'not_entitled' }
}

/** Past-due All-Access members keep access for 14 days while LS retries the card (Task.md P5.10). */
export const ALL_ACCESS_GRACE_MS = 14 * 24 * 60 * 60 * 1000

/** Does an entitlement cover a product at all (any version)? Used for docs, the registry and the Library. */
export function coversProduct(
  e: Pick<EligibilityEntitlement, 'kind' | 'status' | 'productId' | 'validUntil'>,
  product: { id: string; inAllAccess: boolean },
  now: Date = new Date(),
): boolean {
  if (e.status !== 'active') return false
  if (e.kind === 'all_access') {
    return (
      product.inAllAccess && (e.validUntil === null || e.validUntil.getTime() + ALL_ACCESS_GRACE_MS >= now.getTime())
    )
  }
  return e.productId === product.id
}
