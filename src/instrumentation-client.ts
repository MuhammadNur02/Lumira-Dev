// Runs before hydration on every route, so it stays tiny: PostHog and Sentry load as separate
// async chunks and never count toward first-load JS (NFR-PERF-05).
import type * as SentryModule from '@sentry/nextjs'
import { attachPostHog } from '@/lib/analytics/track'

let sentry: typeof SentryModule | null = null

function loadSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  void Promise.all([import('@sentry/nextjs'), import('@/lib/observability/scrub')]).then(([Sentry, { scrubEvent }]) => {
    Sentry.init({
      dsn,
      tunnel: '/monitoring', // same-origin, CSP-friendly (P8.01)
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
      sendDefaultPii: false,
      beforeSend: (event) => scrubEvent(event),
      beforeBreadcrumb: (crumb) => (crumb.category === 'ui.input' ? null : crumb),
    })
    sentry = Sentry
  })
}

function loadPostHog() {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  if (!token) return
  void import('posthog-js').then(({ default: posthog }) => {
    // EU/EEA/UK/CH visitors start memory-only until they consent (FR-AN-04; cookie set in proxy.ts).
    const consentRequired =
      document.cookie.includes('lumira_region=eu') && !document.cookie.includes('lumira_consent=granted')
    posthog.init(token, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      defaults: '2026-05-30',
      persistence: consentRequired ? 'memory' : 'localStorage+cookie',
      disable_session_recording: true, // started selectively (FR-AN-05)
      mask_all_text: false,
      mask_all_element_attributes: false,
    })
    attachPostHog(posthog)
  })
}

try {
  loadSentry()
  if ('requestIdleCallback' in window) requestIdleCallback(loadPostHog, { timeout: 3000 })
  else setTimeout(loadPostHog, 1500)
} catch {
  // Instrumentation must never break the app.
}

export function onRouterTransitionStart(url: string, navigationType: 'push' | 'replace' | 'traverse') {
  sentry?.captureRouterTransitionStart(url, navigationType)
}
