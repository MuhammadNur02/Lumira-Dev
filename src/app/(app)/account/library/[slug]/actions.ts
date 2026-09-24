'use server'

import { headers } from 'next/headers'
import { currentUser } from '@clerk/nextjs/server'
import { z } from 'zod'
import { hashIp } from '@/lib/crypto'
import { clientIp } from '@/lib/http'
import { requireUser } from '@/lib/auth'
import { ratelimit } from '@/lib/rate-limit'
import { openCheckout, tooManyOpenSessions } from '@/server/checkout/open'
import { issueUpgradeCode, quoteUpgrade } from '@/server/upgrades'

const Input = z.object({
  productSlug: z.string().min(1).max(120),
  target: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('major') }),
    z.object({ kind: z.literal('tier'), tier: z.enum(['team', 'extended']) }),
  ]),
  theme: z.enum(['light', 'dark']).default('dark'),
  phDistinctId: z.string().max(200).optional(),
})

export type UpgradeResult = { ok: true; url: string } | { ok: false; error: string }

/** F-06: tier or major-version upgrade through a single-use discount limited to the target variant. */
export async function startUpgrade(raw: z.input<typeof Input>): Promise<UpgradeResult> {
  const { userId } = await requireUser()
  const parsed = Input.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'Invalid upgrade request.' }
  const input = parsed.data

  const ipHash = hashIp(clientIp(await headers()))
  if (!(await ratelimit.checkout.limit(`upgrade:${userId}`)).success || (await tooManyOpenSessions(ipHash))) {
    return { ok: false, error: 'Too many checkout attempts. Try again in a few minutes.' }
  }

  const quote = await quoteUpgrade(userId, input.productSlug, input.target)
  if (!quote) return { ok: false, error: 'This upgrade isn’t available for your license.' }

  let code: string
  try {
    code = await issueUpgradeCode(quote)
  } catch {
    return {
      ok: false,
      error: 'We couldn’t prepare your upgrade price. Try again, or contact support and mention code UP-LS.',
    }
  }

  const user = await currentUser()
  const result = await openCheckout({
    variant: quote.variant,
    userId,
    email: user?.primaryEmailAddress?.emailAddress,
    name: user?.fullName ?? undefined,
    discountCode: code,
    phDistinctId: input.phDistinctId,
    theme: input.theme,
    ipHash,
  })
  return result.ok
    ? { ok: true, url: result.url }
    : { ok: false, error: 'Checkout is unavailable right now. Try again shortly.' }
}
