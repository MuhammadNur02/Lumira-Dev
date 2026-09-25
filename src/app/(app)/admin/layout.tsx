import { Suspense } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { auth } from '@clerk/nextjs/server'
import { FlaskConical, Radio } from 'lucide-react'
import { AdminCommand } from '@/components/admin/admin-command'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { DateRangePicker } from '@/components/admin/date-range-picker'
import { AccountChip, AccountChipFallback } from '@/components/lumira/account-chip'
import { ThemeToggle } from '@/components/lumira/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { requireAdmin } from '@/lib/auth'
import { env } from '@/lib/env'
import { ensureUserRow } from '@/server/identity'

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin · Lumira' },
  robots: { index: false, follow: false },
}

/**
 * Admin shell (P7.01, FR-AD-02). The guard runs here AND in every page, route handler and Server
 * Action: a layout is never the only check. Non-admins get a 404 so /admin is not discoverable.
 */
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const { userId } = await auth()
  if (userId) await ensureUserRow(userId) // the guard below checks the Postgres role
  await requireAdmin()
  const defaultOpen = (await cookies()).get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <SidebarInset id="main">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border glass-bar px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            {env.LS_TEST_MODE ? (
              <Badge variant="warning">
                <FlaskConical aria-hidden /> Test mode
              </Badge>
            ) : (
              <Badge variant="success">
                <Radio aria-hidden /> Live
              </Badge>
            )}
            <AdminCommand />
            <Suspense>
              <DateRangePicker />
            </Suspense>
            <ThemeToggle />
            <Suspense fallback={<AccountChipFallback />}>
              <AccountChip />
            </Suspense>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-(--bento-gap) px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
