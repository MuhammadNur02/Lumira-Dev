import { revalidateTag } from 'next/cache'
import { db } from '@/db/client'
import { snapshotMrr, yesterdayUtc } from '@/server/metrics/mrr'
import { cronResult, cronUnauthorized } from '@/server/cron'

/** FR-SYS-05, daily 00:10 UTC. `?day=YYYY-MM-DD` re-runs a specific day (idempotent). */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()
  const requested = new URL(req.url).searchParams.get('day')
  const day = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : yesterdayUtc()
  await db.transaction((tx) => snapshotMrr(tx, day))
  revalidateTag('admin-metrics', 'max')
  return cronResult('mrr-snapshot', { day }, started)
}
