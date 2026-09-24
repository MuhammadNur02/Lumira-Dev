import { FlaskConical } from 'lucide-react'
import { env } from '@/lib/env'

/** FR-GL-08: every non-production deployment runs Lemon Squeezy in test mode and says so. */
export function EnvironmentBanner() {
  if (!env.LS_TEST_MODE) return null
  return (
    <div role="note" className="bg-warning-subtle text-warning">
      <p className="mx-auto flex max-w-[80rem] items-center justify-center gap-2 px-4 py-1.5 text-micro">
        <FlaskConical className="size-3.5" aria-hidden />
        <span>
          Test mode — use card <span className="font-mono tabular-nums">4242 4242 4242 4242</span>, any future expiry
          and any CVC.
        </span>
      </p>
    </div>
  )
}
