import { NextResponse, type NextRequest } from 'next/server'
import { after } from 'next/server'
import { jwtVerify } from 'jose'
import { db } from '@/db/client'
import { discordLinks } from '@/db/schema'
import { captureServer } from '@/lib/analytics/server'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { DISCORD_API } from '@/server/discord'
import { isVerifiedLicenseHolder } from '@/server/entitlements'

const bot = () => ({
  Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
  'Content-Type': 'application/json',
  'X-Audit-Log-Reason': 'Lumira verified owner',
})

/**
 * F-07 step 2 (FR-GS-05): state bound to this Clerk user, eligibility re-checked (never trusted from
 * the UI), member added with the `Verified Owner` role. The OAuth access token is never stored.
 */
export async function GET(req: NextRequest) {
  const { userId } = await requireUser()
  const back = (q: string) => NextResponse.redirect(new URL(`/account/support?discord=${q}`, env.NEXT_PUBLIC_APP_URL))
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  if (req.nextUrl.searchParams.get('error') === 'access_denied') return back('cancelled')
  if (!code || !state) return back('error')
  try {
    const { payload } = await jwtVerify(state, new TextEncoder().encode(env.DISCORD_STATE_SECRET), {
      algorithms: ['HS256'],
    })
    if (payload.uid !== userId) return back('error')
  } catch {
    return back('error')
  }
  if (!(await isVerifiedLicenseHolder(userId))) return back('not-eligible')

  try {
    const token = (await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/discord/callback`,
      }),
      cache: 'no-store',
    }).then((r) => r.json())) as { access_token?: string }
    if (!token.access_token) return back('error')

    const meRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: 'no-store',
    })
    if (!meRes.ok) return back('error')
    const me = (await meRes.json()) as { id: string; username: string }

    // 201 = added with the role; 204 = already a member (roles NOT applied), so add the role explicitly.
    const join = await fetch(`${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${me.id}`, {
      method: 'PUT',
      headers: bot(),
      body: JSON.stringify({ access_token: token.access_token, roles: [env.DISCORD_VERIFIED_ROLE_ID] }),
    })
    if (join.status === 204) {
      const role = await fetch(
        `${DISCORD_API}/guilds/${env.DISCORD_GUILD_ID}/members/${me.id}/roles/${env.DISCORD_VERIFIED_ROLE_ID}`,
        {
          method: 'PUT',
          headers: bot(),
        },
      )
      if (!role.ok) return back('error')
    } else if (!join.ok) {
      return back(join.status === 429 ? 'rate-limited' : 'error')
    }

    await db
      .insert(discordLinks)
      .values({ userId, discordUserId: me.id, discordUsername: me.username })
      .onConflictDoUpdate({
        target: discordLinks.userId,
        set: {
          discordUserId: me.id,
          discordUsername: me.username,
          status: 'active',
          grantedAt: new Date(),
          revokedAt: null,
        },
      })
  } catch {
    return back('error')
  }

  after(() => captureServer({ distinctId: userId, event: 'discord_joined', properties: {} }))
  return NextResponse.redirect(`https://discord.com/channels/${env.DISCORD_GUILD_ID}/${env.DISCORD_WELCOME_CHANNEL_ID}`)
}
