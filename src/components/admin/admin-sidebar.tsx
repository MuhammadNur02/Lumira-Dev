'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Activity,
  BadgePercent,
  ChartLine,
  CreditCard,
  Download,
  Filter,
  KeyRound,
  LayoutDashboard,
  Mail,
  Package,
  PlugZap,
  Repeat,
  ScrollText,
  Users,
  Webhook,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Wordmark } from '@/components/lumira/wordmark'

const GROUPS = [
  {
    label: 'Business',
    items: [
      { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
      { href: '/admin/revenue', label: 'Revenue', icon: ChartLine },
      { href: '/admin/subscriptions', label: 'Subscriptions', icon: Repeat },
      { href: '/admin/conversion', label: 'Conversion', icon: Filter },
      { href: '/admin/discounts', label: 'Discounts', icon: BadgePercent },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/activity/downloads', label: 'Downloads', icon: Download },
      { href: '/admin/activity/payments', label: 'Payments', icon: CreditCard },
      { href: '/admin/activity/licenses', label: 'Licenses', icon: KeyRound },
      { href: '/admin/activity/emails', label: 'Emails', icon: Mail },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/products', label: 'Products & releases', icon: Package },
      { href: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
      { href: '/admin/integrations', label: 'Integrations', icon: PlugZap },
    ],
  },
] as const

/** FR-AD-02: shadcn Sidebar. Links keep the date range so switching pages keeps the period. */
export function AdminSidebar() {
  const pathname = usePathname()
  const params = useSearchParams()
  const keep = new URLSearchParams()
  for (const key of ['preset', 'from', 'to']) {
    const value = params.get(key)
    if (value) keep.set(key, value)
  }
  const suffix = keep.size ? `?${keep.toString()}` : ''

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center px-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Wordmark />
          <span className="eyebrow group-data-[collapsible=icon]:hidden">Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ href, label, icon: Icon, ...rest }) => {
                  const active =
                    'exact' in rest ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link href={`${href}${suffix}` as Route} aria-current={active ? 'page' : undefined}>
                          <Icon aria-hidden strokeWidth={1.75} />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to the store">
                  <Link href="/" prefetch={false}>
                    <Activity aria-hidden strokeWidth={1.75} />
                    <span>Storefront</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
