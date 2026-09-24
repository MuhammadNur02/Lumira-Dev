import { drainOutboxes } from '@/server/outbox/dispatch'
import { cronResult, cronUnauthorized } from '@/server/cron'

export const maxDuration = 60

/** FR-SYS-03 sweeper (every 5 min): retries due email and job rows with exponential backoff. */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()
  let jobs = 0
  let emails = 0
  // Drain in rounds until empty or ~45 s have passed, so a backlog clears within one run.
  while (Date.now() - started < 45_000) {
    const round = await drainOutboxes({ limit: 50 })
    jobs += round.jobs
    emails += round.emails
    if (round.jobs + round.emails === 0) break
  }
  return cronResult('outbox', { jobs, emails }, started)
}
