import { requireAdmin } from '@/lib/auth'
import { parseRange } from '@/lib/admin/range'
import { abandonedCheckouts, auditList, customerList, downloadLog } from '@/server/admin/queries'
import { revenueByDay } from '@/server/metrics/revenue'

type Cell = string | number | boolean | null | undefined | Date

/** RFC 4180 quoting; formula-leading characters are prefixed so spreadsheets never evaluate them. */
function csvCell(value: Cell): string {
  if (value == null) return ''
  let s = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvResponse(filename: string, header: string[], rows: Cell[][]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`${header.map(csvCell).join(',')}\n`))
      for (const row of rows) controller.enqueue(encoder.encode(`${row.map(csvCell).join(',')}\n`))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

/** CSV export on every admin table (P7.05, P7.06, P7.10). Admin-only; money in cents. */
export async function GET(req: Request, ctx: RouteContext<'/admin/export/[kind]'>) {
  await requireAdmin()
  const { kind } = await ctx.params
  const range = parseRange(Object.fromEntries(new URL(req.url).searchParams))
  const stamp = `${range.from}_${range.to}`

  switch (kind) {
    case 'revenue': {
      const days = await revenueByDay(range.from, range.to)
      return csvResponse(
        `lumira-revenue-${stamp}.csv`,
        [
          'day',
          'one_time_gross_cents',
          'one_time_net_cents',
          'subscription_gross_cents',
          'subscription_net_cents',
          'refunds_cents',
          'orders',
        ],
        days.map((d) => [
          d.day,
          d.one_time_gross,
          d.one_time_net,
          d.subscription_gross,
          d.subscription_net,
          d.refunds,
          d.orders,
        ]),
      )
    }
    case 'abandoned': {
      const rows = await abandonedCheckouts(range.from, range.to, 10_000)
      return csvResponse(
        `lumira-abandoned-${stamp}.csv`,
        ['started_at', 'status', 'product', 'tier', 'email', 'utm', 'discount_code'],
        rows.map((r) => [
          r.createdAt,
          r.status,
          r.product,
          r.tier,
          r.email,
          r.utm ? JSON.stringify(r.utm) : '',
          r.discountCode,
        ]),
      )
    }
    case 'audit': {
      const rows = await auditList(range.from, range.to, {})
      return csvResponse(
        `lumira-audit-${stamp}.csv`,
        ['at', 'actor', 'action', 'target_type', 'target_id', 'reason', 'before', 'after'],
        rows.map(({ entry, actorEmail }) => [
          entry.createdAt,
          actorEmail,
          entry.action,
          entry.targetType,
          entry.targetId,
          entry.reason,
          JSON.stringify(entry.before),
          JSON.stringify(entry.after),
        ]),
      )
    }
    case 'customers': {
      const rows = await customerList(new URL(req.url).searchParams.get('q') ?? undefined)
      return csvResponse(
        'lumira-customers.csv',
        ['id', 'email', 'name', 'ltv_cents', 'orders', 'subscription', 'last_activity', 'bounced'],
        rows.map((r) => [r.id, r.email, r.name, r.ltv, r.orders, r.subscription, r.last_activity, r.bounced]),
      )
    }
    case 'downloads': {
      const rows = await downloadLog(range.from, range.to, {})
      return csvResponse(
        `lumira-downloads-${stamp}.csv`,
        ['at', 'product', 'version', 'channel', 'status', 'deny_reason', 'country', 'user_id'],
        rows.map((r) => [r.at, r.product, r.version, r.channel, r.status, r.denyReason, r.country, r.userId]),
      )
    }
    default:
      return new Response('Not found', { status: 404 })
  }
}
