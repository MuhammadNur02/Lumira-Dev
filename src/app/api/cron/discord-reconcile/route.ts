import { db } from '@/db/client'
import { discordLinks } from '@/db/schema'
import { isVerifiedLicenseHolder } from '@/server/entitlements'
import { enqueueJob } from '@/server/outbox/enqueue'
import { cronResult, cronUnauthorized } from '@/server/cron'

/**
 * FR-GS-06 / FR-SYS-07 (nightly 03:00 UTC): active links whose owner is no longer a verified holder
 * get a `discord_revoke` job; revoked links whose owner regained eligibility get `discord_grant`.
 * The jobs honor Discord's `retry_after` through the outbox backoff.
 */
export async function GET(req: Request) {
  const denied = cronUnauthorized(req)
  if (denied) return denied
  const started = Date.now()
  const day = new Date(started).toISOString().slice(0, 10)
  const links = await db.select({ userId: discordLinks.userId, status: discordLinks.status }).from(discordLinks)

  let revoke = 0
  let grant = 0
  for (const link of links) {
    const eligible = await isVerifiedLicenseHolder(link.userId)
    if (link.status === 'active' && !eligible) {
      await enqueueJob(db, 'discord_revoke', { userId: link.userId }, `discord_revoke:reconcile:${link.userId}:${day}`)
      revoke++
    } else if (link.status === 'revoked' && eligible) {
      await enqueueJob(db, 'discord_grant', { userId: link.userId }, `discord_grant:reconcile:${link.userId}:${day}`)
      grant++
    }
  }
  return cronResult('discord-reconcile', { links: links.length, revoke, grant }, started)
}
