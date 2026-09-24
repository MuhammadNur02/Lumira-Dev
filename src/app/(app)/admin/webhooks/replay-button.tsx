'use client'

import { useTransition } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { replayWebhook } from './actions'

export function ReplayButton({ id, size = 'sm' }: { id: string; size?: 'sm' | 'default' }) {
  const [pending, start] = useTransition()
  return (
    <Button
      variant="outline"
      size={size}
      loading={pending}
      loadingLabel="Replaying"
      onClick={() =>
        start(async () => {
          const result = await replayWebhook(id)
          if (result.ok) toast.success('Replayed: the handler ran again on the stored payload.')
          else toast.error(result.error)
        })
      }
    >
      <RotateCcw aria-hidden /> Replay
    </Button>
  )
}
