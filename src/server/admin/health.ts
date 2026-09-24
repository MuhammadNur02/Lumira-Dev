import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { lsFetch } from '@/lib/billing/lemonsqueezy/client'
import { env } from '@/lib/env'
import { r2Healthy } from '@/lib/r2'
import { redis } from '@/lib/rate-limit'
import { sanityWrite } from '@/lib/sanity/client'
import { DISCORD_API } from '@/server/discord'
import { outboxBacklog } from '@/server/outbox/dispatch'

export type Check = { name: string; status: 'green' | 'amber' | 'red'; detail: string; fix?: string }

const TIMEOUT = 5000
async function timed<T>(fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), TIMEOUT)),
  ])
}
async function check(name: string, fix: string, fn: () => Promise<Omit<Check, 'name' | 'fix'>>): Promise<Check> {
  try {
    const result = await timed(fn)
    return { name, ...result, fix: result.status === 'green' ? undefined : fix }
  } catch (error) {
    return { name, status: 'red', detail: error instanceof Error ? error.message.slice(0, 160) : 'failed', fix }
  }
}

/** FR-AD-60: every integration green / amber / red with "how to fix" copy. */
export async function integrationChecks(): Promise<Check[]> {
  return Promise.all([
    check(
      'Postgres',
      'Check DATABASE_URL (Supavisor transaction pooler, port 6543) and the lumira_app role password.',
      async () => {
        await db.execute(sql`select 1`)
        return { status: 'green', detail: 'Query OK' }
      },
    ),
    check('Upstash Redis', 'Check UPSTASH_REDIS_REST_URL / TOKEN. Rate limits fail open without Redis.', async () => {
      await redis.ping()
      return { status: 'green', detail: 'PING OK' }
    }),
    check(
      'Lemon Squeezy API',
      'Create an API key in LS → Settings → API for the right mode and set LS_API_KEY.',
      async () => {
        const me = await lsFetch<{ meta?: { test_mode?: boolean }; data?: { attributes?: { name?: string } } }>(
          '/users/me',
        )
        const testMode = me.meta?.test_mode
        const mismatch = testMode !== undefined && testMode !== env.LS_TEST_MODE
        return {
          status: mismatch ? 'amber' : 'green',
          detail: `${me.data?.attributes?.name ?? 'Connected'} · ${testMode ? 'test' : 'live'} mode${mismatch ? ` (LS_TEST_MODE=${env.LS_TEST_MODE})` : ''}`,
        }
      },
    ),
    check(
      'Webhooks',
      'Check each provider’s webhook URL and signing secret, then replay failures from the inspector.',
      async () => {
        const rows = Array.from(
          (await db.execute(sql`
          select source::text, max(received_at) as last, count(*) filter (where status = 'failed' and received_at > now() - interval '24 hours')::int as failed
          from app.webhook_events group by source`)) as unknown as ArrayLike<{
            source: string
            last: string
            failed: number
          }>,
        )
        const now = Date.now()
        const stale = rows.filter((r) => now - new Date(r.last).getTime() > 24 * 3600_000).map((r) => r.source)
        const failed = rows.reduce((a, r) => a + r.failed, 0)
        const missing = ['lemonsqueezy', 'clerk', 'sanity', 'resend'].filter((s) => !rows.some((r) => r.source === s))
        return {
          status: failed ? 'red' : stale.length || missing.length ? 'amber' : 'green',
          detail:
            [
              failed ? `${failed} failed in 24 h` : null,
              stale.length ? `quiet > 24 h: ${stale.join(', ')}` : null,
              missing.length ? `never received: ${missing.join(', ')}` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'All sources delivered within 24 h',
        }
      },
    ),
    check(
      'R2 read token',
      'Check R2_READ_ACCESS_KEY_ID / SECRET (Object Read on the assets bucket only).',
      async () => ({
        status: (await r2Healthy('read')) ? 'green' : 'red',
        detail: `HeadBucket ${env.R2_BUCKET}`,
      }),
    ),
    check(
      'R2 write token',
      'Check R2_WRITE_ACCESS_KEY_ID / SECRET and the bucket CORS rule (PUT, ETag exposed).',
      async () => ({
        status: (await r2Healthy('write')) ? 'green' : 'red',
        detail: `HeadBucket ${env.R2_BUCKET}`,
      }),
    ),
    check('Resend', 'Verify mail.lumira.dev and news.lumira.dev (SPF, DKIM, DMARC) in Resend → Domains.', async () => {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Resend API ${res.status}`)
      const { data } = (await res.json()) as { data: { name: string; status: string }[] }
      const unverified = data.filter((d) => d.status !== 'verified')
      return {
        status: data.length === 0 ? 'red' : unverified.length ? 'amber' : 'green',
        detail: data.map((d) => `${d.name}: ${d.status}`).join(' · ') || 'No domains',
      }
    }),
    check(
      'Discord bot',
      'Invite the bot with Create Instant Invite + Manage Roles and place its role above Verified Owner.',
      async () => {
        const headers = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }
        const me = await fetch(`${DISCORD_API}/users/@me`, { headers, cache: 'no-store' })
        if (!me.ok) throw new Error(`Bot token rejected (${me.status})`)
        const bot = (await me.json()) as { id: string; username: string }
        const member = await fetch(`${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${bot.id}`, {
          headers,
          cache: 'no-store',
        })
        if (!member.ok) return { status: 'red', detail: `${bot.username} is not in the guild (${member.status})` }
        const roles = await fetch(`${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/roles`, { headers, cache: 'no-store' })
        if (!roles.ok) return { status: 'amber', detail: `${bot.username} is in the guild; roles unreadable` }
        const list = (await roles.json()) as { id: string; position: number }[]
        const memberRoles = ((await member.json()) as { roles: string[] }).roles
        const botTop = Math.max(0, ...list.filter((r) => memberRoles.includes(r.id)).map((r) => r.position))
        const verified = list.find((r) => r.id === env.DISCORD_VERIFIED_ROLE_ID)
        if (!verified) return { status: 'red', detail: 'DISCORD_VERIFIED_ROLE_ID not found in the guild' }
        return botTop > verified.position
          ? { status: 'green', detail: `${bot.username} can manage Verified Owner` }
          : { status: 'red', detail: 'The bot’s role is below Verified Owner; role grants will fail' }
      },
    ),
    check(
      'Sanity',
      'Create an Editor token for SANITY_API_WRITE_TOKEN and a Viewer token for SANITY_API_READ_TOKEN.',
      async () => {
        const n = await sanityWrite.fetch<number>('count(*[_type == "product"])')
        return { status: 'green', detail: `${n} products readable with the write token` }
      },
    ),
    check(
      'PostHog Query API',
      'Create a personal API key with query:read and set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID.',
      async () => {
        const res = await fetch(`${env.POSTHOG_API_HOST}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: { kind: 'HogQLQuery', query: 'select 1' } }),
          cache: 'no-store',
        })
        return res.ok ? { status: 'green', detail: 'Query OK' } : { status: 'red', detail: `HTTP ${res.status}` }
      },
    ),
    check('Outbox', 'Open Activity → Emails for failures; failed jobs alert the admin by email.', async () => {
      const backlog = await outboxBacklog()
      const failed = (backlog.emails.failed ?? 0) + (backlog.jobs.failed ?? 0)
      const pending = (backlog.emails.pending ?? 0) + (backlog.jobs.pending ?? 0)
      return {
        status: failed ? 'red' : pending > 50 ? 'amber' : 'green',
        detail: `${pending} pending · ${failed} failed`,
      }
    }),
  ])
}
