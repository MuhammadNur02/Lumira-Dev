'use client'

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { Code2, ExternalLink, MonitorPlay, MoreHorizontal, RefreshCw, Sun, ArrowLeft, X } from 'lucide-react'
import type { DemoMessage } from '@lumira/preview-bridge'
import { getPurchaseContext } from '@/app/(site)/_actions/purchase-context'
import { LicenseSelector } from '@/components/commerce/license-selector'
import { isOwned, type Ownership, type PromoInfo, type TierKey } from '@/components/commerce/purchase'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-mobile'
import { track } from '@/lib/analytics/track'
import { useLemonCheckout } from '@/lib/billing/lemonsqueezy/use-lemon-checkout'
import { cn } from '@/lib/utils'
import { BuyCta } from './buy-cta'
import { DeviceFrame } from './device-frame'
import { computeFrame, DEVICE_KEYS, DEVICE_LABEL, frameAnnouncement, frameLabel, type DeviceKey } from './devices'
import { PreviewFallback } from './preview-fallback'
import { PreviewToolbar } from './preview-toolbar'
import { probeDemo } from './probe'
import { FAIL_AFTER_MS, reducer, SLOW_AFTER_MS } from './state'
import type { PlaygroundEntry, PreviewPricing, PreviewProduct } from './types'
import { useDemoBridge } from './use-demo-bridge'
import { usePreviewShortcuts } from './use-preview-shortcuts'
import { useStageSize } from './use-stage-size'

const urlState = {
  device: parseAsStringLiteral(DEVICE_KEYS),
  rotated: parseAsBoolean.withDefault(false),
  path: parseAsString.withDefault('/'),
  entry: parseAsStringLiteral(['pdp', 'card', 'direct'] as const),
}

/**
 * Live Preview player (StyleGuide §7, FR-LP-*). One iframe for the lifetime of the player: device
 * switches restyle it, never remount it. The Buy CTA stays visible at every width ≥ 320 px.
 */
