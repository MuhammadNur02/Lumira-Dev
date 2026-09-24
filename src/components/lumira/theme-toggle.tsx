'use client'

import { flushSync } from 'react-dom'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Circular View Transition reveal from the pointer (SG §6.5.6); instant under reduced motion. */
export function useThemeReveal() {
  const { resolvedTheme, setTheme } = useTheme()

  return (event: React.MouseEvent<HTMLElement>, target?: 'light' | 'dark' | 'system') => {
    const next = target ?? (resolvedTheme === 'dark' ? 'light' : 'dark')
    const root = document.documentElement
    const resolvedNext =
      next === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTheme(next)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX || rect.left + rect.width / 2
    const y = event.clientY || rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    root.dataset.themeTransition = ''
    const transition = document.startViewTransition(() => {
      root.classList.toggle('dark', resolvedNext === 'dark') // synchronous DOM change for the snapshot
      flushSync(() => setTheme(next))
    })
    void transition.ready.then(() => {
      const css = getComputedStyle(root)
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: parseFloat(css.getPropertyValue('--spring-gentle-duration')) || 565,
          easing: css.getPropertyValue('--spring-gentle').trim() || 'ease-out',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    void transition.finished.finally(() => delete root.dataset.themeTransition)
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const reveal = useThemeReveal()
  return (
    <button
      type="button"
      onClick={(e) => reveal(e)}
      className={cn(
        'relative inline-flex size-9 pressable items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        className,
      )}
    >
      {/* Both icons render; CSS picks one, so there is no hydration mismatch. */}
      <Sun className="hidden size-[18px] dark:block" strokeWidth={1.75} aria-hidden />
      <Moon className="size-[18px] dark:hidden" strokeWidth={1.75} aria-hidden />
      <span className="sr-only dark:hidden">Switch to dark theme</span>
      <span className="sr-only hidden dark:inline">Switch to light theme</span>
    </button>
  )
}
