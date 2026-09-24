# Incident runbooks

## Lemon Squeezy outage

1. Admin → Integrations shows Lemon Squeezy red; `/api/health` stays green (LS is not part of it).
2. In the Studio → Site settings → Promo banner, set the text to "Checkout is temporarily
   unavailable" and enable it (the Sanity webhook updates the site within seconds).
3. If only the API is down but hosted checkout works, the buy buttons fall back to each variant's
   hosted `buyUrl` when checkout creation fails (PRD §6.7). Make sure every license has one.
4. License validation keeps working for keys validated in the last 24 h (grace cache).
5. After recovery: run `/api/cron/reconcile` manually and check Admin → Webhooks for failures.

## R2 outage

1. `/api/health` returns 503 (R2 HeadBucket); Admin → Integrations shows R2 red.
2. Downloads fail with code `DL-R2`; nothing else is affected. No data is lost.
3. Post a status note in the Library banner if it lasts more than 15 minutes.
4. Downloads resume automatically. Weekly backups live in `lumira-backups`.

## Database restore drill (NFR-OPS-02)

1. Supabase → Backups → restore PITR into a scratch project.
2. Point a preview deployment's `DATABASE_URL` at it and run the Playwright smoke suite.
3. Record the measured recovery time here. Target RTO ≤ 4 h.

## Provider migration (contingency, PRD R1)

1. Implement `BillingProvider` / `LicenseProvider` (`src/lib/billing/types.ts`) for the new provider.
2. Dual-write period: new purchases go to the new provider; webhooks from both are ingested.
3. Migrate license keys (the `license_keys` table is provider-agnostic apart from the LS ids).
4. Switch the storefront CTA. Keep LS webhooks until the last LS subscription renews or ends.
