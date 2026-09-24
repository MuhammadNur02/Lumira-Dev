'use server'

import { revalidatePath } from 'next/cache'
import { clerkClient } from '@clerk/nextjs/server'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { products, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'

const Pref = z.object({ productSlug: z.string().min(1).max(120), enabled: z.boolean() })

/** Release-email preference per product (FR-BD-09, FR-EM-05). Missing keys default to on. */
export async function setReleaseEmails(raw: z.input<typeof Pref>): Promise<{ ok: boolean }> {
  const { userId } = await requireUser()
  const input = Pref.safeParse(raw)
  if (!input.success) return { ok: false }
  const product = await db.query.products.findFirst({
    where: eq(products.slug, input.data.productSlug),
    columns: { id: true },
  })
  if (!product) return { ok: false }
  await db
    .update(users)
    .set({
      releaseEmails: sql`${users.releaseEmails} || jsonb_build_object(${input.data.productSlug}::text, ${input.data.enabled}::boolean)`,
    })
    .where(eq(users.id, userId))
  revalidatePath('/account/settings')
  return { ok: true }
}

/**
 * Account deletion (FR-BD-09): Clerk deletes the identity; the `user.deleted` webhook anonymizes the
 * mirror and revokes Discord. Orders are retained for tax law. Requires typing DELETE.
 */
export async function deleteAccount(confirmation: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await requireUser()
  if (confirmation !== 'DELETE') return { ok: false, error: 'Type DELETE to confirm.' }
  try {
    const client = await clerkClient()
    await client.users.deleteUser(userId)
  } catch {
    return {
      ok: false,
      error: 'We couldn’t delete your account. Try again, or contact support and mention code AC-DEL.',
    }
  }
  return { ok: true }
}
