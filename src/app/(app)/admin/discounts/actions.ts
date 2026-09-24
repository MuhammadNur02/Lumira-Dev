'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/client'
import { discounts } from '@/db/schema'
import { billing } from '@/lib/billing'
import { env } from '@/lib/env'
import { sanityWrite } from '@/lib/sanity/client'
import { adminAction, needsReverification, withAudit } from '@/server/admin/audit'

const DiscountInput = z
  .object({
    name: z.string().trim().min(2).max(100),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{3,256}$/, 'Uppercase letters and digits, 3–256 characters'),
    amountType: z.enum(['percent', 'fixed']),
    amount: z.number().int().positive(), // percent (1–100) or cents
    variantIds: z.array(z.number().int().positive()).default([]),
    maxRedemptions: z.number().int().positive().optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    duration: z.enum(['once', 'repeating', 'forever']).default('once'),
    durationInMonths: z.number().int().positive().optional(),
  })
  .refine((d) => d.amountType === 'fixed' || d.amount <= 100, {
    message: 'Percent discounts must be 1–100',
    path: ['amount'],
  })
  .refine((d) => !d.startsAt || !d.expiresAt || d.startsAt < d.expiresAt, {
    message: 'Expiry must be after the start',
    path: ['expiresAt'],
  })

export type DiscountInputT = z.input<typeof DiscountInput>

async function createInLs(input: z.output<typeof DiscountInput>) {
  const { id } = await billing.createDiscount({ ...input, testMode: env.LS_TEST_MODE })
  const [row] = await db
    .insert(discounts)
    .values({
      lsDiscountId: id,
      code: input.code,
      name: input.name,
      amount: input.amount,
      amountType: input.amountType,
      duration: input.duration,
      durationInMonths: input.durationInMonths,
      variantIds: input.variantIds,
      maxRedemptions: input.maxRedemptions,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
      testMode: env.LS_TEST_MODE,
    })
    .returning()
  return row!
}

/** FR-AD-31: `POST /v1/discounts` + Postgres mirror. */
export async function createDiscount(raw: DiscountInputT) {
  return adminAction(async () => {
    const parsed = DiscountInput.safeParse(raw)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid discount')
    const input = parsed.data
    const clash = await db.query.discounts.findFirst({ where: eq(discounts.code, input.code) })
    if (clash && clash.status !== 'deleted') throw new Error(`The code ${input.code} is already live`)
    const row = await withAudit({ action: 'discount.created', targetType: 'discount', targetId: input.code }, () =>
      createInLs(input),
    )
    revalidatePath('/admin/discounts')
    return { id: row.id }
  })
}

/** FR-AD-32: destructive, so it requires Clerk step-up reverification. */
export async function deleteDiscount(id: string) {
  const reverify = await needsReverification()
  if (reverify) return reverify
  return adminAction(async () => {
    const row = await db.query.discounts.findFirst({ where: eq(discounts.id, z.uuid().parse(id)) })
    if (!row || row.status === 'deleted') throw new Error('Discount not found')
    await withAudit(
      { action: 'discount.deleted', targetType: 'discount', targetId: row.code, before: row },
      async () => {
        await billing.deleteDiscount(row.lsDiscountId)
        const [after] = await db
          .update(discounts)
          .set({ status: 'deleted' })
          .where(eq(discounts.id, row.id))
          .returning()
        return after
      },
    )
    revalidatePath('/admin/discounts')
  })
}

/**
 * LS has no update endpoint: "Edit" = snapshot → delete → create with the same code. If the create
 * fails, the snapshot is re-created so the code never silently disappears. Redemption counts restart.
 */
export async function editDiscount(id: string, raw: DiscountInputT) {
  const reverify = await needsReverification()
  if (reverify) return reverify
  return adminAction(async () => {
    const parsed = DiscountInput.safeParse(raw)
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid discount')
    const before = await db.query.discounts.findFirst({ where: eq(discounts.id, z.uuid().parse(id)) })
    if (!before || before.status === 'deleted') throw new Error('Discount not found')
    const next = { ...parsed.data, code: before.code }
    return withAudit({ action: 'discount.edited', targetType: 'discount', targetId: before.code, before }, async () => {
      await billing.deleteDiscount(before.lsDiscountId)
      await db.update(discounts).set({ status: 'deleted' }).where(eq(discounts.id, before.id))
      try {
        const row = await createInLs(next)
        revalidatePath('/admin/discounts')
        return row
      } catch (error) {
        await createInLs({
          name: before.name,
          code: before.code,
          amount: before.amount,
          amountType: before.amountType,
          variantIds: before.variantIds,
          maxRedemptions: before.maxRedemptions ?? undefined,
          startsAt: before.startsAt ?? undefined,
          expiresAt: before.expiresAt ?? undefined,
          duration: before.duration ?? 'once',
          durationInMonths: before.durationInMonths ?? undefined,
        })
        revalidatePath('/admin/discounts')
        throw new Error(
          `Edit failed and the original code was restored: ${error instanceof Error ? error.message : 'unknown error'}`,
        )
      }
    })
  })
}

const Banner = z.object({
  enabled: z.boolean(),
  code: z.string().max(256).nullable(),
  text: z.string().max(140).nullable(),
})

/** FR-AD-33: site-wide banner lives in Sanity `siteSettings.promoBanner`; the Sanity webhook revalidates. */
export async function setPromoBanner(raw: z.input<typeof Banner>) {
  return adminAction(async () => {
    const input = Banner.parse(raw)
    await withAudit(
      { action: 'promo_banner.updated', targetType: 'site_settings', targetId: 'siteSettings' },
      async () => {
        await sanityWrite
          .patch('siteSettings')
          .set({
            'promoBanner.enabled': input.enabled,
            ...(input.code
              ? { 'promoBanner.code': input.code, 'promoBanner.href': `/?code=${encodeURIComponent(input.code)}` }
              : {}),
            ...(input.text ? { 'promoBanner.text': input.text } : {}),
          })
          .commit()
        return input
      },
    )
  })
}
