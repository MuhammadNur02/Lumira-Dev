import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { env } from '@/lib/env'

// PRD §8.1 formulas. Money is integer cents. Days are UTC. Test-mode rows never count.
// Every function is `use cache` tagged `admin-metrics`; LS webhook handlers and crons revalidate it.

const rows = <T>(result: unknown) => Array.from(result as ArrayLike<T>).map((r) => ({ ...r }))

export type RevenueDay = {
  day: string
  one_time_gross: number
  one_time_net: number
  subscription_gross: number
  subscription_net: number
  refunds: number
  orders: number
}

/** Daily revenue. Subscription first orders are counted once, via their `initial` invoice. */
export async function revenueByDay(from: string, to: string): Promise<RevenueDay[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-metrics')
  const result = await db.execute(sql`
    with days as (
      select generate_series(${from}::date, ${to}::date, interval '1 day')::date as day
    ),
    one_time as (
      select o.created_at::date as day, sum(o.total_usd) as gross, sum(o.total_usd - o.tax_usd) as net, count(*) as orders
      from app.orders o
      where o.status in ('paid', 'refunded', 'partial_refund') and not o.test_mode
        and o.created_at >= ${from}::date and o.created_at < ${to}::date + 1
        and not exists (
          select 1 from app.order_items oi join app.variants v on v.ls_variant_id = oi.ls_variant_id
          where oi.order_id = o.id and v.tier = 'all_access')
      group by 1
    ),
    subs as (
      select i.created_at::date as day, sum(i.total_usd) as gross, sum(i.total_usd - i.tax_usd) as net
      from app.subscription_invoices i
      where i.status in ('paid', 'refunded', 'partial_refund') and not i.test_mode
        and i.created_at >= ${from}::date and i.created_at < ${to}::date + 1
      group by 1
    ),
    refunds as (
      select o.refunded_at::date as day, sum(o.total_usd - o.tax_usd) as amount
      from app.orders o
      where o.status = 'refunded' and not o.test_mode
        and o.refunded_at >= ${from}::date and o.refunded_at < ${to}::date + 1
      group by 1
    )
    select d.day::text as day,
           coalesce(ot.gross, 0)::int as one_time_gross, coalesce(ot.net, 0)::int as one_time_net,
           coalesce(s.gross, 0)::int as subscription_gross, coalesce(s.net, 0)::int as subscription_net,
           coalesce(r.amount, 0)::int as refunds, coalesce(ot.orders, 0)::int as orders
    from days d
    left join one_time ot on ot.day = d.day
    left join subs s on s.day = d.day
    left join refunds r on r.day = d.day
    order by d.day`)
  return rows<RevenueDay>(result)
}

export type Kpis = {
  gross: number
  net: number
  payout: number
  orders: number
  aov: number | null
  refundRate: number | null
  abandonmentRate: number | null
  mrr: number
  activeSubscribers: number
}

