import { AppHeader } from '@/components/lumira/app-header'

/** Checkout success and emailed download links: compact header, one focused column. */
export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main id="main" className="min-h-[calc(100dvh-3.5rem)] hero-glow">
        {children}
      </main>
    </>
  )
}
