'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/** Dark first; light is a designed peer reachable through the toggle or "System" (SG §2.4). */
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange nonce={nonce}>
      {children}
    </NextThemesProvider>
  )
}
