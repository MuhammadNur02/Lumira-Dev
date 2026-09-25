/**
 * Content Security Policy (NFR-SEC-07, Task.md P8.01). Pure functions so proxy.ts stays small and
 * the policies are unit-tested.
 *
 * - Storefront (`(site)`, statically prerendered): host allowlist with 'unsafe-inline' scripts,
 *   because nonces force dynamic rendering and would disable the static shells (NFR-PERF-07).
 * - App routes (`(app)`: account, admin, checkout success, auth, email links): per-request nonce
 *   with 'strict-dynamic'. The proxy forwards it as `x-nonce`; Next.js applies it to its scripts
 *   and Clerk's `dynamic` provider reads it for clerk-js.
 */
export type CspOptions = {
  clerkHost: string | null
  demoSuffix: string
  studioOrigin: string | null
  r2AccountId: string | null
  reportUri: string | null
  dev: boolean
}

export const APP_ROUTES = /^\/(account|admin|checkout|auth|sign-in|sign-up|d)(\/|$)/

const LEMON = ['https://*.lemonsqueezy.com', 'https://lmsqueezy.com']
const TURNSTILE = 'https://challenges.cloudflare.com'
const SANITY_IMG = 'https://cdn.sanity.io'
const CLERK_IMG = 'https://img.clerk.com'

/** `pk_live_Y2xlcmsubHVtaXJhLmRldiQ=` → `clerk.lumira.dev`. Keyless development falls back to Clerk's dev hosts. */
export function clerkHostFromKey(publishableKey: string | undefined): string | null {
  const encoded = publishableKey?.split('_')[2]
  if (!encoded) return null
  try {
    const host = atob(encoded).replace(/\$$/, '')
    return /^[a-z0-9.-]+$/i.test(host) ? host : null
  } catch {
    return null
  }
}

/** Sentry DSN `https://KEY@HOST/PROJECT` → its security-report endpoint. */
export function sentryReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null
  try {
    const url = new URL(dsn)
    const project = url.pathname.replace(/^\//, '')
    return url.username && project ? `https://${url.host}/api/${project}/security/?sentry_key=${url.username}` : null
  } catch {
    return null
  }
}

const clerkSources = (o: CspOptions) => (o.clerkHost ? [`https://${o.clerkHost}`] : ['https://*.clerk.accounts.dev'])

function join(directives: Record<string, (string | null | false)[]>) {
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values.filter(Boolean)].join(' '))
    .join('; ')
}

/** Storefront allowlist (PRD NFR-SEC-07). The Sanity Studio may frame pages for visual editing. */
export function siteCsp(o: CspOptions): string {
  return join({
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", o.dev && "'unsafe-eval'", ...LEMON, ...clerkSources(o), TURNSTILE],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', SANITY_IMG, CLERK_IMG],
    'font-src': ["'self'"],
    // Demo origins: the Live Preview reachability probe (components/preview/probe.ts).
    'connect-src': [
      "'self'",
      ...clerkSources(o),
      'https://*.api.sanity.io',
      'wss://*.api.sanity.io',
      `https://*.${o.demoSuffix}`,
      o.dev && 'ws:',
    ],
    'media-src': ["'self'", SANITY_IMG],
    'frame-src': [...LEMON, `https://*.${o.demoSuffix}`, TURNSTILE],
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': o.studioOrigin ? [o.studioOrigin] : ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'report-uri': o.reportUri ? [o.reportUri] : [],
  }).replace(/; report-uri$/, '')
}

/** App routes: nonce + 'strict-dynamic'. Admin uploads PUT straight to R2 (FR-AD-52). */
export function appCsp(nonce: string, o: CspOptions): string {
  return join({
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      o.dev && "'unsafe-eval'",
      ...clerkSources(o),
      ...LEMON,
      TURNSTILE,
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', SANITY_IMG, CLERK_IMG],
    'font-src': ["'self'"],
    'connect-src': [
      "'self'",
      ...clerkSources(o),
      o.r2AccountId && `https://*.${o.r2AccountId}.r2.cloudflarestorage.com`,
      o.r2AccountId && `https://${o.r2AccountId}.r2.cloudflarestorage.com`,
      o.dev && 'ws:',
    ],
    'frame-src': [...LEMON, TURNSTILE],
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'report-uri': o.reportUri ? [o.reportUri] : [],
  }).replace(/; report-uri$/, '')
}

/** 128-bit random nonce, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

export function cspOptionsFromEnv(env: Record<string, string | undefined>): CspOptions {
  let studioOrigin: string | null = null
  try {
    studioOrigin = env.SANITY_STUDIO_URL ? new URL(env.SANITY_STUDIO_URL).origin : 'https://lumira.sanity.studio'
  } catch {
    studioOrigin = null
  }
  return {
    clerkHost: clerkHostFromKey(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    demoSuffix: env.NEXT_PUBLIC_DEMO_ORIGIN_SUFFIX || 'lumira-demos.dev',
    studioOrigin,
    r2AccountId: env.R2_ACCOUNT_ID && /^[a-f0-9]{32}$/i.test(env.R2_ACCOUNT_ID) ? env.R2_ACCOUNT_ID : null,
    reportUri: sentryReportUri(env.NEXT_PUBLIC_SENTRY_DSN),
    dev: env.NODE_ENV === 'development',
  }
}

/** Ship report-only first (7 days of clean reports), then set CSP_MODE=enforce. */
export const cspHeaderName = (mode: string | undefined) =>
  mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
