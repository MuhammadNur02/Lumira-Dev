'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, Copy } from 'lucide-react'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

/**
 * Copy with a success confirmation (SG §6.4.8): Copy → Check with the `bouncy` spring and a live
 * region announcement, reset after 2 s. `getValue` may be async (reveal-then-copy for keys).
 */
export function CopyButton({
  value,
  getValue,
  label = 'Copy',
  copiedLabel = 'Copied',
  onCopied,
  className,
}: {
  value?: string
  getValue?: () => Promise<string> | string
  label?: string
  copiedLabel?: string
  onCopied?: () => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    if (busy) return
    setBusy(true)
    try {
      const text = value ?? (await getValue?.()) ?? ''
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopied?.()
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 2000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        disabled={busy}
        className={cn(
          'inline-flex size-8 shrink-0 pressable items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:opacity-50',
          className,
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <m.span
              key="check"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={spring.bouncy}
            >
              <Check className="size-4 text-success" aria-hidden />
            </m.span>
          ) : (
            <m.span
              key="copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <Copy className="size-4" aria-hidden />
            </m.span>
          )}
        </AnimatePresence>
      </button>
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </>
  )
}
