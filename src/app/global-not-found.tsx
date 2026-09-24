import type { Metadata } from 'next'
import Link from 'next/link'
import { ErrorState } from '@/components/lumira/error-state'
import { Wordmark } from '@/components/lumira/wordmark'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { geistMono, geistSans } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Page not found · Lumira',
  description: 'The page you are looking for does not exist.',
}

/**
 * Unmatched URLs across both root layouts (experimental `globalNotFound`). Bypasses the layouts,
 * so it brings its own styles, fonts and theme script.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider>
          <header className="mx-auto flex h-18 max-w-[80rem] items-center px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Wordmark />
              <span className="sr-only">Lumira home</span>
            </Link>
          </header>
          <main>
            <ErrorState
              code="404"
              title="This page moved, or never existed."
              body="The link may be out of date. Head back to the store to browse boilerplates, UI kits and templates."
              actions={
                <Link
                  href="/"
                  className="inline-flex h-12 pressable items-center rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-button-ink"
                >
                  Back to the store
                </Link>
              }
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
