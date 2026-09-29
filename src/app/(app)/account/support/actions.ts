'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { discordLinks } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { ratelimit } from '@/lib/rate-limit'
import { revokeDiscordRole } from '@/server/discord'
import { enqueueEmail } from '@/server/outbox/enqueue'

/** FR-GS-07: removes the role and deletes the link. */
export async function unlinkDiscord(): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireUser()
  try {
    await revokeDiscordRole(userId, true)
  } catch {
    return { ok: false, error: 'Discord didn’t respond. Try again in a minute.' }
  }
  await db.delete(discordLinks).where(eq(discordLinks.userId, userId))
  revalidatePath('/account/support')
  return { ok: true }
}

const SupportInput = z.object({
  subject: z.string().trim().min(3, 'Add a short subject').max(120),
  message: z.string().trim().min(20, 'Tell us a bit more (20 characters minimum)').max(5000),
  orderId: z.union([z.uuid(), z.literal('')]).optional(),
  licenseKeyId: z.union([z.uuid(), z.literal('')]).optional(),
})

export type SupportState = {
  status: 'idle' | 'sent' | 'error'
  message?: string
  fieldErrors?: Partial<Record<'subject' | 'message', string>>
}

/** FR-GS-08: email support with order and license context; ownership is re-checked when rendering. */
export async function sendSupportRequest(_prev: SupportState, form: FormData): Promise<SupportState> {
  const { userId } = await requireUser() // also mirrors the users row the email template joins on
  const parsed = SupportInput.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    return { status: 'error', fieldErrors: { subject: errors.subject?.[0], message: errors.message?.[0] } }
  }
  if (!(await ratelimit.support.limit(userId)).success) {
    return {
      status: 'error',
      message: `You’ve sent several requests in the last hour. We’ll reply soon, or email ${env.SUPPORT_EMAIL} directly.`,
    }
  }
  const { subject, message, orderId, licenseKeyId } = parsed.data
  await enqueueEmail(db, {
    template: 'support-request',
    to: env.SUPPORT_EMAIL,
    payload: { userId, subject, message, orderId: orderId || null, licenseKeyId: licenseKeyId || null },
    idempotencyKey: `support:${userId}:${crypto.randomUUID()}`,
  })
  return { status: 'sent' }
}
