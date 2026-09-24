import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ContinueButton } from './continue-button'

export const metadata = { title: 'Continue to your Library' }

/** Landing for the emailed one-click Library link (F-13). */
export default function ContinuePage() {
  return (
    <div className="bento-surface flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-3">Open your Lumira Library</h1>
        <p className="text-body-sm text-muted-foreground">
          Your purchases, license keys and every version are waiting. Continue to sign in with this one-time link.
        </p>
      </div>
      <Suspense
        fallback={
          <Button size="lg" className="w-full" disabled>
            Continue to your Library
          </Button>
        }
      >
        <ContinueButton />
      </Suspense>
    </div>
  )
}
