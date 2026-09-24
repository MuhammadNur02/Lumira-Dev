import type { Metadata } from 'next'
import { AccountNav } from '@/components/lumira/account-nav'
import { AppHeader } from '@/components/lumira/app-header'

export const metadata: Metadata = {
  title: { default: 'Account', template: '%s · Account · Lumira' },
  robots: { index: false, follow: false },
}

/** Buyer Dashboard shell (P6.05). Pages guard themselves with `requireUser()`; the layout is never the only guard. */
export default function AccountLayout({ children }: LayoutProps<'/account'>) {
  return (
    <>
      <AppHeader />
      <div className="mx-auto grid w-full max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-12">
        <AccountNav />
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </>
  )
}
