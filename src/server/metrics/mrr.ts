import 'server-only'
import { sql, type SQL } from 'drizzle-orm'

/** Any Drizzle Postgres client or transaction (postgres-js in the app, PGlite in tests). */
type Executor = { execute: (query: SQL) => PromiseLike<unknown> }

/**
 * P7.03 / FR-SYS-05: per-subscription MRR for `day`, then the day's snapshot with movements
 * (new, expansion, contraction, churned, reactivated). Idempotent: running twice changes nothing.
 * Past-due subscriptions count for 14 days (the dunning grace window).
 */
export async function snapshotMrr(db: Executor, day: string) {
  await db.execute(sql`
    insert into app.mrr_subscription_days (subscription_id, date, mrr_cents)
    select s.id, ${day}::date,
           case s.interval when 'year' then round(s.unit_price_usd / 12.0)::int else s.unit_price_usd end
    from app.subscriptions s
    where not s.test_mode
      and s.created_at::date <= ${day}::date
      and (s.status = 'active'
        or (s.status = 'past_due' and s.past_due_since > ${day}::date - interval '14 days'))
    on conflict do nothing`)

  await db.execute(sql`
    insert into app.mrr_snapshots (date, mrr_cents, active_subscriptions, new_cents, expansion_cents,
                                   contraction_cents, churned_cents, reactivated_cents)
    select ${day}::date,
           coalesce(sum(t.mrr_cents), 0),
           count(t.subscription_id),
           coalesce(sum(t.mrr_cents) filter (where y.subscription_id is null and e.subscription_id is null), 0),
           coalesce(sum(t.mrr_cents - y.mrr_cents) filter (where t.mrr_cents > y.mrr_cents), 0),
           coalesce(sum(y.mrr_cents - t.mrr_cents) filter (where t.mrr_cents < y.mrr_cents), 0),
           (select coalesce(sum(y2.mrr_cents), 0) from app.mrr_subscription_days y2
             where y2.date = ${day}::date - 1
               and not exists (select 1 from app.mrr_subscription_days t2
                               where t2.date = ${day}::date and t2.subscription_id = y2.subscription_id)),
           coalesce(sum(t.mrr_cents) filter (where y.subscription_id is null and e.subscription_id is not null), 0)
    from app.mrr_subscription_days t
    left join app.mrr_subscription_days y
           on y.subscription_id = t.subscription_id and y.date = ${day}::date - 1
    left join lateral (
      select p.subscription_id from app.mrr_subscription_days p
      where p.subscription_id = t.subscription_id and p.date < ${day}::date - 1
      limit 1
    ) e on true
    where t.date = ${day}::date
    on conflict (date) do update set
      mrr_cents = excluded.mrr_cents, active_subscriptions = excluded.active_subscriptions,
      new_cents = excluded.new_cents, expansion_cents = excluded.expansion_cents,
      contraction_cents = excluded.contraction_cents, churned_cents = excluded.churned_cents,
      reactivated_cents = excluded.reactivated_cents`)
}

/** Yesterday in UTC as `YYYY-MM-DD`. */
export const yesterdayUtc = (now = new Date()) =>
  new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
