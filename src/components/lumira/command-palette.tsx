'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useTheme } from 'next-themes'
import { BookOpen, Boxes, FileText, History, Laptop, Library, Moon, Package, Sun } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { track } from '@/lib/analytics/track'

export type PaletteData = {
  products: { name: string; slug: string; line: string; tagline: string }[]
  releases: { product: string; productSlug: string; version: string; anchor: string; title: string }[]
}

type DocsHit = { id: string; url: string; type: 'page' | 'heading' | 'text'; content: string }

/** Command palette (FR-GL-02): products, docs (Fumadocs search, P4.18), changelog versions, actions. */
export function CommandPalette({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: PaletteData
}) {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<DocsHit[]>([])
  const [, startTransition] = useTransition()

  // Docs search: debounced 150 ms against /api/search (licensed pages expose titles only, FR-DOC-04).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!res.ok) return
        const hits = ((await res.json()) as DocsHit[]).filter((h) => h.type !== 'text').slice(0, 6)
        setDocs(hits)
        track('docs_searched', { query: q.slice(0, 80), results_count: hits.length })
      } catch {
        // aborted or offline: keep previous results
      }
    }, 150)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  const visibleDocs = query.trim().length >= 2 ? docs : []

  const go = (href: string, external = false) => {
    onOpenChange(false)
    if (external) window.location.assign(href)
    else startTransition(() => router.push(href as Route))
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search products, docs, versions…" />
      <CommandList>
        <CommandEmpty>No results for “{query}”.</CommandEmpty>
        <CommandGroup heading="Products">
          {data.products.map((p) => (
            <CommandItem
              key={p.slug}
              value={`${p.name} ${p.line} ${p.tagline}`}
              onSelect={() => go(`/products/${p.slug}`)}
            >
              <Package aria-hidden />
              <span className="truncate">{p.name}</span>
              <span className="ml-auto truncate text-micro text-muted-foreground">{p.line.replace('_', ' ')}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {visibleDocs.length > 0 ? (
          <CommandGroup heading="Docs" forceMount>
            {visibleDocs.map((hit) => (
              <CommandItem key={hit.id} value={`docs ${hit.content} ${hit.id}`} onSelect={() => go(hit.url)} forceMount>
                <FileText aria-hidden />
                <span className="truncate">{hit.content}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Changelog">
          {data.releases.map((r) => (
            <CommandItem
              key={r.anchor}
              value={`${r.product} v${r.version} ${r.title}`}
              onSelect={() => go(`/changelog#${r.anchor}`)}
            >
              <History aria-hidden />
              <span className="truncate">
                {r.product} <span className="font-mono text-micro">v{r.version}</span>
              </span>
              <span className="ml-auto truncate text-micro text-muted-foreground">{r.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="open library" onSelect={() => go('/account/library', true)}>
            <Library aria-hidden /> Open your Library
          </CommandItem>
          <CommandItem value="all access pass" onSelect={() => go('/all-access')}>
            <Boxes aria-hidden /> All-Access Pass
          </CommandItem>
          <CommandItem value="documentation docs" onSelect={() => go('/docs')}>
            <BookOpen aria-hidden /> Documentation
          </CommandItem>
          <CommandItem value="theme light" onSelect={() => (setTheme('light'), onOpenChange(false))}>
            <Sun aria-hidden /> Light theme
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => (setTheme('dark'), onOpenChange(false))}>
            <Moon aria-hidden /> Dark theme
          </CommandItem>
          <CommandItem value="theme system" onSelect={() => (setTheme('system'), onOpenChange(false))}>
            <Laptop aria-hidden /> System theme
            <CommandShortcut />
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
