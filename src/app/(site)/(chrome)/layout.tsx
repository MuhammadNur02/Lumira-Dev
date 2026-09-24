import { Suspense } from 'react'
import { EnvironmentBanner } from '@/components/lumira/environment-banner'
import { PromoBanner } from '@/components/lumira/promo-banner'
import { SiteFooter } from '@/components/lumira/site-footer'
import { SiteHeader } from '@/components/lumira/site-header'

/** Header, main landmark and footer for every storefront page except the full-screen preview player. */
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <EnvironmentBanner />
      <Suspense fallback={null}>
        <PromoBanner />
      </Suspense>
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter />
    </>
  )
}
