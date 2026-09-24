import { Suspense } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Download, Search } from 'lucide-react'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatMoney } from '@/lib/format'
import { customerList, downloadAnomalies } from '@/server/admin/queries'

export const metadata = { title: 'Customers' }

export default async function CustomersPage({ searchParams }: PageProps<'/admin/customers'>) {
  await requireAdmin()
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.slice(0, 200) : undefined
  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Search by email or name. Order numbers and full license keys work in ⌘K."
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/export/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`} download>
              <Download aria-hidden /> CSV
            </a>
          </Button>
        }
      />
      <form className="flex max-w-lg gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Email or name"
          aria-label="Search customers"
          className="ph-no-capture"
        />
        <Button type="submit" variant="secondary">
          <Search aria-hidden /> Search
        </Button>
      </form>
      <Suspense key={q} fallback={<div className="h-96 skeleton-shimmer rounded-3xl" />}>
        <CustomerTable q={q} />
      </Suspense>
    </>
  )
}

async function CustomerTable({ q }: { q?: string }) {
  const [rows, anomalies] = await Promise.all([customerList(q), downloadAnomalies()])
  const flagged = new Set(anomalies.map((a) => a.user_id))
  return (
    <Panel bodyClassName="-mx-5 md:-mx-6">
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">Customer</TableHead>
                <TableHead className="text-right">LTV (net)</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="pr-5 md:pr-6">Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className="h-11">
                  <TableCell className="ph-no-capture pl-5 md:pl-6">
                    <Link
                      href={`/admin/customers/${c.id}` as Route}
                      className="flex flex-col hover:underline hover:underline-offset-4"
                    >
                      <span className="font-medium">{c.name ?? c.email}</span>
                      {c.name ? <span className="text-caption text-muted-foreground">{c.email}</span> : null}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(c.ltv)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.orders}</TableCell>
                  <TableCell className="capitalize">{c.subscription?.replace('_', ' ') ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.last_activity ? formatDate(c.last_activity) : '—'}
                  </TableCell>
                  <TableCell className="pr-5 md:pr-6">
                    <div className="flex gap-1">
                      {c.bounced ? <Badge variant="danger">Bounced</Badge> : null}
                      {flagged.has(c.id) ? <Badge variant="warning">Anomaly</Badge> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 text-body-sm text-muted-foreground md:px-6">
          {q ? `No customers match “${q}”.` : 'No customers yet.'}
        </p>
      )}
    </Panel>
  )
}
