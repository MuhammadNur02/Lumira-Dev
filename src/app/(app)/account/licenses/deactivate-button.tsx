'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { Button } from '@/components/ui/button'
import { deactivateInstance } from './actions'

/** F-03: confirm → LS deactivate → the usage meter springs down after revalidation. */
export function DeactivateButton({ instanceId, name }: { instanceId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()

  function confirm() {
    start(async () => {
      const result = await deactivateInstance(instanceId)
      if (result.ok) {
        setOpen(false)
        toast.success(`Freed the activation “${name}”`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Deactivate
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        title={`Deactivate “${name}”?`}
        description="The project stops validating and the slot is freed immediately. You can activate it again at any time."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} loading={pending} loadingLabel="Deactivating">
            Deactivate
          </Button>
        </div>
      </MotionDialog>
    </>
  )
}
