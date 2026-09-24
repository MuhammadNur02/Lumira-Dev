import { Suspense } from 'react'
import { desc, eq } from 'drizzle-orm'
import { Download } from 'lucide-react'
import { db } from '@/db/client'
import { downloadEvents, products, releases } from '@/db/schema'
import { AccountCard, AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { VersionPill } from '@/components/lumira/version-pill'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'Downloads' }

const CHANNEL = { dashboard: 'Library', success_page: 'Checkout', email_link: 'Email link', admin: 'Support' } as const
const STATUS = {
  granted: { label: 'Downloaded', variant: 'success' },
  denied: { label: 'Denied', variant: 'danger' },
  rate_limited: { label: 'Rate limited', variant: 'warning' },
} as const

export default function DownloadsPage() {
  return (
    <>
      <AccountPageHeader
        title="Downloads"
        description="Your last 100 downloads across the Library, checkout and email links."
      />
      <Suspense fallback={<AccountSkeleton rows={1} tall />}>
        <DownloadsTable />
      </Suspense>
    </>
  )
}

async function DownloadsTable() {
  const { userId } = await requireUser()
  const rows = await db
    .select({
      id: downloadEvents.id,
      at: downloadEvents.createdAt,
      channel: downloadEvents.channel,
      status: downloadEvents.status,
      country: downloadEvents.country,
      version: releases.semver,
      product: products.name,
    })
    .from(downloadEvents)
    .innerJoin(releases, eq(releases.id, downloadEvents.releaseId))
    .innerJoin(products, eq(products.id, releases.productId))
    .where(eq(downloadEvents.userId, userId))
    .orderBy(desc(downloadEvents.createdAt))
    .limit(100)

  if (!rows.length) {
    return (
      <Empty className="bento-surface py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Download aria-hidden strokeWidth={1.5} />
          </EmptyMedia>
          <EmptyTitle>No downloads yet</EmptyTitle>
          <EmptyDescription>Download a release from your Library and it shows up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <AccountCard className="px-0 py-2 md:px-0 md:py-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5 md:pl-6">Asset</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="pr-5 md:pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5 font-medium md:pl-6">{row.product}</TableCell>
                <TableCell>
                  <VersionPill version={row.version} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatDateTime(row.at)}
                </TableCell>
                <TableCell>{CHANNEL[row.channel]}</TableCell>
                <TableCell className="font-mono text-caption">{row.country ?? '—'}</TableCell>
                <TableCell className="pr-5 md:pr-6">
                  <Badge variant={STATUS[row.status].variant}>{STATUS[row.status].label}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AccountCard>
  )
}
