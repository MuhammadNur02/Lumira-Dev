'use client'

import { useState } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseRange, PRESETS } from '@/lib/admin/range'
import { cn } from '@/lib/utils'

/** SG §5.11 date range: preset rows with a 16 px check, custom range behind a hairline, persisted in the URL. */
export function DateRangePicker() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const range = parseRange(Object.fromEntries(params))
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)

  function apply(next: Record<string, string | null>) {
    const q = new URLSearchParams(params)
    for (const key of ['preset', 'from', 'to']) q.delete(key)
    for (const [key, value] of Object.entries(next)) if (value) q.set(key, value)
    const qs = q.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}` as Route, { scroll: false })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Date range: ${range.label}`}>
          <CalendarDays aria-hidden /> {range.label} <ChevronDown aria-hidden className="opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1.5">
        <ul className="flex flex-col" role="listbox" aria-label="Date range presets">
          {PRESETS.map((p) => {
            const selected = range.preset === p.id
            return (
              <li key={p.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => apply({ preset: p.id === '30d' ? null : p.id })}
                  className={cn(
                    'flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-body-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    selected && 'font-medium',
                  )}
                >
                  <Check aria-hidden className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} />
                  {p.label}
                </button>
              </li>
            )
          })}
        </ul>
        <form
          className="mt-1.5 flex flex-col gap-2 border-t border-border p-2 pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (from && to && from <= to) apply({ from, to })
          }}
        >
          <span className="eyebrow">Custom</span>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" aria-label="From" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" aria-label="To" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="submit" size="sm" disabled={!from || !to || from > to}>
            Apply
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
