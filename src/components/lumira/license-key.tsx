'use client'

import { useState, useTransition } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Ban, CircleCheck, CircleDashed, Clock, Eye, EyeOff, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { revealLicenseKey } from '@/app/(app)/account/licenses/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/lumira/copy-button'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

export type LicenseKeyStatus = 'inactive' | 'active' | 'expired' | 'disabled'

const MASK = '••••••••-••••-••••-••••-••••••••'

/** Hyphens in `muted-foreground` so the character groups scan easily (SG §5.6). Case is never changed. */
function Groups({ text }: { text: string }) {
  const parts = text.split('-')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="text-muted-foreground">-</span>}
          {part}
        </span>
      ))}
    </>
  )
}

type Props = {
  last4: string
  status?: LicenseKeyStatus
  className?: string
} & (
  | {
      /** Library: revealed through `revealLicenseKey` (ownership re-checked, `revealed` event logged). */ id: string
      value?: never
    }
  | {
      /** Success page (guest scope): the plaintext is already authorized for this browser. */ value: string
      id?: never
    }
)

/** SG §5.6. Masked by default; excluded from analytics and session replays. */
export function LicenseKey({ last4, status, className, ...source }: Props) {
  const [plain, setPlain] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function resolve(): Promise<string> {
    if (source.value) return source.value
    return revealLicenseKey(source.id!)
  }

  function toggle() {
    if (plain) return setPlain(null)
    start(async () => {
      try {
        setPlain(await resolve())
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'We couldn’t reveal this key. Try again.')
      }
    })
  }

  async function copyValue() {
    if (plain) return plain
    const value = await resolve()
    setPlain(value) // a masked copy reveals first
    return value
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="ph-no-capture flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-bento-border bg-muted/60 py-1 pr-1 pl-3">
        <KeyRound aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
        <AnimatePresence mode="popLayout" initial={false}>
          <m.code
            key={plain ? 'plain' : 'masked'}
            className="min-w-0 flex-1 py-1 license-key"
            aria-label={plain ? 'License key' : `License key ending in ${last4}`}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={spring.reveal}
          >
            <Groups text={plain ?? `${MASK}${last4}`} />
          </m.code>
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggle}
          aria-pressed={!!plain}
          loading={pending}
          loadingLabel="Revealing license key"
          aria-label={plain ? 'Hide license key' : 'Reveal license key'}
        >
          {plain ? <EyeOff /> : <Eye />}
        </Button>
        <CopyButton label="Copy license key" copiedLabel="License key copied" getValue={copyValue} />
      </div>
      {status && <LicenseStatusBadge status={status} />}
    </div>
  )
}

export function LicenseStatusBadge({ status }: { status: LicenseKeyStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="success">
          <CircleCheck aria-hidden /> Active
        </Badge>
      )
    case 'inactive':
      return (
        <Badge variant="neutral">
          <CircleDashed aria-hidden /> Not activated
        </Badge>
      )
    case 'expired':
      return (
        <Badge variant="danger">
          <Clock aria-hidden /> Expired
        </Badge>
      )
    case 'disabled':
      return (
        <Badge variant="danger">
          <Ban aria-hidden /> Disabled
        </Badge>
      )
  }
}
