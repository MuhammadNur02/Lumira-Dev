'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import * as m from 'motion/react-m'
import { CreditCard, Download, KeyRound, Library, LifeBuoy, Receipt, Settings } from 'lucide-react'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

export const ACCOUNT_NAV = [
  { href: '/account/library', label: 'Library', icon: Library },
  { href: '/account/licenses', label: 'Licenses', icon: KeyRound },
  { href: '/account/downloads', label: 'Downloads', icon: Download },
  { href: '/account/orders', label: 'Orders', icon: Receipt },
  { href: '/account/billing', label: 'Billing', icon: CreditCard },
  { href: '/account/support', label: 'Support', icon: LifeBuoy },
  { href: '/account/settings', label: 'Settings', icon: Settings },
] as const

/** Account sidebar (P6.05): 2 px brand indicator that springs between items; a scrollable row on mobile. */
export function AccountNav() {
  const pathname = usePathname()
  const active = ACCOUNT_NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href

  return (
    <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:sticky lg:top-20 lg:flex-col">
        {ACCOUNT_NAV.map(({ href, label, icon: Icon }) => {
          const current = href === active
          return (
            <li key={href} className="relative shrink-0">
              {current ? (
                <m.span
                  layoutId="account-nav-indicator"
                  transition={spring.snappy}
                  aria-hidden
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand lg:inset-x-auto lg:inset-y-2 lg:left-0 lg:h-auto lg:w-0.5"
                />
              ) : null}
              <Link
                href={href as Route}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2.5 rounded-md px-3 text-body-sm transition-colors lg:pl-4',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  current
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon aria-hidden strokeWidth={1.75} className="size-4" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
