'use client'

import { useSyncExternalStore } from 'react'
import { CircleCheck, Circle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const DOCS_KEY = 'lumira:onboarding:docs'
const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}
const readDocs = () => {
  try {
    return window.localStorage.getItem(DOCS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Onboarding checklist (FR-BD-10): Download → Activate → Getting Started → Discord. Every step but
 * "Read Getting Started" completes from server events; that one is remembered per browser.
 */
export function Onboarding({
  downloaded,
  activated,
  discord,
  docsHref,
}: {
  downloaded: boolean
  activated: boolean
  discord: boolean
  docsHref: string
}) {
  const docs = useSyncExternalStore(subscribe, readDocs, () => false)
  const steps = [
    { done: downloaded, label: 'Download your first release', href: '#library-grid' },
    { done: activated, label: 'Activate with npx lumira@latest activate', href: '/account/licenses' },
    { done: docs, label: 'Read Getting Started', href: docsHref, onClick: markDocs },
    { done: discord, label: 'Join the verified-owner Discord', href: '/account/support' },
  ]
  const complete = steps.filter((s) => s.done).length
  if (complete === steps.length) return null

  return (
    <section
      aria-labelledby="onboarding-title"
      className="bento-surface mb-(--bento-gap) flex flex-col gap-4 p-5 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="onboarding-title" className="text-heading-4">
          Get started
        </h2>
        <span className="text-caption text-muted-foreground tabular-nums">
          {complete} of {steps.length} done
        </span>
      </div>
      <Progress value={(complete / steps.length) * 100} aria-label="Onboarding progress" />
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.label}>
            <a
              href={step.href}
              onClick={step.onClick}
              className={cn(
                'flex h-full items-start gap-2 rounded-lg border border-bento-border p-3 text-body-sm transition-colors hover:bg-accent',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                step.done && 'text-muted-foreground',
              )}
            >
              {step.done ? (
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <Circle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <span>
                {step.label}
                {step.done ? <span className="sr-only"> (done)</span> : null}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}

function markDocs() {
  try {
    window.localStorage.setItem(DOCS_KEY, '1')
  } catch {
    // private mode: the step simply stays open
  }
}
