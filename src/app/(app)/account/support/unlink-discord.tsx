'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { unlinkDiscord } from './actions'

export function UnlinkDiscordButton() {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      loading={pending}
      loadingLabel="Unlinking Discord"
      onClick={() =>
        start(async () => {
          const result = await unlinkDiscord()
          if (result.ok) toast.success('Discord unlinked. The Verified Owner role was removed.')
          else toast.error(result.error ?? 'Unlink failed. Try again.')
        })
      }
    >
      Unlink
    </Button>
  )
}
