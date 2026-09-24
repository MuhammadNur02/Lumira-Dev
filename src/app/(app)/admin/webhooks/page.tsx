import { Suspense } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { webhookList } from '@/server/admin/queries'
import { ReplayButton } from './replay-button'

export const metadata = { title: 'Webhooks' }

const SOURCES = ['lemonsqueezy', 'clerk', 'sanity', 'resend'] as const
const STATUSES = ['received', 'processed', 'failed', 'ignored'] as const
const TONE = { processed: 'success', failed: 'danger', received: 'info', ignored: 'neutral' } as const

export default async function WebhooksPage({ searchParams }: PageProps<'/admin/webhooks'>) {
  await requireAdmin()
  const sp = await searchParams
  const source = SOURCES.find((s) => s === sp.source)
  const status = STATUSES.find((s) => s === sp.status)
  const href = (next: { source?: string; status?: string }) => {
    const q = new URLSearchParams()
    const s = 'source' in next ? next.source : source
    const st = 'status' in next ? next.status : status
    if (s) q.set('source', s)
    if (st) q.set('status', st)
    return `/admin/webhooks${q.size ? `?${q}` : ''}` as Route
  }
  const chip =
    'rounded-full border border-border px-2.5 py-0.5 text-caption hover:bg-accent aria-[current=true]:border-transparent aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground'

  return (
    <>
      <AdminPageHeader
        title="Webhooks"
        description="Last 500 deliveries per filter. Every stored event passed signature verification; secrets are redacted before storage. Replay re-runs the idempotent handler."
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Source">
          <Link href={href({ source: undefined })} className={chip} aria-current={!source ? 'true' : undefined}>
            All sources
          </Link>
          {SOURCES.map((s) => (
            <Link key={s} href={href({ source: s })} className={chip} aria-current={source === s ? 'true' : undefined}>
              {s}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
          <Link href={href({ status: undefined })} className={chip} aria-current={!status ? 'true' : undefined}>
            All statuses
          </Link>
          {STATUSES.map((s) => (
            <Link key={s} href={href({ status: s })} className={chip} aria-current={status === s ? 'true' : undefined}>
              {s}
            </Link>
          ))}
        </div>
      </div>
      <Suspense key={`${source}-${status}`} fallback={<div className="h-[32rem] skeleton-shimmer rounded-3xl" />}>
        <List source={source} status={status} />
      </Suspense>
    </>
  )
}

async function List({ source, status }: { source?: string; status?: string }) {
  const rows = await webhookList(source, status)
  return (
    <Panel bodyClassName="-mx-5 md:-mx-6">
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">Received</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="pr-5 md:pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w.id} className="h-11">
                  <TableCell className="pl-5 whitespace-nowrap tabular-nums md:pl-6">
                    <Link href={`/admin/webhooks/${w.id}` as Route} className="hover:underline">
                      {formatDateTime(w.receivedAt)}
                    </Link>
                  </TableCell>
                  <TableCell>{w.source}</TableCell>
                  <TableCell className="font-mono text-caption">{w.eventName}</TableCell>
                  <TableCell>
                    <Badge variant={TONE[w.status]}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{w.attempts}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {w.durationMs != null ? `${w.durationMs} ms` : '—'}
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-caption text-destructive" title={w.error ?? undefined}>
                    {w.error ?? ''}
                  </TableCell>
                  <TableCell className="pr-5 text-right md:pr-6">
                    {w.status === 'failed' ? <ReplayButton id={w.id} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 text-body-sm text-muted-foreground md:px-6">No deliveries match.</p>
      )}
    </Panel>
  )
}
