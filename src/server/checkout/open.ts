import 'server-only'
import { cookies } from 'next/headers'
import { after } from 'next/server'
import { and, count, eq, gt } from 'drizzle-orm'
import { db } from '@/db/client'
import { checkoutSessions, type Variant } from '@/db/schema'
import { captureServer } from '@/lib/analytics/server'
import { createCheckout, LemonSqueezyError } from '@/lib/billing/lemonsqueezy/client'
import { env } from '@/lib/env'

export type OpenCheckoutInput = {
  variant: Variant
  userId: string | null
  email?: string
  name?: string
  discountCode?: string
  phDistinctId?: string
  utm?: Record<string, string | undefined>
  theme: 'light' | 'dark'
  hasAffiliate?: boolean
  ipHash: string
}

export type OpenCheckoutResult =
  { ok: true; url: string; checkoutSessionId: string } | { ok: false; error: 'unavailable' }

/**
 * Session row → LS checkout → `__Host-lumira_cs` cookie (FR-CO-02). The row carries UTM and the
 * PostHog id so the server-side `purchase_completed` joins the browsing session. Callers own rate
 * limiting and input validation. Server Actions and Route Handlers only (sets a cookie).
 */
export async function openCheckout(input: OpenCheckoutInput): Promise<OpenCheckoutResult> {
  const { variant } = input
  const [session] = await db
    .insert(checkoutSessions)
    .values({
      userId: input.userId,
      email: input.email,
      lsVariantId: variant.lsVariantId,
      discountCode: input.discountCode,
      utm: input.utm as Record<string, string> | undefined,
      phDistinctId: input.phDistinctId,
      ipHash: input.ipHash,
    })
    .returning({ id: checkoutSessions.id })
  if (!session) return { ok: false, error: 'unavailable' }

  let checkout: { checkoutId: string; url: string }
  try {
    checkout = await createCheckout({
      variantId: variant.lsVariantId,
      email: input.email,
      name: input.name,
      discountCode: input.discountCode,
      custom: {
        cs_id: session.id,
        user_id: input.userId ?? '',
        ph_id: input.phDistinctId ?? '',
        ...Object.fromEntries(Object.entries(input.utm ?? {}).map(([k, v]) => [`utm_${k}`, v ?? ''])),
      },
      redirectUrl: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?cs=${session.id}`,
      dark: input.theme === 'dark',
      testMode: env.LS_TEST_MODE,
    })
  } catch (error) {
    await db.update(checkoutSessions).set({ status: 'expired' }).where(eq(checkoutSessions.id, session.id))
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'checkout_create_failed',
        status: error instanceof LemonSqueezyError ? error.status : null,
      }),
    )
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import('@sentry/nextjs').then((S) => S.captureException(error))
    return { ok: false, error: 'unavailable' }
  }

  await db
    .update(checkoutSessions)
    .set({ lsCheckoutId: checkout.checkoutId })
    .where(eq(checkoutSessions.id, session.id))
  const jar = await cookies()
  jar.set('__Host-lumira_cs', session.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 2 * 60 * 60,
  })

  after(() =>
    captureServer({
      distinctId: input.phDistinctId || input.userId || session.id,
      event: 'checkout_started',
      properties: {
        cs_id: session.id,
        variant_id: variant.lsVariantId,
        tier: variant.tier,
        price_usd: variant.priceCents / 100,
        has_discount: Boolean(input.discountCode),
        has_affiliate: input.hasAffiliate,
      },
    }),
  )
  return { ok: true, url: checkout.url, checkoutSessionId: session.id }
}

/** At most 3 open sessions per IP per 10 minutes (FR-CO-08). */
export async function tooManyOpenSessions(ipHash: string): Promise<boolean> {
  const [open] = await db
    .select({ n: count() })
    .from(checkoutSessions)
    .where(
      and(
        eq(checkoutSessions.ipHash, ipHash),
        eq(checkoutSessions.status, 'initiated'),
        gt(checkoutSessions.createdAt, new Date(Date.now() - 10 * 60 * 1000)),
      ),
    )
  return (open?.n ?? 0) >= 3
}
