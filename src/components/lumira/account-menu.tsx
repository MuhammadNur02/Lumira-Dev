'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useClerk, useUser } from '@clerk/nextjs'
import { KeyRound, Library, LogOut, ReceiptText, Settings, ShieldCheck } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** Signed-in avatar menu (FR-GL-01). Links cross into the `(app)` root layout, so they are plain anchors. */
export function AccountMenu({ isAdmin }: { isAdmin: boolean }) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const initials = (user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress[0] ?? 'L').toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="inline-flex size-9 pressable items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 28 px Clerk avatar, already optimized by Clerk
          <img
            src={user.imageUrl}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full border border-bento-border"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-caption">{initials}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-caption text-muted-foreground">
          {user?.primaryEmailAddress?.emailAddress ?? 'Account'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link prefetch={false} href="/account/library">
            <Library aria-hidden /> Library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link prefetch={false} href="/account/licenses">
            <KeyRound aria-hidden /> Licenses
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link prefetch={false} href="/account/billing">
            <ReceiptText aria-hidden /> Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link prefetch={false} href={'/account/settings' as Route}>
            <Settings aria-hidden /> Settings
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link prefetch={false} href={'/admin' as Route}>
              <ShieldCheck aria-hidden /> Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut({ redirectUrl: '/' })}>
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
