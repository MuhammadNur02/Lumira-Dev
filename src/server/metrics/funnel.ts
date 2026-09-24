import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { env } from '@/lib/env'

export type Step = { name: string; count: number }

async function query<T>(body: unknown): Promise<T> {
  const res = await fetch(`${env.POSTHOG_API_HOST}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status}`)
  return (await res.json()) as T
}

/** FR-AD-20: ordered funnel through the PostHog Query API (server-side only, cached 15 min). */
export async function posthogFunnel(
  events: string[],
  dateFrom: string,
  dateTo: string,
  breakdown?: 'product_slug' | 'utm_source',
): Promise<Step[] | null> {
  'use cache'
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 })
  cacheTag('admin-funnel')
  try {
    const json = await query<{ results: Step[] | Step[][] }>({
      query: {
        kind: 'FunnelsQuery',
        series: events.map((event) => ({ kind: 'EventsNode', event })),
        dateRange: { date_from: dateFrom, date_to: dateTo },
        funnelsFilter: { funnelWindowInterval: 7, funnelWindowIntervalUnit: 'day', funnelOrderType: 'ordered' },
        ...(breakdown ? { breakdownFilter: { breakdown, breakdown_type: 'event' } } : {}),
      },
    })
    const first = Array.isArray(json.results[0]) ? (json.results[0] as Step[]) : (json.results as Step[])
    return first.map(({ name, count }) => ({ name, count }))
  } catch {
    return null // "data unavailable" state
  }
}

/** Unique visitors (persons with `$pageview`) for the conversion rate (PRD §8.1). */
export async function uniqueVisitors(dateFrom: string, dateTo: string): Promise<number | null> {
  'use cache'
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 })
  cacheTag('admin-funnel')
  const DAY = /^\d{4}-\d{2}-\d{2}$/ // interpolated into HogQL below, so only plain dates pass
  if (!DAY.test(dateFrom) || !DAY.test(dateTo)) return null
  try {
    const json = await query<{ results: [[number]] }>({
      query: {
        kind: 'HogQLQuery',
        query: `select count(distinct person_id) from events where event = '$pageview' and timestamp >= toDateTime('${dateFrom} 00:00:00') and timestamp < toDateTime('${dateTo} 00:00:00') + interval 1 day`,
      },
    })
    return Number(json.results[0]?.[0] ?? 0)
  } catch {
    return null
  }
}

export const PURCHASE_FUNNEL = ['$pageview', 'product_viewed', 'checkout_started', 'purchase_completed']
export const PURCHASE_LABELS = ['Sessions', 'PDP views', 'Checkout started', 'Purchase']
export const PREVIEW_FUNNEL = ['product_viewed', 'preview_opened', 'preview_buy_clicked']
export const PREVIEW_LABELS = ['PDP views', 'Preview opens', 'Preview buy clicks']
