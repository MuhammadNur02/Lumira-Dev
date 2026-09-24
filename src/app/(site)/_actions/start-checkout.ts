'use server'

import { cookies, headers } from 'next/headers'
import { auth, currentUser } from '@clerk/nextjs/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { variants } from '@/db/schema'
import { hashIp } from '@/lib/crypto'
import { clientIp } from '@/lib/http'
import { ratelimit } from '@/lib/rate-limit'
import { openCheckout, tooManyOpenSessions } from '@/server/checkout/open'
import { resolvePromo } from '@/server/promo'

const Input = z.object({
  variantId: z.number().int().positive(),
  phDistinctId: z.string().max(200).optional(),
  utm: z.partialRecord(z.enum(['source', 'medium', 'campaign', 'content', 'term']), z.string().max(200)).optional(),
  theme: z.enum(['light', 'dark']).default('light'),
  hasAffiliate: z.boolean().optional(),
})

export type StartCheckoutResult =
  | { ok: true; url: string; checkoutSessionId: string }
  | { ok: false; error: 'rate_limited' | 'unknown_variant' | 'unavailable' | 'invalid' }

/**
 * Creates a Lemon Squeezy checkout for one variant (FR-CO-02). The HttpOnly `__Host-lumira_cs`
 * cookie scopes the success page to this browser.
 */
export async function startCheckout(raw: z.input<typeof Input>): Promise<StartCheckoutResult> {
  const parsed = Input.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  const input = parsed.data

  const ipHash = hashIp(clientIp(await headers()))
  if (!(await ratelimit.checkout.limit(ipHash)).success) return { ok: false, error: 'rate_limited' }
  if (await tooManyOpenSessions(ipHash)) return { ok: false, error: 'rate_limited' }

  const variant = await db.query.variants.findFirst({
    where: and(eq(variants.lsVariantId, input.variantId), eq(variants.active, true)),
  })
  if (!variant) return { ok: false, error: 'unknown_variant' }

  const { userId } = await auth()
  const user = userId ? await currentUser() : null
  const promo = await resolvePromo((await cookies()).get('lumira_promo')?.value, variant.lsVariantId)

  return openCheckout({
    variant,
    userId,
    email: user?.primaryEmailAddress?.emailAddress,
    name: user?.fullName ?? undefined,
    discountCode: promo?.code,
    phDistinctId: input.phDistinctId,
    utm: input.utm,
    theme: input.theme,
    hasAffiliate: input.hasAffiliate,
    ipHash,
  })
}
