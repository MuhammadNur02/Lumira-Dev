'use client'

import { useTransition } from 'react'
import { useTheme } from 'next-themes'
import { ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getDistinctId } from '@/lib/analytics/track'
import { startUpgrade } from './actions'

export function UpgradeButton({
  productSlug,
  target,
  children,
  variant = 'brand',
  size = 'sm',
}: {
  productSlug: string
  target: { kind: 'major' } | { kind: 'tier'; tier: 'team' | 'extended' }
  children: React.ReactNode
  variant?: 'brand' | 'outline' | 'secondary'
  size?: 'sm' | 'default'
}) {
  const [pending, start] = useTransition()
  const { resolvedTheme } = useTheme()

  function upgrade() {
    start(async () => {
      const result = await startUpgrade({
        productSlug,
        target,
        theme: resolvedTheme === 'light' ? 'light' : 'dark',
        phDistinctId: getDistinctId(),
      })
      if (result.ok) window.location.assign(result.url)
      else toast.error(result.error)
    })
  }

  return (
    <Button variant={variant} size={size} onClick={upgrade} loading={pending} loadingLabel="Preparing your upgrade">
      <ArrowUpCircle aria-hidden /> {children}
    </Button>
  )
}
