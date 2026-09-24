import { Suspense } from 'react'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { CopyButton } from '@/components/lumira/copy-button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { env } from '@/lib/env'
import { formatDate, formatMoney, TIER_LABEL } from '@/lib/format'
import { getSiteSettings } from '@/lib/sanity/fetchers'
import { discountList, variantOptions } from '@/server/admin/queries'
import { BannerButton, DeleteDiscountButton } from './discount-actions'
import { DiscountDialog, type VariantOption } from './discount-form'

export const metadata = { title: 'Discounts' }

export default async function DiscountsPage() {
  await requireAdmin()
  const variants: VariantOption[] = (await variantOptions()).map((v) => ({
    id: v.id,
    label: v.tier === 'all_access' ? `All-Access (${v.id})` : `${v.name ?? 'Bundle'} · ${TIER_LABEL[v.tier]}`,
  }))
  return (
    <>
      <AdminPageHeader
        title="Discounts"
        description="Codes live in Lemon Squeezy and are mirrored here. Upgrade codes (F-06) are issued automatically and hidden from this list."
        actions={<DiscountDialog variants={variants} />}
      />
      <Suspense fallback={<div className="h-96 skeleton-shimmer rounded-3xl" />}>
        <DiscountTable variants={variants} />
      </Suspense>
    </>
  )
}

async function DiscountTable({ variants }: { variants: VariantOption[] }) {
  const [rows, settings] = await Promise.all([discountList(), getSiteSettings()])
  const bannerCode = settings.promoBanner?.enabled ? settings.promoBanner.code : null
  const label = new Map(variants.map((v) => [v.id, v.label]))

  return (
    <Panel bodyClassName="-mx-5 md:-mx-6">
      {rows.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">Code</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Redemptions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Discount given</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right md:pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => {
                const expired = d.expired
                const exhausted = d.max_redemptions != null && d.redemptions >= d.max_redemptions
                const shareUrl = `${env.NEXT_PUBLIC_APP_URL}/?code=${d.code}`
                return (
                  <TableRow key={d.id} className="h-11">
                    <TableCell className="pl-5 md:pl-6">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{d.code}</span>
                        <span className="text-caption text-muted-foreground">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {d.amount_type === 'percent' ? `${d.amount}%` : formatMoney(d.amount)}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-body-sm">
                      {d.variant_ids.length
                        ? d.variant_ids.map((id) => label.get(Number(id)) ?? id).join(', ')
                        : 'All products'}
                    </TableCell>
                    <TableCell className="capitalize">{d.duration ?? 'once'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.redemptions}
                      {d.max_redemptions ? ` / ${d.max_redemptions}` : ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(d.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(d.discount_given)}</TableCell>
                    <TableCell className="text-caption whitespace-nowrap text-muted-foreground">
                      {d.starts_at ? formatDate(d.starts_at) : 'Now'} →{' '}
                      {d.expires_at ? formatDate(d.expires_at) : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {expired ? (
                          <Badge variant="neutral">Expired</Badge>
                        ) : exhausted ? (
                          <Badge variant="warning">Used up</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                        {d.test_mode ? <Badge variant="outline">Test</Badge> : null}
                        {bannerCode === d.code ? <Badge variant="brand">Banner</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="pr-5 md:pr-6">
                      <div className="flex justify-end gap-0.5">
                        <CopyButton
                          value={shareUrl}
                          label={`Copy share link for ${d.code}`}
                          copiedLabel="Share link copied"
                        />
                        <BannerButton code={d.code} active={bannerCode === d.code} />
                        <DiscountDialog
                          variants={variants}
                          initial={{
                            id: d.id,
                            name: d.name,
                            code: d.code,
                            amountType: d.amount_type,
                            amount: d.amount,
                            variantIds: d.variant_ids.map(Number),
                            maxRedemptions: d.max_redemptions ?? undefined,
                            startsAt: d.starts_at ? new Date(d.starts_at) : undefined,
                            expiresAt: d.expires_at ? new Date(d.expires_at) : undefined,
                            duration: (d.duration as 'once' | 'repeating' | 'forever' | null) ?? 'once',
                          }}
                        />
                        <DeleteDiscountButton id={d.id} code={d.code} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 text-body-sm text-muted-foreground md:px-6">
          No discount codes yet. Create one to share a launch or partner offer.
        </p>
      )}
    </Panel>
  )
}
