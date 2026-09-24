'use client'

import { useEffect, useRef } from 'react'

export type ShortcutHandlers = Partial<
  Record<'1' | '2' | '3' | '0' | 'r' | 'R' | 't' | 'o' | 'b' | 'p' | '?' | 'Escape', () => void>
>

/** Keys shown in the shortcut help popover (SG §7.5). */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['1'], label: 'Desktop' },
  { keys: ['2'], label: 'Tablet' },
  { keys: ['3'], label: 'Mobile' },
  { keys: ['0'], label: 'Fit' },
  { keys: ['R'], label: 'Rotate' },
  { keys: ['Shift', 'R'], label: 'Reload demo' },
  { keys: ['P'], label: 'Page picker' },
  { keys: ['T'], label: 'Toggle demo theme' },
  { keys: ['O'], label: 'Open in new tab' },
  { keys: ['B'], label: 'Buy' },
  { keys: ['?'], label: 'Shortcuts' },
  { keys: ['Esc'], label: 'Close' },
]

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
    target.getAttribute('role') === 'combobox'
  )
}

/**
 * Single-key shortcuts (SG §7.5). Ignored while focus is in inputs, selects, textareas or
 * contenteditable, and whenever Ctrl/⌘/Alt is held (browser shortcuts win). Keystrokes inside the
 * cross-origin iframe never reach the player.
 */
export function usePreviewShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      // Shift+R reloads; plain r (or R with Caps Lock) rotates; '?' arrives as its own key.
      const key =
        e.key === 'Escape'
          ? 'Escape'
          : e.key === 'R' && e.shiftKey
            ? 'R'
            : e.key.length === 1
              ? e.key.toLowerCase()
              : null
      const fn = key ? ref.current[key as keyof ShortcutHandlers] : undefined
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
