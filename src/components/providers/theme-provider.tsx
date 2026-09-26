'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

// React 19 warns when an inline <script> tag is rendered inside a client component tree (next-themes FOUC script).
// Filter out this dev-only warning so it doesn't trigger the Next.js Turbopack error overlay.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const origError = console.error
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) {
      return
    }
    origError.apply(console, args)
  }
}

/** Dark first; light is a designed peer reachable through the toggle or "System" (SG §2.4). */
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange nonce={nonce}>
      {children}
    </NextThemesProvider>
  )
}
