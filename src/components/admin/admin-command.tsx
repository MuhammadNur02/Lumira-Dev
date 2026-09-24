'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { KeyRound, Receipt, Search, User } from 'lucide-react'
import { searchAdmin } from '@/app/(app)/admin/search'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import type { SearchHit } from '@/server/admin/queries'

const ICON = { customer: User, order: Receipt, license: KeyRound } as const

/** Jump to a customer by email, name, order # or full license key (hash lookup). */
export function AdminCommand() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [pending, start] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) return
    const timer = window.setTimeout(() => start(async () => setHits(await searchAdmin(query))), 200)
    return () => window.clearTimeout(timer)
  }, [query])

  const visible = query.trim().length < 2 ? [] : hits

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-muted-foreground">
        <Search aria-hidden /> Search <Kbd className="ml-2 hidden sm:inline-flex">⌘K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        title="Admin search"
        description="Customer email, name, order number or license key"
      >
        <CommandInput placeholder="Email, name, #order or license key…" value={query} onValueChange={setQuery} />
        <CommandList className="ph-no-capture">
          <CommandEmpty>
            {pending ? 'Searching…' : query.trim().length < 2 ? 'Type at least 2 characters.' : 'No matches.'}
          </CommandEmpty>
          {visible.length ? (
            <CommandGroup heading="Results">
              {visible.map((hit) => {
                const Icon = ICON[hit.kind]
                return (
                  <CommandItem
                    key={`${hit.kind}-${hit.href}-${hit.label}`}
                    value={`${hit.label} ${hit.detail}`}
                    onSelect={() => {
                      setOpen(false)
                      router.push(hit.href as Route)
                    }}
                  >
                    <Icon aria-hidden />
                    <span className="truncate">{hit.label}</span>
                    <span className="ml-auto truncate text-caption text-muted-foreground">{hit.detail}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  )
}
