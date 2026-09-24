import { Suspense } from 'react'
import { Download } from 'lucide-react'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requireAdmin } from '@/lib/auth'
import { parseRange, type DateRange } from '@/lib/admin/range'
import { formatDateTime } from '@/lib/format'
import { auditList } from '@/server/admin/queries'

export const metadata = { title: 'Audit log' }

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v.slice(0, 120) : undefined)

export default async function AuditPage({ searchParams }: PageProps<'/admin/audit'>) {
  await requireAdmin()
  const sp = await searchParams
  const range = parseRange(sp)
  const filters = { actor: str(sp.actor), action: str(sp.action), target: str(sp.target) }
  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="Append-only at the database level: the runtime role cannot update or delete rows (FR-AD-47)."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/export/audit?from=${range.from}&to=${range.to}`} download>
              <Download aria-hidden /> CSV
            </a>
          </Button>
        }
      />
      <form className="grid gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]" role="search">
        {range.preset === 'custom' ? (
          <>
            <input type="hidden" name="from" value={range.from} />
            <input type="hidden" name="to" value={range.to} />
          </>
        ) : (
          <input type="hidden" name="preset" value={range.preset} />
        )}
        <Input name="actor" defaultValue={filters.actor} placeholder="Actor email" aria-label="Actor email" />
        <Input
          name="action"
          defaultValue={filters.action}
          placeholder="Action prefix, e.g. discount."
          aria-label="Action"
        />
        <Input name="target" defaultValue={filters.target} placeholder="Target id" aria-label="Target id" />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      <Suspense key={JSON.stringify(sp)} fallback={<div className="h-[32rem] skeleton-shimmer rounded-3xl" />}>
        <Entries range={range} filters={filters} />
      </Suspense>
    </>
  )
}

async function Entries({
  range,
  filters,
}: {
  range: DateRange
  filters: { actor?: string; action?: string; target?: string }
}) {
  const rows = await auditList(range.from, range.to, filters)
  return (
    <Panel description={`${rows.length} entries · ${range.label}`}>
      {rows.length ? (
        <ol className="flex flex-col divide-y divide-border">
          {rows.map(({ entry, actorEmail }) => (
            <li key={entry.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-body-sm">
                <span>
                  <span className="font-mono font-medium">{entry.action}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {entry.targetType} <span className="font-mono">{entry.targetId}</span>
                  </span>
                </span>
                <span className="text-caption text-muted-foreground tabular-nums">
                  {formatDateTime(entry.createdAt)} · <span className="ph-no-capture">{actorEmail}</span>
                </span>
              </div>
              {entry.reason ? <p className="text-body-sm">“{entry.reason}”</p> : null}
              {entry.before != null || entry.after != null ? (
                <details className="group rounded-lg border border-border">
                  <summary className="cursor-pointer px-3 py-1.5 text-caption text-muted-foreground hover:text-foreground">
                    Before / after
                  </summary>
                  <div className="grid gap-px border-t border-border bg-border md:grid-cols-2">
                    <pre className="ph-no-capture max-h-72 overflow-auto bg-card p-3 font-mono text-micro">
                      {JSON.stringify(entry.before, null, 2) ?? 'null'}
                    </pre>
                    <pre className="ph-no-capture max-h-72 overflow-auto bg-card p-3 font-mono text-micro">
                      {JSON.stringify(entry.after, null, 2) ?? 'null'}
                    </pre>
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-body-sm text-muted-foreground">No admin actions match.</p>
      )}
    </Panel>
  )
}
