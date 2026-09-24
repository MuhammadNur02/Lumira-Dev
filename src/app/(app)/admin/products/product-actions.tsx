'use client'

import { useState, useTransition } from 'react'
import { useReverification } from '@clerk/nextjs'
import { Archive, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { Textarea } from '@/components/ui/textarea'
import { deleteRelease, syncPrices, yankRelease } from './actions'

export function SyncPricesButton() {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      loadingLabel="Syncing prices"
      onClick={() =>
        start(async () => {
          const result = await syncPrices()
          if (!result.ok) return void toast.error(result.error)
          const { updated, missing } = result.data!
          toast.success(`Synced from Lemon Squeezy: ${updated} variant${updated === 1 ? '' : 's'} updated.`)
          if (missing.length)
            toast.warning(`Variants missing in this LS store/mode: ${missing.join(', ')}. Fix the IDs in the Studio.`)
        })
      }
    >
      <RefreshCw aria-hidden /> Sync from Lemon Squeezy
    </Button>
  )
}

export function YankReleaseButton({ id, version }: { id: string; version: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, start] = useTransition()
  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Yank v${version}`} onClick={() => setOpen(true)}>
        <Archive />
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(v) => !pending && setOpen(v)}
        title={`Yank v${version}?`}
        description="New downloads stop and the changelog marks it withdrawn. The file and history are kept."
      >
        <Field>
          <FieldLabel htmlFor={`yank-${id}`}>Reason (audited, shown to nobody else)</FieldLabel>
          <Textarea id={`yank-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3}
            loading={pending}
            onClick={() =>
              start(async () => {
                const result = await yankRelease(id, reason)
                if (result.ok) {
                  toast.success(`v${version} yanked`)
                  setOpen(false)
                } else toast.error(result.error)
              })
            }
          >
            Yank release
          </Button>
        </div>
      </MotionDialog>
    </>
  )
}

export function DeleteReleaseButton({ id, version }: { id: string; version: string }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const remove = useReverification(deleteRelease)
  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Delete v${version}`} onClick={() => setOpen(true)}>
        <Trash2 />
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(v) => !pending && setOpen(v)}
        title={`Delete v${version} permanently?`}
        description="Removes the file from R2 and the release record. Only possible when nobody has downloaded it. You’ll be asked to verify it’s you."
      >
        <Field>
          <FieldLabel htmlFor={`del-${id}`}>
            Type <span className="font-mono">{version}</span> to confirm
          </FieldLabel>
          <Input id={`del-${id}`} autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={text !== version}
            loading={pending}
            onClick={() =>
              start(async () => {
                try {
                  const result = await remove(id, text)
                  if (result?.ok === false) toast.error(result.error)
                  else {
                    toast.success(`v${version} deleted`)
                    setOpen(false)
                  }
                } catch {
                  toast.error('Verification was cancelled.')
                }
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      </MotionDialog>
    </>
  )
}
