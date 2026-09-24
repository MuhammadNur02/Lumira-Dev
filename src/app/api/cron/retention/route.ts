import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { cronResult, cronUnauthorized } from '@/server/cron'

export const maxDuration = 120

const REDACTED = sql`'{"redacted": true}'::jsonb`

/**
 * PRD §7.4 retention (nightly 03:30 UTC). Orders, subscriptions, invoices and the audit log are
 * never touched here (≥ 7 years). Every statement is idempotent.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()

  const count = async (query: ReturnType<typeof sql>) =>
    ((await db.execute(query)) as unknown as { count?: number }).count ?? 0

  const result = {
    // 90 days: payloads redacted, metadata (source, event, status, timings) kept.
    webhookPayloads: await count(sql`
      update app.webhook_events set payload = ${REDACTED}
      where received_at < now() - interval '90 days' and payload <> ${REDACTED} and status in ('processed', 'ignored', 'failed')`),
    emailPayloads: await count(sql`
      update app.email_outbox set payload = ${REDACTED}
      where created_at < now() - interval '90 days' and payload <> ${REDACTED} and status <> 'pending'`),
    // 24 months: activity logs.
    downloadEvents: await count(sql`delete from app.download_events where created_at < now() - interval '24 months'`),
    licenseEvents: await count(sql`delete from app.license_events where created_at < now() - interval '24 months'`),
    // 13 months: checkout sessions. Sessions an order still references keep only their id and status.
    checkoutSessionsDeleted: await count(sql`
      delete from app.checkout_sessions cs
      where cs.created_at < now() - interval '13 months'
        and not exists (select 1 from app.orders o where o.checkout_session_id = cs.id)`),
    checkoutSessionsScrubbed: await count(sql`
      update app.checkout_sessions set email = null, utm = null, ip_hash = null, ph_distinct_id = null
      where created_at < now() - interval '13 months' and (email is not null or utm is not null or ip_hash is not null)`),
    // Housekeeping: finished jobs and dead email-link tokens.
    jobsDeleted: await count(
      sql`delete from app.job_outbox where status = 'done' and done_at < now() - interval '30 days'`,
    ),
    downloadTokensDeleted: await count(
      sql`delete from app.download_tokens where expires_at < now() - interval '30 days'`,
    ),
  }
  return cronResult('retention', result, started)
}
