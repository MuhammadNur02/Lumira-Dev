'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Route } from 'next'
import { cn } from '@/lib/utils'

export const NAV_ITEMS: { href: Route; label: string }[] = [
  { href: '/boilerplates', label: 'Boilerplates' },
  { href: '/ui-kits', label: 'UI Kits' },
  { href: '/templates', label: 'Templates' },
  { href: '/all-access', label: 'All-Access' },
  { href: '/docs' as Route, label: 'Docs' },
  { href: '/changelog', label: 'Changelog' },
]

/** Primary navigation (FR-GL-01) with the current section marked for assistive tech. */
export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Primary" className={cn('hidden items-center gap-1 lg:flex', className)}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 pressable items-center rounded-md px-3 text-body-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
              active && 'text-foreground',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