export function PreviewPlayer({
  mode,
  product,
  pricing,
  playground = [],
  onClose,
}: {
  mode: 'modal' | 'page'
  product: PreviewProduct
  pricing: PreviewPricing
  playground?: PlaygroundEntry[]
  onClose?: () => void
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const headingId = useId()
  const [url, setUrl] = useQueryStates(urlState, { history: 'replace', scroll: false })
  const [state, dispatch] = useReducer(reducer, {
    status: 'loading',
    device: url.device ?? 'desktop',
    rotated: url.rotated,
    path: url.path.startsWith('/') ? url.path : '/',
  })
  const [navTarget, setNavTarget] = useState(state.path)
  const [demoTheme, setDemoTheme] = useState<'light' | 'dark'>('dark')
  const [announcement, setAnnouncement] = useState('')
  const [view, setView] = useState<'preview' | 'code'>('preview')
  const [ownership, setOwnership] = useState<Ownership>(null)
  const [promo, setPromo] = useState<PromoInfo>(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const defaultTier: TierKey = pricing.options.some((o) => o.tier === 'team')
    ? 'team'
    : (pricing.options[0]?.tier ?? 'personal')
  const [tier, setTier] = useState<TierKey>(defaultTier)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pageSelectRef = useRef<HTMLButtonElement>(null)
  const openedAt = useRef(0)
  const loadStarted = useRef(0)
  // Settles when the demo origin answers; created per load (see probe.ts, FR-LP-07).
  const reachable = useRef<Promise<boolean> | null>(null)
  const { warm } = useLemonCheckout()

  const stage = useStageSize(stageRef)
  const pad = isMobile ? 16 : 32
  const frame = useMemo(
    () =>
      computeFrame(
        stage ? { w: stage.w, h: Math.max(0, stage.h - 28) } : { w: 1280, h: 720 },
        state.device,
        state.rotated,
        pad,
      ),
    [stage, state.device, state.rotated, pad],
  )
  const demoUrl = `${product.demo.origin}${state.path}`
  const src = `${product.demo.origin}${navTarget}`

  // --- analytics: opened once, with where it came from (PRD §8.2) ---------------------------------
  useEffect(() => {
    openedAt.current = performance.now()
    reachable.current = probeDemo(product.demo.origin, FAIL_AFTER_MS)
    loadStarted.current = performance.now()
    track('preview_opened', { product_slug: product.slug, entry: url.entry ?? 'direct' })
    if (url.entry) void setUrl({ entry: null })
    // Touch devices default to the Mobile preset at scale 1 (FR-LP-10).
    if (!url.device && window.matchMedia('(pointer: coarse)').matches) dispatch({ type: 'device', device: 'mobile' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, [])

  // --- ownership & promo after mount: the iframe must never remount for personal state -----------
  useEffect(() => {
    let cancelled = false
    void getPurchaseContext(product.slug)
      .then((ctx) => {
        if (cancelled) return
        setOwnership(ctx.ownership)
        setPromo(ctx.promo)
        if (isOwned(defaultTier, ctx.ownership)) {
          const next = [...pricing.options, ...(pricing.allAccess ? [pricing.allAccess] : [])].find(
            (o) => !isOwned(o.tier, ctx.ownership),
          )
          if (next) setTier(next.tier)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [product.slug, defaultTier, pricing])

  // --- URL mirrors device, rotation and path (history: replace) -----------------------------------
  useEffect(() => {
    void setUrl({ device: state.device, rotated: state.rotated || null, path: state.path === '/' ? null : state.path })
  }, [state.device, state.rotated, state.path, setUrl])

  // --- lifecycle timers: 3 s → slow, 8 s → failed (FR-LP-07) ---------------------------------------
  useEffect(() => {
    if (state.status !== 'loading' && state.status !== 'slow') return
    const slow = window.setTimeout(
      () => dispatch({ type: 'slow' }),
      Math.max(0, SLOW_AFTER_MS - (performance.now() - loadStarted.current)),
    )
    const fail = window.setTimeout(
      () => dispatch({ type: 'fail', reason: 'timeout' }),
      Math.max(0, FAIL_AFTER_MS - (performance.now() - loadStarted.current)),
    )
    return () => {
      window.clearTimeout(slow)
      window.clearTimeout(fail)
    }
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'failed' || !state.failure) return
    track('preview_load_failed', {
      reason: state.failure,
      elapsed_ms: Math.round(performance.now() - loadStarted.current),
      device: state.device,
    })
  }, [state.status, state.failure, state.device])

  // --- bridge ---------------------------------------------------------------------------------------
  const onBridge = useCallback(
    (message: DemoMessage) => {
      if (message.type === 'ready') dispatch({ type: 'ready' })
      else if (message.type === 'navigate') {
        dispatch({ type: 'navigate', path: message.path })
        track('preview_page_changed', { path: message.path.slice(0, 200) })
      } else dispatch({ type: 'fail', reason: 'bridge_error' })
    },
    [dispatch],
  )
  const send = useDemoBridge(iframeRef, product.demo.origin, onBridge)

  // --- actions --------------------------------------------------------------------------------------
  const load = useCallback(() => {
    loadStarted.current = performance.now()
    reachable.current = probeDemo(product.demo.origin, FAIL_AFTER_MS)
    dispatch({ type: 'load' })
  }, [product.demo.origin])
  const changeDevice = useCallback(
    (device: DeviceKey) => {
      if (device === state.device) return
      track('preview_device_changed', { from: state.device, to: device })
      dispatch({ type: 'device', device })
    },
    [state.device],
  )
  const goToPage = useCallback(
    (path: string) => {
      dispatch({ type: 'navigate', path })
      setNavTarget(path)
      load()
    },
    [load],
  )
  const reload = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    load()
    iframe.src = `${product.demo.origin}${state.path}`
  }, [load, product.demo.origin, state.path])
  const toggleTheme = useCallback(() => {
    const next = demoTheme === 'dark' ? 'light' : 'dark'
    setDemoTheme(next)
    send({ type: 'set-theme', theme: next })
  }, [demoTheme, send])
  const openBuy = useCallback(() => {
    warm()
    track('preview_buy_clicked', {
      device: state.device,
      seconds_in_preview: Math.round((performance.now() - openedAt.current) / 1000),
    })
    setSelectorOpen(true)
  }, [state.device, warm])
  const close = useCallback(() => {
    if (onClose) onClose()
    else router.push(`/products/${product.slug}` as Route, { transitionTypes: ['nav-back'] } as never)
  }, [onClose, router, product.slug])

  usePreviewShortcuts(
    {
      '1': () => changeDevice('desktop'),
      '2': () => changeDevice('tablet'),
      '3': () => changeDevice('mobile'),
      '0': () => changeDevice('fit'),
      r: () => dispatch({ type: 'rotate' }),
      R: reload,
      t: product.demo.supportsTheme ? toggleTheme : undefined,
      o: () => window.open(demoUrl, '_blank', 'noopener'),
      b: openBuy,
      p: () => pageSelectRef.current?.focus(),
      Escape: mode === 'page' ? close : undefined, // the modal's Dialog handles Esc itself
    },
    !selectorOpen,
  )

  // Focus the heading when the player opens (SG §7.10).
  useEffect(() => {
    document.getElementById(headingId)?.focus({ preventScroll: true })
  }, [headingId])

  const onSettled = useCallback(() => setAnnouncement(frameAnnouncement(state.device, frame)), [state.device, frame])

  const purchase = (variant: 'toolbar' | 'bar') => (
    <BuyCta
      slug={product.slug}
      options={pricing.options}
      allAccess={pricing.allAccess}
      tier={tier}
      onTierChange={setTier}
      ownership={ownership}
      promo={promo}
      onBuy={openBuy}
      starting={false}
      variant={variant}
    />
  )

  const showing = state.status === 'ready' || state.status === 'loading' || state.status === 'slow'
  const activeComponent = playground.find((c) => state.path === `/c/${c.name}`)

  return (
    <div className="flex h-dvh flex-col bg-background" aria-labelledby={headingId}>
      <a
        href="#preview-buy"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:ring-2 focus:ring-ring"
      >
        Skip to buy
      </a>

      {/* Toolbar: desktop ≥ md; compact top bar below */}
      <div className="hidden md:block">
        <PreviewToolbar
          mode={mode}
          name={product.name}
          version={product.version}
          device={state.device}
          onDevice={changeDevice}
          rotated={state.rotated}
          onRotate={() => dispatch({ type: 'rotate' })}
          pages={product.demo.pages}
          path={state.path}
          onPage={goToPage}
          pageSelectRef={pageSelectRef}
          onReload={reload}
          demoUrl={demoUrl}
          supportsTheme={product.demo.supportsTheme}
          demoTheme={demoTheme}
          onTheme={toggleTheme}
          onClose={close}
          headingId={headingId}
          purchase={purchase('toolbar')}
        />
      </div>
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border glass-bar px-2 md:hidden">
        <Button variant="ghost" size="icon-sm" aria-label={mode === 'modal' ? 'Close preview' : 'Back'} onClick={close}>
          {mode === 'modal' ? <X aria-hidden /> : <ArrowLeft aria-hidden />}
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-body-sm font-semibold">{product.name}</h2>
        <Select value={state.device} onValueChange={(v) => changeDevice(v as DeviceKey)}>
          <SelectTrigger size="sm" aria-label="Device">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end" className="z-[75]">
            {DEVICE_KEYS.map((d) => (
              <SelectItem key={d} value={d}>
                {DEVICE_LABEL[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[75]">
            <DropdownMenuItem onSelect={reload}>
              <RefreshCw aria-hidden /> Reload demo
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={demoUrl} target="_blank" rel="noopener">
                <ExternalLink aria-hidden /> Open in new tab
              </a>
            </DropdownMenuItem>
            {product.demo.supportsTheme ? (
              <DropdownMenuItem onSelect={toggleTheme}>
                <Sun aria-hidden /> Toggle demo theme
              </DropdownMenuItem>
            ) : null}
            {product.demo.pages.map((p) => (
              <DropdownMenuItem key={p.path} onSelect={() => goToPage(p.path)}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-h-0 flex-1">
        {playground.length ? (
          <nav
            aria-label="Components"
            className="hidden w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-3 lg:flex"
          >
            <p className="px-2 pt-1 pb-2 eyebrow">Components</p>
            {playground.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => goToPage(`/c/${c.name}`)}
                aria-current={activeComponent?.name === c.name ? 'true' : undefined}
                className={cn(
                  'flex flex-col items-start rounded-md px-2 py-2 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  activeComponent?.name === c.name && 'bg-accent',
                )}
              >
                <span className="text-body-sm">{c.title}</span>
                {c.description ? <span className="text-micro text-muted-foreground">{c.description}</span> : null}
              </button>
            ))}
          </nav>
        ) : null}

        <div className="relative flex min-w-0 flex-1 flex-col">
          {activeComponent ? (
            <div
              className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-3"
              role="tablist"
              aria-label="Playground view"
            >
              {(['preview', 'code'] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-caption focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    view === v ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {v === 'preview' ? (
                    <MonitorPlay className="size-3.5" aria-hidden />
                  ) : (
                    <Code2 className="size-3.5" aria-hidden />
                  )}
                  {v === 'preview' ? 'Preview' : 'Code'}
                </button>
              ))}
            </div>
          ) : null}

          <div
            ref={stageRef}
            className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden stage-dots"
            style={{ padding: pad }}
          >
            <div className={cn('flex flex-col items-center gap-3', (!showing || view === 'code') && 'hidden')}>
              <div className="relative">
                <DeviceFrame
                  iframeRef={iframeRef}
                  device={state.device}
                  frame={frame}
                  src={src}
                  displayUrl={demoUrl.replace(/^https:\/\//, '')}
                  title={`Live preview of ${product.name}`}
                  visible={showing && view === 'preview'}
                  onLoad={() => {
                    if (iframeRef.current?.src === 'about:blank') return
                    // `load` also fires for the browser's own error page: trust it only once the
                    // demo host has answered (see probe.ts). The bridge `ready` bypasses this.
                    void (reachable.current ?? Promise.resolve(true)).then((ok) =>
                      dispatch(ok ? { type: 'ready' } : { type: 'fail', reason: 'network' }),
                    )
                  }}
                  onHide={() => dispatch({ type: 'hide' })}
                  onShow={load}
                  onSettled={onSettled}
                />
                {state.status === 'loading' || state.status === 'slow' ? (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-card"
                    aria-hidden
                  >
                    <Skeleton className="absolute inset-0 rounded-none opacity-60" />
                    <p className="relative font-mono text-micro text-muted-foreground">Loading live demo…</p>
                    {state.status === 'slow' ? (
                      <p className="relative max-w-[28ch] text-center text-caption text-muted-foreground">
                        Warming up the demo. First loads can take a few seconds.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <p className="font-mono text-micro text-muted-foreground tabular-nums">
                {frameLabel(state.device, frame)}
              </p>
            </div>

            {state.status === 'failed' ? (
              <PreviewFallback
                gallery={product.demo.gallery}
                device={state.device}
                demoUrl={demoUrl}
                onRetry={reload}
              />
            ) : null}

            {view === 'code' && activeComponent ? (
              <div className="flex h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto">
                {activeComponent.codeHtml ? (
                  <div
                    className="overflow-hidden rounded-xl border border-bento-border bg-card p-4"
                    dangerouslySetInnerHTML={{ __html: activeComponent.codeHtml }}
                  />
                ) : (
                  <p className="text-body-sm text-muted-foreground">
                    Source for this component installs from the registry.
                  </p>
                )}
                <p className="text-caption text-muted-foreground">
                  {activeComponent.truncated ? 'Showing the first 30 lines. ' : ''}Install the full component with{' '}
                  <code className="rounded-xs bg-muted px-1 font-mono">
                    npx shadcn@latest add @lumira/{activeComponent.name}
                  </code>{' '}
                  using your license key.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile buy bar: 64 px + safe area (SG §7.2) */}
      <div className="shrink-0 border-t border-border glass-bar pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16 items-center px-3">{purchase('bar')}</div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <LicenseSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        productSlug={product.slug}
        productName={product.name}
        options={pricing.options}
        allAccess={pricing.allAccess}
        ownership={ownership}
        promo={promo}
        defaultTier={tier}
        source="preview"
      />
    </div>
  )
}
