import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'
import { createMDX } from 'fumadocs-mdx/next'

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://lumira.lemonsqueezy.com")',
  },
]

type SanityRedirect = { source: string; destination: string; permanent: boolean }

/** Sanity `redirect` documents compiled into 301s at build time (NFR-SEO-08). */
async function sanityRedirects(): Promise<SanityRedirect[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  if (!projectId || !dataset || process.env.CONTENT_SOURCE === 'fixtures') return []
  const query = encodeURIComponent(
    '*[_type == "redirect" && defined(source) && defined(destination)]{ source, destination, "permanent": coalesce(permanent, true) }',
  )
  try {
    const res = await fetch(`https://${projectId}.apicdn.sanity.io/v2026-09-01/data/query/${dataset}?query=${query}`)
    if (!res.ok) return []
    return ((await res.json()) as { result: SanityRedirect[] }).result ?? []
  } catch {
    return [] // never fail a build because the CMS is unreachable
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  skipTrailingSlashRedirect: true, // required by the PostHog reverse proxy
  transpilePackages: ['@lumira/bento', '@lumira/preview-bridge'],
  experimental: {
    globalNotFound: true, // two root layouts (Task.md §0.4) need one app-wide 404
  },
  images: {
    // Sanity's image pipeline resizes and negotiates AVIF/WebP (NFR-PERF-02).
    loaderFile: './src/lib/sanity/image-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  async redirects() {
    return (await sanityRedirects()).map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: r.permanent,
    }))
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

// Fumadocs MDX (P4.11): the macro API is only used by the docs source module.
const withMDX = createMDX({ macro: { include: ['**/lib/docs/source.ts'] } })

export default withSentryConfig(withMDX(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring', // same-origin Sentry traffic (CSP-friendly, P8.01)
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
})
