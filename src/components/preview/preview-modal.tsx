'use client'

import { useRouter } from 'next/navigation'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { PreviewPlayer } from './preview-player'
import type { PlaygroundEntry, PreviewPricing, PreviewProduct } from './types'

/**
 * Intercepted Live Preview (P4.05): a full-screen dialog over the PDP. Esc and the close button go
 * back in history; Radix returns focus to the Live Preview trigger (SG §7.10).
 */
export function PreviewModal(props: {
  product: PreviewProduct
  pricing: PreviewPricing
  playground: PlaygroundEntry[]
}) {
  const router = useRouter()
  return (
    <DialogPrimitive.Root defaultOpen onOpenChange={(open) => !open && router.back()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-70 bg-background outline-none data-open:animate-in data-open:duration-(--spring-smooth-duration) data-open:fade-in-0"
        >
          <DialogPrimitive.Title className="sr-only">Live preview of {props.product.name}</DialogPrimitive.Title>
          <PreviewPlayer mode="modal" {...props} onClose={() => router.back()} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
