# Launch & environment setup (P8.10)

Everything the code expects from the outside world, in the order it is usually set up. Each item
names the environment variables it produces (see `.env.example`). Do staging first, with Lemon
Squeezy in test mode, then repeat for production.

## 1. Supabase (Postgres)

1. Create the project (region close to Vercel's function region).
2. Run `supabase/bootstrap.sql` in the SQL editor with a strong password for `lumira_app`.
3. `DATABASE_URL` = Supavisor **transaction** pooler (port 6543) as `lumira_app`.
   `DATABASE_URL_DIRECT` = direct connection (port 5432) as the owner, for migrations only.
4. `pnpm db:migrate` with `DATABASE_URL_DIRECT` set. Confirm RLS is on for every table in `app`.
5. Enable PITR (7 days) and daily backups (NFR-OPS-02).

## 2. Clerk

1. Create the application; enable email code, passkeys, GitHub and Google.
2. Session token → add `{"metadata": "{{user.public_metadata}}"}` so `role` reaches the server.
3. Custom domain `clerk.lumira.dev`. Paths: sign-in `/sign-in`, sign-up `/sign-up`.
4. Webhook → `https://lumira.dev/api/webhooks/clerk` for `user.created`, `user.updated`,
   `user.deleted`, `session.created`. Keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
   `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`.
5. Admin: set `publicMetadata.role = "admin"` on your user, set `users.role = 'admin'` in Postgres,
   and enable MFA (the admin layout requires it).

## 3. Lemon Squeezy

1. Store → `LS_STORE_ID`, `NEXT_PUBLIC_LS_STORE_SLUG`. API key → `LS_API_KEY` (test key on staging,
   `LS_TEST_MODE=true`).
2. One product per asset with Personal / Team / Extended variants (license keys on, activation
   limits 1 / 5 / 25). All-Access: subscription product with monthly and yearly variants (limit 10).
3. Put the LS product and variant ids into the Sanity product documents, then `pnpm ls:sync`.
4. Webhook → `https://lumira.dev/api/webhooks/lemonsqueezy` with every event in PRD FR-SYS-01;
   signing secret → `LS_WEBHOOK_SECRET` (6–40 chars).
5. Affiliates: enable in LS; the storefront loads the affiliate script.

## 4. Cloudflare R2

1. Buckets `lumira-assets`, `lumira-assets-staging`, `lumira-backups`; no public access.
2. Tokens: read (Object Read), write (Object Read & Write), backup → `R2_*` variables.
3. CORS on the assets bucket: origins `https://lumira.dev`, `https://staging.lumira.dev`,
   `http://localhost:3000`; methods PUT, GET, HEAD; **expose header `ETag`** (multipart uploads need it).
4. Lifecycle rule: abort incomplete multipart uploads after 1 day (FR-AD-55).

## 5. Sanity

1. Create the project and datasets `production` and `staging` → `NEXT_PUBLIC_SANITY_*`.
2. Tokens: Viewer → `SANITY_API_READ_TOKEN`, Editor → `SANITY_API_WRITE_TOKEN`.
3. `cd studio && pnpm sanity deploy` → `SANITY_STUDIO_URL`. Add the site to the Presentation tool.
4. GROQ webhook → `https://lumira.dev/api/webhooks/sanity` (projection `{_type, _id, "slug": slug.current, "product": product->slug.current}`), secret → `SANITY_WEBHOOK_SECRET`.
5. Set `CONTENT_SOURCE=sanity` (the default; `fixtures` is refused in production).

## 6. Resend

1. Domains `mail.lumira.dev` (transactional, tracking **off**) and `news.lumira.dev` (release
   notices). Add SPF, DKIM and DMARC (`p=quarantine`).
2. `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NEWS`, `SUPPORT_EMAIL`, `ADMIN_ALERT_EMAIL`.
3. Webhook → `https://lumira.dev/api/webhooks/resend` for delivered, bounced, complained →
   `RESEND_WEBHOOK_SECRET`.

## 7. Upstash

Redis database → `UPSTASH_REDIS_REST_*`. QStash → `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`,
`QSTASH_NEXT_SIGNING_KEY`.

## 8. PostHog, Sentry, Discord

- PostHog: project token → `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`; personal API key with
  `query:read` → `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_HOST`.
- Sentry: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (source maps). Alerts per NFR-OPS-03.
- Discord: application with OAuth2 redirect `https://lumira.dev/api/discord/callback`; bot with
  Create Instant Invite + Manage Roles, its role above `Verified Owner`; ids → `DISCORD_*`.

## 9. Vercel

1. Import the repo; set every variable per environment (Preview uses staging services).
2. `CRON_SECRET` (Vercel sends it to the crons in `vercel.json`).
3. Generate the app secrets once per environment (`LICENSE_ENCRYPTION_KEY` is 32 random bytes,
   base64): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
   Never rotate `LICENSE_ENCRYPTION_KEY` by replacing it; see secret-rotation.md.
4. Domains: `lumira.dev` (production), `staging.lumira.dev`.
5. Deployment protection bypass → `VERCEL_AUTOMATION_BYPASS_SECRET` in GitHub for E2E.

## Go-live checklist

- [ ] Admin → Integrations: everything green (LS mode matches `LS_TEST_MODE`).
- [ ] A test-mode purchase reaches the success page, the email and the Library (AC-01).
- [ ] Refund in LS test mode revokes the download and the Discord role.
- [ ] `CSP_MODE=report-only` has produced no reports for 7 days, then set `enforce`.
- [ ] Switch LS to live mode: live API key, live webhook secret, `LS_TEST_MODE=false`, `pnpm ls:sync`.
- [ ] Warm the cache: open `/`, the catalog pages and every PDP once.
- [ ] Watch Sentry and PostHog for 48 hours. Rollback: Vercel Instant Rollback (migrations are
      backward-compatible for one release).
