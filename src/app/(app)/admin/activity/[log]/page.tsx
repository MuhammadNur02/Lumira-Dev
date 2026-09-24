import { Suspense } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'
import { Download, TriangleAlert } from 'lucide-react'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { parseRange, type DateRange } from '@/lib/admin/range'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { downloadAnomalies, downloadLog, emailLog, licenseActivityLog, paymentLog } from '@/server/admin/queries'
import { ResendEmailButton } from '../../customers/[id]/quick-actions'

const LOGS = {
  downloads: {
    title: 'Downloads',
    description:
      'Every download attempt with channel and outcome. Anomaly: > 30 downloads or > 5 countries in 24 h (FR-AD-42).',
  },
  payments: {
    title: 'Payments',
    description: 'Failed, recovered and refunded payments with dunning status (FR-AD-43).',
  },
  licenses: {
    title: 'License activity',
    description: 'Activations, deactivations, validation failures and admin changes by source (FR-AD-44).',
  },
  emails: { title: 'Email log', description: 'Outbox status, bounces and complaints, with resend (FR-AD-45).' },
} as const

type Log = keyof typeof LOGS
type Params = Record<string, string | string[] | undefined>

export async function generateMetadata({ params }: PageProps<'/admin/activity/[log]'>) {
  const { log } = await params
  return { title: LOGS[log as Log]?.title ?? 'Activity' }
}

export default async function ActivityPage({ params, searchParams }: PageProps<'/admin/activity/[log]'>) {
  await requireAdmin()
  const [{ log }, sp] = await Promise.all([params, searchParams])
  if (!(log in LOGS)) notFound()
  const range = parseRange(sp)
  const meta = LOGS[log as Log]
  return (
    <>
      <AdminPageHeader
        title={meta.title}
        description={`${range.label} · ${meta.description}`}
        actions={
          log === 'downloads' ? (
            <Button asChild variant="outline" size="sm">
              <a href={`/admin/export/downloads?from=${range.from}&to=${range.to}`} download>
                <Download aria-hidden /> CSV
              </a>
            </Button>
          ) : null
        }
      />
      <Suspense
        key={`${log}-${JSON.stringify(sp)}`}
        fallback={<div className="h-[32rem] skeleton-shimmer rounded-3xl" />}
      >
        {log === 'downloads' ? <Downloads range={range} sp={sp} /> : null}
        {log === 'payments' ? <Payments range={range} /> : null}
        {log === 'licenses' ? <Licenses range={range} sp={sp} /> : null}
        {log === 'emails' ? <Emails range={range} sp={sp} /> : null}
      </Suspense>
    </>
  )
}

const str = (v: string | string[] | undefined) => (typeof v === 'string' && v.length <= 60 ? v : undefined)