/** KPI stat tiles (FR-AD-10) for one period. Conversion needs PostHog and is computed separately. */
export async function kpis(from: string, to: string): Promise<Kpis> {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-metrics')
  const [money] = rows<{
    one_time_gross: number
    one_time_tax: number
    paid_orders: number
    refunded_orders: number
    invoice_gross: number
    invoice_tax: number
    invoices: number
    refunds: number
    abandoned: number
    completed: number
  }>(
    await db.execute(sql`
      with o as (
        select o.*, exists (
          select 1 from app.order_items oi join app.variants v on v.ls_variant_id = oi.ls_variant_id
          where oi.order_id = o.id and v.tier = 'all_access') as is_sub
        from app.orders o
        where not o.test_mode and o.created_at >= ${from}::date and o.created_at < ${to}::date + 1
      )
      select
        (select coalesce(sum(total_usd), 0) from o where not is_sub and status in ('paid', 'refunded', 'partial_refund'))::int as one_time_gross,
        (select coalesce(sum(tax_usd), 0) from o where not is_sub and status in ('paid', 'refunded', 'partial_refund'))::int as one_time_tax,
        (select count(*) from o where not is_sub and status in ('paid', 'refunded', 'partial_refund'))::int as paid_orders,
        (select count(*) from o where not is_sub and status = 'refunded')::int as refunded_orders,
        (select coalesce(sum(total_usd), 0) from app.subscription_invoices i
          where not i.test_mode and i.status in ('paid', 'refunded', 'partial_refund')
            and i.created_at >= ${from}::date and i.created_at < ${to}::date + 1)::int as invoice_gross,
        (select coalesce(sum(tax_usd), 0) from app.subscription_invoices i
          where not i.test_mode and i.status in ('paid', 'refunded', 'partial_refund')
            and i.created_at >= ${from}::date and i.created_at < ${to}::date + 1)::int as invoice_tax,
        (select count(*) from app.subscription_invoices i
          where not i.test_mode and i.status in ('paid', 'refunded', 'partial_refund')
            and i.created_at >= ${from}::date and i.created_at < ${to}::date + 1)::int as invoices,
        (select coalesce(sum(total_usd - tax_usd), 0) from app.orders r
          where not r.test_mode and r.status = 'refunded'
            and r.refunded_at >= ${from}::date and r.refunded_at < ${to}::date + 1)::int as refunds,
        (select count(*) from app.checkout_sessions c
          where c.status in ('abandoned', 'expired') and c.created_at >= ${from}::date and c.created_at < ${to}::date + 1)::int as abandoned,
        (select count(*) from app.checkout_sessions c
          where c.status = 'completed' and c.created_at >= ${from}::date and c.created_at < ${to}::date + 1)::int as completed`),
  )
  const [mrr] = rows<{ mrr: number; subs: number }>(
    await db.execute(sql`
      select mrr_cents::int as mrr, active_subscriptions::int as subs from app.mrr_snapshots
      where date <= ${to}::date order by date desc limit 1`),
  )
  const m = money!
  const gross = m.one_time_gross + m.invoice_gross
  const net = gross - m.one_time_tax - m.invoice_tax - m.refunds
  const transactions = m.paid_orders + m.invoices
  const fees = Math.round((gross * env.LS_FEE_PCT) / 100) + env.LS_FEE_FIXED_CENTS * transactions
  return {
    gross,
    net,
    payout: net - fees,
    orders: m.paid_orders,
    aov: m.paid_orders ? Math.round(m.one_time_gross / m.paid_orders) : null,
    refundRate: m.paid_orders ? m.refunded_orders / m.paid_orders : null,
    abandonmentRate: m.abandoned + m.completed ? m.abandoned / (m.abandoned + m.completed) : null,
    mrr: mrr?.mrr ?? 0,
    activeSubscribers: mrr?.subs ?? 0,
  }
}

export type MrrPoint = {
  date: string
  mrr: number
  subs: number
  new: number
  expansion: number
  contraction: number
  churned: number
  reactivated: number
}

export async function mrrSeries(from: string, to: string): Promise<MrrPoint[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-metrics')
  return rows<MrrPoint>(
    await db.execute(sql`
      select date::text as date, mrr_cents::int as mrr, active_subscriptions::int as subs, new_cents::int as new,
             expansion_cents::int as expansion, contraction_cents::int as contraction,
             churned_cents::int as churned, reactivated_cents::int as reactivated
      from app.mrr_snapshots where date between ${from}::date and ${to}::date order by date`),
  )
}

