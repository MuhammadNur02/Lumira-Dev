import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { discordLinks } from '@/db/schema'
import { env } from '@/lib/env'
import { isVerifiedLicenseHolder } from '@/server/entitlements'

export const DISCORD_API = 'https://discord.com/api/v10'

/** Discord 429 carries `retry_after` (seconds); surface it so the job backs off accordingly. */
export class DiscordRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super(`Discord rate limited for ${retryAfterMs} ms`)
    this.name = 'DiscordRateLimitError'
  }
}

const botHeaders = () => ({
  Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
  'Content-Type': 'application/json',
  'X-Audit-Log-Reason': 'Lumira verified owner',
})

async function roleRequest(method: 'PUT' | 'DELETE', discordUserId: string) {
  const res = await fetch(
    `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${env.DISCORD_VERIFIED_ROLE_ID}`,
    {
      method,
      headers: botHeaders(),
    },
  )
  if (res.status === 429) {
    const body = (await res.json().catch(() => ({}))) as { retry_after?: number }
    throw new DiscordRateLimitError(Math.ceil((body.retry_after ?? 5) * 1000))
  }
  // 404: the member left the guild; nothing to do.
  if (!res.ok && res.status !== 404) throw new Error(`Discord role ${method} failed: ${res.status}`)
}

/** `discord_grant` (FR-GS-06): re-adds the role for linked users who are (again) verified holders. */
export async function grantDiscordRole(userId: string) {
  const link = await db.query.discordLinks.findFirst({ where: eq(discordLinks.userId, userId) })
  if (!link || !(await isVerifiedLicenseHolder(userId))) return
  await roleRequest('PUT', link.discordUserId)
  if (link.status !== 'active') {
    await db
      .update(discordLinks)
      .set({ status: 'active', grantedAt: new Date(), revokedAt: null })
      .where(eq(discordLinks.userId, userId))
  }
}

/** `discord_revoke`: removes the role only if the user is no longer a verified holder (or `force`). */
export async function revokeDiscordRole(userId: string, force = false) {
  const link = await db.query.discordLinks.findFirst({
    where: and(eq(discordLinks.userId, userId), eq(discordLinks.status, 'active')),
  })
  if (!link) return
  if (!force && (await isVerifiedLicenseHolder(userId))) return
  await roleRequest('DELETE', link.discordUserId)
  await db.update(discordLinks).set({ status: 'revoked', revokedAt: new Date() }).where(eq(discordLinks.userId, userId))
}
