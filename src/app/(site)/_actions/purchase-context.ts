'use server'

import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import type { Ownership, PromoInfo } from '@/components/commerce/purchase'
import { ownershipFor } from '@/server/entitlements'
import { resolvePromo } from '@/server/promo'

/**
 * Ownership + promo for client surfaces that must stay mounted (the Live Preview player keeps its
 * iframe, so it asks after mount instead of streaming a new tree).
 */
export async function getPurchaseContext(rawSlug: string): Promise<{ ownership: Ownership; promo: PromoInfo }> {
  const slug = z
    .string()
    .regex(/^[a-z0-9-]{1,64}$/)
    .parse(rawSlug)
  const [{ userId }, jar] = await Promise.all([auth(), cookies()])
  const [ownership, promo] = await Promise.all([
    userId ? ownershipFor(userId, slug).catch(() => null) : Promise.resolve(null),
    resolvePromo(jar.get('lumira_promo')?.value),
  ])
  return { ownership: ownership as Ownership, promo }
}
