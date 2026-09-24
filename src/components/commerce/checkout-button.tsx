'use client'

import { Button } from '@/components/ui/button'
import { useCheckout } from '@/lib/billing/use-checkout'

/** Starts checkout for one variant (All-Access plans, bundles). Keeps its width while pending. */
export function CheckoutButton({
  variantId,
  fallbackUrl,
  children,
  variant = 'default',
  className,
}: {
  variantId: number | null
  fallbackUrl?: string | null
  children: React.ReactNode
  variant?: 'default' | 'secondary' | 'brand' | 'outline'
  className?: string
}) {
  const { buy, warm, pendingVariant } = useCheckout()
  return (
    <Button
      size="lg"
      variant={variant}
      className={className}
      disabled={!variantId}
      loading={pendingVariant !== null && pendingVariant === variantId}
      loadingLabel="Starting checkout"
      onPointerEnter={warm}
      onFocus={warm}
      onClick={() => variantId && void buy(variantId, fallbackUrl)}
    >
      {children}
    </Button>
  )
}