/** Logo and revenue churn for the range (PRD §8.1, approximated over the range instead of a month). */
export async function churn(from: string, to: string) {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-metrics')
  const [r] = rows<{ start_mrr: number; start_subs: number; churned: number; expired: number }>(
    await db.execute(sql`
      select
        coalesce((select mrr_cents from app.mrr_snapshots where date <= ${from}::date order by date desc limit 1), 0)::int as start_mrr,
        coalesce((select active_subscriptions from app.mrr_snapshots where date <= ${from}::date order by date desc limit 1), 0)::int as start_subs,
        coalesce((select sum(churned_cents) from app.mrr_snapshots where date between ${from}::date and ${to}::date), 0)::int as churned,
        (select count(*) from app.subscriptions s where s.status = 'expired' and not s.test_mode
          and s.ends_at >= ${from}::date and s.ends_at < ${to}::date + 1)::int as expired`),
  )
  return {
    logoChurn: r && r.start_subs ? r.expired / r.start_subs : null,
    revenueChurn: r && r.start_mrr ? r.churned / r.start_mrr : null,
  }
}

export type RevenueSlice = { key: string; label: string; line: string; gross: number; net: number; orders: number }

/** FR-AD-12: revenue by product and by line (All-Access from invoices). */
export async function revenueByProduct(from: string, to: string): Promise<RevenueSlice[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-metrics')
  const products = rows<RevenueSlice>(
    await db.execute(sql`
      select coalesce(p.slug, 'bundle-' || v.ls_variant_id) as key, coalesce(p.name, 'Bundle') as label,
             coalesce(p.line::text, 'bundle') as line,
             sum(oi.price_usd * oi.quantity)::int as gross,
             sum(oi.price_usd * oi.quantity - round(o.tax_usd::numeric * oi.price_usd / nullif(o.subtotal_usd - o.discount_usd, 0)))::int as net,
             count(distinct o.id)::int as orders
      from app.orders o
      join app.order_items oi on oi.order_id = o.id
      join app.variants v on v.ls_variant_id = oi.ls_variant_id
      left join app.products p on p.id = v.product_id
      where not o.test_mode and o.status in ('paid', 'partial_refund') and v.tier <> 'all_access'
        and o.created_at >= ${from}::date and o.created_at < ${to}::date + 1
      group by 1, 2, 3
      order by gross desc`),
  )
  const [aa] = rows<{ gross: number; net: number; n: number }>(
    await db.execute(sql`
      select coalesce(sum(total_usd), 0)::int as gross, coalesce(sum(total_usd - tax_usd), 0)::int as net, count(*)::int as n
      from app.subscription_invoices where not test_mode and status = 'paid'
        and created_at >= ${from}::date and created_at < ${to}::date + 1`),
  )
  if (aa && aa.gross > 0)
    products.push({
      key: 'all-access',
      label: 'All-Access Pass',
      line: 'all_access',
      gross: aa.gross,
      net: aa.net,
      orders: aa.n,
    })
  return products.sort((a, b) => b.gross - a.gross)
}

export type AbandonmentDay = { day: string; abandoned: number; completed: number }

export async function abandonmentByDay(from: string, to: string): Promise<AbandonmentDay[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('admin-metrics')
  return rows<AbandonmentDay>(
    await db.execute(sql`
      select d.day::text as day,
             count(c.id) filter (where c.status in ('abandoned', 'expired'))::int as abandoned,
             count(c.id) filter (where c.status = 'completed')::int as completed
      from generate_series(${from}::date, ${to}::date, interval '1 day') as d(day)
      left join app.checkout_sessions c on c.created_at >= d.day and c.created_at < d.day + interval '1 day'
      group by d.day order by d.day`),
  )
}

/** 12-point sparkline: sums a daily series into 12 equal buckets. */
export function sparkline(values: number[], points = 12): number[] {
  if (!values.length) return []
  const size = Math.max(1, Math.ceil(values.length / points))
  const out: number[] = []
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size).reduce((a, b) => a + b, 0))
  return out
}

/** 12-point sparkline for a level series (MRR, subscribers): evenly spaced samples ending on the last value. */
export function sampled(values: number[], points = 12): number[] {
  if (values.length <= points) return values
  const step = (values.length - 1) / (points - 1)
  return Array.from({ length: points }, (_, i) => values[Math.round(i * step)]!)
}
