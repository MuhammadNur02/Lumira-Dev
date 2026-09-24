'use client'

import { ArrowLeft, ExternalLink, Keyboard, Moon, RefreshCw, RotateCw, Sun, X } from 'lucide-react'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { VersionPill } from '@/components/lumira/version-pill'
import { cn } from '@/lib/utils'
import type { DemoPage } from '@/lib/sanity/models'
import { DeviceToggle } from './device-toggle'
import type { DeviceKey } from './devices'
import { SHORTCUTS } from './use-preview-shortcuts'

const iconButton =
  'pressable inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function IconAction({
  label,
  shortcut,
  onClick,
  disabled,
  children,
}: {
  label: string
  shortcut?: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={iconButton}
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          aria-keyshortcuts={shortcut}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {label} {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  )
}

/** Desktop toolbar (SG §7.2, §7.5): identity · device controls · purchase (never shrinks). */
export function PreviewToolbar({
  mode,
  name,
  version,
  device,
  onDevice,
  rotated,
  onRotate,
  pages,
  path,
  onPage,
  pageSelectRef,
  onReload,
  demoUrl,
  supportsTheme,
  demoTheme,
  onTheme,
  onClose,
  headingId,
  purchase,
}: {
  mode: 'modal' | 'page'
  name: string
  version: string | null
  device: DeviceKey
  onDevice: (d: DeviceKey) => void
  rotated: boolean
  onRotate: () => void
  pages: DemoPage[]
  path: string
  onPage: (path: string) => void
  pageSelectRef: React.RefObject<HTMLButtonElement | null>
  onReload: () => void
  demoUrl: string
  supportsTheme: boolean
  demoTheme: 'light' | 'dark'
  onTheme: () => void
  onClose: () => void
  headingId: string
  purchase: React.ReactNode
}) {
  const known = pages.some((p) => p.path === path)
  return (
    <div className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border glass-bar px-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          className={iconButton}
          onClick={onClose}
          aria-label={mode === 'modal' ? 'Close preview' : `Back to ${name}`}
          aria-keyshortcuts="Escape"
        >
          {mode === 'modal' ? (
            <X className="size-[18px]" aria-hidden />
          ) : (
            <ArrowLeft className="size-[18px]" aria-hidden />
          )}
        </button>
        <h2 id={headingId} tabIndex={-1} className="truncate text-body-sm font-semibold outline-none">
          {name}
        </h2>
        {version ? <VersionPill version={version} className="hidden sm:inline-flex" /> : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <DeviceToggle value={device} onChange={onDevice} />
        <IconAction
          label="Rotate"
          shortcut="R"
          onClick={onRotate}
          disabled={device !== 'tablet' && device !== 'mobile'}
        >
          <RotateCw
            className={cn(
              'size-4 transition-transform duration-(--spring-snappy-duration) ease-spring-snappy',
              rotated && 'rotate-90',
            )}
            aria-hidden
          />
        </IconAction>
        {pages.length > 1 ? (
          <Select value={known ? path : '__current'} onValueChange={(v) => v !== '__current' && onPage(v)}>
            <SelectTrigger
              ref={pageSelectRef}
              size="sm"
              aria-label="Demo page"
              aria-keyshortcuts="p"
              className="hidden max-w-44 lg:flex"
            >
              <SelectValue>
                <span className="truncate font-mono text-micro">{path}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="z-[75]">
              {!known ? <SelectItem value="__current">{path}</SelectItem> : null}
              {pages.map((p) => (
                <SelectItem key={p.path} value={p.path}>
                  {p.label} <span className="font-mono text-micro text-muted-foreground">{p.path}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <IconAction label="Reload demo" shortcut="Shift+R" onClick={onReload}>
          <RefreshCw className="size-4" aria-hidden />
        </IconAction>
        {supportsTheme ? (
          <IconAction
            label={`Show demo in ${demoTheme === 'dark' ? 'light' : 'dark'} theme`}
            shortcut="T"
            onClick={onTheme}
          >
            {demoTheme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
          </IconAction>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener"
              className={iconButton}
              aria-label="Open demo in new tab"
              aria-keyshortcuts="o"
            >
              <ExternalLink className="size-4" aria-hidden />
            </a>
          </TooltipTrigger>
          <TooltipContent>
            Open in new tab <Kbd>O</Kbd>
          </TooltipContent>
        </Tooltip>
        <Popover>
          <PopoverTrigger
            className={cn(iconButton, 'hidden lg:inline-flex')}
            aria-label="Keyboard shortcuts"
            aria-keyshortcuts="?"
          >
            <Keyboard className="size-4" aria-hidden />
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[75] w-64">
            <p className="text-caption font-medium">Keyboard shortcuts</p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-caption">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="contents">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd>
                    <KbdGroup>
                      {s.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </KbdGroup>
                  </dd>
                </div>
              ))}
            </dl>
          </PopoverContent>
        </Popover>
      </div>

      <div id="preview-buy" className="flex min-w-0 flex-1 shrink-0 justify-end">
        {purchase}
      </div>
    </div>
  )
}
