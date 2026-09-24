'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Download } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { redeemDownload, type RedeemState } from './actions'

export function DownloadForm({ token, label }: { token: string; label: string }) {
  const [state, action, pending] = useActionState<RedeemState, FormData>(redeemDownload.bind(null, token), {
    error: null,
  })
  return (
    <form action={action} className="flex flex-col gap-4">
      <Button type="submit" size="lg" className="w-full" loading={pending} loadingLabel="Preparing your download">
        <Download aria-hidden /> {label}
      </Button>
      {state.error ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertDescription>
            {state.error}{' '}
            <Link prefetch={false} className="underline underline-offset-4" href="/account/library">
              Open your Library
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}
