import { NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db/client'
import { subscriptions } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { billing } from '@/lib/billing'
import { env } from '@/lib/env'

/** Signed LS portal URLs are short-lived, so they are fetched on click (FR-BD-07). */
export async function GET(req: Request) {
  const { userId } = await requireUser()
  const back = (q = '') =>
    NextResponse.redirect(new URL(`/account/billing${q}`, env.NEXT_PUBLIC_APP_URL), {
      headers: { 'Cache-Control': 'no-store' },
    })
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      inArray(subscriptions.status, ['on_trial', 'active', 'past_due', 'unpaid', 'paused', 'cancelled']),
    ),
    orderBy: desc(subscriptions.createdAt),
  })
  if (!sub) return back()
  try {
    const { customerPortal, updatePaymentMethod } = await billing.getSubscriptionUrls(sub.lsSubscriptionId)
    const target = new URL(req.url).searchParams.get('to') === 'payment' ? updatePaymentMethod : customerPortal
    if (!target) return back('?portal=unavailable')
    return NextResponse.redirect(target, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return back('?portal=unavailable')
  }
}
