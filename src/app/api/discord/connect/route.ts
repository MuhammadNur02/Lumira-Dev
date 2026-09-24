import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { ratelimit } from '@/lib/rate-limit'
import { isVerifiedLicenseHolder } from '@/server/entitlements'

const stateSecret = () => new TextEncoder().encode(env.DISCORD_STATE_SECRET)

/** F-07 step 1: signed, session-bound `state`; eligibility checked here and again in the callback. */
export async function GET() {
  const { userId } = await requireUser()
  const back = (q: string) => NextResponse.redirect(new URL(`/account/support?discord=${q}`, env.NEXT_PUBLIC_APP_URL))
  if (!(await ratelimit.discord.limit(userId)).success) return back('rate-limited')
  if (!(await isVerifiedLicenseHolder(userId))) return back('not-eligible')

  const state = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(stateSecret())
  const url = new URL('https://discord.com/oauth2/authorize')
  url.search = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    response_type: 'code',
    scope: 'identify guilds.join',
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/discord/callback`,
    state,
    prompt: 'none',
  }).toString()
  return NextResponse.redirect(url)
}
