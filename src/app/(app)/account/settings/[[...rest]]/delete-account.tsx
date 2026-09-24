'use client'

import { useState, useTransition } from 'react'
import { useClerk } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { deleteAccount } from '../actions'

export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const { signOut } = useClerk()

  function confirm() {
    start(async () => {
      const result = await deleteAccount(text)
      if (!result.ok) return void toast.error(result.error ?? 'Deletion failed.')
      await signOut({ redirectUrl: '/' })
    })
  }

  return (
    <>
      <Button variant="destructive" className="self-start" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        title="Delete your Lumira account?"
        description="Your sign-in, Library access and Discord role are removed. Orders and invoices are kept for tax law. This can’t be undone."
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="delete-confirm" className="text-body-sm">
            Type <span className="font-mono font-medium">DELETE</span> to confirm
          </label>
          <Input id="delete-confirm" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={text !== 'DELETE'}
            loading={pending}
            loadingLabel="Deleting account"
          >
            Delete account
          </Button>
        </div>
      </MotionDialog>
    </>
  )
}
