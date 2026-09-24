import { Suspense } from 'react'
import { desc, eq, inArray } from 'drizzle-orm'
import { ArrowUpRight, CircleCheck, CircleX, Clock, Receipt, RotateCcw } from 'lucide-react'
import { db } from '@/db/client'
import { orderItems, orders, products, variants } from '@/db/schema'
import { AccountCard, AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireUser } from '@/lib/auth'
import { formatDate, formatMoney, TIER_LABEL } from '@/lib/format'

export const metadata = { title: 'Orders' }

const STATUS = {
  paid: { label: 'Paid', variant: 'success', icon: CircleCheck },
  pending: { label: 'Pending', variant: 'neutral', icon: Clock },
  failed: { label: 'Failed', variant: 'danger', icon: CircleX },
  refunded: { label: 'Refunded', variant: 'warning', icon: RotateCcw },
  partial_refund: { label: 'Partially refunded', variant: 'warning', icon: RotateCcw },
} as const

export default function OrdersPage() {
  return (
    <>
      <AccountPageHeader
        title="Orders"
        description="Payments, tax and invoicing are handled by Lemon Squeezy, our Merchant of Record. Invoices open on Lemon Squeezy."
      />
      <Suspense fallback={<AccountSkeleton rows={1} tall />}>
        <OrdersTable />
      </Suspense>
    </>
  )
}

async function OrdersTable() {
  const { userId } = await requireUser()
  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(200)
  if (!list.length) {
    return (
      <Empty className="bento-surface py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt aria-hidden strokeWidth={1.5} />
          </EmptyMedia>
          <EmptyTitle>No orders yet</EmptyTitle>
          <EmptyDescription>Your purchases and invoices will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const items = await db
    .select({ orderId: orderItems.orderId, tier: variants.tier, name: products.name })
    .from(orderItems)
    .innerJoin(variants, eq(variants.lsVariantId, orderItems.lsVariantId))
    .leftJoin(products, eq(products.id, variants.productId))
    .where(
      inArray(
        orderItems.orderId,
        list.map((o) => o.id),
      ),
    )

  return (
    <AccountCard className="px-0 py-2 md:px-0 md:py-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5 md:pl-6">Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="min-w-[14rem]">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right md:pr-6">
                <span className="sr-only">Invoice</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((order) => {
              const status = STATUS[order.status]
              const Icon = status.icon
              return (
                <TableRow key={order.id}>
                  <TableCell className="pl-5 font-mono tabular-nums md:pl-6">#{order.orderNumber}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    {items
                      .filter((i) => i.orderId === order.id)
                      .map((i) =>
                        i.tier === 'all_access' ? 'All-Access' : `${i.name ?? 'Bundle'} · ${TIER_LABEL[i.tier]}`,
                      )
                      .join(', ') || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(order.totalUsd)}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>
                      <Icon aria-hidden /> {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right md:pr-6">
                    {order.receiptUrl ? (
                      <Button asChild variant="ghost" size="sm">
                        <a href={order.receiptUrl} target="_blank" rel="noopener noreferrer">
                          Invoice <ArrowUpRight aria-hidden />
                          <span className="sr-only"> for order #{order.orderNumber} (opens Lemon Squeezy)</span>
                        </a>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </AccountCard>
  )
}
