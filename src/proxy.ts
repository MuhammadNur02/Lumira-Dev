import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { APP_ROUTES, appCsp, createNonce, cspHeaderName, cspOptionsFromEnv, siteCsp } from '@/lib/csp'

const csp = cspOptionsFromEnv(process.env)
const CSP_HEADER = cspHeaderName(process.env.CSP_MODE)
const SITE_CSP = siteCsp(csp)

// EU (27) + EEA (IS, LI, NO) + UK + CH: analytics start memory-only until consent (FR-AN-04).
const CONSENT_REGIONS = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
  'GB',
  'CH',
])

/**
 * Session handling, cookies and exactly one CSP per response (P8.01). Authorization lives in each
 * page, route handler and Server Action (NFR-SEC-03); nothing here decides who may see what.
 */
export default clerkMiddleware(async (_auth, req) => {
  let res: NextResponse
  if (APP_ROUTES.test(req.nextUrl.pathname)) {
    // Dynamic routes: per-request nonce. Next.js reads it from the request CSP header for its own
    // scripts; (app)/layout.tsx and Clerk's dynamic provider read `x-nonce`.
    const nonce = createNonce()
    const policy = appCsp(nonce, csp)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set(CSP_HEADER, policy)
    res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set(CSP_HEADER, policy)
  } else {
    res = NextResponse.next()
    if (!req.nextUrl.pathname.startsWith('/api/')) res.headers.set(CSP_HEADER, SITE_CSP)
  }

  // Promo links (`/?code=LAUNCH30`): validated against the discounts mirror at checkout (FR-CO-05).
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  if (code && /^[A-Z0-9]{3,64}$/.test(code)) {
    res.cookies.set('lumira_promo', code, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: true,
      httpOnly: true,
    })
  }

  // Readable by instrumentation-client.ts, so static pages stay static (FR-AN-04).
  if (!req.cookies.has('lumira_region')) {
    const country = req.headers.get('x-vercel-ip-country') ?? ''
    res.cookies.set('lumira_region', CONSENT_REGIONS.has(country) ? 'eu' : 'other', {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
      secure: true,
    })
  }
  return res
})

// Keep the config inline: Next.js reads it statically from this file.
export const config = {
  matcher: [
    '/((?!_next|ingest|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|avif|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)',
    '/(api|trpc)(.*)',
  ],
}
