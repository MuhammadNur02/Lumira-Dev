import { describe, expect, it } from 'vitest'
import {
  APP_ROUTES,
  appCsp,
  clerkHostFromKey,
  createNonce,
  cspHeaderName,
  cspOptionsFromEnv,
  sentryReportUri,
  siteCsp,
} from '@/lib/csp'

const directive = (policy: string, name: string) => policy.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''

const opts = cspOptionsFromEnv({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_live_${btoa('clerk.lumira.dev$')}`,
  NEXT_PUBLIC_SENTRY_DSN: 'https://abc123@o1.ingest.sentry.io/42',
  R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  SANITY_STUDIO_URL: 'https://lumira.sanity.studio/structure',
  NODE_ENV: 'production',
})

describe('CSP (NFR-SEC-07, P8.01)', () => {
  it('derives the Clerk Frontend API host and the Sentry report endpoint', () => {
    expect(clerkHostFromKey(`pk_live_${btoa('clerk.lumira.dev$')}`)).toBe('clerk.lumira.dev')
    expect(clerkHostFromKey(undefined)).toBeNull()
    expect(clerkHostFromKey('pk_test_!!!')).toBeNull()
    expect(sentryReportUri('https://abc123@o1.ingest.sentry.io/42')).toBe(
      'https://o1.ingest.sentry.io/api/42/security/?sentry_key=abc123',
    )
    expect(sentryReportUri('not a url')).toBeNull()
  })

  it('gives app routes a nonce with strict-dynamic and no unsafe-inline scripts', () => {
    const nonce = createNonce()
    const policy = appCsp(nonce, opts)
    const scripts = directive(policy, 'script-src')
    expect(scripts).toContain(`'nonce-${nonce}'`)
    expect(scripts).toContain("'strict-dynamic'")
    expect(scripts).not.toContain("'unsafe-inline'")
    expect(scripts).not.toContain("'unsafe-eval'")
    expect(directive(policy, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(directive(policy, 'connect-src')).toContain(
      'https://*.0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
    )
    expect(policy).toContain('report-uri https://o1.ingest.sentry.io/api/42/security/?sentry_key=abc123')
  })

  it('keeps the storefront static: allowlist, no nonce, Studio may frame it for visual editing', () => {
    const policy = siteCsp(opts)
    expect(policy).not.toContain('nonce-')
    expect(directive(policy, 'script-src')).toContain('https://clerk.lumira.dev')
    expect(directive(policy, 'frame-src')).toContain('https://*.lumira-demos.dev')
    expect(directive(policy, 'frame-ancestors')).toBe('frame-ancestors https://lumira.sanity.studio')
    expect(directive(policy, 'object-src')).toBe("object-src 'none'")
  })

  it('allows eval and websockets only in development', () => {
    const dev = cspOptionsFromEnv({ NODE_ENV: 'development' })
    expect(directive(siteCsp(dev), 'script-src')).toContain("'unsafe-eval'")
    expect(directive(siteCsp(dev), 'script-src')).toContain('https://*.clerk.accounts.dev')
    expect(directive(siteCsp(opts), 'connect-src')).not.toContain('ws:')
  })

  it('matches only app routes and switches between report-only and enforce', () => {
    for (const path of ['/account/library', '/admin', '/checkout/success', '/auth/continue', '/sign-in', '/d/abc'])
      expect(APP_ROUTES.test(path)).toBe(true)
    for (const path of ['/', '/products/lumen-ui', '/docs', '/downloads', '/administrators'])
      expect(APP_ROUTES.test(path)).toBe(false)
    expect(cspHeaderName(undefined)).toBe('Content-Security-Policy-Report-Only')
    expect(cspHeaderName('enforce')).toBe('Content-Security-Policy')
    expect(createNonce()).not.toBe(createNonce())
  })
})
