'use client'

import { useState, useTransition } from 'react'
import { useReverification } from '@clerk/nextjs'
import { Megaphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { deleteDiscount, setPromoBanner } from './actions'

export function DeleteDiscountButton({ id, code }: { id: string; code: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const remove = useReverification(deleteDiscount)
  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${code}`} onClick={() => setOpen(true)}>
        <Trash2 />
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        title={`Delete ${code}?`}
        description="The code stops working at checkout immediately. Past orders keep their discount. You’ll be asked to verify it’s you."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            loadingLabel="Deleting"
            onClick={() =>
              start(async () => {
                try {
                  const result = await remove(id)
                  if (result?.ok === false) toast.error(result.error)
                  else {
                    toast.success(`Deleted ${code}`)
                    setOpen(false)
                  }
                } catch {
                  toast.error('Verification was cancelled.')
                }
              })
            }
          >
            Delete code
          </Button>
        </div>
      </MotionDialog>
    </>
  )
}

/** FR-AD-33: show this code in the site-wide banner (Sanity `siteSettings.promoBanner`). */
export function BannerButton({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      aria-pressed={active}
      aria-label={active ? `Hide the ${code} banner` : `Show ${code} in the site banner`}
      loading={pending}
      onClick={() =>
        start(async () => {
          const result = await setPromoBanner({ enabled: !active, code: active ? null : code, text: null })
          if (result.ok)
            toast.success(active ? 'Banner hidden. The site updates within seconds.' : `Banner now promotes ${code}.`)
          else toast.error(result.error)
        })
      }
    >
      <Megaphone />
    </Button>
  )
}
