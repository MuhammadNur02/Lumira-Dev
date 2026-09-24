/**
 * Admin date range (FR-AD-02, SG §5.11): presets or a custom `from`/`to`, persisted in the URL.
 * Dates are UTC calendar days, inclusive. The previous period has the same length and ends the day
 * before `from`, for "vs previous period" deltas.
 */
export const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '12m', label: '12 months' },
  { id: 'mtd', label: 'Month to date' },
] as const

export type PresetId = (typeof PRESETS)[number]['id']
export type DateRange = {
  preset: PresetId | 'custom'
  from: string
  to: string
  days: number
  prevFrom: string
  prevTo: string
  label: string
}

const DAY = 86_400_000
const iso = (d: Date) => d.toISOString().slice(0, 10)
const utcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
const isDay = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

export function parseRange(params: Record<string, string | string[] | undefined>, now: Date = new Date()): DateRange {
  const today = utcDay(now)
  let from: Date
  let to = today
  let preset: DateRange['preset'] = '30d'

  if (isDay(params.from) && isDay(params.to) && params.from <= params.to) {
    preset = 'custom'
    from = new Date(params.from)
    to = new Date(params.to)
  } else {
    const requested = PRESETS.find((p) => p.id === params.preset)?.id ?? '30d'
    preset = requested
    switch (requested) {
      case 'today':
        from = today
        break
      case '7d':
        from = new Date(today.getTime() - 6 * DAY)
        break
      case '90d':
        from = new Date(today.getTime() - 89 * DAY)
        break
      case '12m':
        from = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), today.getUTCDate() + 1))
        break
      case 'mtd':
        from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
        break
      default:
        from = new Date(today.getTime() - 29 * DAY)
    }
  }
  const days = Math.round((to.getTime() - from.getTime()) / DAY) + 1
  const prevTo = new Date(from.getTime() - DAY)
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * DAY)
  const label = preset === 'custom' ? `${iso(from)} → ${iso(to)}` : PRESETS.find((p) => p.id === preset)!.label
  return { preset, from: iso(from), to: iso(to), days, prevFrom: iso(prevFrom), prevTo: iso(prevTo), label }
}

/** Query string that keeps the current range when linking between admin pages. */
export function rangeQuery(range: Pick<DateRange, 'preset' | 'from' | 'to'>): string {
  return range.preset === 'custom'
    ? `?from=${range.from}&to=${range.to}`
    : range.preset === '30d'
      ? ''
      : `?preset=${range.preset}`
}

/** Bucket for charts: day up to 92 days, then week, then month. */
export const bucketFor = (days: number): 'day' | 'week' | 'month' =>
  days <= 92 ? 'day' : days <= 400 ? 'week' : 'month'
