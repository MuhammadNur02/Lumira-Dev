import { HostMessage, type DemoMessageInput } from './protocol'

export type BridgeOptions = {
  /** Allowed player origins, e.g. ['https://lumira.dev', 'https://staging.lumira.dev']. */
  hosts: string[]
  /** Applies a theme requested by the player (`?theme=` capable demos). */
  onSetTheme?: (theme: 'light' | 'dark') => void
  /** Navigates the demo; defaults to `location.assign(path)`. */
  onNavigate?: (path: string) => void
  themes?: ('light' | 'dark')[]
}

/**
 * Demo-side bridge (SG §7.8). Loaded only when framed: announces `ready`, reports client-side
 * navigations (history API + popstate) and applies host commands from allowed origins only.
 * Returns a cleanup function.
 */
export function startBridge({ hosts, onSetTheme, onNavigate, themes }: BridgeOptions): () => void {
  if (typeof window === 'undefined' || window.parent === window) return () => {}
  const host = hosts.find((h) => document.referrer.startsWith(h)) ?? hosts[0]
  if (!host) return () => {}

  const post = (m: DemoMessageInput) => window.parent.postMessage({ source: 'lumira-demo', v: 1, ...m }, host)
  const notify = () => post({ type: 'navigate', path: location.pathname + location.search, title: document.title })

  const originals = { pushState: history.pushState, replaceState: history.replaceState }
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = originals[method]
    history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args)
      queueMicrotask(notify)
      return result
    }
  }
  window.addEventListener('popstate', notify)

  const onMessage = (e: MessageEvent) => {
    if (!hosts.includes(e.origin) || e.source !== window.parent) return
    const parsed = HostMessage.safeParse(e.data)
    if (!parsed.success) return
    if (parsed.data.type === 'set-theme') onSetTheme?.(parsed.data.theme)
    else (onNavigate ?? ((p: string) => location.assign(p)))(parsed.data.path)
  }
  window.addEventListener('message', onMessage)
  window.addEventListener('error', (e) => post({ type: 'error', message: String(e.message).slice(0, 500) }))

  post({ type: 'ready', path: location.pathname + location.search, title: document.title, themes })

  return () => {
    history.pushState = originals.pushState
    history.replaceState = originals.replaceState
    window.removeEventListener('popstate', notify)
    window.removeEventListener('message', onMessage)
  }
}
