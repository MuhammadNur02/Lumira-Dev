import { Suspense } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { VersionPill } from '@/components/lumira/version-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { env } from '@/lib/env'
import { formatMoney, LINE_LABEL } from '@/lib/format'
import { productStats } from '@/server/admin/queries'
import { SyncPricesButton } from './product-actions'

export const metadata = { title: 'Products & releases' }

export default async function ProductsPage() {
  await requireAdmin()
  return (
    <>
      <AdminPageHeader
        title="Products & releases"
        description="Content lives in Sanity; prices come from Lemon Squeezy; release files live in private R2. Stats cover the last 30 days."
        actions={
          <>
            <SyncPricesButton />
            <Button asChild variant="ghost" size="sm">
              <a href={`${env.SANITY_STUDIO_URL}/structure/product`} target="_blank" rel="noopener noreferrer">
                Open Studio <ArrowUpRight aria-hidden />
              </a>
            </Button>
          </>
        }
      />
      <Suspense fallback={<div className="h-96 skeleton-shimmer rounded-3xl" />}>
        <ProductTable />
      </Suspense>
    </>
  )
}

async function ProductTable() {
  const rows = await productStats()
  return (
    <Panel bodyClassName="-mx-5 md:-mx-6">
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">Product</TableHead>
                <TableHead>Latest</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Activation rate</TableHead>
                <TableHead className="pr-5 md:pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="h-11">
                  <TableCell className="pl-5 md:pl-6">
                    <Link
                      href={`/admin/products/${encodeURIComponent(p.id)}` as Route}
                      className="flex flex-col hover:underline hover:underline-offset-4"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-caption text-muted-foreground">
                        {LINE_LABEL[p.line as keyof typeof LINE_LABEL] ?? p.line}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {p.latest ? <VersionPill version={p.latest} /> : <span className="text-muted-foreground">—</span>}
                      {p.drafts ? <Badge variant="info">{p.drafts} draft</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.downloads_30d.toLocaleString('en-US')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(p.revenue_30d)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.keys ? `${((p.activated_keys / p.keys) * 100).toFixed(0)}%` : '—'}
                  </TableCell>
                  <TableCell className="pr-5 md:pr-6">
                    <Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'On sale' : 'Unpublished'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 text-body-sm text-muted-foreground md:px-6">
          No products mirrored yet. Publish a product in the Studio; the Sanity webhook mirrors it here.
        </p>
      )}
    </Panel>
  )
}
