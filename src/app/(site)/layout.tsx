import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { ClerkProvider } from '@clerk/nextjs'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PostHogIdentify } from '@/components/analytics/posthog-identify'
import { UtmCapture } from '@/components/analytics/utm-capture'
import { MotionProvider } from '@/components/motion/motion-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Particles } from '@/components/lumira/particles'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { brandHex } from '@/lib/brand-hex'
import { clerkAppearance } from '@/lib/clerk/appearance'
import { env } from '@/lib/env'
import { geistMono, geistSans } from '../fonts'
import '../globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: 'Lumira — Premium web assets', template: '%s · Lumira' },
  description:
    'Boilerplates, UI kits and templates by one curator. Try every one live, buy in 30 seconds, own every version.',
  applicationName: 'Lumira',
  openGraph: { type: 'website', siteName: 'Lumira', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  alternates: { types: { 'application/atom+xml': '/changelog/feed.xml' } },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: brandHex.light.canvas },
    { media: '(prefers-color-scheme: dark)', color: brandHex.dark.canvas },
  ],
  colorScheme: 'dark light',
}

/**
 * Root layout 1 of 2 (Task.md §0.4): the static-first storefront, docs and changelog. Nothing here
 * reads request data, so every page keeps a prerendered shell; personal fragments stream into
 * Suspense holes further down.
 */
export default function SiteRootLayout({ children, modal }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <ThemeProvider>
            <NuqsAdapter>
              <MotionProvider>
                <TooltipProvider>
                  <Particles quantity={70} className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-65" />
                  {children}
                  {modal}
                  <Toaster />
                </TooltipProvider>
              </MotionProvider>
            </NuqsAdapter>
          </ThemeProvider>
          <PostHogIdentify />
          <UtmCapture />
        </ClerkProvider>
        {/* Affiliate tracking on storefront routes only (FR-GS-02); the config must exist before affiliate.js runs. */}
        <Script id="ls-affiliate" strategy="afterInteractive">{`
          window.lemonSqueezyAffiliateConfig = { store: ${JSON.stringify(env.NEXT_PUBLIC_LS_STORE_SLUG)} };
          var s = document.createElement('script');
          s.src = 'https://lmsqueezy.com/affiliate.js'; s.defer = true;
          document.head.appendChild(s);
        `}</Script>
        <SpeedInsights />
      </body>
    </html>
  )
}
