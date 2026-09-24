'use client'

import { Dialog as DialogPrimitive } from 'radix-ui'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { X } from 'lucide-react'
import { exit, spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

/**
 * Spring-revealed dialog (SG §6.4.3): `reveal` spring in, `exit` tween out. Radix keeps focus trap,
 * Esc and `aria-modal`; the destructive button in a confirm dialog is never auto-focused.
 */
export function MotionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = 'confirm',
  showClose = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** `confirm` 30 rem · `form` 40 rem (SG §5.3). */
  size?: 'confirm' | 'form'
  showClose?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-70 bg-black/40 backdrop-blur-[2px] dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: exit }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              {/* Tailwind v4 translate utilities use the independent `translate` property,
                  so they compose with Motion's `transform` (scale, y) instead of fighting it. */}
              <m.div
                className={cn(
                  'fixed top-1/2 left-1/2 z-70 grid max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-2xl bg-popover p-6 text-popover-foreground shadow-modal outline-none',
                  size === 'confirm' ? 'w-[min(92vw,30rem)]' : 'w-[min(92vw,40rem)]',
                  className,
                )}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 4, transition: exit }}
                transition={spring.reveal}
              >
                <div className="grid gap-1.5 pr-8">
                  <DialogPrimitive.Title className="text-heading-4 text-balance">{title}</DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="text-body-sm text-pretty text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  ) : (
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                  )}
                </div>
                {children}
                {showClose && (
                  <DialogPrimitive.Close
                    className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                    aria-label="Close"
                  >
                    <X className="size-4" aria-hidden />
                  </DialogPrimitive.Close>
                )}
              </m.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
