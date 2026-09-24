import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

/** NFR-SEO-03: private and transactional surfaces are never crawled. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account',
        '/admin',
        '/api',
        '/checkout',
        '/d/',
        '/auth',
        '/products/*/preview',
        '/sign-in',
        '/sign-up',
      ],
    },
    sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
    host: env.NEXT_PUBLIC_APP_URL,
  }
}
