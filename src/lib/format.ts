// Formatting helpers. Prices are integer cents in USD (the store currency, FR-SF-09).

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** `$249` for whole dollars, `$249.50` otherwise. */
export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100)
}

/** Always two decimals, for receipts and tables. */
export const formatMoney = (cents: number) => usd.format(cents / 100)

/** 1,284 · 12.9K · $4.2M (SG §5.11 auto-compact). */
export function formatCompact(value: number, opts: { currency?: boolean } = {}): string {
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
    ...(opts.currency ? { style: 'currency', currency: 'USD' } : {}),
  }).format(value)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const DIVISIONS: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
]

/** "3 days ago", relative to `now` (pass it explicitly from cached components). */
export function formatRelative(date: string | Date, now: Date = new Date()): string {
  let duration = (new Date(date).getTime() - now.getTime()) / 1000
  for (const [amount, unit] of DIVISIONS) {
    if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit)
    duration /= amount
  }
  return rtf.format(Math.round(duration), 'year')
}

const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' })
const dateTimeFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
})

export const formatDate = (d: string | Date) => dateFmt.format(new Date(d))
export const formatMonth = (d: string | Date) => monthFmt.format(new Date(d))
export const formatDateTime = (d: string | Date) => dateTimeFmt.format(new Date(d))

/** Changelog anchors: `saas-starter-v2-3-0` (FR-CL-02). */
export const releaseAnchor = (productSlug: string, version: string) => `${productSlug}-v${version.replaceAll('.', '-')}`

export const TIER_LABEL = {
  personal: 'Personal',
  team: 'Team',
  extended: 'Extended',
  all_access: 'All-Access',
} as const
export const LINE_LABEL = { boilerplate: 'Boilerplate', ui_kit: 'UI Kit', template: 'Template' } as const
export const LINE_PATH = { boilerplate: '/boilerplates', ui_kit: '/ui-kits', template: '/templates' } as const

/** "Updated 3 days ago" freshness label (FR-SF-05, FR-CL-05). */
export function freshness(latest: { releasedAt: string } | null, createdAt: string, now: Date = new Date()): string {
  return latest ? `Updated ${formatRelative(latest.releasedAt, now)}` : `Added ${formatRelative(createdAt, now)}`
}
