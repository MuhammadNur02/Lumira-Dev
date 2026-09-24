'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

// Lumira patch (SG §5.3): glass, status icon + text, bottom-right on desktop, top-center on mobile.
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()
  const isMobile = useIsMobile()

  return (
    <Sonner
      theme={(resolvedTheme ?? 'dark') as ToasterProps['theme']}
      position={isMobile ? 'top-center' : 'bottom-right'}
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-success" aria-hidden />,
        info: <Info className="size-4 text-info" aria-hidden />,
        warning: <TriangleAlert className="size-4 text-warning" aria-hidden />,
        error: <OctagonX className="size-4 text-destructive" aria-hidden />,
        loading: <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />,
      }}
      style={
        {
          '--normal-bg': 'color-mix(in oklch, var(--popover) 85%, transparent)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--bento-border)',
          '--border-radius': 'var(--radius-lg)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'glass-popover! shadow-overlay! font-sans text-body-sm',
          description: 'text-muted-foreground!',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
