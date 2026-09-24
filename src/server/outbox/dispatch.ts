import 'server-only'
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm'
import { Resend } from 'resend'
import { db } from '@/db/client'
import { emailOutbox, jobOutbox } from '@/db/schema'
import { renderTemplate } from '@/lib/email/render'
import { env } from '@/lib/env'
import { DiscordRateLimitError } from '@/server/discord'
import { MAX_JOB_ATTEMPTS, nextAttemptDelayMs, RetryableJobError } from '@/server/jobs/errors'
import { jobHandlers } from '@/server/jobs/handlers'

const MAX_EMAIL_ATTEMPTS = 8
const LEASE_MS = 5 * 60 * 1000

let resend: Resend | null = null
const resendClient = () => (resend ??= new Resend(env.RESEND_API_KEY))

/**
 * Lease a batch with FOR UPDATE SKIP LOCKED and push its next attempt out by the lease time, so
 * concurrent drains (after() + cron) never pick the same rows.
 */
async function lease<T extends typeof emailOutbox | typeof jobOutbox>(
  table: T,
  limit: number,
): Promise<T['$inferSelect'][]> {
  // One code path for both tables: the casts only narrow the column accessors they share.
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(table as typeof emailOutbox)
      .where(
        and(
          eq((table as typeof emailOutbox).status, 'pending'),
          lte((table as typeof emailOutbox).nextAttemptAt, new Date()),
        ),
      )
      .orderBy(asc((table as typeof emailOutbox).nextAttemptAt))
      .limit(limit)
      .for('update', { skipLocked: true })
    if (rows.length > 0) {
      await tx
        .update(table as typeof emailOutbox)
        .set({ nextAttemptAt: new Date(Date.now() + LEASE_MS) })
        .where(
          inArray(
            (table as typeof emailOutbox).id,
            rows.map((r) => r.id),
          ),
        )
    }
    return rows
  })
}

/** Admin alert through the outbox; the key dedupes repeats of the same incident. */
export async function alertAdmin(title: string, lines: string[], key: string, path = '/admin/activity/emails') {
  await db
    .insert(emailOutbox)
    .values({
      template: 'admin-alert',
      to: env.ADMIN_ALERT_EMAIL,
      payload: { title, lines, path },
      idempotencyKey: `admin-alert:${key}`,
    })
    .onConflictDoNothing()
}

/** Email outbox (FR-SYS-03, FR-EM-10): each row sent exactly once; Resend dedupes on the idempotency key too. */
export async function drainEmailOutbox(limit = 20) {
  const batch = await lease(emailOutbox, limit)
  for (const row of batch) {
    try {
      const { subject, react, from, replyTo, headers, payloadPatch } = await renderTemplate(row.template, row.payload)
      const { data, error } = await resendClient().emails.send(
        { from: from ?? env.EMAIL_FROM, to: row.to, replyTo: replyTo ?? env.SUPPORT_EMAIL, subject, react, headers },
        { idempotencyKey: row.idempotencyKey }, // Resend dedupes for 24 h
      )
      if (error) throw new Error(error.message)
      await db
        .update(emailOutbox)
        .set({
          status: 'sent',
          resendId: data?.id ?? null,
          sentAt: new Date(),
          attempts: row.attempts + 1,
          lastError: null,
          ...(payloadPatch ? { payload: { ...row.payload, ...payloadPatch } } : {}),
        })
        .where(eq(emailOutbox.id, row.id))
    } catch (err) {
      const attempts = row.attempts + 1
      const failed = attempts >= MAX_EMAIL_ATTEMPTS
      await db
        .update(emailOutbox)
        .set({
          attempts,
          lastError: String(err).slice(0, 1000),
          status: failed ? 'failed' : 'pending',
          nextAttemptAt: new Date(Date.now() + nextAttemptDelayMs(attempts, false)),
        })
        .where(eq(emailOutbox.id, row.id))
      if (failed && row.template !== 'admin-alert') {
        await alertAdmin(
          `Email ${row.template} failed after ${attempts} attempts`,
          [`to: ${row.to}`, `error: ${String(err).slice(0, 200)}`],
          `email:${row.id}`,
        )
      }
    }
  }
  return batch.length
}

/** Job outbox (P6.11): one handler per kind; retryable errors back off 2 s → 30 s. */
export async function drainJobOutbox(limit = 20) {
  const batch = await lease(jobOutbox, limit)
  for (const row of batch) {
    try {
      await jobHandlers[row.kind](row.payload)
      await db
        .update(jobOutbox)
        .set({ status: 'done', doneAt: new Date(), attempts: row.attempts + 1, lastError: null })
        .where(eq(jobOutbox.id, row.id))
    } catch (err) {
      const attempts = row.attempts + 1
      const retryable = err instanceof RetryableJobError || err instanceof DiscordRateLimitError
      const max = err instanceof RetryableJobError ? MAX_JOB_ATTEMPTS.retryable : MAX_JOB_ATTEMPTS.default
      const failed = attempts >= max
      await db
        .update(jobOutbox)
        .set({
          attempts,
          lastError: String(err).slice(0, 1000),
          status: failed ? 'failed' : 'pending',
          nextAttemptAt: new Date(
            Date.now() +
              nextAttemptDelayMs(
                attempts,
                retryable,
                err instanceof DiscordRateLimitError ? err.retryAfterMs : undefined,
              ),
          ),
        })
        .where(eq(jobOutbox.id, row.id))
      if (failed) {
        await alertAdmin(
          `Job ${row.kind} failed after ${attempts} attempts`,
          [`job: ${row.id}`, `error: ${String(err).slice(0, 200)}`],
          `job:${row.id}`,
        )
      }
    }
  }
  return batch.length
}

export async function drainOutboxes({ limit }: { limit: number }) {
  const [jobs, emails] = await Promise.allSettled([drainJobOutbox(limit), drainEmailOutbox(limit)])
  return {
    jobs: jobs.status === 'fulfilled' ? jobs.value : 0,
    emails: emails.status === 'fulfilled' ? emails.value : 0,
  }
}

/** Outbox health for the admin integrations page. */
export async function outboxBacklog() {
  const rows = await db
    .select({ status: jobOutbox.status, n: sql<number>`count(*)::int` })
    .from(jobOutbox)
    .groupBy(jobOutbox.status)
  const emails = await db
    .select({ status: emailOutbox.status, n: sql<number>`count(*)::int` })
    .from(emailOutbox)
    .groupBy(emailOutbox.status)
  return {
    jobs: Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])),
    emails: Object.fromEntries(emails.map((r) => [r.status, Number(r.n)])),
  }
}