function Filters({ name, options, current, sp }: { name: string; options: string[]; current?: string; sp: Params }) {
  const link = (value?: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === 'string'))
    if (value) q.set(name, value)
    else q.delete(name)
    return `?${q.toString()}` as Route
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Filter by ${name}`}>
      {[undefined, ...options].map((value) => (
        <Link
          key={value ?? 'all'}
          href={link(value)}
          aria-current={current === value ? 'true' : undefined}
          className="rounded-full border border-border px-2.5 py-0.5 text-caption capitalize hover:bg-accent aria-[current=true]:border-transparent aria-[current=true]:bg-primary aria-[current=true]:text-primary-foreground"
        >
          {value?.replace('_', ' ') ?? 'All'}
        </Link>
      ))}
    </div>
  )
}

function Empty() {
  return <p className="px-5 text-body-sm text-muted-foreground md:px-6">Nothing in this range.</p>
}

async function Downloads({ range, sp }: { range: DateRange; sp: Params }) {
  const channel = str(sp.channel)
  const status = str(sp.status)
  const [rows, anomalies] = await Promise.all([
    downloadLog(range.from, range.to, { channel, status, product: str(sp.product) }),
    downloadAnomalies(),
  ])
  const flagged = new Set(anomalies.map((a) => a.user_id))
  return (
    <Panel
      actions={
        <div className="flex flex-col gap-2">
          <Filters
            name="channel"
            options={['dashboard', 'success_page', 'email_link', 'admin']}
            current={channel}
            sp={sp}
          />
          <Filters name="status" options={['granted', 'denied', 'rate_limited']} current={status} sp={sp} />
        </div>
      }
      bodyClassName="-mx-5 md:-mx-6"
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">When</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="pr-5 md:pr-6">Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="h-11">
                  <TableCell className="pl-5 whitespace-nowrap tabular-nums md:pl-6">{formatDateTime(r.at)}</TableCell>
                  <TableCell>
                    {r.product} <span className="font-mono text-caption text-muted-foreground">v{r.version}</span>
                  </TableCell>
                  <TableCell>{r.channel.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'granted' ? 'success' : r.status === 'denied' ? 'danger' : 'warning'}>
                      {r.status.replace('_', ' ')}
                    </Badge>
                    {r.denyReason ? (
                      <span className="ml-1.5 text-caption text-muted-foreground">{r.denyReason}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-caption">{r.country ?? '—'}</TableCell>
                  <TableCell className="ph-no-capture pr-5 md:pr-6">
                    {r.userId ? (
                      <Link
                        href={`/admin/customers/${r.userId}` as Route}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        {r.email ?? r.userId}
                        {flagged.has(r.userId) ? (
                          <TriangleAlert aria-label="Anomaly" className="size-3.5 text-warning" />
                        ) : null}
                      </Link>
                    ) : (
                      (r.email ?? 'Guest')
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty />
      )}
    </Panel>
  )
}

async function Payments({ range }: { range: DateRange }) {
  const rows = await paymentLog(range.from, range.to)
  const LABEL = { payment_failed: 'Failed', payment_recovered: 'Recovered', payment_refunded: 'Refunded' } as const
  return (
    <Panel bodyClassName="-mx-5 md:-mx-6">
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Dunning</TableHead>
                <TableHead className="pr-5 md:pr-6">Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="h-11">
                  <TableCell className="pl-5 whitespace-nowrap tabular-nums md:pl-6">{formatDateTime(r.at)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.type === 'payment_failed' ? 'danger' : r.type === 'payment_recovered' ? 'success' : 'warning'
                      }
                    >
                      {LABEL[r.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.amount != null ? formatMoney(r.amount) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.attempt ?? '—'}</TableCell>
                  <TableCell className="text-caption">
                    {r.subscriptionStatus
                      ? `${r.subscriptionStatus.replace('_', ' ')}${r.renewsAt ? ` · next ${formatDate(r.renewsAt)}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell className="ph-no-capture pr-5 md:pr-6">
                    {r.userId ? (
                      <Link href={`/admin/customers/${r.userId}` as Route} className="hover:underline">
                        {r.email ?? r.userId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty />
      )}
    </Panel>
  )
}

async function Licenses({ range, sp }: { range: DateRange; sp: Params }) {
  const type = str(sp.type)
  const rows = await licenseActivityLog(range.from, range.to, type)
  return (
    <Panel
      actions={
        <Filters
          name="type"
          options={['activated', 'deactivated', 'validation_failed', 'revealed', 'limit_changed', 'disabled']}
          current={type}
          sp={sp}
        />
      }
      bodyClassName="-mx-5 md:-mx-6"
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Instance</TableHead>
                <TableHead>Source / actor</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="pr-5 md:pr-6">Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="h-11">
                  <TableCell className="pl-5 whitespace-nowrap tabular-nums md:pl-6">{formatDateTime(r.at)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.type === 'validation_failed' || r.type === 'disabled'
                          ? 'danger'
                          : r.type === 'activated'
                            ? 'success'
                            : 'neutral'
                      }
                    >
                      {r.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">••••{r.keyShort.slice(-4)}</TableCell>
                  <TableCell>{r.instance ?? '—'}</TableCell>
                  <TableCell>{r.source ?? r.actor}</TableCell>
                  <TableCell className="font-mono text-caption">{r.country ?? '—'}</TableCell>
                  <TableCell className="ph-no-capture pr-5 md:pr-6">
                    {r.userId ? (
                      <Link href={`/admin/customers/${r.userId}` as Route} className="hover:underline">
                        {r.email}
                      </Link>
                    ) : (
                      r.email
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty />
      )}
    </Panel>
  )
}

async function Emails({ range, sp }: { range: DateRange; sp: Params }) {
  const status = str(sp.status)
  const rows = await emailLog(range.from, range.to, status)
  return (
    <Panel
      actions={
        <Filters
          name="status"
          options={['pending', 'sent', 'delivered', 'failed', 'bounced', 'complained']}
          current={status}
          sp={sp}
        />
      }
      bodyClassName="-mx-5 md:-mx-6"
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">Created</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Last error</TableHead>
                <TableHead className="pr-5 md:pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="h-11">
                  <TableCell className="pl-5 whitespace-nowrap tabular-nums md:pl-6">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-caption">{r.template}</TableCell>
                  <TableCell className="ph-no-capture">{r.to}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'delivered' || r.status === 'sent'
                          ? 'success'
                          : r.status === 'pending'
                            ? 'neutral'
                            : 'danger'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.attempts}</TableCell>
                  <TableCell
                    className="max-w-64 truncate text-caption text-muted-foreground"
                    title={r.lastError ?? undefined}
                  >
                    {r.lastError ?? '—'}
                  </TableCell>
                  <TableCell className="pr-5 text-right md:pr-6">
                    {r.status !== 'pending' ? <ResendEmailButton emailId={r.id} template={r.template} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Empty />
      )}
    </Panel>
  )
}
