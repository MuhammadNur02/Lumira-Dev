import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { LicenseStatusBadge } from '@/components/lumira/license-key'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { db } from '@/db/client'
import { products } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { formatDate, formatDateTime, formatMoney, TIER_LABEL } from '@/lib/format'
import { customerDetail, customerTimeline, type TimelineItem } from '@/server/admin/queries'
import { ActivationLimitDialog, GrantCompDialog, ResendEmailButton, RevokeEntitlementButton } from './quick-actions'

export const metadata = { title: 'Customer' }

export default async function CustomerPage({ params }: PageProps<'/admin/customers/[id]'>) {
  await requireAdmin()
  const { id } = await params
  const detail = await customerDetail(decodeURIComponent(id))
  if (!detail) notFound()
  const { user } = detail
  const catalog = await db.select({ id: products.id, name: products.name }).from(products).orderBy(products.name)

  return (
    <>
      <AdminPageHeader
        title={user.name ?? user.email}
        description={
          <span className="ph-no-capture">
            {user.email} · customer since {formatDate(user.createdAt)} · LTV {formatMoney(detail.ltv)}
            {user.deletedAt ? ' · account deleted' : ''}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user.emailBouncedAt ? <Badge variant="danger">Email bounced</Badge> : null}
            {detail.anomalous ? <Badge variant="warning">Download anomaly</Badge> : null}
            <GrantCompDialog userId={user.id} products={catalog} />
          </div>
        }
      />
      <div className="grid gap-(--bento-gap) xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex min-w-0 flex-col gap-(--bento-gap)">
          <Panel title="Entitlements" bodyClassName="-mx-5 md:-mx-6">
            {detail.entitlements.length ? (
              <Table>
                <TableBody>
                  {detail.entitlements.map(({ entitlement: e, productName }) => {
                    const label =
                      e.kind === 'all_access'
                        ? 'All-Access'
                        : `${productName ?? 'Product'} · ${TIER_LABEL[e.tier ?? 'personal']}`
                    return (
                      <TableRow key={e.id} className="h-11">
                        <TableCell className="pl-5 md:pl-6">
                          <div className="flex flex-col">
                            <span className="font-medium">{label}</span>
                            <span className="text-caption text-muted-foreground">
                              {e.kind}
                              {e.maxMajor != null ? ` · up to v${e.maxMajor}` : ''} · since {formatDate(e.validFrom)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.status === 'active' ? 'success' : e.status === 'suspended' ? 'warning' : 'neutral'
                            }
                          >
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-5 text-right md:pr-6">
                          {e.status !== 'revoked' ? <RevokeEntitlementButton id={e.id} label={label} /> : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 text-body-sm text-muted-foreground md:px-6">No entitlements.</p>
            )}
          </Panel>
          <Panel title="License keys" bodyClassName="-mx-5 md:-mx-6">
            {detail.keys.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5 md:pl-6">Key</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Activations</TableHead>
                    <TableHead className="pr-5 md:pr-6">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.keys.map((k) => (
                    <TableRow key={k.id} className="h-11">
                      <TableCell className="pl-5 font-mono md:pl-6">••••{k.keyShort.slice(-4)}</TableCell>
                      <TableCell>
                        <LicenseStatusBadge status={k.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {k.instancesCount} / {k.activationLimit ?? '∞'}
                      </TableCell>
                      <TableCell className="pr-5 text-right md:pr-6">
                        <ActivationLimitDialog keyId={k.id} current={k.activationLimit} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 text-body-sm text-muted-foreground md:px-6">No license keys.</p>
            )}
          </Panel>
          <Panel title="Subscriptions">
            {detail.subscriptions.length ? (
              <ul className="flex flex-col gap-2 text-body-sm">
                {detail.subscriptions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        s.status === 'active'
                          ? 'success'
                          : s.status === 'past_due' || s.status === 'unpaid'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {s.status.replace('_', ' ')}
                    </Badge>
                    <span>
                      {formatMoney(s.unitPriceUsd)} / {s.interval}
                    </span>
                    <span className="text-muted-foreground">
                      {s.renewsAt ? `renews ${formatDate(s.renewsAt)}` : s.endsAt ? `ends ${formatDate(s.endsAt)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-muted-foreground">No subscriptions.</p>
            )}
          </Panel>
        </div>
        <Suspense fallback={<div className="h-[40rem] skeleton-shimmer rounded-3xl" />}>
          <Timeline userId={user.id} email={user.email} />
        </Suspense>
      </div>
    </>
  )
}

const KIND_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  order: 'success',
  refund: 'warning',
  payment_payment_failed: 'danger',
  payment_payment_recovered: 'success',
  payment_payment_refunded: 'warning',
  license_validation_failed: 'danger',
  license_disabled: 'danger',
  download_denied: 'danger',
  download_rate_limited: 'warning',
  email_bounced: 'danger',
  email_complained: 'danger',
  email_failed: 'danger',
}

function describe(item: TimelineItem): string {
  const d = item.data as Record<string, string | number | null>
  switch (true) {
    case item.kind === 'order':
      return `Order #${d.orderNumber} · ${formatMoney(Number(d.totalUsd))} · ${d.status}`
    case item.kind === 'refund':
      return `Refund · order #${d.orderNumber}`
    case item.kind.startsWith('payment_'):
      return `${item.kind.replace('payment_payment_', 'Payment ')}${d.amountUsd ? ` · ${formatMoney(Number(d.amountUsd))}` : ''}${d.attempt ? ` · attempt ${d.attempt}` : ''}`
    case item.kind.startsWith('subscription_'):
      return `Subscription ${item.kind.replace('subscription_', '').replace('_', ' ')} · ${d.interval}`
    case item.kind.startsWith('license_'):
      return `License ${item.kind.replace('license_', '').replace('_', ' ')} · ${d.key}${d.instance ? ` · ${d.instance}` : ''}${d.country ? ` · ${d.country}` : ''}`
    case item.kind.startsWith('download_'):
      return `Download ${item.kind.replace('download_', '').replace('_', ' ')} · ${d.product} v${d.version} · ${d.channel}${d.country ? ` · ${d.country}` : ''}`
    case item.kind.startsWith('email_'):
      return `Email ${d.template} · ${item.kind.replace('email_', '')}`
    case item.kind.startsWith('discord_'):
      return `Discord ${item.kind.replace('discord_', '')}${d.username ? ` · ${d.username}` : ''}`
    case item.kind === 'sign_in':
      return 'Signed in'
    default:
      return item.kind
  }
}

async function Timeline({ userId, email }: { userId: string; email: string }) {
  const items = await customerTimeline(userId, email)
  return (
    <Panel title="Timeline" description="Newest first · last 100 events">
      {items.length ? (
        <ol className="flex flex-col">
          {items.map((item, i) => {
            const tone = KIND_TONE[item.kind] ?? 'neutral'
            const emailId = item.kind.startsWith('email_') ? String((item.data as { id?: string }).id ?? '') : ''
            return (
              <li key={`${item.kind}-${item.at}-${i}`} className="relative flex gap-3 pb-4 pl-4 last:pb-0">
                <span aria-hidden className="absolute top-1.5 bottom-0 left-0 w-px bg-border" />
                <span
                  aria-hidden
                  className={
                    'absolute top-1.5 -left-[3px] size-[7px] rounded-full ' +
                    (tone === 'danger'
                      ? 'bg-destructive'
                      : tone === 'warning'
                        ? 'bg-warning'
                        : tone === 'success'
                          ? 'bg-success'
                          : 'bg-muted-foreground')
                  }
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 text-body-sm">{describe(item)}</span>
                  <span className="flex items-center gap-1">
                    <time
                      dateTime={item.at}
                      className="text-caption whitespace-nowrap text-muted-foreground tabular-nums"
                    >
                      {formatDateTime(item.at)}
                    </time>
                    {emailId ? (
                      <ResendEmailButton
                        emailId={emailId}
                        template={String((item.data as { template?: string }).template)}
                      />
                    ) : null}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="text-body-sm text-muted-foreground">No events yet.</p>
      )}
    </Panel>
  )
}
