'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Search } from 'lucide-react'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import type { PaletteData } from './command-palette'

// cmdk and the dialog load on first open (or on hover intent), never in first-load JS.
const loadPalette = () => import('./command-palette')
const CommandPalette = dynamic(() => loadPalette().then((m) => m.CommandPalette), { ssr: false })

/** ⌘K trigger + global shortcut (FR-GL-02). */
export function CommandMenu({ data, className }: { data: PaletteData; className?: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setMounted(true)
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onPointerEnter={() => void loadPalette()}
        onFocus={() => void loadPalette()}
        onClick={() => {
          setMounted(true)
          setOpen(true)
        }}
        aria-keyshortcuts="Meta+K Control+K"
        className={cn(
          'inline-flex h-9 pressable items-center gap-2 rounded-md border border-border bg-transparent px-2.5 text-body-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
          className,
        )}
      >
        <Search className="size-4" strokeWidth={1.75} aria-hidden />
        <span className="hidden xl:inline">Search</span>
        <span className="sr-only xl:hidden">Search</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </button>
      {mounted ? <CommandPalette open={open} onOpenChange={setOpen} data={data} /> : null}
    </>
  )
}
