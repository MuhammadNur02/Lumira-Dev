'use client'

import { Dialog as DialogPrimitive } from 'radix-ui'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { exit, spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

/**
 * Mobile bottom sheet (SG §6.4.4): the Radix Dialog shell (focus trap, Esc, aria-modal) with a
 * draggable `smooth`-spring panel. A drag beyond 120 px or faster than 600 px/s dismisses it.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-70 bg-black/40 dark:bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } }}
                exit={{ opacity: 0, transition: exit }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <m.div
                className={cn(
                  'fixed inset-x-0 bottom-0 z-70 max-h-[88dvh] overflow-y-auto rounded-t-[24px] bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-modal outline-none',
                  className,
                )}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%', transition: exit }}
                transition={spring.smooth}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.05, bottom: 0.6 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false)
                }}
              >
                <div aria-hidden className="mx-auto mt-2 h-1 w-9 rounded-full bg-border" />
                <div className="grid gap-1.5 px-5 pt-4 pb-2">
                  <DialogPrimitive.Title className="text-heading-4">{title}</DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="text-body-sm text-muted-foreground">
                      {description}
                    </DialogPrimitive.Description>
                  ) : (
                    <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
                  )}
                </div>
                <div className="px-5 pb-5">{children}</div>
              </m.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}
