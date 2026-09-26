import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { ClerkProvider } from '@clerk/nextjs'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PostHogIdentify } from '@/components/analytics/posthog-identify'
import { MotionProvider } from '@/components/motion/motion-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { MeshGradientBackground } from '@/components/ui/mesh-gradient'
import { brandHex } from '@/lib/brand-hex'
import { clerkAppearance } from '@/lib/clerk/appearance'
import { env } from '@/lib/env'
import { geistMono, geistSans } from '../fonts'
import '../globals.css'

// Root layout 2 of 2 (Task.md §0.4): account, admin, checkout, auth and email-link routes. These are
// personal and dynamic anyway, so the layout reads the per-request CSP nonce (NFR-SEC-07).
export const instant = false

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: 'Lumira', template: '%s · Lumira' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: brandHex.light.canvas },
    { media: '(prefers-color-scheme: dark)', color: brandHex.dark.canvas },
  ],
  colorScheme: 'dark light',
}

export default async function AppRootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ClerkProvider appearance={clerkAppearance} dynamic>
          <ThemeProvider nonce={nonce}>
            <NuqsAdapter>
              <MotionProvider>
                <TooltipProvider>
                  <MeshGradientBackground />
                  {children}
                  <Toaster />
                </TooltipProvider>
              </MotionProvider>
            </NuqsAdapter>
          </ThemeProvider>
          <PostHogIdentify />
        </ClerkProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
