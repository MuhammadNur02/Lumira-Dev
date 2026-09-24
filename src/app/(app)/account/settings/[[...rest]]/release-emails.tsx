'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { setReleaseEmails } from '../actions'

type Pref = { slug: string; name: string; enabled: boolean }

export function ReleaseEmails({ prefs }: { prefs: Pref[] }) {
  const [optimistic, apply] = useOptimistic(prefs, (state, next: { slug: string; enabled: boolean }) =>
    state.map((p) => (p.slug === next.slug ? { ...p, enabled: next.enabled } : p)),
  )
  const [, start] = useTransition()

  function toggle(slug: string, enabled: boolean) {
    start(async () => {
      apply({ slug, enabled })
      const result = await setReleaseEmails({ productSlug: slug, enabled })
      if (!result.ok) toast.error('We couldn’t save that preference. Try again.')
    })
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {optimistic.map((pref) => {
        const id = `release-${pref.slug}`
        return (
          <li key={pref.slug} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <label htmlFor={id} className="text-body-sm">
              {pref.name}
            </label>
            <Switch id={id} checked={pref.enabled} onCheckedChange={(v) => toggle(pref.slug, v)} />
          </li>
        )
      })}
    </ul>
  )
}
