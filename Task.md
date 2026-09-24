# Lumira — Implementation Roadmap

| | |
|---|---|
| **Document** | `Task.md` · v1.0 · **Status:** Ready to execute |
| **Last updated** | 2026-09-24 |
| **Audience** | Solo full-stack developer (owner-operator) |
| **Implements** | `PRD.md` (requirement IDs in brackets, e.g. [FR-CO-02]) using `StyleGuide.md` (section refs, e.g. SG §6.2) |

---

## 0. How to Use This Plan

### 0.1 Conventions

- **Task ID** `P{phase}.{nn}`. Each task has an estimate in focused hours and a **Done when** line. A task is not done until its Done-when is demonstrably true on a preview deployment.
- **Order matters.** Phases are sequential; tasks inside a phase are ordered by dependency. Tasks marked ⇄ can be done in parallel with the previous task.
- **Environments:** `local` (Docker Postgres, LS test mode, Sanity `staging` dataset) → `staging` (`staging.lumira.dev`, Supabase staging, LS test mode) → `production` (`lumira.dev`, LS live mode).
- **Branching:** trunk-based; short-lived branches `p5/checkout-action`; one PR per task group; every PR gets a Vercel preview deployment.
- **Next.js 16 rule of thumb:** with `cacheComponents: true`, anything that reads request data (`cookies()`, `headers()`, `auth()`, un-generated `params`, `searchParams`) must render inside `<Suspense>` (or under a `loading.tsx`), otherwise the build fails. Cache data with `"use cache"` + `cacheTag()` + `cacheLife()`.

### 0.2 Global Definition of Done

- [ ] `pnpm typecheck && pnpm lint && pnpm test` green; Playwright smoke green on the preview URL.
- [ ] New UI passes the SG §10 checklist (tokens only, focus, reduced motion, light + dark snapshots).
- [ ] No P0 performance budget regression (PRD §5.1) in Lighthouse CI.
- [ ] New env vars added to `src/lib/env.ts`, `.env.example` and all Vercel environments.
- [ ] Webhook and job handlers are idempotent (replaying the fixture twice gives the same DB state).
- [ ] Runbook updated when an operational procedure changed.

### 0.3 Timeline

| Phase | Weeks | Est. hours | Milestone (PRD §9) |
|---|---|---|---|
| 1 · Project initialization & boilerplate | W1 | 36 | — |
| 2 · Database & schema design | W2 | 37 | **M1 Foundation** |
| 3 · Storefront & Bento Grid UI | W3–W4 | 68 | — |
| 4 · Live Preview engine & documentation layer | W5–W6 | 64 | **M2 Storefront, Preview & Docs** |
| 5 · E-commerce engine & software licensing | W7–W8 | 70 | — |
| 6 · Secure delivery, Buyer Dashboard & support | W9–W10 | 55 | **M3 Commerce & Delivery** |
| 7 · Admin dashboard, analytics & management | W10–W11 | 68 | — |
| 8 · Launch hardening | W12 | 32 | **M4 Launch** |
| **Total** | **12 weeks** | **≈ 430 h** | at ~36 focused h/week; add a 10–15 % buffer before committing to a launch date |

### 0.4 Repository Layout (pnpm workspace)

```
lumira/
├─ src/
│  ├─ app/
│  │  ├─ (site)/                      # ROOT LAYOUT 1 — static-first (PPR), allowlist CSP
│  │  │  ├─ layout.tsx                # <html>, fonts, ThemeProvider, ClerkProvider, MotionProvider
│  │  │  ├─ (storefront)/             # /, /boilerplates, /ui-kits, /templates, /products/[slug]/..., /bundles, /all-access, /affiliates, legal
│  │  │  ├─ @modal/(.)products/[slug]/preview/   # intercepted Live Preview
│  │  │  ├─ changelog/  blog/  docs/  # docs = Fumadocs
│  │  │  └─ not-found.tsx
│  │  ├─ (app)/                       # ROOT LAYOUT 2 — dynamic, nonce CSP
│  │  │  ├─ layout.tsx                # reads x-nonce → <ClerkProvider nonce>
│  │  │  ├─ (auth)/sign-in/[[...sign-in]]/  sign-up/[[...sign-up]]/  auth/continue/
│  │  │  ├─ account/                  # library, licenses, downloads, orders, billing, support, settings/[[...rest]]
│  │  │  ├─ admin/                    # overview, revenue, subscriptions, conversion, discounts, customers, activity, webhooks, products, audit, settings
│  │  │  ├─ checkout/success/
│  │  │  └─ d/[token]/
│  │  ├─ r/[name]/route.ts            # license-gated shadcn registry
│  │  └─ api/                         # checkout/status, downloads, webhooks/*, discord/*, v1/licenses/*, search, cron/*, queue/*, health
│  ├─ components/  ui/ lumira/ motion/ preview/ account/ admin/ docs/
│  ├─ db/          schema.ts  client.ts  migrations/
│  ├─ emails/      React Email templates
│  ├─ lib/         env.ts auth/ billing/ licensing/ delivery/ r2.ts email/ analytics/ discord/ sanity/ rate-limit.ts crypto.ts motion/ bento/
│  ├─ server/      webhooks/ outbox/ metrics/ catalog/ entitlements.ts
│  ├─ styles/      springs.css (generated) view-transitions.css bento.css typography.css
│  ├─ workers/     sha256.worker.ts
│  ├─ instrumentation.ts  instrumentation-client.ts  proxy.ts
├─ content/docs/   Fumadocs MDX, one folder per product
├─ studio/         Sanity Studio (deployed to lumira.sanity.studio)
├─ packages/       cli/ (npm: lumira)  preview-bridge/ (@lumira/preview-bridge)  bento/ (@lumira/bento: validateBands)
├─ scripts/        generate-spring-easings.mjs  check-contrast.mjs  seed.ts  ls-sync.ts
├─ tests/          unit/ integration/ e2e/ fixtures/lemonsqueezy/
├─ drizzle.config.ts  next.config.ts  vercel.json  components.json  lighthouserc.json
```

Two **root layouts** are deliberate. `(site)` stays static and cacheable. `(app)` is dynamic anyway (auth, keys, admin) and can therefore use per-request CSP nonces (PRD NFR-SEC-07). Navigating between them is a full page load, which is acceptable at that boundary.

### 0.5 Environment Variables

| Group | Variables | Scope |
|---|---|---|
| App | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEMO_ORIGIN_SUFFIX` (`lumira-demos.dev`) | public |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` | mixed |
| Postgres | `DATABASE_URL` (Supavisor transaction pooler, port 6543, role `lumira_app`), `DATABASE_URL_DIRECT` (port 5432, owner, CI migrations only) | server |
| Sanity | `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`, `SANITY_WEBHOOK_SECRET` | mixed |
| Lemon Squeezy | `LS_API_KEY`, `LS_STORE_ID`, `NEXT_PUBLIC_LS_STORE_SLUG` (`lumira`), `LS_WEBHOOK_SECRET` (6–40 chars), `LS_TEST_MODE`, `LS_FEE_PCT`, `LS_FEE_FIXED_CENTS` | mixed |
| R2 | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_READ_ACCESS_KEY_ID`, `R2_READ_SECRET_ACCESS_KEY`, `R2_WRITE_ACCESS_KEY_ID`, `R2_WRITE_SECRET_ACCESS_KEY` | server |
| Resend | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `EMAIL_FROM` (`Lumira <orders@mail.lumira.dev>`) | server |
| PostHog | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` | mixed |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | server |
| Discord | `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_VERIFIED_ROLE_ID`, `DISCORD_WELCOME_CHANNEL_ID`, `DISCORD_STATE_SECRET` | server |
| Secrets | `LICENSE_ENCRYPTION_KEY` (32-byte base64), `LICENSE_HASH_PEPPER`, `DOWNLOAD_TOKEN_SECRET`, `GUEST_SCOPE_SECRET`, `IP_HASH_SALT`, `CRON_SECRET` | server |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | mixed |

Generate secrets with `openssl rand -base64 32`.

---

## Phase 1 — Project Initialization & Boilerplate (Week 1 · ~36 h)

**Goal:** a deployed skeleton with the design tokens, motion system, Clerk auth, PostHog analytics, error monitoring and CI.

- [ ] **P1.01 — Scaffold the workspace** _(2 h)_
  - Keep the repo **outside OneDrive/Dropbox** (e.g. `C:\dev\lumira`); synced folders break `node_modules` and `.next` with `EPERM` errors.
  - `pnpm create next-app@latest lumira --ts --tailwind --eslint --app --src-dir --react-compiler --import-alias "@/*" --use-pnpm --yes` (installs `babel-plugin-react-compiler`, inits git).
  - create-next-app writes its own `CLAUDE.md` (`@AGENTS.md`) and `AGENTS.md`: keep the project `CLAUDE.md` and add `@AGENTS.md` as its first line.
  - Node 24 LTS (`.nvmrc`), `@types/node@^24`, `typecheck` script (`tsc --noEmit`). `.gitattributes`: `* text=auto eol=lf` (Git for Windows defaults to `core.autocrlf=true`).
  - `pnpm-workspace.yaml`: **merge** with the generated `allowBuilds` block; the app is the workspace root, so `pnpm add` needs `ignoreWorkspaceRootCheck`:

  ```yaml
  packages:
    - .
    - studio
    - packages/*

  # The Next.js app lives at the workspace root (§0.4), so `pnpm add` must target it directly.
  ignoreWorkspaceRootCheck: true

  allowBuilds:
    sharp: false
    unrs-resolver: false
  ```
  - **Done when:** `pnpm dev` serves the app with Turbopack.

- [ ] **P1.02 — `next.config.ts`** _(2 h)_ [NFR-PERF-06, NFR-SEC-08, FR-AN-01]

  ```ts
  // next.config.ts
  import type { NextConfig } from 'next'

  const securityHeaders = [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://lumira.lemonsqueezy.com")' },
  ]

  const nextConfig: NextConfig = {
    cacheComponents: true,
    reactCompiler: true,
    typedRoutes: true,
    skipTrailingSlashRedirect: true, // required by the PostHog reverse proxy
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'cdn.sanity.io' },
        { protocol: 'https', hostname: 'img.clerk.com' },
      ],
    },
    async rewrites() {
      return [
        { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
        { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
      ]
    },
    async headers() {
      return [{ source: '/:path*', headers: securityHeaders }]
    },
  }

  // Phase 4 wraps this with createMDX() from 'fumadocs-mdx/next'.
  export default nextConfig
  ```
  - `createMDX()` is added in Phase 4 together with the `fumadocs-mdx` package; importing it earlier fails the build.
  - **Done when:** the build passes and response headers are visible on the preview URL.

- [ ] **P1.03 — TypeScript, lint, format, hooks** _(2 h)_
  - `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`.
  - ESLint flat config: `eslint-config-next`, `eslint-plugin-react-hooks` (React Compiler rules), `@typescript-eslint`. `no-restricted-imports` bans `motion/react`'s `motion` component (use `motion/react-m`) and `@/db/*` imports in client components. `no-restricted-syntax` flags color literals (`#hex`, `oklch(`) outside `src/app/globals.css` and `src/styles/*` (SG §10).
  - Prettier + `prettier-plugin-tailwindcss`; `lint-staged` + `simple-git-hooks` pre-commit.
  - **Done when:** a commit with a hard-coded hex color in a component is rejected.

- [ ] **P1.04 — Typed environment** _(1.5 h)_ [NFR-SEC-06]

  ```ts
  // src/lib/env.ts
  import { createEnv } from '@t3-oss/env-nextjs'
  import { z } from 'zod'

  const secret = z.string().min(32)

  export const env = createEnv({
    server: {
      DATABASE_URL: z.string().url(),
      DATABASE_URL_DIRECT: z.string().url().optional(),
      CLERK_SECRET_KEY: z.string().startsWith('sk_'),
      CLERK_WEBHOOK_SIGNING_SECRET: z.string().startsWith('whsec_'),
      SANITY_API_READ_TOKEN: z.string(),
      SANITY_API_WRITE_TOKEN: z.string(),
      SANITY_WEBHOOK_SECRET: z.string().min(16),
      LS_API_KEY: z.string(),
      LS_STORE_ID: z.coerce.number().int().positive(),
      LS_WEBHOOK_SECRET: z.string().min(6).max(40),
      LS_TEST_MODE: z.enum(['true', 'false']).transform((v) => v === 'true'),
      LS_FEE_PCT: z.coerce.number().default(5),
      LS_FEE_FIXED_CENTS: z.coerce.number().int().default(50),
      R2_ACCOUNT_ID: z.string(),
      R2_BUCKET: z.string(),
      R2_READ_ACCESS_KEY_ID: z.string(),
      R2_READ_SECRET_ACCESS_KEY: z.string(),
      R2_WRITE_ACCESS_KEY_ID: z.string(),
      R2_WRITE_SECRET_ACCESS_KEY: z.string(),
      RESEND_API_KEY: z.string().startsWith('re_'),
      RESEND_WEBHOOK_SECRET: z.string(),
      EMAIL_FROM: z.string(),
      POSTHOG_PERSONAL_API_KEY: z.string(),
      POSTHOG_PROJECT_ID: z.string(),
      UPSTASH_REDIS_REST_URL: z.string().url(),
      UPSTASH_REDIS_REST_TOKEN: z.string(),
      QSTASH_TOKEN: z.string(),
      QSTASH_CURRENT_SIGNING_KEY: z.string(),
      QSTASH_NEXT_SIGNING_KEY: z.string(),
      DISCORD_CLIENT_ID: z.string(),
      DISCORD_CLIENT_SECRET: z.string(),
      DISCORD_BOT_TOKEN: z.string(),
      DISCORD_GUILD_ID: z.string(),
      DISCORD_VERIFIED_ROLE_ID: z.string(),
      DISCORD_WELCOME_CHANNEL_ID: z.string(),
      DISCORD_STATE_SECRET: secret,
      LICENSE_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64'),
      LICENSE_HASH_PEPPER: secret,
      DOWNLOAD_TOKEN_SECRET: secret,
      GUEST_SCOPE_SECRET: secret,
      IP_HASH_SALT: z.string().min(16),
      CRON_SECRET: secret,
    },
    client: {
      NEXT_PUBLIC_APP_URL: z.string().url(),
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
      NEXT_PUBLIC_SANITY_PROJECT_ID: z.string(),
      NEXT_PUBLIC_SANITY_DATASET: z.string(),
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string(),
      NEXT_PUBLIC_LS_STORE_SLUG: z.string(),
      NEXT_PUBLIC_DEMO_ORIGIN_SUFFIX: z.string().default('lumira-demos.dev'),
      NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    },
    experimental__runtimeEnv: {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
      NEXT_PUBLIC_LS_STORE_SLUG: process.env.NEXT_PUBLIC_LS_STORE_SLUG,
      NEXT_PUBLIC_DEMO_ORIGIN_SUFFIX: process.env.NEXT_PUBLIC_DEMO_ORIGIN_SUFFIX,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    },
    emptyStringAsUndefined: true,
  })
  ```
  - **Done when:** removing any required variable fails `pnpm build` with a readable message.

- [ ] **P1.05 — Tailwind v4 + shadcn/ui + Lumira tokens** _(4 h)_ [SG §2–§3]
  - `pnpm dlx shadcn@latest init -b radix -p vega --no-monorepo --no-rtl` (shadcn 4.x: Radix primitives + the Vega preset, the successor of new-york; neutral, CSS variables) → replace `globals.css` with SG §2.3; add `src/styles/typography.css` (SG §3.3), `bento.css` (SG §4.2, §4.5, §4.7 + `pressable` from §5.4), `view-transitions.css` (SG §6.5.5). The Vega preset adds Inter to `layout.tsx`; remove it (Geist only, P1.07).
  - Add `scripts/generate-spring-easings.mjs` (SG §6.6) and `"gen:springs": "node scripts/generate-spring-easings.mjs > src/styles/springs.css"`; CI re-runs it and fails on `git diff --exit-code`. On Windows, run it through `pnpm` (cmd.exe), never with a PowerShell 5.1 `>` redirect, which writes UTF-16.
  - Add `scripts/check-contrast.mjs`: converts the OKLCH tokens to sRGB and asserts every pair in SG §2.5 (≥ 4.5 text, ≥ 3 UI) for `:root` and `.dark`.
  - **Done when:** `pnpm check:contrast` passes and a token tweak that breaks a pair fails CI.

- [ ] **P1.06 — shadcn components + Lumira patches** _(3 h)_ ⇄ [SG §5]
  - `pnpm dlx shadcn@latest add button badge card input textarea label field select dialog sheet popover dropdown-menu tabs toggle-group tooltip command table sidebar chart sonner skeleton accordion kbd empty progress avatar separator scroll-area`.
  - Apply the SG §5.1 patch checklist to each; replace `button.tsx` with SG §5.4; add `src/components/ui/PATCHES.md`.
  - shadcn 4.x imports primitives from the unified `radix-ui` package (`import { Slot } from 'radix-ui'` → `Slot.Root`), not `@radix-ui/react-slot`. The SG §5.4 shadows contain `oklch(…)` literals, which the P1.03 lint rule rejects in components; move them into tokens first.
  - **Done when:** the `/dev/kitchen-sink` page (dev only) renders every component in both themes and passes axe.

- [ ] **P1.07 — Fonts, theme, root layouts** _(2.5 h)_ [SG §3.1, §2.4]
  - `src/app/fonts.ts` (Geist, Geist Mono with `preload: false`).
  - Create the two root layouts from §0.4. Both render `<html lang="en" suppressHydrationWarning>` with the font variables, `next-themes` (`attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`), `MotionProvider`, `Toaster` and `SpeedInsights`. `viewport` export sets `themeColor` for both schemes (`#f9fafc` / `#06070a`).
  - **Done when:** the theme toggle works without flash on hard reload in both root layouts.

- [ ] **P1.08 — Motion system** _(1.5 h)_ [SG §6.3]
  - `pnpm add motion`; add `src/lib/motion/springs.ts`, `src/lib/motion/features.ts`, `src/components/motion/motion-provider.tsx` exactly as SG §6.3.
  - **Done when:** a `m.div` animates after hydration, and first-load JS grows by less than 6 kB gzip.

- [ ] **P1.09 — Clerk authentication** _(4 h)_ [FR-BD-01, FR-AD-01, NFR-SEC-03]
  - Create Clerk **development** and **production** instances. Enable email code (primary), passkeys, GitHub and Google OAuth, bot protection on sign-up. Production Frontend API domain `clerk.lumira.dev` (DNS CNAME).
  - Session token customization (Dashboard → Sessions → Customize session token): `{ "metadata": "{{user.public_metadata}}" }`. Set `publicMetadata.role = "admin"` on the owner account and enable MFA on it.
  - `pnpm add @clerk/nextjs @clerk/themes`; `ClerkProvider` per SG §5.8 (`baseTheme: shadcn`, `cssLayerName: 'clerk'`) in both root layouts; `@layer theme, base, clerk, components, utilities;` as the first line of `globals.css`.
  - Sign-in and sign-up catch-all pages under `(app)/(auth)` with `<SignIn />` / `<SignUp />`.

  ```ts
  // src/proxy.ts (Phase 1 version; Phase 5 adds the promo cookie, Phase 8 adds nonce CSP)
  import { clerkMiddleware } from '@clerk/nextjs/server'

  // Session handling only. Authorization lives in each page, route handler and Server Action.
  export default clerkMiddleware()

  export const config = {
    matcher: [
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
      '/(api|trpc)(.*)',
    ],
  }
  ```

  ```ts
  // src/types/globals.d.ts
  export {}
  declare global {
    interface CustomJwtSessionClaims {
      metadata?: { role?: 'admin' | 'buyer' }
    }
  }
  ```

  ```ts
  // src/lib/auth/index.ts
  import 'server-only'
  import { auth, currentUser } from '@clerk/nextjs/server'
  import { notFound, redirect } from 'next/navigation'

  export async function requireUser() {
    const { userId } = await auth.protect()
    return { userId }
  }

  /** Role claim → DB role (Phase 2) → MFA. Use in every admin page, route handler and Server Action. */
  export async function requireAdmin() {
    const { userId, sessionClaims } = await auth.protect()
    if (sessionClaims?.metadata?.role !== 'admin') notFound() // never reveal that /admin exists
    const user = await currentUser()
    if (!user?.twoFactorEnabled) redirect('/account/settings/security?mfa=required')
    return { userId }
  }
  ```
  - **Done when:** sign-in works on the preview URL, `/admin` returns 404 for a buyer account and renders for the MFA-enabled owner.

- [ ] **P1.10 — PostHog analytics (performance-safe)** _(3 h)_ [FR-AN-01..04, FR-AN-07]
  - `pnpm add posthog-js posthog-node`. Create a PostHog project (EU or US cloud; match the rewrite hosts in P1.02).
  - Typed event map `src/lib/analytics/events.ts` (PRD §8.2) and a queueing shim:

  ```ts
  // src/lib/analytics/track.ts
  import type { PostHog } from 'posthog-js'
  import type { AnalyticsEvent } from './events'

  let client: PostHog | null = null
  const queue: [string, Record<string, unknown>][] = []

  export function track<E extends AnalyticsEvent>(name: E['name'], props: E['props']) {
    if (client) client.capture(name, props)
    else if (queue.length < 100) queue.push([name, props])
  }

  export function attachPostHog(instance: PostHog) {
    client = instance
    for (const [name, props] of queue.splice(0)) instance.capture(name, props)
  }
  ```

  ```ts
  // src/instrumentation-client.ts: runs before hydration, so keep it tiny and defer the SDK
  import { attachPostHog } from '@/lib/analytics/track'

  function load() {
    void import('posthog-js').then(({ default: posthog }) => {
      const consentRequired = document.cookie.includes('lumira_region=eu') && !document.cookie.includes('lumira_consent=granted')
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
        defaults: '2026-05-30',
        persistence: consentRequired ? 'memory' : 'localStorage+cookie',
        disable_session_recording: true, // started selectively (FR-AN-05)
      })
      attachPostHog(posthog)
    })
  }

  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 })
  else setTimeout(load, 1500)
  ```
  - `proxy.ts` sets a non-HttpOnly `lumira_region=eu` cookie when `x-vercel-ip-country` is in the EU/EEA/UK/CH list, so static pages stay static.
  - `PostHogIdentify` client component (inside `ClerkProvider`): `posthog.identify(user.id)` on sign-in, `posthog.reset()` on sign-out.
  - Server helper `src/lib/analytics/server.ts`: `captureServer()` with `posthog-node` (`flushAt: 1`, `flushInterval: 0`, `await client.shutdown()`), called inside `after()`.
  - **Done when:** `$pageview` events arrive through `/ingest` (not blocked by uBlock Origin) and PostHog JS is absent from the first-load bundle report.

- [ ] **P1.11 — Sentry** _(1.5 h)_ ⇄ [NFR-OPS-03]
  - `pnpm dlx @sentry/wizard@latest -i nextjs`; `tracesSampleRate: 0.1` in production; `tunnelRoute: '/monitoring'` so Sentry traffic is same-origin (CSP-friendly, P8.01); `beforeSend` scrubs UUID-shaped license keys (`/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi`) and emails from messages, breadcrumbs and request bodies.
  - **Done when:** a test error shows up with the key-shaped string redacted.

- [ ] **P1.12 — Vercel project & domains** _(2 h)_
  - Vercel Pro (needed for sub-daily crons). Domains `lumira.dev` (apex) + `www` → apex redirect + `staging.lumira.dev` bound to the `staging` branch.
  - Enable Deployment Protection on previews, and create a **Protection Bypass for Automation** secret for third-party webhooks to staging (`?x-vercel-protection-bypass=…` in the webhook URL).
  - Install `@vercel/speed-insights`.
  - **Done when:** `main` deploys to production and `staging` to `staging.lumira.dev`.

- [ ] **P1.13 — CI pipeline** _(2.5 h)_
  - `.github/workflows/ci.yml`: pnpm cache → `typecheck` → `lint` → `test` (Vitest) → `gen:springs` drift → `check:contrast` → `build`. `e2e.yml`: Playwright against the Vercel preview URL (`deployment_status` event).
  - **Done when:** a PR shows all checks, and a failing unit test blocks merge.

- [ ] **P1.14 — Application shell** _(3 h)_ [FR-GL-01, FR-GL-07, FR-GL-08]
  - Header skeleton (nav, ⌘K placeholder, theme toggle, account chip in `<Suspense>`), footer skeleton, `not-found.tsx` per root layout, `error.tsx`, `global-error.tsx` (Sentry event ID), environment banner when `LS_TEST_MODE` is true.
  - **Done when:** 404 and error pages render branded in both themes.

- [ ] **P1.15 — Rate limiting & hashing utilities** _(1.5 h)_ [NFR-SEC-10, NFR-SEC-13]
  - Create an Upstash Redis database (same region as the functions); `pnpm add @upstash/ratelimit @upstash/redis`.

  ```ts
  // src/lib/rate-limit.ts
  import 'server-only'
  import { Ratelimit } from '@upstash/ratelimit'
  import { Redis } from '@upstash/redis'

  const redis = Redis.fromEnv() // UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
  const limiter = (prefix: string, tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) =>
    new Ratelimit({ redis, prefix: `rl:${prefix}`, limiter: Ratelimit.slidingWindow(tokens, window) })

  // PRD NFR-SEC-10
  export const ratelimit = {
    checkout: limiter('checkout', 20, '1 m'),
    downloadAsset: limiter('dl:asset', 10, '1 h'),
    downloadUser: limiter('dl:user', 60, '1 h'),
    downloadToken: limiter('dl:token', 20, '1 h'),
    licenseKey: limiter('lic:key', 30, '1 h'),
    licenseIp: limiter('lic:ip', 120, '1 h'),
    registryKey: limiter('reg:key', 300, '1 h'),
    discord: limiter('discord', 5, '1 h'),
    admin: limiter('admin', 60, '1 m'),
  }
  ```

  ```ts
  // src/lib/crypto.ts
  import 'server-only'
  import crypto from 'node:crypto'
  import { env } from '@/lib/env'

  /** IPs are never stored raw (PRD NFR-SEC-13). */
  export const hashIp = (ip: string) => crypto.createHmac('sha256', env.IP_HASH_SALT).update(ip).digest('hex').slice(0, 32)
  ```
  - **Done when:** a unit test with a mocked Redis shows the 21st checkout call in a minute is refused.

**Phase 1 exit criteria:** preview URL live; sign-in works; theme toggle; PostHog receives events through `/ingest`; Sentry receives errors; CI green.

---

## Phase 2 — Database & Schema Design (Week 2 · ~37 h)

**Goal:** Postgres (Supabase + Drizzle) for transactional data, Sanity for content, both synced with Clerk and the Next.js cache.

### 2A · PostgreSQL (Supabase + Drizzle)

- [ ] **P2.01 — Supabase projects & roles** _(2 h)_ [NFR-SEC-12]
  - Create `lumira-staging` and `lumira-prod` in the region co-located with the Vercel Functions region (e.g. `us-east-1` ↔ `iad1`). Production: Pro plan, PITR on.
  - Settings → API → remove `app` from exposed schemas (the Data API never serves Lumira tables).

  ```sql
  -- supabase/bootstrap.sql (run once per project as the owner)
  create schema if not exists app;
  create role lumira_app login password :'app_password' noinherit;
  grant usage on schema app to lumira_app;
  alter default privileges in schema app grant select, insert, update, delete on tables to lumira_app;
  alter default privileges in schema app grant usage, select on sequences to lumira_app;
  ```
  - Pooler connection string for the app uses Supavisor's `role.project-ref` username form: `postgresql://lumira_app.<project-ref>:<password>@<pooler-host>:6543/postgres`.
  - **Done when:** `lumira_app` can read and write `app.*` but `select * from app.users` via the Supabase REST API fails.

- [ ] **P2.02 — Drizzle client & config** _(1.5 h)_

  ```ts
  // drizzle.config.ts
  import { defineConfig } from 'drizzle-kit'

  export default defineConfig({
    dialect: 'postgresql',
    schema: './src/db/schema.ts',
    out: './src/db/migrations',
    schemaFilter: ['app'],
    casing: 'snake_case',
    dbCredentials: { url: process.env.DATABASE_URL_DIRECT! },
  })
  ```

  ```ts
  // src/db/client.ts
  import 'server-only'
  import postgres from 'postgres'
  import { drizzle } from 'drizzle-orm/postgres-js'
  import * as schema from './schema'
  import { env } from '@/lib/env'

  const globalForDb = globalThis as unknown as { sql?: postgres.Sql }

  // Transaction-mode pooler: prepared statements must be disabled.
  const sql = globalForDb.sql ?? postgres(env.DATABASE_URL, { prepare: false, max: 5, idle_timeout: 20 })
  if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql

  export const db = drizzle(sql, { schema, casing: 'snake_case' })
  export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
  ```

- [ ] **P2.03 — Schema** _(6 h)_ [PRD §7]

  ```ts
  // src/db/schema.ts
  import { sql } from 'drizzle-orm'
  import {
    bigint, boolean, date, index, integer, jsonb, pgSchema, primaryKey, text, timestamp, uniqueIndex, uuid,
  } from 'drizzle-orm/pg-core'

  export const app = pgSchema('app')

  // ---------- Enums ----------
  export const userRole = app.enum('user_role', ['buyer', 'admin'])
  export const productLine = app.enum('product_line', ['boilerplate', 'ui_kit', 'template'])
  export const licenseTier = app.enum('license_tier', ['personal', 'team', 'extended', 'all_access'])
  export const checkoutStatus = app.enum('checkout_status', ['initiated', 'completed', 'abandoned', 'expired'])
  export const orderStatus = app.enum('order_status', ['pending', 'failed', 'paid', 'refunded', 'partial_refund'])
  export const subscriptionStatus = app.enum('subscription_status', ['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'])
  export const entitlementKind = app.enum('entitlement_kind', ['license', 'all_access', 'comp'])
  export const entitlementStatus = app.enum('entitlement_status', ['active', 'suspended', 'revoked'])
  export const licenseKeyStatus = app.enum('license_key_status', ['inactive', 'active', 'expired', 'disabled'])
  export const licenseEventType = app.enum('license_event_type', ['issued', 'activated', 'deactivated', 'validated', 'validation_failed', 'disabled', 'enabled', 'revealed', 'limit_changed'])
  export const actorType = app.enum('actor_type', ['buyer', 'admin', 'system', 'cli', 'registry'])
  export const instanceSource = app.enum('instance_source', ['cli', 'registry', 'dashboard', 'external'])
  export const releaseStatus = app.enum('release_status', ['draft', 'published', 'yanked'])
  export const downloadChannel = app.enum('download_channel', ['dashboard', 'success_page', 'email_link', 'admin'])
  export const downloadStatus = app.enum('download_status', ['granted', 'denied', 'rate_limited'])
  export const paymentEventType = app.enum('payment_event_type', ['payment_failed', 'payment_recovered', 'payment_refunded'])
  export const discountStatus = app.enum('discount_status', ['active', 'expired', 'deleted'])
  export const emailStatus = app.enum('email_status', ['pending', 'sent', 'failed', 'bounced'])
  export const jobKind = app.enum('job_kind', ['license_keys_fetch', 'license_key_disable', 'license_key_enable', 'discord_grant', 'discord_revoke', 'analytics_capture', 'release_notify'])
  export const jobStatus = app.enum('job_status', ['pending', 'done', 'failed'])
  export const webhookSource = app.enum('webhook_source', ['lemonsqueezy', 'clerk', 'sanity', 'resend'])
  export const webhookStatus = app.enum('webhook_status', ['received', 'processed', 'failed', 'ignored'])
  export const discordLinkStatus = app.enum('discord_link_status', ['active', 'revoked'])

  const tz = { withTimezone: true } as const
  const createdAt = () => timestamp(tz).defaultNow().notNull()
  const updatedAt = () => timestamp(tz).defaultNow().notNull().$onUpdate(() => new Date())
  /** Money is stored in integer cents, exactly as Lemon Squeezy reports it. */
  const cents = () => integer()

  // ---------- Identity & catalog ----------
  export const users = app.table('users', {
    id: text().primaryKey(), // Clerk user ID
    email: text().notNull(),
    name: text(),
    role: userRole().notNull().default('buyer'),
    lsCustomerId: bigint({ mode: 'number' }),
    releaseEmails: jsonb().$type<Record<string, boolean>>().notNull().default({}),
    deletedAt: timestamp(tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  }, (t) => [uniqueIndex('users_email_uq').on(t.email)])

  export const products = app.table('products', {
    id: text().primaryKey(), // Sanity _id (published)
    slug: text().notNull(),
    name: text().notNull(),
    line: productLine().notNull(),
    inAllAccess: boolean().notNull().default(true),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  }, (t) => [uniqueIndex('products_slug_uq').on(t.slug)])

  export const variants = app.table('variants', {
    lsVariantId: bigint({ mode: 'number' }).primaryKey(),
    lsProductId: bigint({ mode: 'number' }).notNull(),
    productId: text().references(() => products.id), // null for bundles and All-Access
    tier: licenseTier().notNull(),
    activationLimit: integer(), // null = unlimited
    priceCents: cents().notNull(),
    interval: text().$type<'month' | 'year'>(),
    bundleProductIds: text().array().notNull().default(sql`'{}'::text[]`),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  }, (t) => [index('variants_ls_product_idx').on(t.lsProductId)])

  // ---------- Commerce ----------
  export const checkoutSessions = app.table('checkout_sessions', {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => users.id),
    email: text(),
    lsVariantId: bigint({ mode: 'number' }).notNull().references(() => variants.lsVariantId),
    lsCheckoutId: text(),
    status: checkoutStatus().notNull().default('initiated'),
    discountCode: text(),
    utm: jsonb().$type<Record<string, string>>(),
    phDistinctId: text(),
    ipHash: text(),
    orderId: uuid(),
    createdAt: createdAt(),
    completedAt: timestamp(tz),
  }, (t) => [index('checkout_sessions_status_created_idx').on(t.status, t.createdAt)])

  export const orders = app.table('orders', {
    id: uuid().primaryKey().defaultRandom(),
    lsOrderId: bigint({ mode: 'number' }).notNull(),
    orderNumber: integer().notNull(),
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    status: orderStatus().notNull(),
    currency: text().notNull(),
    subtotalUsd: cents().notNull(),
    discountUsd: cents().notNull().default(0),
    taxUsd: cents().notNull().default(0),
    totalUsd: cents().notNull(),
    discountCode: text(),
    receiptUrl: text(),
    checkoutSessionId: uuid().references(() => checkoutSessions.id),
    testMode: boolean().notNull().default(false),
    refundedAt: timestamp(tz),
    createdAt: timestamp(tz).notNull(), // LS created_at
  }, (t) => [
    uniqueIndex('orders_ls_order_id_uq').on(t.lsOrderId),
    index('orders_user_idx').on(t.userId),
    index('orders_email_idx').on(t.customerEmail),
    index('orders_created_idx').on(t.createdAt),
  ])

  export const orderItems = app.table('order_items', {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid().notNull().references(() => orders.id, { onDelete: 'cascade' }),
    lsOrderItemId: bigint({ mode: 'number' }).notNull(),
    lsVariantId: bigint({ mode: 'number' }).notNull().references(() => variants.lsVariantId),
    priceUsd: cents().notNull(),
    quantity: integer().notNull().default(1),
  }, (t) => [uniqueIndex('order_items_ls_uq').on(t.lsOrderItemId)])

  export const subscriptions = app.table('subscriptions', {
    id: uuid().primaryKey().defaultRandom(),
    lsSubscriptionId: bigint({ mode: 'number' }).notNull(),
    lsOrderId: bigint({ mode: 'number' }).notNull(), // initial order; links the subscription's license key
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    lsVariantId: bigint({ mode: 'number' }).notNull().references(() => variants.lsVariantId),
    status: subscriptionStatus().notNull(),
    interval: text().$type<'month' | 'year'>().notNull(),
    unitPriceUsd: cents().notNull(), // per interval, ex-tax (from the variant at sync time)
    cardBrand: text(),
    cardLastFour: text(),
    renewsAt: timestamp(tz),
    endsAt: timestamp(tz),
    trialEndsAt: timestamp(tz),
    pastDueSince: timestamp(tz),
    createdAt: timestamp(tz).notNull(),
    updatedAt: updatedAt(),
  }, (t) => [uniqueIndex('subscriptions_ls_uq').on(t.lsSubscriptionId), index('subscriptions_status_idx').on(t.status)])

  export const subscriptionInvoices = app.table('subscription_invoices', {
    id: uuid().primaryKey().defaultRandom(),
    lsInvoiceId: bigint({ mode: 'number' }).notNull(),
    subscriptionId: uuid().notNull().references(() => subscriptions.id),
    status: text().notNull(), // paid | pending | void | refunded | partial_refund
    billingReason: text().notNull(), // initial | renewal | updated
    subtotalUsd: cents().notNull(),
    taxUsd: cents().notNull(),
    totalUsd: cents().notNull(),
    createdAt: timestamp(tz).notNull(),
  }, (t) => [uniqueIndex('subscription_invoices_ls_uq').on(t.lsInvoiceId), index('subscription_invoices_created_idx').on(t.createdAt)])

  export const paymentEvents = app.table('payment_events', {
    id: uuid().primaryKey().defaultRandom(),
    type: paymentEventType().notNull(),
    userId: text().references(() => users.id),
    subscriptionId: uuid().references(() => subscriptions.id),
    orderId: uuid().references(() => orders.id),
    amountUsd: cents(),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  }, (t) => [index('payment_events_type_created_idx').on(t.type, t.createdAt)])

  export const entitlements = app.table('entitlements', {
    id: uuid().primaryKey().defaultRandom(),
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    kind: entitlementKind().notNull(),
    productId: text().references(() => products.id), // null for all_access
    tier: licenseTier(),
    maxMajor: integer(), // one-time: latest major at purchase time
    sourceOrderItemId: uuid().references(() => orderItems.id),
    sourceSubscriptionId: uuid().references(() => subscriptions.id),
    status: entitlementStatus().notNull().default('active'),
    validFrom: timestamp(tz).notNull().defaultNow(),
    validUntil: timestamp(tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  }, (t) => [
    index('entitlements_user_idx').on(t.userId, t.status),
    index('entitlements_email_idx').on(t.customerEmail),
    uniqueIndex('entitlements_item_product_uq').on(t.sourceOrderItemId, t.productId),
    uniqueIndex('entitlements_subscription_uq').on(t.sourceSubscriptionId).where(sql`source_subscription_id is not null`),
  ])

  // ---------- Licensing ----------
  export const licenseKeys = app.table('license_keys', {
    id: uuid().primaryKey().defaultRandom(),
    lsLicenseKeyId: bigint({ mode: 'number' }).notNull(),
    lsOrderId: bigint({ mode: 'number' }).notNull(),
    lsOrderItemId: bigint({ mode: 'number' }).notNull(),
    lsProductId: bigint({ mode: 'number' }).notNull(),
    orderId: uuid().references(() => orders.id), // linked once order_created is ingested
    subscriptionId: uuid().references(() => subscriptions.id),
    userId: text().references(() => users.id),
    customerEmail: text().notNull(),
    keyCiphertext: text().notNull(), // v1:<iv>:<ciphertext>:<tag> (base64url)
    keyHash: text().notNull(), // HMAC-SHA256(key, pepper), hex
    keyShort: text().notNull(), // LS key_short, for masked display
    status: licenseKeyStatus().notNull(),
    activationLimit: integer(), // null = unlimited
    instancesCount: integer().notNull().default(0),
    expiresAt: timestamp(tz),
    createdAt: timestamp(tz).notNull(),
    updatedAt: updatedAt(),
  }, (t) => [
    uniqueIndex('license_keys_ls_uq').on(t.lsLicenseKeyId),
    uniqueIndex('license_keys_hash_uq').on(t.keyHash),
    index('license_keys_user_idx').on(t.userId),
    index('license_keys_ls_order_idx').on(t.lsOrderId),
  ])

  export const licenseInstances = app.table('license_instances', {
    id: uuid().primaryKey().defaultRandom(),
    lsInstanceId: text().notNull(), // UUID issued by LS
    licenseKeyId: uuid().notNull().references(() => licenseKeys.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    source: instanceSource().notNull(),
    lastValidatedAt: timestamp(tz),
    deactivatedAt: timestamp(tz),
    createdAt: timestamp(tz).notNull(),
  }, (t) => [uniqueIndex('license_instances_ls_uq').on(t.lsInstanceId)])

  export const licenseEvents = app.table('license_events', {
    id: uuid().primaryKey().defaultRandom(),
    licenseKeyId: uuid().notNull().references(() => licenseKeys.id),
    type: licenseEventType().notNull(),
    actor: actorType().notNull(),
    actorUserId: text(),
    instanceId: uuid().references(() => licenseInstances.id),
    ipHash: text(),
    country: text(),
    userAgent: text(),
    meta: jsonb().$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  }, (t) => [
    index('license_events_key_created_idx').on(t.licenseKeyId, t.createdAt),
    index('license_events_type_created_idx').on(t.type, t.createdAt),
  ])

  // ---------- Delivery ----------
  export const releases = app.table('releases', {
    id: uuid().primaryKey().defaultRandom(),
    productId: text().notNull().references(() => products.id),
    semver: text().notNull(),
    major: integer().notNull(),
    minor: integer().notNull(),
    patch: integer().notNull(),
    r2Key: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull(),
    sha256: text().notNull(),
    status: releaseStatus().notNull().default('draft'),
    sanityReleaseId: text(),
    publishedAt: timestamp(tz),
    createdBy: text().references(() => users.id),
    createdAt: createdAt(),
  }, (t) => [
    uniqueIndex('releases_product_semver_uq').on(t.productId, t.semver),
    uniqueIndex('releases_r2_key_uq').on(t.r2Key),
    index('releases_product_published_idx').on(t.productId, t.publishedAt),
  ])

  export const downloadTokens = app.table('download_tokens', {
    jti: uuid().primaryKey().defaultRandom(),
    orderId: uuid().notNull().references(() => orders.id),
    productId: text().notNull().references(() => products.id),
    releaseId: uuid().references(() => releases.id), // null = latest eligible release
    maxUses: integer().notNull().default(5),
    uses: integer().notNull().default(0),
    expiresAt: timestamp(tz).notNull(),
    revokedAt: timestamp(tz),
    createdAt: createdAt(),
  })

  export const downloadEvents = app.table('download_events', {
    id: uuid().primaryKey().defaultRandom(),
    releaseId: uuid().notNull().references(() => releases.id),
    userId: text().references(() => users.id),
    customerEmail: text(),
    entitlementId: uuid().references(() => entitlements.id),
    channel: downloadChannel().notNull(),
    status: downloadStatus().notNull(),
    denyReason: text(),
    ipHash: text(),
    country: text(),
    userAgent: text(),
    createdAt: createdAt(),
  }, (t) => [
    index('download_events_user_created_idx').on(t.userId, t.createdAt),
    index('download_events_release_idx').on(t.releaseId),
  ])

  // ---------- Marketing & growth ----------
  export const discounts = app.table('discounts', {
    id: uuid().primaryKey().defaultRandom(),
    lsDiscountId: bigint({ mode: 'number' }).notNull(),
    code: text().notNull(),
    name: text().notNull(),
    amount: integer().notNull(), // percent (30) or cents (1500)
    amountType: text().$type<'percent' | 'fixed'>().notNull(),
    duration: text().$type<'once' | 'repeating' | 'forever'>(),
    durationInMonths: integer(),
    variantIds: bigint({ mode: 'number' }).array().notNull().default(sql`'{}'::bigint[]`),
    maxRedemptions: integer(),
    startsAt: timestamp(tz),
    expiresAt: timestamp(tz),
    status: discountStatus().notNull().default('active'),
    testMode: boolean().notNull().default(false),
    createdBy: text().references(() => users.id),
    createdAt: createdAt(),
  }, (t) => [
    uniqueIndex('discounts_ls_uq').on(t.lsDiscountId),
    // "Edit" = delete + re-create with the same code, so uniqueness applies to live codes only
    uniqueIndex('discounts_code_live_uq').on(t.code).where(sql`status <> 'deleted'`),
  ])

  export const discordLinks = app.table('discord_links', {
    userId: text().primaryKey().references(() => users.id),
    discordUserId: text().notNull(),
    discordUsername: text(),
    status: discordLinkStatus().notNull().default('active'),
    grantedAt: timestamp(tz).notNull().defaultNow(),
    revokedAt: timestamp(tz),
  }, (t) => [uniqueIndex('discord_links_discord_uq').on(t.discordUserId)])

  // ---------- Reliability ----------
  export const emailOutbox = app.table('email_outbox', {
    id: uuid().primaryKey().defaultRandom(),
    template: text().notNull(),
    to: text().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(), // references only, never secrets
    idempotencyKey: text().notNull(),
    status: emailStatus().notNull().default('pending'),
    resendId: text(),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp(tz).notNull().defaultNow(),
    lastError: text(),
    sentAt: timestamp(tz),
    createdAt: createdAt(),
  }, (t) => [
    uniqueIndex('email_outbox_idem_uq').on(t.idempotencyKey),
    index('email_outbox_due_idx').on(t.status, t.nextAttemptAt),
  ])

  export const jobOutbox = app.table('job_outbox', {
    id: uuid().primaryKey().defaultRandom(),
    kind: jobKind().notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text().notNull(),
    status: jobStatus().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp(tz).notNull().defaultNow(),
    lastError: text(),
    doneAt: timestamp(tz),
    createdAt: createdAt(),
  }, (t) => [
    uniqueIndex('job_outbox_idem_uq').on(t.idempotencyKey),
    index('job_outbox_due_idx').on(t.status, t.nextAttemptAt),
  ])

  export const webhookEvents = app.table('webhook_events', {
    id: uuid().primaryKey().defaultRandom(),
    source: webhookSource().notNull(),
    eventName: text().notNull(),
    idempotencyKey: text().notNull(),
    payload: jsonb().notNull(),
    status: webhookStatus().notNull().default('received'),
    error: text(),
    attempts: integer().notNull().default(1),
    durationMs: integer(),
    receivedAt: timestamp(tz).notNull().defaultNow(),
    processedAt: timestamp(tz),
  }, (t) => [
    uniqueIndex('webhook_events_idem_uq').on(t.idempotencyKey),
    index('webhook_events_source_received_idx').on(t.source, t.receivedAt),
  ])

  // ---------- Analytics ----------
  export const mrrSnapshots = app.table('mrr_snapshots', {
    date: date({ mode: 'string' }).primaryKey(),
    mrrCents: integer().notNull(),
    activeSubscriptions: integer().notNull(),
    newCents: integer().notNull(),
    expansionCents: integer().notNull(),
    contractionCents: integer().notNull(),
    churnedCents: integer().notNull(),
    reactivatedCents: integer().notNull(),
  })

  export const mrrSubscriptionDays = app.table('mrr_subscription_days', {
    subscriptionId: uuid().notNull().references(() => subscriptions.id),
    date: date({ mode: 'string' }).notNull(),
    mrrCents: integer().notNull(),
  }, (t) => [primaryKey({ columns: [t.subscriptionId, t.date] })])

  export const auditLog = app.table('audit_log', {
    id: uuid().primaryKey().defaultRandom(),
    actorUserId: text().notNull().references(() => users.id),
    action: text().notNull(), // e.g. 'license_key.limit_changed'
    targetType: text().notNull(),
    targetId: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    reason: text(),
    ipHash: text(),
    userAgent: text(),
    createdAt: createdAt(),
  }, (t) => [index('audit_log_target_idx').on(t.targetType, t.targetId), index('audit_log_created_idx').on(t.createdAt)])
  ```
  - **Done when:** `drizzle-kit generate` produces a clean initial migration with every table in schema `app`.

- [ ] **P2.04 — Migrations, RLS & privileges** _(2 h)_ [NFR-SEC-12]
  - `pnpm drizzle-kit generate` → review SQL → `pnpm drizzle-kit generate --custom --name=security` and add:

  ```sql
  -- RLS on every table. Only lumira_app gets a policy, so Supabase's anon/authenticated roles
  -- are denied even if the schema is ever exposed through the Data API by mistake.
  do $$ declare t record; begin
    for t in select tablename from pg_tables where schemaname = 'app' loop
      execute format('alter table app.%I enable row level security', t.tablename);
      execute format('create policy lumira_app_all on app.%I for all to lumira_app using (true) with check (true)', t.tablename);
    end loop;
  end $$;
  revoke update, delete on app.audit_log from lumira_app;  -- append-only
  ```
  - CI job `migrate` on `main` and `staging` runs `drizzle-kit migrate` with `DATABASE_URL_DIRECT`. Local: `docker compose up postgres` (Postgres 17).
  - **Done when:** migrations apply on a fresh database and `update app.audit_log …` as `lumira_app` fails with "permission denied".

- [ ] **P2.05 — Domain services & eligibility** _(4 h)_ [PRD §7.3]
  - `src/server/entitlements.ts`: `canDownload(identity, releaseId)`, `grantFromOrderItem(tx, …)`, `revokeForOrder(tx, orderId)`, `isVerifiedLicenseHolder(userId)`, `productsCoveredByKey(keyId)`.
  - Table-driven Vitest suite covering: one-time within major, one-time next major (denied), comp, All-Access active, All-Access expired (release before and after `valid_until`), suspended, revoked, yanked release.
  - **Done when:** all eligibility cases pass.

- [ ] **P2.06 — Seed data** _(1.5 h)_ ⇄
  - `scripts/seed.ts`: 3 products (boilerplate, UI kit, template), variants mapped to LS **test-mode** IDs, 1 admin user, draft releases, synthetic orders and subscriptions across 90 days (dev and staging only).
  - **Done when:** `pnpm db:seed` makes the admin charts non-empty locally.

- [ ] **P2.07 — Webhook ledger + Clerk → Postgres sync** _(3.5 h)_ [FR-SYS-01, NFR-SEC-02, F-13]

  Shared by every webhook route (Clerk now; Sanity, Lemon Squeezy and Resend later):

  ```ts
  // src/server/webhooks/ledger.ts
  import 'server-only'
  import crypto from 'node:crypto'
  import { after } from 'next/server'
  import { eq, sql } from 'drizzle-orm'
  import { db } from '@/db/client'
  import { webhookEvents } from '@/db/schema'
  import { drainOutboxes } from '@/server/outbox/dispatch' // no-op stub until P6.11

  type Source = (typeof webhookEvents.$inferInsert)['source']

  /** Record → process once → mark. Failed events return 500 so the sender re-delivers; handlers are upsert-safe. */
  export async function recordWebhook(
    source: Source, eventName: string, dedupeKey: string, payload: unknown, handle: () => Promise<void>,
  ): Promise<Response> {
    const idempotencyKey = crypto.createHash('sha256').update(`${source}:${dedupeKey}`).digest('hex')
    const [row] = await db.insert(webhookEvents)
      .values({ source, eventName, idempotencyKey, payload })
      .onConflictDoUpdate({ target: webhookEvents.idempotencyKey, set: { attempts: sql`${webhookEvents.attempts} + 1` } })
      .returning({ id: webhookEvents.id, status: webhookEvents.status })
    if (row!.status === 'processed') return Response.json({ duplicate: true })

    const started = Date.now()
    try {
      await handle()
      await db.update(webhookEvents)
        .set({ status: 'processed', error: null, processedAt: new Date(), durationMs: Date.now() - started })
        .where(eq(webhookEvents.id, row!.id))
      after(() => drainOutboxes({ limit: 25 }))
      return Response.json({ ok: true })
    } catch (error) {
      await db.update(webhookEvents)
        .set({ status: 'failed', error: String(error), durationMs: Date.now() - started })
        .where(eq(webhookEvents.id, row!.id))
      return new Response('Processing failed', { status: 500 })
    }
  }
  ```

  ```ts
  // src/app/api/webhooks/clerk/route.ts
  import { verifyWebhook } from '@clerk/nextjs/webhooks'
  import { handleClerkEvent } from '@/server/webhooks/clerk'
  import { recordWebhook } from '@/server/webhooks/ledger'

  export async function POST(req: Request) {
    let evt
    try {
      evt = await verifyWebhook(req) // CLERK_WEBHOOK_SIGNING_SECRET
    } catch {
      return new Response('Invalid signature', { status: 400 })
    }
    return recordWebhook('clerk', evt.type, `${evt.type}:${evt.data.id ?? ''}:${req.headers.get('svix-id')}`, evt, () => handleClerkEvent(evt))
  }
  ```
  - `user.created` / `user.updated`: upsert `users` (primary email, name); for every **verified** email, claim orders, entitlements and keys where `user_id is null and customer_email = email`. `user.deleted`: anonymize (`email = deleted+{id}@lumira.invalid`, `deleted_at`), enqueue `discord_revoke`. `session.created`: activity entry.
  - Register the endpoint in Clerk → Webhooks; locally tunnel with `cloudflared tunnel --url http://localhost:3000`.
  - **Done when:** signing up creates a `users` row, and a guest order for that email appears in the new account after email verification.

### 2B · Sanity (content, products, changelog)

- [ ] **P2.08 — Studio project** _(1.5 h)_
  - `pnpm create sanity@latest` in `studio/` (datasets `production`, `staging`); CORS origins `https://lumira.dev`, `https://staging.lumira.dev`, `http://localhost:3000`; tokens: Viewer (read) and Editor (write, server-only); `sanity deploy` → `lumira.sanity.studio`.

- [ ] **P2.09 — Content schemas** _(5 h)_ [FR-SF-01, FR-CL-01, FR-LP-04]

  ```ts
  // studio/schemaTypes/product.ts
  import { defineArrayMember, defineField, defineType } from 'sanity'

  export const product = defineType({
    name: 'product',
    title: 'Product',
    type: 'document',
    groups: [{ name: 'content', default: true }, { name: 'commerce' }, { name: 'demo' }, { name: 'seo' }],
    fields: [
      defineField({ name: 'name', type: 'string', group: 'content', validation: (r) => r.required().max(60) }),
      defineField({ name: 'slug', type: 'slug', group: 'content', options: { source: 'name', maxLength: 64 }, validation: (r) => r.required() }),
      defineField({ name: 'line', type: 'string', group: 'content', options: { list: ['boilerplate', 'ui_kit', 'template'], layout: 'radio' }, validation: (r) => r.required() }),
      defineField({ name: 'templateType', type: 'string', group: 'content', options: { list: ['portfolio', 'landing', 'docs', 'blog'] }, hidden: ({ document }) => document?.line !== 'template' }),
      defineField({ name: 'tagline', type: 'string', group: 'content', validation: (r) => r.required().max(90) }),
      defineField({ name: 'description', type: 'array', group: 'content', of: [defineArrayMember({ type: 'block' })] }),
      defineField({
        name: 'hero', type: 'image', group: 'content', options: { hotspot: true },
        fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
        validation: (r) => r.required(),
      }),
      defineField({ name: 'heroDark', type: 'image', group: 'content', options: { hotspot: true } }),
      defineField({ name: 'hoverVideo', type: 'file', group: 'content', options: { accept: 'video/webm,video/mp4' } }),
      defineField({ name: 'stack', type: 'array', group: 'content', of: [defineArrayMember({ type: 'reference', to: [{ type: 'techStack' }] })], validation: (r) => r.max(6) }),
      defineField({ name: 'features', type: 'array', group: 'content', of: [defineArrayMember({ type: 'featureTile' })] }),
      defineField({ name: 'fileTree', type: 'text', group: 'content', description: 'Output of `tree -L 2`, rendered in Geist Mono' }),
      defineField({ name: 'faq', type: 'array', group: 'content', of: [defineArrayMember({ type: 'reference', to: [{ type: 'faq' }] })] }),
      defineField({
        name: 'licenses', type: 'array', group: 'commerce',
        of: [defineArrayMember({
          type: 'object', name: 'license',
          fields: [
            defineField({ name: 'tier', type: 'string', options: { list: ['personal', 'team', 'extended'] }, validation: (r) => r.required() }),
            defineField({ name: 'lsProductId', type: 'number', validation: (r) => r.required().integer().positive() }),
            defineField({ name: 'lsVariantId', type: 'number', validation: (r) => r.required().integer().positive() }),
            defineField({ name: 'priceCents', type: 'number', readOnly: true, description: 'Synced from Lemon Squeezy (P5.02)' }),
            defineField({ name: 'activationLimit', type: 'number', readOnly: true }),
            defineField({ name: 'buyUrl', type: 'url', description: 'Hosted checkout fallback (PRD §6.7)' }),
            defineField({ name: 'rights', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
          ],
          preview: { select: { title: 'tier', subtitle: 'lsVariantId' } },
        })],
        validation: (r) => r.required().min(1),
      }),
      defineField({ name: 'inAllAccess', type: 'boolean', group: 'commerce', initialValue: true }),
      defineField({
        name: 'demo', type: 'object', group: 'demo',
        fields: [
          defineField({
            name: 'origin', type: 'url',
            validation: (r) => r.uri({ scheme: ['https'] }).custom((v) =>
              !v || /^https:\/\/[a-z0-9-]+\.lumira-demos\.dev$/.test(v) ? true : 'Must be https://{slug}.lumira-demos.dev'),
          }),
          defineField({
            name: 'pages', type: 'array',
            of: [defineArrayMember({ type: 'object', fields: [
              defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
              defineField({ name: 'path', type: 'string', validation: (r) => r.required().regex(/^\//) }),
            ] })],
          }),
          defineField({ name: 'supportsTheme', type: 'boolean', initialValue: false }),
          defineField({
            name: 'gallery', type: 'array',
            of: [defineArrayMember({ type: 'image', fields: [
              defineField({ name: 'device', type: 'string', options: { list: ['desktop', 'tablet', 'mobile'] } }),
              defineField({ name: 'alt', type: 'string' }),
            ] })],
          }),
          defineField({
            name: 'lighthouse', type: 'object',
            fields: ['performance', 'accessibility', 'bestPractices', 'seo'].map((name) =>
              defineField({ name, type: 'number', validation: (r) => r.min(0).max(100) })),
          }),
        ],
      }),
      defineField({ name: 'seo', type: 'seo', group: 'seo' }),
    ],
    preview: { select: { title: 'name', subtitle: 'line', media: 'hero' } },
  })
  ```

  ```ts
  // studio/schemaTypes/release.ts
  import { defineArrayMember, defineField, defineType } from 'sanity'

  const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/

  export const release = defineType({
    name: 'release',
    title: 'Release',
    type: 'document',
    fields: [
      defineField({ name: 'product', type: 'reference', to: [{ type: 'product' }], validation: (r) => r.required() }),
      defineField({ name: 'version', type: 'string', validation: (r) => r.required().regex(SEMVER, { name: 'semver' }) }),
      defineField({ name: 'type', type: 'string', options: { list: ['major', 'minor', 'patch'], layout: 'radio' }, validation: (r) => r.required() }),
      defineField({ name: 'releasedAt', type: 'datetime', validation: (r) => r.required() }),
      defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(80) }),
      defineField({ name: 'summary', type: 'text', rows: 3, validation: (r) => r.required().max(280) }),
      defineField({ name: 'highlights', type: 'array', of: [defineArrayMember({ type: 'block' }), defineArrayMember({ type: 'image' })] }),
      defineField({
        name: 'changes', type: 'array',
        of: [defineArrayMember({
          type: 'object', name: 'change',
          fields: [
            defineField({ name: 'kind', type: 'string', options: { list: ['added', 'improved', 'fixed', 'removed', 'deprecated', 'security', 'breaking'] }, validation: (r) => r.required() }),
            defineField({ name: 'text', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'docsPath', type: 'string', validation: (r) => r.regex(/^\/docs\//) }),
          ],
          preview: { select: { title: 'text', subtitle: 'kind' } },
        })],
      }),
      defineField({
        name: 'upgradeGuide', type: 'array', of: [defineArrayMember({ type: 'block' })],
        validation: (r) => r.custom((value, ctx) =>
          ctx.document?.type === 'major' && !(value as unknown[] | undefined)?.length ? 'Major releases need an upgrade guide' : true),
      }),
      defineField({ name: 'compatibility', type: 'object', fields: ['next', 'react', 'tailwind', 'node'].map((name) => defineField({ name, type: 'string' })) }),
      defineField({ name: 'releaseId', type: 'string', readOnly: true, description: 'Postgres releases.id (written by the admin publish flow)' }),
    ],
    orderings: [{ title: 'Newest', name: 'releasedAtDesc', by: [{ field: 'releasedAt', direction: 'desc' }] }],
    preview: {
      select: { version: 'version', product: 'product.name' },
      prepare: ({ version, product }) => ({ title: `v${version}`, subtitle: product }),
    },
  })
  ```
  - Also define: `category`, `techStack` (name, logo SVG, version), `featureTile`, `faq`, `testimonial` (with a `permissionGranted` boolean that is required to publish), `bundle` (LS ids + `includes[]` product refs), `homePage` (singleton; `bands[]` of `{ preset, rows, tiles[] }` validated with `validateBands` from SG §4.3, shared through a small `@lumira/bento` package), `siteSettings` (singleton: navigation, footer, `affiliate { commissionRate, cookieDays }`, `promoBanner`), `post`, `author`, `legalPage`, `redirect`, `seo` object.
  - **Done when:** Studio blocks publishing a product without a variant ID, a release with an invalid semver, and a home band that fails `validateBands`.

- [ ] **P2.10 — Desk structure & Presentation** _(2 h)_
  - Singletons pinned; products grouped by line; releases listed per product (newest first); Presentation tool pointing to `https://lumira.dev/api/draft-mode/enable` (preview URL resolver per document type).

- [ ] **P2.11 — TypeGen** _(1 h)_
  - `sanity schema extract && sanity typegen generate` → `src/sanity/types.ts`; `pnpm typegen` script; CI drift check.

- [ ] **P2.12 — Cached data layer** _(3 h)_ [NFR-PERF-06]

  ```ts
  // src/lib/sanity/fetchers.ts
  import 'server-only'
  import { cacheLife, cacheTag } from 'next/cache'
  import { defineQuery } from 'next-sanity'
  import { sanity } from './client'

  const PRODUCT_BY_SLUG = defineQuery(`*[_type == "product" && slug.current == $slug][0]{
    _id, name, "slug": slug.current, line, tagline, description, hero, heroDark, "video": hoverVideo.asset->url,
    stack[]->{ name, logo, version }, features, fileTree, faq[]->{ question, answer },
    licenses[]{ tier, lsVariantId, priceCents, activationLimit, rights, buyUrl }, inAllAccess, demo, seo,
    "latestRelease": *[_type == "release" && references(^._id)] | order(releasedAt desc)[0]{ version, releasedAt, compatibility }
  }`)

  export async function getProduct(slug: string) {
    'use cache'
    cacheLife('max')
    cacheTag(`product:${slug}`, 'catalog')
    return sanity.fetch(PRODUCT_BY_SLUG, { slug })
  }
  ```
  - Same pattern for `getHome()` (`home`), `getCatalog(filters)` (`catalog`), `getChangelog(productSlug?)` (`changelog`, `release:{slug}`), `getSiteSettings()` (`site-settings`).
  - **Done when:** a PDP renders from cache with no Sanity request per page view (verify in Sanity usage graphs).

- [ ] **P2.13 — Sanity webhook → cache & mirror** _(2 h)_ [FR-SYS-02, FR-SYS-09]

  ```ts
  // src/app/api/webhooks/sanity/route.ts
  import { revalidateTag } from 'next/cache'
  import { parseBody } from 'next-sanity/webhook'
  import { env } from '@/lib/env'
  import { syncProductMirror } from '@/server/catalog/mirror'

  type Payload = { _type: string; _id: string; slug?: string; product?: string }
  const NOW = { expire: 0 } as const // prices & catalog: never serve stale after an edit

  export async function POST(req: Request) {
    const { isValidSignature, body } = await parseBody<Payload>(req, env.SANITY_WEBHOOK_SECRET)
    if (!isValidSignature || !body?._type) return new Response('Invalid signature', { status: 401 })

    switch (body._type) {
      case 'product':
        await syncProductMirror(body._id) // upsert app.products + app.variants
        revalidateTag(`product:${body.slug}`, NOW)
        revalidateTag('catalog', NOW)
        revalidateTag('home', NOW)
        break
      case 'release':
        revalidateTag(`release:${body.product}`, 'max')
        revalidateTag('changelog', 'max')
        revalidateTag(`product:${body.product}`, NOW)
        break
      case 'homePage':
        revalidateTag('home', NOW)
        break
      case 'siteSettings':
        revalidateTag('site-settings', NOW)
        break
      default:
        revalidateTag(body._type, 'max')
    }
    return Response.json({ revalidated: true })
  }
  ```
  - Sanity → API → Webhooks: GROQ filter `_type in ["product","release","homePage","siteSettings","category","bundle","post"]`, projection `{_type, _id, "slug": slug.current, "product": product->slug.current}`, secret = `SANITY_WEBHOOK_SECRET`.
  - **Done when:** publishing a price change in Studio shows the new price on the next PDP request.

- [ ] **P2.14 — Draft Mode & Visual Editing** _(1.5 h)_ ⇄
  - `/api/draft-mode/enable` with `defineEnableDraftMode` (next-sanity) and `<VisualEditing />` rendered only when `draftMode().isEnabled`.

**Phase 2 exit criteria (M1):** migrations on staging; Clerk ↔ `users` sync; Studio live with schemas and seed content; publish → revalidate works end to end.

---

## Phase 3 — Lumira Storefront & Bento Grid UI (Weeks 3–4 · ~68 h)

**Goal:** the public storefront (home, catalog, PDP, changelog, All-Access, bundles, affiliates) built on the Bento Grid 2.0 system, fast and accessible.

- [ ] **P3.01 — Brand primitives** _(4 h)_ [SG §3.5, §5.3]
  - `VersionPill` (mono, `rounded-md`), `StackBadge` (14 px mono logo + label), `PriceTag` (`Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, proportional figures, `whitespace-nowrap`), `SectionHeader` (eyebrow + `display-lg` + lead), `ThemedImage` (SG §2.4), `CopyButton` (SG §6.4.8).
  - **Done when:** each primitive has a Vitest render test and a light/dark Playwright snapshot.

- [ ] **P3.02 — Bento system** _(6 h)_ [SG §4]
  - `BentoGrid`, `BentoTile` (SG §5.5), `packages/bento` with `validateBands` + `centroid` (SG §4.3) shared by the app and Studio; `useSpotlight(gridRef)` (single delegated `pointermove`, rAF-batched, `pointer: fine` only).
  - Unit tests: the SG §4.3 worked example (5.71 / 6.50 → mean 6.11 passes; 5.71 / 5.30 → 5.51 fails), repeated preset, 13-column band, two heroes.
  - Visual snapshots of all 10 presets at 375 / 834 / 1440 px in both themes.
  - **Done when:** the snapshots are approved and `validateBands` has 100 % branch coverage.

- [ ] **P3.03 — Tile kinds & band renderer** _(6 h)_ [FR-SF-01]
  - One component per `TileKind` (SG §4.4 table): `FeaturedProductTile` (bleed media + hover video), `StatTile`, `TestimonialTile`, `StackBadgesTile`, `ChangelogTeaserTile`, `DocsTeaserTile` (Shiki server-rendered), `AllAccessTile` (the brand tile + border beam), `VideoTile` (with a visible pause control).
  - `BentoBands` maps Sanity `homePage.bands[]` to presets. If `validateBands` fails at render, it falls back to `lead-left` / `golden-right` alternation and reports a Sentry warning.
  - **Done when:** the home bands from seed content render, and a deliberately invalid band shows the fallback, not a broken layout.

- [ ] **P3.04 — Header, footer & affiliate engine** _(5 h)_ [FR-GL-01, FR-GL-04, FR-GS-01..03]
  - Header per SG §6.4.10 (glass condense, `viewTransitionName: 'site-header'`), nav, ⌘K trigger, theme toggle with the circular reveal (SG §6.5.6), account chip in `<Suspense>` reading `await auth()`.
  - Footer from `siteSettings`: product links, resources, legal, the MoR line, and **"Affiliates · Earn {commissionRate}%"** → `/affiliates` (commission, cookie window, payouts through LS, FAQ) → CTA to `https://{store}.lemonsqueezy.com/affiliates`.
  - Affiliate tracking in the `(site)` root layout only. One inline script guarantees the config exists before `affiliate.js` runs:

  ```tsx
  // src/app/(site)/layout.tsx (excerpt)
  <Script id="ls-affiliate" strategy="afterInteractive">{`
    window.lemonSqueezyAffiliateConfig = { store: ${JSON.stringify(env.NEXT_PUBLIC_LS_STORE_SLUG)} };
    var s = document.createElement('script');
    s.src = 'https://lmsqueezy.com/affiliate.js'; s.defer = true;
    document.head.appendChild(s);
  `}</Script>
  ```
  - **Done when:** visiting `/?aff=TEST` stores LS's affiliate tracking ID (`LemonSqueezy.Affiliate.GetID()` returns it once Lemon.js is loaded in P5.05), and the footer link reads the rate from Sanity.

- [ ] **P3.05 — Home page** _(5 h)_ [FR-SF-02]
  - Sections in PRD order; hero glow (SG §4.7); `Reveal` only below the fold (SG §6.4.6); the hero LCP image eager with high fetch priority; "New & Updated" rail sorted by latest release date.
  - **Done when:** home LCP ≤ 1.8 s in Lighthouse mobile and CLS ≤ 0.05.

- [ ] **P3.06 — Catalog & filters** _(6 h)_ [FR-SF-03, FR-SF-04, FR-SF-06]
  - `pnpm add nuqs`; wrap both root layouts with `NuqsAdapter` from `nuqs/adapters/next/app`.

  ```ts
  // src/app/(site)/(storefront)/catalog-params.ts
  import { createSearchParamsCache, parseAsArrayOf, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server'

  export const catalogParams = {
    type: parseAsStringLiteral(['portfolio', 'landing', 'docs', 'blog'] as const),
    stack: parseAsArrayOf(parseAsString).withDefault([]),
    features: parseAsArrayOf(parseAsString).withDefault([]),
    maxPrice: parseAsInteger,
    sort: parseAsStringLiteral(['updated', 'newest', 'popular', 'price-asc', 'price-desc'] as const).withDefault('updated'),
  }
  export const catalogCache = createSearchParamsCache(catalogParams)
  ```

  ```tsx
  // src/app/(site)/(storefront)/templates/page.tsx
  export default function TemplatesPage({ searchParams }: PageProps<'/templates'>) {
    return (
      <PageTransition>
        <CatalogHeader line="template" />
        <FilterBar />                                       {/* client: useQueryStates(catalogParams, { shallow: false }) + useTransition */}
        <Suspense fallback={<CatalogGridSkeleton />}>
          <CatalogResults line="template" searchParams={searchParams} />
        </Suspense>
      </PageTransition>
    )
  }

  async function CatalogResults({ line, searchParams }: { line: 'template'; searchParams: PageProps<'/templates'>['searchParams'] }) {
    const filters = catalogCache.parse(await searchParams)
    const products = await getCatalog({ line, ...filters }) // "use cache" keyed by its arguments, tag 'catalog'
    return products.length ? <ProductGrid products={products} /> : <CatalogEmpty />
  }
  ```
  - Multi-facet URLs emit `robots: { index: false, follow: true }` with a canonical to the category root [NFR-SEO-06].
  - **Done when:** filter URLs are shareable, back/forward restores state, and the grid crossfades between filter states (`<ViewTransition key={filtersKey} name="collection-content" share="auto" enter="auto" default="none">`).

- [ ] **P3.07 — Product card** _(3 h)_ ⇄ [FR-SF-05]
  - Poster wrapped in `<ViewTransition name={'product-media-' + slug} share="morph" default="none">` (SG §6.5.3); hover video starts after 80 ms of hover intent, never under reduced motion or `navigator.connection.saveData`; freshness label; `Link` with `transitionTypes={['nav-forward']}`.

- [ ] **P3.08 — Product Detail Page** _(8 h)_ [FR-SF-07..11]
  - Sections per FR-SF-07; sticky purchase rail (desktop right column, mobile bottom bar with safe-area inset); license comparison table; changelog excerpt (latest 3); docs quick links; related products.
  - Ownership hole (FR-SF-11): `<Suspense fallback={<BuyRail />}><OwnershipAwareBuyRail slug={slug} /></Suspense>`, which reads `auth()` and entitlements; checkout wiring lands in P5.06.
  - Preconnect to the demo origin when the Live Preview CTA is hovered or focused (`<link rel="preconnect">` inserted on intent).
  - JSON-LD (escaped against `</script>` injection):

  ```tsx
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': ['Product', 'SoftwareApplication'],
    name: product.name,
    description: product.tagline,
    image: urlFor(product.hero).width(1200).height(750).url(),
    applicationCategory: 'DeveloperApplication',
    brand: { '@type': 'Brand', name: 'Lumira' },
    offers: product.licenses.map((l) => ({
      '@type': 'Offer',
      name: `${product.name} — ${l.tier} license`,
      price: (l.priceCents / 100).toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${env.NEXT_PUBLIC_APP_URL}/products/${product.slug}`,
    })),
  }
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
  ```
  - **Done when:** Rich Results Test validates the product, and PDP LCP ≤ 2.0 s (Lighthouse mobile).

- [ ] **P3.09 — View Transitions** _(4 h)_ [FR-GL-06, SG §6.5]
  - `PageTransition` in every storefront `page.tsx` (never in layouts); `transitionTypes` on hierarchy links; card ↔ PDP morph names; header anchoring; `view-transitions.css`; theme reveal.
  - **Done when:** catalog → PDP morphs in Chrome and Safari, back links slide right, reduced motion swaps instantly, and Firefox without support navigates normally.

- [ ] **P3.10 — Changelog UI & feeds** _(5 h)_ [FR-CL-02..05, FR-CL-07]
  - `/changelog` (timeline grouped by month, filters by product and change kind, "New" < 14 days, anchors `#{product}-v2-3-0`), `/products/[slug]/changelog` (breaking-change callouts, upgrade guide accordion).

  ```ts
  // src/app/(site)/changelog/feed.xml/route.ts
  import { env } from '@/lib/env'
  import { getChangelog } from '@/lib/sanity/fetchers'

  const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!)

  export async function GET() {
    const site = env.NEXT_PUBLIC_APP_URL
    const releases = await getChangelog() // cached, tags 'changelog'
    const entries = releases.map((r) => {
      const anchor = `${r.productSlug}-v${r.version.replaceAll('.', '-')}`
      return `<entry><id>${site}/changelog#${anchor}</id><title>${xml(`${r.productName} v${r.version}: ${r.title}`)}</title>`
        + `<updated>${new Date(r.releasedAt).toISOString()}</updated><link href="${site}/changelog#${anchor}"/>`
        + `<summary>${xml(r.summary)}</summary></entry>`
    }).join('')
    const updated = new Date(releases[0]?.releasedAt ?? Date.now()).toISOString()
    return new Response(
      `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Lumira Changelog</title>`
      + `<id>${site}/changelog</id><link rel="self" href="${site}/changelog/feed.xml"/><updated>${updated}</updated>${entries}</feed>`,
      { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } },
    )
  }
  ```
  - **Done when:** a release published in Studio appears on `/changelog`, on the product changelog and in the feed, and a yanked release shows "Withdrawn".

- [ ] **P3.11 — All-Access, bundles, affiliates & legal pages** _(3 h)_ ⇄ [FR-SF-12, FR-SF-13]

- [ ] **P3.12 — Command palette (⌘K)** _(3 h)_ [FR-GL-02]
  - shadcn `Command` in a `MotionDialog`; groups: Products (cached catalog), Changelog versions, Actions; Docs results join in P4.19.

- [ ] **P3.13 — SEO plumbing** _(4 h)_ [NFR-SEO-01..08]
  - `generateMetadata` helper from the Sanity `seo` object; `opengraph-image.tsx` for products and changelog entries (`next/og`, Geist fonts, tokens as hex); `sitemap.ts`; `robots.ts` (disallow `/account`, `/admin`, `/api`, `/checkout`, `/d/`, `/auth`, `/products/*/preview`); Sanity `redirect` documents fetched in `next.config.ts` `redirects()`.
  - **Done when:** `sitemap.xml` lists every public page with `lastModified`, and OG previews render in a social card validator.

- [ ] **P3.14 — Analytics instrumentation** _(1.5 h)_ [FR-AN-07]
  - `product_viewed`, `catalog_filtered`, `affiliate_link_clicked`, `docs_searched` through `track()`; events typed against PRD §8.2.

- [ ] **P3.15 — Performance & accessibility gates** _(4 h)_ [NFR-PERF-01, NFR-A11Y-01]

  ```json
  {
    "ci": {
      "collect": { "numberOfRuns": 3 },
      "assert": {
        "assertMatrix": [
          { "matchingUrlPattern": ".*/products/[^/]+/preview$", "assertions": {
            "categories:performance": ["error", { "minScore": 0.9 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.02 }] } },
          { "matchingUrlPattern": "^(?!.*preview$).*$", "assertions": {
            "categories:performance": ["error", { "minScore": 0.95 }],
            "categories:accessibility": ["error", { "minScore": 1 }],
            "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }],
            "cumulative-layout-shift": ["error", { "maxNumericValue": 0.05 }],
            "total-blocking-time": ["error", { "maxNumericValue": 150 }] } }
        ]
      }
    }
  }
  ```
  - The CI job injects the preview URLs (home, catalog, PDP, preview, docs) through `LHCI_COLLECT__URL`; `@axe-core/playwright` scans the same pages in both themes.
  - **Done when:** both gates block a PR that regresses them.

**Phase 3 exit criteria:** storefront on staging with real Sanity content; Lighthouse mobile ≥ 95 on PDP; axe clean; View Transitions working.

---

## Phase 4 — Live Preview Engine & Documentation Layer (Weeks 5–6 · ~64 h)

### 4A · Live Preview / iframe engine

- [ ] **P4.01 — Demo hosting on an isolated domain** _(4 h)_ [FR-LP-01, FR-LP-02, FR-LP-11]
  - Register `lumira-demos.dev`. One Vercel project per demo (built from the product repo's `demo` branch) with domain `{slug}.lumira-demos.dev`.
  - Every demo sends:

  ```ts
  // demo repo: next.config.ts (excerpt)
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: 'frame-ancestors https://lumira.dev https://staging.lumira.dev' },
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    }]
  }
  ```
  - Demo CI runs Lighthouse (mobile LCP ≤ 2.5 s).
  - **Done when:** a demo loads inside the Lumira preview, refuses to be framed by any other origin, and is excluded from search engines.

- [ ] **P4.02 — `@lumira/preview-bridge` package** _(4 h)_ [FR-LP-06, SG §7.8]
  - Protocol schemas (SG §7.8), the host hook, and the demo-side script. Client-side navigation reporting:

  ```ts
  // packages/preview-bridge/src/demo.ts (excerpt)
  const notify = () => post({ type: 'navigate', path: location.pathname + location.search, title: document.title })
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = history[method]
    history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args)
      queueMicrotask(notify)
      return result
    }
  }
  window.addEventListener('popstate', notify)
  ```
  - **Done when:** navigating inside a demo updates the player's page picker and `?path=`, and a message from any other origin is ignored (unit test).

- [ ] **P4.03 — Player core** _(8 h)_ [FR-LP-03, FR-LP-07, SG §7.3–§7.4]
  - `devices.ts` (`computeFrame`), `use-stage-size.ts` (ResizeObserver, rAF-throttled), `use-device-frame.ts` (SG §7.4), `device-frame.tsx`, and the player state machine:

  ```ts
  // src/components/preview/state.ts
  import type { DeviceKey } from './devices'

  export type PreviewState = {
    status: 'loading' | 'slow' | 'ready' | 'failed' | 'hidden'
    device: DeviceKey
    rotated: boolean
    path: string
    failure?: 'timeout' | 'bridge_error' | 'network'
  }

  export type PreviewAction =
    | { type: 'load' } | { type: 'slow' } | { type: 'ready' }
    | { type: 'fail'; reason: NonNullable<PreviewState['failure']> }
    | { type: 'device'; device: DeviceKey } | { type: 'rotate' }
    | { type: 'navigate'; path: string } | { type: 'hide' } | { type: 'show' }

  export function reducer(state: PreviewState, action: PreviewAction): PreviewState {
    switch (action.type) {
      case 'load': return { ...state, status: 'loading', failure: undefined }
      case 'slow': return state.status === 'loading' ? { ...state, status: 'slow' } : state
      case 'ready': return { ...state, status: 'ready' }
      case 'fail': return state.status === 'ready' ? state : { ...state, status: 'failed', failure: action.reason }
      case 'device': return { ...state, device: action.device, rotated: action.device === 'desktop' || action.device === 'fit' ? false : state.rotated }
      case 'rotate': return state.device === 'tablet' || state.device === 'mobile' ? { ...state, rotated: !state.rotated } : state
      case 'navigate': return { ...state, path: action.path }
      case 'hide': return { ...state, status: 'hidden' }
      case 'show': return { ...state, status: 'loading' }
    }
  }
  ```
  - Timers: entering `loading` starts 3 s → `slow` and 8 s → `fail('timeout')`; `ready` clears them. URL state (`device`, `rotated`, `path`) through `nuqs` with `history: 'replace'`.
  - **Done when:** switching devices never reloads the iframe (Playwright asserts a single `load` event) and the frame settles in ≤ 300 ms.

- [ ] **P4.04 — Toolbar, controls & shortcuts** _(6 h)_ [FR-LP-04, SG §7.5]
  - Segmented device control with the `layoutId` indicator (SG §6.4.2), rotate, page picker, reload, open in new tab, theme hint (bridge `set-theme`), shortcut help popover, `aria-live` announcements, "Skip to buy" link.
  - `use-preview-shortcuts.ts` ignores events from inputs, selects, textareas and contenteditable, and any Ctrl/⌘/Alt combination.

- [ ] **P4.05 — Routes: full page + intercepted modal** _(3 h)_ [FR-LP-01]

  ```
  src/app/(site)/layout.tsx                                      → renders {children}{modal}
  src/app/(site)/@modal/default.tsx                              → export default function Default() { return null }
  src/app/(site)/@modal/(.)products/[slug]/preview/page.tsx      → <PreviewModal><PreviewPlayer mode="modal" … /></PreviewModal>
  src/app/(site)/(storefront)/products/[slug]/preview/page.tsx   → <PreviewPlayer mode="page" … />
  ```
  - Both pages `generateMetadata` → `robots: { index: false }`. The modal closes with `router.back()`.
  - **Done when:** clicking Live Preview on a PDP opens the modal, a hard refresh shows the full-page player, and Esc returns focus to the trigger.

- [ ] **P4.06 — Persistent Buy CTA** _(3 h)_ [FR-LP-05, SG §7.6]
  - Desktop toolbar zone + mobile buy bar; states: default, promo, starting, owned, unavailable; opens the license selector over the running demo (wired to checkout in P5.06).

- [ ] **P4.07 — `<Activity>` memory hygiene** _(1 h)_ [FR-LP-09]

  ```ts
  // inside DeviceFrame: effects are cleaned up when Next hides the route and re-run when it is shown again
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    if (iframe.src === 'about:blank' && lastSrc.current) {
      iframe.src = lastSrc.current
      dispatch({ type: 'show' })
    }
    return () => {
      lastSrc.current = iframe.src
      iframe.src = 'about:blank' // stop demo CPU, timers and audio while hidden
      dispatch({ type: 'hide' })
    }
  }, [])
  ```
  - **Done when:** after navigating PDP → preview → home, the demo shows no network or CPU activity in DevTools, and going back restores it.

- [ ] **P4.08 — Fallback gallery & telemetry** _(2 h)_ [FR-LP-07, PRD §8.2]
  - Screenshot carousel from Sanity `demo.gallery` for the current device; "Retry" and "Open in new tab"; `preview_load_failed { reason, elapsed_ms, device }`; alert when the failure rate for any product exceeds 5 % per day (PostHog alert).

- [ ] **P4.09 — Component Playground (UI kits)** _(5 h)_ [FR-LP-08]
  - Left rail from Sanity `components[]`; iframe route `/c/{component}` on the demo origin; "Code" tab rendered by Shiki `codeToHtml` in a cached RSC (dual themes); only the first 30 lines for non-owners, with a registry install CTA.

- [ ] **P4.10 — Player tests** _(4 h)_
  - Unit: `computeFrame` table (each device × 3 stage sizes, rotation, the snap-to-1 rule), reducer transitions, bridge origin and source checks.
  - Playwright: device switch without reload; Buy CTA visible at 320, 768 and 1440 px; `page.route('**lumira-demos.dev/**', r => r.abort())` → fallback within 8 s; keyboard-only run (1/2/3/0, R, Esc).

### 4B · Documentation layer (Fumadocs)

- [ ] **P4.11 — Install Fumadocs** _(1 h)_
  - `pnpm add fumadocs-mdx fumadocs-core fumadocs-ui @types/mdx` (currently core/ui 16.x, mdx 15.x); wrap the P1.02 config: `import { createMDX } from 'fumadocs-mdx/next'` and `export default createMDX()(nextConfig)`.

- [ ] **P4.12 — Content source & frontmatter schema** _(2 h)_ [FR-DOC-01, FR-DOC-02]

  ```ts
  // src/lib/docs/source.ts
  import { defineDocs } from 'fumadocs-mdx/macro'
  import { loader } from 'fumadocs-core/source'
  import { pageSchema } from 'fumadocs-core/source/schema'
  import { z } from 'zod'

  const docs = defineDocs({
    dir: 'content/docs',
    docs: {
      schema: pageSchema.extend({
        product: z.string(),
        access: z.enum(['public', 'licensed']).default('public'),
        since: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
        updated: z.coerce.date().optional(),
      }),
    },
  })

  export const source = loader({ baseUrl: '/docs', source: docs.toFumadocsSource() })
  ```
  - If the installed `fumadocs-mdx` uses the `source.config.ts` style, move the same `defineDocs({...})` call there (import from `fumadocs-mdx/config`); the options are identical.
  - Content layout: `content/docs/{product}/meta.json` (`{ "root": true, "title": "SaaS Starter", "pages": ["index", "installation", "environment", "activation", "structure", "deployment", "upgrading", "troubleshooting", "faq"] }`).
  - **Done when:** a page with an invalid `since` fails the build.

- [ ] **P4.13 — Docs layout & page** _(5 h)_ [FR-DOC-01, FR-DOC-05, FR-DOC-06]

  ```tsx
  // src/app/(site)/docs/layout.tsx
  import { DocsLayout } from 'fumadocs-ui/layouts/docs'
  import { RootProvider } from 'fumadocs-ui/provider/next'
  import { source } from '@/lib/docs/source'
  import './docs.css' // SG §5.9 token mapping

  export default function Layout({ children }: LayoutProps<'/docs'>) {
    return (
      <RootProvider theme={{ enabled: false }}> {/* next-themes in the root layout owns theme state */}
        <DocsLayout tree={source.pageTree} nav={{ title: 'Lumira Docs' }}>{children}</DocsLayout>
      </RootProvider>
    )
  }
  ```

  ```tsx
  // src/app/(site)/docs/[[...slug]]/page.tsx
  import { Suspense } from 'react'
  import { notFound } from 'next/navigation'
  import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
  import { source } from '@/lib/docs/source'
  import { getMDXComponents } from '@/components/docs/mdx-components'
  import { LicensedGate, LicensedTeaser } from '@/components/docs/licensed-gate'

  export default async function Page({ params }: PageProps<'/docs/[[...slug]]'>) {
    const { slug } = await params
    const page = source.getPage(slug)
    if (!page) notFound()
    const MDX = page.data.body
    const body = <DocsBody><MDX components={getMDXComponents()} /></DocsBody>

    return (
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        {page.data.access === 'licensed' ? (
          // The static shell holds only the teaser; the body streams for owners.
          <Suspense fallback={<LicensedTeaser product={page.data.product} />}>
            <LicensedGate product={page.data.product}>{body}</LicensedGate>
          </Suspense>
        ) : body}
      </DocsPage>
    )
  }

  export function generateStaticParams() {
    return source.generateParams()
  }

  export async function generateMetadata({ params }: PageProps<'/docs/[[...slug]]'>) {
    const page = source.getPage((await params).slug)
    if (!page) notFound()
    return {
      title: page.data.title,
      description: page.data.description,
      robots: page.data.access === 'licensed' ? { index: false, follow: true } : undefined,
    }
  }
  ```

  ```tsx
  // src/components/docs/licensed-gate.tsx
  import { auth } from '@clerk/nextjs/server'
  import { ownsProduct } from '@/server/entitlements'

  export async function LicensedGate({ product, children }: { product: string; children: React.ReactNode }) {
    const { userId } = await auth()
    if (!userId || !(await ownsProduct(userId, product))) return <LicensedTeaser product={product} />
    return children // never rendered, and never serialized, for non-owners
  }
  ```
  - MDX components: `Callout`, `Steps`, `Tabs` (pnpm/npm/bun), `Files`, `TypeTable`, `LicenseSnippet` (owner-aware CLI and registry snippets with a masked key reference).
  - **Done when:** a licensed page shows the teaser when signed out (the body is absent from the HTML and RSC payload) and the full content for an owner.

- [ ] **P4.14 — Docs theming** _(1.5 h)_ ⇄ [FR-DOC-10, SG §5.9]

- [ ] **P4.15 — Search** _(1.5 h)_ [FR-DOC-04]

  ```ts
  // src/app/api/search/route.ts
  import { createFromSource } from 'fumadocs-core/search/server'
  import { source } from '@/lib/docs/source'

  export const { GET } = createFromSource(source)
  ```
  - Configure `createFromSource`'s index builder (per the installed version's options) so that `access: 'licensed'` pages contribute only title and description, never structured body content.
  - **Done when:** searching a phrase that exists only inside a licensed page returns nothing.

- [ ] **P4.16 — Write the launch documentation** _(10 h)_ [FR-DOC-03]
  - Boilerplate: all nine FR-DOC-03 pages. UI kit: Registry install (with the `components.json` snippet from FR-LIC-12), Theming, per-component API pages. Templates: Setup, Editing content, Deploy.
  - Cross-link `since` badges and changelog `docsPath` entries [FR-DOC-09].

- [ ] **P4.17 — Docs SEO & AI exports** _(2 h)_ [FR-DOC-07, FR-DOC-08]
  - Docs OG images; public docs in `sitemap.ts`; `/llms.txt` and `/llms-full.txt` built from the Fumadocs source, filtered to `access: 'public'`.

- [ ] **P4.18 — ⌘K docs results** _(1 h)_ [FR-GL-02]
  - The palette queries `/api/search` (debounced 150 ms) and groups results under "Docs".

**Phase 4 exit criteria (M2):** Live Preview for 2 templates and 1 UI kit playground; docs for 1 boilerplate; AC-05 passes; Lighthouse and axe gates green.

---

## Phase 5 — E-commerce Engine & Software Licensing (Weeks 7–8 · ~70 h)

**Goal:** Lemon Squeezy checkout, idempotent webhooks, order → entitlement → license key pipeline, license activation proxy, CLI and the license-gated registry.

- [ ] **P5.01 — Configure the Lemon Squeezy store (test mode)** _(3 h)_ [FR-LIC-01]
  - Store slug `lumira`; currency USD.
  - For every product, one variant per tier (Personal, Team, Extended) with **license keys enabled**: activation limits 1 / 5 / 25, length unlimited. Templates get keys too (activation optional). No files attached, since delivery is Lumira's R2 pipeline.
  - All-Access subscription product: monthly and yearly variants, license keys enabled (limit 10).
  - Bundles: one-time products whose variant IDs map to `variants.bundle_product_ids`.
  - Receipt: button text "Open your Lumira Library" → `https://lumira.dev/account/library`.
  - Webhook: `https://staging.lumira.dev/api/webhooks/lemonsqueezy?x-vercel-protection-bypass=…`, signing secret (6–40 chars), every event from PRD FR-SYS-01.
  - Affiliates: enable the program, commission rate and cookie window (PRD Q1).
  - **Done when:** the store is approved in test mode and `LS_*` variables are set for local and staging.

- [ ] **P5.02 — Variant sync** _(3 h)_ [FR-AD-51, FR-SYS-09]
  - `scripts/ls-sync.ts` + admin action: for each Sanity product, `GET /v1/variants?filter[product_id]={lsProductId}` → upsert `variants` (price, tier, activation limit, LS product ID) → patch Sanity `licenses[].priceCents` and `activationLimit` → `revalidateTag('product:{slug}', { expire: 0 })`.
  - **Done when:** changing a price in LS and running the sync updates the PDP within one request.

- [ ] **P5.03 — Lemon Squeezy client & provider interfaces** _(4 h)_ [PRD §10 R1]

  ```ts
  // src/lib/billing/types.ts: the seam that makes a future provider migration an adapter swap
  export type CreateCheckoutInput = {
    variantId: number; email?: string; name?: string; discountCode?: string
    custom: Record<string, string>; redirectUrl: string; dark: boolean; testMode: boolean
  }
  export interface BillingProvider {
    createCheckout(input: CreateCheckoutInput): Promise<{ checkoutId: string; url: string }>
    getSubscriptionUrls(lsSubscriptionId: number): Promise<{ customerPortal: string; updatePaymentMethod: string }>
    listLicenseKeysForOrder(lsOrderId: number): Promise<LsLicenseKeyResource[]>
    updateLicenseKey(lsLicenseKeyId: number, patch: { activation_limit?: number | null; expires_at?: string | null; disabled?: boolean }): Promise<void>
    createDiscount(input: CreateDiscountInput): Promise<{ id: number }>
    deleteDiscount(lsDiscountId: number): Promise<void>
  }
  export interface LicenseProvider {
    activate(key: string, instanceName: string): Promise<LicenseApiResult>
    validate(key: string, instanceId?: string): Promise<LicenseApiResult>
    deactivate(key: string, instanceId: string): Promise<LicenseApiResult>
  }
  ```

  ```ts
  // src/lib/billing/lemonsqueezy/client.ts
  import 'server-only'
  import { env } from '@/lib/env'

  const BASE = 'https://api.lemonsqueezy.com/v1'

  export class LemonSqueezyError extends Error {
    constructor(readonly status: number, readonly body: unknown) {
      super(`Lemon Squeezy API error ${status}`)
    }
  }

  export async function lsFetch<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${env.LS_API_KEY}`,
        ...init.headers,
      },
    })
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const retryAfterMs = Number(res.headers.get('retry-after') ?? 0) * 1000
      await new Promise((r) => setTimeout(r, Math.max(retryAfterMs, 500 * 2 ** attempt) + Math.random() * 250))
      return lsFetch<T>(path, init, attempt + 1)
    }
    if (!res.ok) throw new LemonSqueezyError(res.status, await res.json().catch(() => null))
    return (res.status === 204 ? null : await res.json()) as T
  }

  export async function createCheckout(i: CreateCheckoutInput) {
    const res = await lsFetch<{ data: { id: string; attributes: { url: string } } }>('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: { email: i.email, name: i.name, discount_code: i.discountCode, custom: i.custom },
            checkout_options: { embed: true, media: false, logo: true, desc: true, discount: true, dark: i.dark, button_color: '#5856e9' },
            product_options: {
              redirect_url: i.redirectUrl,
              receipt_button_text: 'Open your Lumira Library',
              receipt_link_url: `${env.NEXT_PUBLIC_APP_URL}/account/library`,
            },
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            test_mode: i.testMode,
          },
          relationships: {
            store: { data: { type: 'stores', id: String(env.LS_STORE_ID) } },
            variant: { data: { type: 'variants', id: String(i.variantId) } },
          },
        },
      }),
    })
    return { checkoutId: res.data.id, url: res.data.attributes.url }
  }
  ```
  - **Done when:** a contract test (recorded fixtures) covers checkout creation, 429 retry and error mapping.

- [ ] **P5.04 — `startCheckout` Server Action** _(4 h)_ [FR-CO-02, FR-CO-05, FR-CO-08]

  ```ts
  // src/app/(site)/(storefront)/_actions/start-checkout.ts
  'use server'
  import { cookies, headers } from 'next/headers'
  import { after } from 'next/server'
  import { auth, currentUser } from '@clerk/nextjs/server'
  import { and, eq } from 'drizzle-orm'
  import { z } from 'zod'
  import { db } from '@/db/client'
  import { checkoutSessions, discounts, variants } from '@/db/schema'
  import { createCheckout } from '@/lib/billing/lemonsqueezy/client'
  import { captureServer } from '@/lib/analytics/server'
  import { hashIp } from '@/lib/crypto'
  import { env } from '@/lib/env'
  import { ratelimit } from '@/lib/rate-limit'

  const Input = z.object({
    variantId: z.number().int().positive(),
    phDistinctId: z.string().max(200).optional(),
    utm: z.record(z.enum(['source', 'medium', 'campaign', 'content', 'term']), z.string().max(200)).optional(),
    theme: z.enum(['light', 'dark']).default('light'),
  })

  async function resolvePromo(code: string | undefined, variantId: number) {
    if (!code) return undefined
    const d = await db.query.discounts.findFirst({ where: and(eq(discounts.code, code), eq(discounts.status, 'active')) })
    const now = new Date()
    if (!d || (d.startsAt && d.startsAt > now) || (d.expiresAt && d.expiresAt < now)) return undefined
    if (d.variantIds.length > 0 && !d.variantIds.includes(variantId)) return undefined
    return d.code
  }

  export async function startCheckout(raw: z.input<typeof Input>) {
    const input = Input.parse(raw)
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!(await ratelimit.checkout.limit(ip)).success) return { ok: false as const, error: 'rate_limited' as const }

    const variant = await db.query.variants.findFirst({ where: and(eq(variants.lsVariantId, input.variantId), eq(variants.active, true)) })
    if (!variant) return { ok: false as const, error: 'unknown_variant' as const }

    const { userId } = await auth()
    const user = userId ? await currentUser() : null
    const jar = await cookies()
    const promo = await resolvePromo(jar.get('lumira_promo')?.value, variant.lsVariantId)

    const [session] = await db.insert(checkoutSessions).values({
      userId, email: user?.primaryEmailAddress?.emailAddress, lsVariantId: variant.lsVariantId,
      discountCode: promo, utm: input.utm, phDistinctId: input.phDistinctId, ipHash: hashIp(ip),
    }).returning({ id: checkoutSessions.id })

    const { checkoutId, url } = await createCheckout({
      variantId: variant.lsVariantId,
      email: user?.primaryEmailAddress?.emailAddress,
      name: user?.fullName ?? undefined,
      discountCode: promo,
      custom: {
        cs_id: session!.id, user_id: userId ?? '', ph_id: input.phDistinctId ?? '',
        ...Object.fromEntries(Object.entries(input.utm ?? {}).map(([k, v]) => [`utm_${k}`, v])),
      },
      redirectUrl: `${env.NEXT_PUBLIC_APP_URL}/checkout/success?cs=${session!.id}`,
      dark: input.theme === 'dark',
      testMode: env.LS_TEST_MODE,
    })

    await db.update(checkoutSessions).set({ lsCheckoutId: checkoutId }).where(eq(checkoutSessions.id, session!.id))
    jar.set('__Host-lumira_cs', session!.id, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 2 * 60 * 60 })
    after(() => captureServer({
      distinctId: input.phDistinctId ?? userId ?? session!.id,
      event: 'checkout_started',
      properties: { cs_id: session!.id, variant_id: variant.lsVariantId, tier: variant.tier, price_usd: variant.priceCents / 100, has_discount: Boolean(promo) },
    }))
    return { ok: true as const, url, checkoutSessionId: session!.id }
  }
  ```
  - **Done when:** calling the action returns an LS test-mode URL and writes an `initiated` session with UTM and PostHog IDs.

- [ ] **P5.05 — Lemon.js overlay with affiliate attribution** _(3 h)_ [FR-CO-03, FR-CO-04]

  ```ts
  // src/lib/billing/lemonsqueezy/use-lemon-checkout.ts
  'use client'
  import { useCallback, useRef } from 'react'
  import { useRouter } from 'next/navigation'
  import { track } from '@/lib/analytics/track'

  type LemonEvent = { event: string; data?: unknown }
  declare global {
    interface Window {
      createLemonSqueezy?: () => void
      LemonSqueezy?: {
        Setup(options: { eventHandler: (event: LemonEvent) => void }): void
        Url: { Open(url: string): void; Close(): void }
        Affiliate: { GetID(): string | undefined; Build(url: string): string }
      }
    }
  }

  let loading: Promise<void> | null = null
  function loadLemonJs() {
    loading ??= new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://app.lemonsqueezy.com/js/lemon.js'
      s.defer = true
      s.onload = () => { window.createLemonSqueezy?.(); resolve() }
      s.onerror = () => { loading = null; reject(new Error('lemon.js failed to load')) }
      document.head.appendChild(s)
    })
    return loading
  }

  export function useLemonCheckout() {
    const router = useRouter()
    const session = useRef<string | null>(null)

    /** Call on hover/focus of any Buy button so the overlay opens instantly on click. */
    const warm = useCallback(() => { void loadLemonJs().catch(() => {}) }, [])

    const open = useCallback(async (url: string, checkoutSessionId: string) => {
      session.current = checkoutSessionId
      try {
        await loadLemonJs()
        const ls = window.LemonSqueezy!
        ls.Setup({
          eventHandler: ({ event }) => {
            if (event !== 'Checkout.Success') return // Lemon.js emits no "closed" event for checkout
            track('checkout_success_client', { cs_id: session.current })
            ls.Url.Close()
            router.push(`/checkout/success?cs=${session.current}`)
          },
        })
        ls.Url.Open(ls.Affiliate.Build(url)) // keeps ?aff= attribution on API-created checkouts
      } catch {
        window.location.assign(url) // hosted checkout; redirect_url brings the buyer back
      }
    }, [router])

    return { warm, open }
  }
  ```
  - **Done when:** an affiliate-referred test purchase shows the referral in the LS affiliate dashboard.

- [ ] **P5.06 — License selector & checkout wiring** _(5 h)_ [FR-CO-01, FR-CO-07, FR-LP-05]
  - Dialog on desktop and bottom sheet on mobile (SG §6.4.3–§6.4.4); tiers with price, activation limit and rights; All-Access row; promo pill; owned and upgrade states; `license_selector_opened` and `license_tier_selected` events; the Buy button calls `startCheckout` then `open()`, and keeps its width with a spinner while pending.

- [ ] **P5.07 — Promo & region cookies in `proxy.ts`** _(1.5 h)_ [FR-CO-05, FR-AN-04]

  ```ts
  // src/proxy.ts (Phase 5 version)
  import { clerkMiddleware } from '@clerk/nextjs/server'
  import { NextResponse } from 'next/server'

  // EU (27) + EEA (IS, LI, NO) + UK + CH
  const CONSENT_REGIONS = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'])

  export default clerkMiddleware(async (_auth, req) => {
    const res = NextResponse.next()
    const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
    if (code && /^[A-Z0-9]{3,64}$/.test(code)) {
      res.cookies.set('lumira_promo', code, { path: '/', maxAge: 7 * 24 * 60 * 60, sameSite: 'lax', secure: true, httpOnly: true })
    }
    if (!req.cookies.has('lumira_region')) {
      const country = req.headers.get('x-vercel-ip-country') ?? ''
      res.cookies.set('lumira_region', CONSENT_REGIONS.has(country) ? 'eu' : 'other', { path: '/', maxAge: 30 * 24 * 60 * 60, sameSite: 'lax', secure: true })
    }
    return res
  })

  // Keep the config inline: Next.js reads it statically from this file.
  export const config = {
    matcher: [
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
      '/(api|trpc)(.*)',
    ],
  }
  ```

- [ ] **P5.08 — Lemon Squeezy webhook endpoint** _(3 h)_ [FR-SYS-01, NFR-SEC-01, NFR-SEC-02]

  ```ts
  // src/app/api/webhooks/lemonsqueezy/route.ts
  import crypto from 'node:crypto'
  import { env } from '@/lib/env'
  import { recordWebhook } from '@/server/webhooks/ledger'
  import { dispatchLemonSqueezyEvent } from '@/server/webhooks/lemonsqueezy'
  import type { LsWebhook } from '@/lib/billing/lemonsqueezy/types'

  export async function POST(req: Request) {
    const raw = await req.text() // the HMAC covers the raw body, so read it before parsing
    if (raw.length > 1_000_000) return new Response('Payload too large', { status: 413 })

    const digest = Buffer.from(crypto.createHmac('sha256', env.LS_WEBHOOK_SECRET).update(raw).digest('hex'), 'utf8')
    const signature = Buffer.from(req.headers.get('x-signature') ?? '', 'utf8')
    if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(raw) as LsWebhook
    const dedupeKey = `${event.meta.event_name}:${event.data.id}:${event.data.attributes.updated_at ?? ''}`
    return recordWebhook('lemonsqueezy', event.meta.event_name, dedupeKey, event, () => dispatchLemonSqueezyEvent(event))
  }
  ```

  ```ts
  // src/server/webhooks/lemonsqueezy/index.ts
  export async function dispatchLemonSqueezyEvent(event: LsWebhook): Promise<void> {
    switch (event.meta.event_name) {
      case 'order_created': return onOrderCreated(event as LsWebhook<LsOrderAttributes>)
      case 'order_refunded': return onOrderRefunded(event as LsWebhook<LsOrderAttributes>)
      case 'license_key_created':
      case 'license_key_updated': return upsertLicenseKey(event.data as LsLicenseKeyResource)
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_cancelled':
      case 'subscription_resumed':
      case 'subscription_expired':
      case 'subscription_paused':
      case 'subscription_unpaused': return onSubscriptionChanged(event as LsWebhook<LsSubscriptionAttributes>)
      case 'subscription_payment_success':
      case 'subscription_payment_failed':
      case 'subscription_payment_recovered':
      case 'subscription_payment_refunded': return onSubscriptionPayment(event as LsWebhook<LsInvoiceAttributes>)
      case 'customer_updated': return onCustomerUpdated(event)
      case 'affiliate_activated': return onAffiliateActivated(event)
      default: return // recorded in the ledger, intentionally ignored
    }
  }
  ```
  - **Done when:** a tampered payload returns 401, the same event delivered 3 times produces one set of rows, and a failing handler returns 500 then succeeds on redelivery.

- [ ] **P5.09 — `order_created` → order, entitlements, key fetch, email** _(6 h)_ [Stage 4, FR-LIC-02, F-13]

  ```ts
  // src/server/webhooks/lemonsqueezy/order-created.ts
  import 'server-only'
  import { and, eq, inArray, sql } from 'drizzle-orm'
  import { db } from '@/db/client'
  import { checkoutSessions, emailOutbox, entitlements, jobOutbox, orderItems, orders, releases, users, variants } from '@/db/schema'
  import { resolveBuyerByEmail } from '@/server/identity'
  import type { LsOrderAttributes, LsWebhook } from '@/lib/billing/lemonsqueezy/types'

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  export async function onOrderCreated(event: LsWebhook<LsOrderAttributes>) {
    const a = event.data.attributes
    const custom = event.meta.custom_data ?? {}
    const email = a.user_email.trim().toLowerCase()
    const csId = typeof custom.cs_id === 'string' && UUID.test(custom.cs_id) ? custom.cs_id : null

    // Trust the user bound to a checkout WE created server-side; otherwise resolve by email.
    // Never auto-sign anyone in from here (PRD NFR-SEC-15).
    const session = csId ? await db.query.checkoutSessions.findFirst({ where: eq(checkoutSessions.id, csId) }) : undefined
    const user = session?.userId
      ? await db.query.users.findFirst({ where: eq(users.id, session.userId) })
      : await resolveBuyerByEmail(email, a.user_name) // Clerk getUserList → createUser; outside the transaction
    if (!user) throw new Error(`Cannot resolve buyer for LS order ${event.data.id}`)

    const item = a.first_order_item
    const variant = await db.query.variants.findFirst({ where: eq(variants.lsVariantId, item.variant_id) })
    if (!variant) throw new Error(`Unmapped LS variant ${item.variant_id}`) // 500 → fix mapping → LS re-delivers

    await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        lsOrderId: Number(event.data.id), orderNumber: a.order_number, userId: user.id, customerEmail: email,
        status: a.status, currency: a.currency,
        subtotalUsd: a.subtotal_usd, discountUsd: a.discount_total_usd, taxUsd: a.tax_usd, totalUsd: a.total_usd,
        discountCode: session?.discountCode ?? null, receiptUrl: a.urls.receipt, checkoutSessionId: session?.id ?? null,
        testMode: a.test_mode, createdAt: new Date(a.created_at),
      }).onConflictDoNothing({ target: orders.lsOrderId }).returning()
      if (!order) return // replay: already ingested

      await tx.update(users).set({ lsCustomerId: a.customer_id })
        .where(and(eq(users.id, user.id), sql`${users.lsCustomerId} is null`))

      const [orderItem] = await tx.insert(orderItems).values({
        orderId: order.id, lsOrderItemId: item.id, lsVariantId: item.variant_id, priceUsd: item.price, quantity: item.quantity ?? 1,
      }).returning()

      if (session) {
        await tx.update(checkoutSessions).set({ status: 'completed', completedAt: new Date(), orderId: order.id })
          .where(eq(checkoutSessions.id, session.id))
      }
      if (a.status !== 'paid') return

      // The initial order of an All-Access subscription grants nothing here: subscription_created owns it.
      if (variant.tier !== 'all_access') {
        const productIds = variant.bundleProductIds.length > 0 ? variant.bundleProductIds : [variant.productId!]
        const majors = await tx
          .select({ productId: releases.productId, major: sql<number>`max(${releases.major})` })
          .from(releases)
          .where(and(inArray(releases.productId, productIds), eq(releases.status, 'published')))
          .groupBy(releases.productId)
        const majorOf = new Map(majors.map((m) => [m.productId, m.major]))
        await tx.insert(entitlements).values(productIds.map((productId) => ({
          userId: user.id, customerEmail: email, kind: 'license' as const, productId, tier: variant.tier,
          maxMajor: majorOf.get(productId) ?? 1, sourceOrderItemId: orderItem!.id,
        }))).onConflictDoNothing()
      }

      await tx.insert(jobOutbox).values([
        { kind: 'license_keys_fetch', idempotencyKey: `license_keys_fetch:${order.id}`, payload: { orderId: order.id, lsOrderId: order.lsOrderId } },
        { kind: 'analytics_capture', idempotencyKey: `purchase_completed:${order.id}`, payload: {
          event: 'purchase_completed', distinctId: custom.ph_id || user.id,
          properties: { order_id: order.id, cs_id: session?.id, variant_ids: [item.variant_id], revenue_usd: (a.total_usd - a.tax_usd) / 100,
            tier: variant.tier, is_bundle: variant.bundleProductIds.length > 0, discount_code: session?.discountCode ?? null },
        } },
        { kind: 'discord_grant', idempotencyKey: `discord_grant:${order.id}`, payload: { userId: user.id } }, // no-op unless already linked
      ]).onConflictDoNothing()

      // Due ~15 s later so the key fetch usually lands first; the template loads and decrypts keys at render time.
      await tx.insert(emailOutbox).values({
        template: 'order-confirmation', to: email, payload: { orderId: order.id },
        idempotencyKey: `order-confirmation:${order.id}`, nextAttemptAt: new Date(Date.now() + 15_000),
      }).onConflictDoNothing()
    })
  }
  ```

  ```ts
  // src/server/jobs/license-keys-fetch.ts (job kind 'license_keys_fetch'; retried 2 s → 30 s, max 5 attempts)
  export async function runLicenseKeysFetch({ lsOrderId }: { orderId: string; lsOrderId: number }) {
    const keys = await billing.listLicenseKeysForOrder(lsOrderId) // GET /v1/license-keys?filter[order_id]=…
    if (keys.length === 0) throw new RetryableJobError('License keys not generated yet')
    for (const key of keys) await upsertLicenseKey(key) // same upsert as the license_key_created webhook
  }
  ```

  ```ts
  // src/server/licensing/upsert-license-key.ts
  export async function upsertLicenseKey(k: LsLicenseKeyResource) {
    const a = k.attributes
    const status = a.disabled ? 'disabled' : a.status
    const [order, subscription] = await Promise.all([
      db.query.orders.findFirst({ where: eq(orders.lsOrderId, a.order_id), columns: { id: true, userId: true } }),
      db.query.subscriptions.findFirst({ where: eq(subscriptions.lsOrderId, a.order_id), columns: { id: true, userId: true } }),
    ])
    const [row] = await db.insert(licenseKeys).values({
      lsLicenseKeyId: Number(k.id), lsOrderId: a.order_id, lsOrderItemId: a.order_item_id, lsProductId: a.product_id,
      orderId: order?.id, subscriptionId: subscription?.id, userId: order?.userId ?? subscription?.userId,
      customerEmail: a.user_email.toLowerCase(),
      keyCiphertext: encryptLicenseKey(a.key), keyHash: hashLicenseKey(a.key), keyShort: a.key_short,
      status, activationLimit: a.activation_limit, instancesCount: a.instances_count,
      expiresAt: a.expires_at ? new Date(a.expires_at) : null, createdAt: new Date(a.created_at),
    }).onConflictDoUpdate({
      target: licenseKeys.lsLicenseKeyId,
      set: {
        status, activationLimit: a.activation_limit, instancesCount: a.instances_count,
        expiresAt: a.expires_at ? new Date(a.expires_at) : null,
        orderId: sql`coalesce(excluded.order_id, ${licenseKeys.orderId})`,
        subscriptionId: sql`coalesce(excluded.subscription_id, ${licenseKeys.subscriptionId})`,
        userId: sql`coalesce(excluded.user_id, ${licenseKeys.userId})`,
      },
    }).returning({ id: licenseKeys.id, inserted: sql<boolean>`(xmax = 0)` }) // xmax = 0 ⇒ this was an insert
    if (row?.inserted) await logLicenseEvent({ licenseKeyId: row.id, type: 'issued', actor: 'system' })
    await invalidateLicenseCache(hashLicenseKey(a.key))
  }
  ```
  - `resolveBuyerByEmail`: `clerkClient().users.getUserList({ emailAddress: [email], limit: 1 })`, else `users.createUser({ emailAddress: [email], firstName, lastName, skipPasswordRequirement: true })`, then upsert `app.users`.
  - **Done when:** AC-01 passes up to the email (keys stored encrypted, one row per LS key; the email contains the key or the "being generated" variant).

- [ ] **P5.10 — Refund & subscription handlers** _(6 h)_ [F-04, F-05, F-12]
  - `onOrderRefunded`: `orders.status` ← `refunded` or `partial_refund`, `refunded_at`. On full refund: entitlements for its items → `revoked`; `job_outbox` `license_key_disable` for every key of the order (PATCH `{ disabled: true }`), `discord_revoke` if the user is no longer a verified holder; `refund-processed` email; audit entry (actor `system`).
  - `onSubscriptionChanged`: upsert `subscriptions` (status, variant, `renews_at`, `ends_at`, card, `past_due_since`), then upsert the All-Access entitlement with `onConflictDoUpdate` on `entitlements.sourceSubscriptionId` (pass `targetWhere` = `source_subscription_id is not null` to match the partial unique index):

  | LS status | Entitlement status | `valid_until` | Key | Emails / jobs |
  |---|---|---|---|---|
  | `on_trial`, `active` | active | `renews_at` | enabled | `all-access-welcome` on `subscription_created` |
  | `past_due` | active (grace ≤ 14 days) | `renews_at` | enabled | dunning via `subscription_payment_failed` |
  | `unpaid` | suspended | `renews_at` | disabled | `discord_revoke` |
  | `paused` | suspended | — | disabled | `discord_revoke` |
  | `cancelled` | active until `ends_at` | `ends_at` | enabled until expiry | `subscription-ended` |
  | `expired` | active (historical access only) | `ends_at` (frozen) | disabled | `discord_revoke`, email |

  - `onSubscriptionPayment`: upsert `subscription_invoices` (`billing_reason`, totals); `payment_events` for failed, recovered and refunded; `payment-failed` email with the update-payment-method URL fetched through `GET /v1/subscriptions/{id}` at render time (the URL is signed and short-lived).
  - **Done when:** replaying the LS fixture sequence created → payment_failed → payment_recovered → cancelled → expired yields the table's states, and a release published after `ends_at` is denied while an earlier one downloads.

- [ ] **P5.11 — License crypto & License API wrapper** _(4 h)_ [FR-LIC-03, FR-LIC-05, FR-LIC-06]

  ```ts
  // src/lib/licensing/crypto.ts
  import 'server-only'
  import crypto from 'node:crypto'
  import { env } from '@/lib/env'

  const KEY_V1 = Buffer.from(env.LICENSE_ENCRYPTION_KEY, 'base64') // 32 bytes

  export function encryptLicenseKey(plain: string): string {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY_V1, iv)
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return ['v1', iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join(':')
  }

  export function decryptLicenseKey(payload: string): string {
    const [version, iv, ciphertext, tag] = payload.split(':')
    if (version !== 'v1' || !iv || !ciphertext || !tag) throw new Error('Unsupported license ciphertext')
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_V1, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
  }

  export const hashLicenseKey = (key: string) =>
    crypto.createHmac('sha256', env.LICENSE_HASH_PEPPER).update(key.trim()).digest('hex')
  ```

  ```ts
  // src/lib/licensing/license-api.ts: LS License API (form-encoded, 60 requests/minute)
  import 'server-only'
  import { env } from '@/lib/env'
  import { isLumiraLsProduct } from '@/server/catalog'

  export type LicenseApiResult = {
    activated?: boolean; valid?: boolean; deactivated?: boolean; error: string | null
    license_key?: { id: number; status: 'inactive' | 'active' | 'expired' | 'disabled'; key: string; activation_limit: number | null; activation_usage: number; expires_at: string | null }
    instance?: { id: string; name: string; created_at: string } | null
    meta?: { store_id: number; order_id: number; order_item_id: number; product_id: number; variant_id: number }
  }

  async function call(action: 'activate' | 'validate' | 'deactivate', form: Record<string, string>): Promise<LicenseApiResult> {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${action}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form),
      cache: 'no-store',
    })
    const body = (await res.json()) as LicenseApiResult
    // The License API accepts keys from ANY Lemon Squeezy store: only Lumira-issued keys are valid here.
    if (body.meta && (body.meta.store_id !== env.LS_STORE_ID || !(await isLumiraLsProduct(body.meta.product_id)))) {
      return { error: 'This license key was not issued by Lumira.', activated: false, valid: false }
    }
    return body
  }

  export const licenseApi = {
    activate: (key: string, instanceName: string) => call('activate', { license_key: key, instance_name: instanceName }),
    validate: (key: string, instanceId?: string) => call('validate', { license_key: key, ...(instanceId ? { instance_id: instanceId } : {}) }),
    deactivate: (key: string, instanceId: string) => call('deactivate', { license_key: key, instance_id: instanceId }),
  }
  ```
  - `validateLicenseCached(key)`: Redis `lic:{hash}` → `{ valid, keyId, productIds, expiresAt }` for 10 min (60 s when invalid); invalidated by `upsertLicenseKey` and deactivations.
  - **Done when:** encrypt → decrypt round-trips; a tampered ciphertext throws; a key from another store is rejected (unit test with a mocked `meta.store_id`).

- [ ] **P5.12 — License proxy endpoints** _(4 h)_ [FR-LIC-05..07]

  ```ts
  // src/app/api/v1/licenses/activate/route.ts
  import { eq } from 'drizzle-orm'
  import { z } from 'zod'
  import { db } from '@/db/client'
  import { licenseInstances, licenseKeys } from '@/db/schema'
  import { hashLicenseKey } from '@/lib/licensing/crypto'
  import { licenseApi } from '@/lib/licensing/license-api'
  import { invalidateLicenseCache, logLicenseEvent } from '@/server/licensing'
  import { clientIp, readJsonOrForm, tooManyRequests } from '@/lib/http'
  import { ratelimit } from '@/lib/rate-limit'
  import { env } from '@/lib/env'

  const Body = z.object({ license_key: z.string().min(16).max(100), instance_name: z.string().trim().min(1).max(100) })

  export async function POST(req: Request) {
    const parsed = Body.safeParse(await readJsonOrForm(req))
    if (!parsed.success) return Response.json({ activated: false, error: 'Invalid request' }, { status: 400 })

    const keyHash = hashLicenseKey(parsed.data.license_key)
    const [perKey, perIp] = await Promise.all([ratelimit.licenseKey.limit(keyHash), ratelimit.licenseIp.limit(clientIp(req))])
    if (!perKey.success || !perIp.success) return tooManyRequests(Math.max(perKey.reset, perIp.reset))

    const result = await licenseApi.activate(parsed.data.license_key, parsed.data.instance_name)
    const key = await db.query.licenseKeys.findFirst({ where: eq(licenseKeys.keyHash, keyHash) })

    if (key && result.activated && result.instance) {
      const [instance] = await db.insert(licenseInstances).values({
        lsInstanceId: result.instance.id, licenseKeyId: key.id, name: result.instance.name,
        source: 'cli', createdAt: new Date(result.instance.created_at),
      }).onConflictDoNothing().returning()
      await db.update(licenseKeys)
        .set({ status: 'active', instancesCount: result.license_key?.activation_usage ?? key.instancesCount + 1 })
        .where(eq(licenseKeys.id, key.id))
      await logLicenseEvent({ licenseKeyId: key.id, type: 'activated', actor: 'cli', instanceId: instance?.id, req })
      await invalidateLicenseCache(keyHash)
    } else if (key) {
      await logLicenseEvent({ licenseKeyId: key.id, type: 'validation_failed', actor: 'cli', meta: { action: 'activate', error: result.error }, req })
    }

    const atLimit = !result.activated && result.license_key && result.license_key.activation_limit !== null
      && result.license_key.activation_usage >= result.license_key.activation_limit
    return Response.json({
      activated: Boolean(result.activated),
      instance_id: result.instance?.id ?? null,
      activation_usage: result.license_key?.activation_usage ?? null,
      activation_limit: result.license_key?.activation_limit ?? null,
      error: result.error,
      manage_url: `${env.NEXT_PUBLIC_APP_URL}/account/licenses`,
    }, { status: result.activated ? 200 : atLimit ? 409 : 400 })
  }
  ```
  - `validate` (cached, sampled `validated` events) and `deactivate` (writes `deactivated_at`, `license_events(deactivated)`) follow the same pattern.
  - **Done when:** AC-03 passes against LS test mode (limit reached → 409 with `manage_url`).

- [ ] **P5.13 — Lumira CLI (`npx lumira`)** _(5 h)_ [F-02]

  ```ts
  #!/usr/bin/env node
  // packages/cli/src/activate.ts
  import { mkdir, readFile, writeFile } from 'node:fs/promises'
  import { basename } from 'node:path'
  import { isCancel, password, text } from '@clack/prompts'

  const API = process.env.LUMIRA_API_URL ?? 'https://lumira.dev/api/v1/licenses'

  export async function activate() {
    const key = process.env.LUMIRA_LICENSE_KEY ?? (await password({ message: 'Paste your Lumira license key' }))
    if (isCancel(key)) process.exit(1)
    const pkg = JSON.parse(await readFile('package.json', 'utf8').catch(() => '{}')) as { name?: string }
    const name = await text({ message: 'Name this activation', initialValue: pkg.name ?? basename(process.cwd()) })
    if (isCancel(name)) process.exit(1)

    const res = await fetch(`${API}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license_key: String(key), instance_name: String(name) }),
    })
    const body = await res.json()
    if (!res.ok || !body.activated) {
      console.error(`✖ ${body.error ?? 'Activation failed'}\n  Manage activations: ${body.manage_url}`)
      process.exit(1)
    }
    await mkdir('.lumira', { recursive: true })
    // Store the instance, never the key.
    await writeFile('.lumira/license.json', JSON.stringify({ instanceId: body.instance_id, name, activatedAt: new Date().toISOString() }, null, 2))
    console.log(`✔ Activated "${String(name)}" · ${body.activation_usage}/${body.activation_limit ?? '∞'} activations used`)
  }
  ```
  - Commands: `activate`, `status` (validate with the stored instance ID), `deactivate`. Adds `.lumira/` to `.gitignore` when missing. Published from CI with `npm publish --provenance`.
  - **Done when:** `npx lumira@latest activate` works against staging and appears in `license_events` within seconds.

- [ ] **P5.14 — License-gated shadcn registry** _(5 h)_ [FR-LIC-11, FR-LIC-12]
  - The UI kit release pipeline runs `shadcn build` and uploads each item JSON to the **private** R2 prefix `registry/{kit}/{name}.json`, plus `registry/index.json` mapping item name → `{ productId, key }`.

  ```ts
  // src/app/r/[name]/route.ts
  import { validateLicenseCached } from '@/server/licensing'
  import { keyCoversProduct } from '@/server/entitlements'
  import { getRegistryIndex, r2GetText } from '@/lib/r2'
  import { ratelimit } from '@/lib/rate-limit'
  import { hashLicenseKey } from '@/lib/licensing/crypto'

  export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
    const item = (await params).name.replace(/\.json$/, '')
    if (!/^[a-z0-9-]+$/.test(item)) return Response.json({ error: 'Not found' }, { status: 404 })

    const key = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!key) return Response.json({ error: 'Missing license key. Set LUMIRA_LICENSE_KEY.' }, { status: 401 })
    if (!(await ratelimit.registryKey.limit(hashLicenseKey(key))).success) return Response.json({ error: 'Too many requests' }, { status: 429 })

    const license = await validateLicenseCached(key) // Redis → LS validate with the store/product guard
    if (!license.valid) return Response.json({ error: 'Invalid license key' }, { status: 401 })

    const entry = (await getRegistryIndex())[item] // "use cache", tag 'registry'
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!(await keyCoversProduct(license.keyId, entry.productId))) {
      return Response.json({ error: 'Your license does not include this component' }, { status: 403 })
    }
    return new Response(await r2GetText(entry.key), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    })
  }
  ```
  - **Done when:** AC-04 passes (valid Team key installs; a foreign-store key gets 401; an uncovered component gets 403).

- [ ] **P5.15 — Checkout success page & status endpoint** _(4 h)_ [FR-CO-06, Stage 5.1]
  - `GET /api/checkout/status?cs=`: `Cache-Control: no-store`. Returns details only when the caller holds the matching `__Host-lumira_cs` cookie (≤ 30 min after completion) or is the signed-in owner. Otherwise it returns only `pending`/`completed`. On first completed response it sets `__Host-lumira_guest` (HS256 JWT `{ orderId }`, 30 min, `GUEST_SCOPE_SECRET`), which the download route accepts as the `success_page` channel.
  - Page: polling state machine (1 s, 2 s, 4 s … max 30 s) → receipt tile, `LicenseKey` components (revealed for guest scope), download buttons, next steps (Activate, Docs, Discord), and an account CTA ("We've emailed you a sign-in link").
  - **Done when:** in LS test mode the page reaches `completed` within 60 s and shows keys and downloads without signing in; another browser with the same `cs` sees no details.

- [ ] **P5.16 — Abandonment & reconciliation crons** _(3 h)_ [FR-SYS-02, FR-SYS-04]

  ```json
  // vercel.json
  {
    "crons": [
      { "path": "/api/cron/checkouts", "schedule": "*/15 * * * *" },
      { "path": "/api/cron/outbox", "schedule": "*/5 * * * *" },
      { "path": "/api/cron/mrr-snapshot", "schedule": "10 0 * * *" },
      { "path": "/api/cron/reconcile", "schedule": "0 1 * * *" },
      { "path": "/api/cron/license-instances", "schedule": "0 2 * * *" },
      { "path": "/api/cron/discord-reconcile", "schedule": "0 3 * * *" },
      { "path": "/api/cron/retention", "schedule": "30 3 * * *" }
    ]
  }
  ```

  ```ts
  // src/app/api/cron/checkouts/route.ts
  import { and, eq, inArray, lt } from 'drizzle-orm'
  import { revalidateTag } from 'next/cache'
  import { db } from '@/db/client'
  import { checkoutSessions } from '@/db/schema'
  import { env } from '@/lib/env'

  export async function GET(req: Request) {
    if (req.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const abandoned = await db.update(checkoutSessions).set({ status: 'abandoned' })
      .where(and(eq(checkoutSessions.status, 'initiated'), lt(checkoutSessions.createdAt, hourAgo)))
      .returning({ id: checkoutSessions.id })
    const expired = await db.update(checkoutSessions).set({ status: 'expired' })
      .where(and(inArray(checkoutSessions.status, ['initiated', 'abandoned']), lt(checkoutSessions.createdAt, dayAgo)))
      .returning({ id: checkoutSessions.id })

    revalidateTag('admin-metrics', 'max')
    return Response.json({ abandoned: abandoned.length, expired: expired.length })
  }
  ```
  - A late `order_created` still flips an abandoned session to `completed` (P5.09 updates by ID regardless of status).
  - Reconciliation: page through `GET /v1/orders?filter[store_id]=…` (newest first) and `GET /v1/subscriptions?filter[store_id]=…` until records are older than 72 h; any LS order missing in Postgres is replayed through `onOrderCreated` with a synthesized event (identity resolved by email, since custom data is only in webhooks). A mismatch report is emailed to the admin.
  - **Done when:** AC-07 passes, and deleting a staging order row then running reconcile restores it.

- [ ] **P5.17 — Commerce test suite** _(6 h)_
  - Record LS webhook fixtures in test mode (`tests/fixtures/lemonsqueezy/*.json` + their raw bodies for HMAC tests).
  - Integration (disposable Postgres, MSW for LS and Clerk): order → keys; `license_key_created` **before** `order_created`; three identical deliveries; bundle expansion; All-Access initial order (no license entitlement); refund; subscription lifecycle table.
  - Playwright E2E in LS test mode: `frameLocator` into the overlay, card `4242 4242 4242 4242`, any future expiry, any CVC → success page → keys shown.
  - **Done when:** the suite runs in CI in under 6 minutes.

**Phase 5 exit criteria:** AC-01 (through email), AC-03, AC-04, AC-07 and AC-08 pass in LS test mode on staging.

---

## Phase 6 — Secure Delivery, Buyer Dashboard & Support (Weeks 9–10 · ~55 h)

**Goal:** private R2 delivery with pre-signed URLs, the Clerk-protected Buyer Dashboard, license management UI, the Discord token gate and the Resend email pipeline.

- [ ] **P6.01 — R2 buckets, tokens, CORS & lifecycle** _(3 h)_ [FR-DL-01, FR-AD-55, NFR-SEC-04]
  - Buckets `lumira-assets`, `lumira-assets-staging`, `lumira-backups`; no public `r2.dev` URL and no public custom domain.
  - API tokens: `lumira-read` (Object Read, `lumira-assets` only), `lumira-write` (Object Read & Write, `lumira-assets` only), `lumira-backup` (write to `lumira-backups` only).
  - CORS policy (R2 dashboard → bucket → Settings → CORS):

  ```json
  [
    {
      "AllowedOrigins": ["https://lumira.dev", "https://staging.lumira.dev", "http://localhost:3000"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["content-type"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```
  - Object lifecycle rule: abort incomplete multipart uploads after **1 day**.
  - **Done when:** an unsigned GET to an object returns 403, and a browser PUT from `localhost:3000` exposes `ETag`.

- [ ] **P6.02 — R2 client module** _(2 h)_ [PRD §6.4]

  ```ts
  // src/lib/r2.ts
  import 'server-only'
  import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
  import { env } from '@/lib/env'

  const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` // pre-signing works only on the S3 API domain

  // Newer AWS SDK versions add default CRC32 checksums that break pre-signed PUT/UploadPart on R2.
  const compat = { requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' } as const

  export const r2Read = new S3Client({
    region: 'auto', endpoint, ...compat,
    credentials: { accessKeyId: env.R2_READ_ACCESS_KEY_ID, secretAccessKey: env.R2_READ_SECRET_ACCESS_KEY },
  })
  export const r2Write = new S3Client({
    region: 'auto', endpoint, ...compat,
    credentials: { accessKeyId: env.R2_WRITE_ACCESS_KEY_ID, secretAccessKey: env.R2_WRITE_SECRET_ACCESS_KEY },
  })

  export function presignDownload(key: string, filename: string, expiresIn = 300) {
    return getSignedUrl(r2Read, new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
      ResponseCacheControl: 'private, no-store',
    }), { expiresIn })
  }

  export async function r2GetText(key: string) {
    const res = await r2Read.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
    return res.Body!.transformToString()
  }
  ```

- [ ] **P6.03 — Download authorization & endpoint** _(5 h)_ [FR-DL-02..05, PRD §7.3]

  ```ts
  // src/server/delivery/authorize.ts: extends canDownload() from P2.05 with rate limits
  import 'server-only'
  import { and, eq, inArray, or } from 'drizzle-orm'
  import { db } from '@/db/client'
  import { entitlements, orderItems, products, releases } from '@/db/schema'
  import { ratelimit } from '@/lib/rate-limit'

  export type DownloadIdentity = { userId: string } | { orderId: string }
  export type Decision =
    | { status: 'granted'; release: typeof releases.$inferSelect; product: typeof products.$inferSelect; entitlementId: string }
    | { status: 'denied'; reason: 'not_found' | 'withdrawn' | 'not_entitled' | 'major_version' }
    | { status: 'rate_limited'; retryAfter: number }

  export async function authorizeDownload(identity: DownloadIdentity, releaseId: string): Promise<Decision> {
    const [found] = await db.select({ release: releases, product: products }).from(releases)
      .innerJoin(products, eq(products.id, releases.productId)).where(eq(releases.id, releaseId)).limit(1)
    if (!found) return { status: 'denied', reason: 'not_found' }
    if (found.release.status !== 'published' || !found.release.publishedAt) return { status: 'denied', reason: 'withdrawn' }

    const owner = 'userId' in identity
      ? eq(entitlements.userId, identity.userId)
      : inArray(entitlements.sourceOrderItemId, db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, identity.orderId)))

    const candidates = await db.select().from(entitlements).where(and(owner, eq(entitlements.status, 'active'),
      or(eq(entitlements.productId, found.release.productId), eq(entitlements.kind, 'all_access'))))

    const publishedAt = found.release.publishedAt
    const match = candidates.find((e) => e.kind === 'all_access'
      ? found.product.inAllAccess && publishedAt <= (e.validUntil ?? new Date())
      : e.maxMajor === null || found.release.major <= e.maxMajor)
    if (!match) {
      const ownsOlderMajor = candidates.some((e) => e.kind !== 'all_access')
      return { status: 'denied', reason: ownsOlderMajor ? 'major_version' : 'not_entitled' }
    }

    const subject = 'userId' in identity ? identity.userId : `order:${identity.orderId}`
    const [perAsset, perUser] = await Promise.all([
      ratelimit.downloadAsset.limit(`${subject}:${found.product.id}`),
      ratelimit.downloadUser.limit(subject),
    ])
    if (!perAsset.success || !perUser.success) {
      return { status: 'rate_limited', retryAfter: Math.ceil((Math.max(perAsset.reset, perUser.reset) - Date.now()) / 1000) }
    }
    return { status: 'granted', release: found.release, product: found.product, entitlementId: match.id }
  }
  ```

  ```ts
  // src/app/api/downloads/route.ts
  import { after } from 'next/server'
  import { auth } from '@clerk/nextjs/server'
  import { z } from 'zod'
  import { authorizeDownload } from '@/server/delivery/authorize'
  import { logDownload, readGuestScope } from '@/server/delivery'
  import { presignDownload } from '@/lib/r2'
  import { captureServer } from '@/lib/analytics/server'

  export async function POST(req: Request) {
    const body = z.object({ releaseId: z.string().uuid() }).safeParse(await req.json().catch(() => null))
    if (!body.success) return Response.json({ error: 'Invalid request' }, { status: 400 })

    const { userId } = await auth()
    const guest = userId ? null : await readGuestScope() // __Host-lumira_guest (P5.15)
    const identity = userId ? { userId } : guest ? { orderId: guest.orderId } : null
    if (!identity) return Response.json({ error: 'Sign in to download' }, { status: 401 })

    const channel = userId ? 'dashboard' : 'success_page'
    const decision = await authorizeDownload(identity, body.data.releaseId)
    await logDownload(decision, identity, channel, req)

    if (decision.status === 'rate_limited') {
      return Response.json({ error: 'Too many downloads. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(decision.retryAfter) } })
    }
    if (decision.status === 'denied') return Response.json({ error: decision.reason }, { status: 403 })

    const url = await presignDownload(decision.release.r2Key, `${decision.product.slug}-${decision.release.semver}.zip`, 300)
    after(() => captureServer({
      distinctId: userId ?? decision.entitlementId,
      event: 'download_granted',
      properties: { product_slug: decision.product.slug, version: decision.release.semver, channel },
    }))
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  }
  ```
  - **Done when:** the P2.05 eligibility table passes through this endpoint, and 11 rapid downloads of one asset return a 429 with `Retry-After`.

- [ ] **P6.04 — Email download tokens & scanner-safe interstitial** _(4 h)_ [FR-DL-04, Stage 5.3]

  ```ts
  // src/server/delivery/tokens.ts
  import 'server-only'
  import { SignJWT, jwtVerify } from 'jose'
  import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
  import { db } from '@/db/client'
  import { downloadTokens } from '@/db/schema'
  import { env } from '@/lib/env'

  const secret = new TextEncoder().encode(env.DOWNLOAD_TOKEN_SECRET)

  export async function issueDownloadToken(input: { orderId: string; productId: string; releaseId?: string }) {
    const [row] = await db.insert(downloadTokens)
      .values({ ...input, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) })
      .returning({ jti: downloadTokens.jti })
    return new SignJWT({ oid: input.orderId, pid: input.productId })
      .setProtectedHeader({ alg: 'HS256' }).setJti(row!.jti).setIssuedAt().setExpirationTime('72h').sign(secret)
  }

  /** Verifies the signature without consuming a use (for rendering the interstitial). */
  export async function peekDownloadToken(token: string) {
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
      return db.query.downloadTokens.findFirst({ where: and(eq(downloadTokens.jti, payload.jti!), isNull(downloadTokens.revokedAt)) })
    } catch {
      return undefined
    }
  }

  /** Atomically consumes one use; returns undefined when expired, revoked or exhausted. */
  export async function redeemDownloadToken(token: string) {
    const peeked = await peekDownloadToken(token)
    if (!peeked) return undefined
    const [row] = await db.update(downloadTokens)
      .set({ uses: sql`${downloadTokens.uses} + 1` })
      .where(and(
        eq(downloadTokens.jti, peeked.jti), isNull(downloadTokens.revokedAt),
        gt(downloadTokens.expiresAt, new Date()), lt(downloadTokens.uses, downloadTokens.maxUses),
      ))
      .returning()
    return row
  }
  ```
  - `/d/[token]` renders product, version and size with a **Download** button that submits a Server Action. GET requests never consume a use, so link-scanning mail gateways cannot burn the token. The action redeems the token, runs `authorizeDownload({ orderId }, releaseId ?? latestEligible)`, logs the `email_link` channel and `redirect()`s to a 60 s pre-signed URL.
  - **Done when:** fetching the link with `curl` five times leaves `uses = 0`, and the sixth real download is refused with a "sign in to your Library" message.

- [ ] **P6.05 — Account shell** _(3 h)_ [FR-BD-01]
  - `(app)/account/layout.tsx`: sidebar (Library, Licenses, Downloads, Orders, Billing, Support, Settings) with the 2 px brand active indicator; every page calls `await requireUser()` inside a Suspense boundary; `robots: { index: false }`.

- [ ] **P6.06 — Library & asset detail** _(5 h)_ [FR-BD-02, FR-BD-03, FR-CL-06]
  - Library Bento grid (owned assets, owned vs latest version, "Update available"); All-Access members see the whole catalog as "Included".
  - Asset detail: release history (semver, date, size, SHA-256 with copy, notes excerpt), download buttons calling `/api/downloads`, locked majors with the upgrade CTA (F-06), "What's new since v…" from Sanity releases between the last downloaded and the latest eligible version.

- [ ] **P6.07 — Licenses page** _(5 h)_ [FR-BD-04, F-03]

  ```ts
  // src/app/(app)/account/licenses/actions.ts
  'use server'
  import { headers } from 'next/headers'
  import { revalidatePath } from 'next/cache'
  import { and, eq, isNull, sql } from 'drizzle-orm'
  import { db } from '@/db/client'
  import { licenseInstances, licenseKeys } from '@/db/schema'
  import { requireUser } from '@/lib/auth'
  import { decryptLicenseKey } from '@/lib/licensing/crypto'
  import { licenseApi } from '@/lib/licensing/license-api'
  import { invalidateLicenseCache, logLicenseEvent } from '@/server/licensing'

  export async function revealLicenseKey(id: string) {
    const { userId } = await requireUser()
    const key = await db.query.licenseKeys.findFirst({ where: and(eq(licenseKeys.id, id), eq(licenseKeys.userId, userId)) })
    if (!key) throw new Error('License key not found')
    await logLicenseEvent({ licenseKeyId: key.id, type: 'revealed', actor: 'buyer', actorUserId: userId, headers: await headers() })
    return decryptLicenseKey(key.keyCiphertext)
  }

  export async function deactivateInstance(instanceId: string) {
    const { userId } = await requireUser()
    const [found] = await db.select({ instance: licenseInstances, key: licenseKeys }).from(licenseInstances)
      .innerJoin(licenseKeys, eq(licenseKeys.id, licenseInstances.licenseKeyId))
      .where(and(eq(licenseInstances.id, instanceId), eq(licenseKeys.userId, userId), isNull(licenseInstances.deactivatedAt)))
      .limit(1)
    if (!found) throw new Error('Activation not found')

    const result = await licenseApi.deactivate(decryptLicenseKey(found.key.keyCiphertext), found.instance.lsInstanceId)
    if (!result.deactivated) throw new Error(result.error ?? 'Deactivation failed')

    await db.transaction(async (tx) => {
      await tx.update(licenseInstances).set({ deactivatedAt: new Date() }).where(eq(licenseInstances.id, instanceId))
      await tx.update(licenseKeys).set({ instancesCount: sql`greatest(${licenseKeys.instancesCount} - 1, 0)` }).where(eq(licenseKeys.id, found.key.id))
    })
    await logLicenseEvent({ licenseKeyId: found.key.id, type: 'deactivated', actor: 'buyer', actorUserId: userId, instanceId, headers: await headers() })
    await invalidateLicenseCache(found.key.keyHash)
    revalidatePath('/account/licenses')
  }
  ```
  - UI: `LicenseKey` component (SG §5.6), status badge, usage meter (SG §5.3 Progress), instances table (merged with a live `GET /v1/license-key-instances?filter[license_key_id]=` read, cached 60 s), confirm dialog for Deactivate, snippet tabs (CLI · `.env` · `components.json`).
  - **Done when:** reveal writes a `revealed` event, and deactivation frees a slot that the CLI can immediately reuse.

- [ ] **P6.08 — Orders, billing, downloads & settings** _(4 h)_ [FR-BD-05..09]
  - Billing portal redirect (signed LS URLs are short-lived, so fetch on click):

  ```ts
  // src/app/(app)/account/billing/portal/route.ts
  import { NextResponse } from 'next/server'
  import { and, desc, eq, inArray } from 'drizzle-orm'
  import { db } from '@/db/client'
  import { subscriptions } from '@/db/schema'
  import { requireUser } from '@/lib/auth'
  import { billing } from '@/lib/billing'
  import { env } from '@/lib/env'

  export async function GET(req: Request) {
    const { userId } = await requireUser()
    const sub = await db.query.subscriptions.findFirst({
      where: and(eq(subscriptions.userId, userId), inArray(subscriptions.status, ['on_trial', 'active', 'past_due', 'unpaid', 'paused', 'cancelled'])),
      orderBy: desc(subscriptions.createdAt),
    })
    if (!sub) return NextResponse.redirect(new URL('/account/billing', env.NEXT_PUBLIC_APP_URL))
    const { customerPortal, updatePaymentMethod } = await billing.getSubscriptionUrls(sub.lsSubscriptionId)
    const target = new URL(req.url).searchParams.get('to') === 'payment' ? updatePaymentMethod : customerPortal
    return NextResponse.redirect(target)
  }
  ```
  - Settings: `<UserProfile path="/account/settings" routing="path" />` in the `[[...rest]]` catch-all, themed (SG §5.8); release-email preferences per product (`users.release_emails`); "Export my data" (JSON of orders, keys masked, downloads); "Delete account" (Clerk `users.deleteUser` + anonymization via the `user.deleted` webhook).

- [ ] **P6.09 — Discord token gate** _(6 h)_ [FR-GS-05..08, F-07]
  - Discord application: OAuth2 redirect `https://lumira.dev/api/discord/callback`; a bot in the Lumira server with **Create Instant Invite** + **Manage Roles**; the bot's role placed above `Verified Owner`; private channels visible only to `Verified Owner`.

  ```ts
  // src/app/api/discord/connect/route.ts
  import { NextResponse } from 'next/server'
  import { SignJWT } from 'jose'
  import { requireUser } from '@/lib/auth'
  import { isVerifiedLicenseHolder } from '@/server/entitlements'
  import { ratelimit } from '@/lib/rate-limit'
  import { env } from '@/lib/env'

  const stateSecret = new TextEncoder().encode(env.DISCORD_STATE_SECRET)

  export async function GET() {
    const { userId } = await requireUser()
    const back = (q: string) => NextResponse.redirect(new URL(`/account/support?discord=${q}`, env.NEXT_PUBLIC_APP_URL))
    if (!(await ratelimit.discord.limit(userId)).success) return back('rate-limited')
    if (!(await isVerifiedLicenseHolder(userId))) return back('not-eligible')

    const state = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('10m').sign(stateSecret)
    const url = new URL('https://discord.com/oauth2/authorize')
    url.search = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID, response_type: 'code', scope: 'identify guilds.join',
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/discord/callback`, state, prompt: 'none',
    }).toString()
    return NextResponse.redirect(url)
  }
  ```

  ```ts
  // src/app/api/discord/callback/route.ts
  import { NextResponse, type NextRequest } from 'next/server'
  import { jwtVerify } from 'jose'
  import { db } from '@/db/client'
  import { discordLinks } from '@/db/schema'
  import { requireUser } from '@/lib/auth'
  import { isVerifiedLicenseHolder } from '@/server/entitlements'
  import { env } from '@/lib/env'

  const API = 'https://discord.com/api/v10'
  const bot = { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json', 'X-Audit-Log-Reason': 'Lumira verified owner' }

  export async function GET(req: NextRequest) {
    const { userId } = await requireUser()
    const back = (q: string) => NextResponse.redirect(new URL(`/account/support?discord=${q}`, env.NEXT_PUBLIC_APP_URL))
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')
    if (!code || !state) return back('error')
    try {
      const { payload } = await jwtVerify(state, new TextEncoder().encode(env.DISCORD_STATE_SECRET))
      if (payload.uid !== userId) return back('error') // state is bound to this Clerk session's user
    } catch {
      return back('error')
    }
    if (!(await isVerifiedLicenseHolder(userId))) return back('not-eligible') // re-check; never trust the UI

    const token = await fetch(`${API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code',
        code, redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/discord/callback`,
      }),
    }).then((r) => r.json() as Promise<{ access_token?: string }>)
    if (!token.access_token) return back('error')

    const me = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${token.access_token}` } })
      .then((r) => r.json() as Promise<{ id: string; username: string }>)

    // 201 = added with the role; 204 = already a member (roles are NOT applied), so add the role explicitly.
    const join = await fetch(`${API}/guilds/${env.DISCORD_GUILD_ID}/members/${me.id}`, {
      method: 'PUT', headers: bot, body: JSON.stringify({ access_token: token.access_token, roles: [env.DISCORD_VERIFIED_ROLE_ID] }),
    })
    if (join.status === 204) {
      const role = await fetch(`${API}/guilds/${env.DISCORD_GUILD_ID}/members/${me.id}/roles/${env.DISCORD_VERIFIED_ROLE_ID}`, { method: 'PUT', headers: bot })
      if (!role.ok) return back('error')
    } else if (!join.ok) {
      return back('error')
    }

    await db.insert(discordLinks).values({ userId, discordUserId: me.id, discordUsername: me.username })
      .onConflictDoUpdate({ target: discordLinks.userId, set: { discordUserId: me.id, discordUsername: me.username, status: 'active', grantedAt: new Date(), revokedAt: null } })
    // The OAuth access token is discarded here and never stored.
    return NextResponse.redirect(`https://discord.com/channels/${env.DISCORD_GUILD_ID}/${env.DISCORD_WELCOME_CHANNEL_ID}`)
  }
  ```
  - Jobs: `discord_revoke` removes the role (`DELETE …/roles/{role}`) only if the user is **no longer** a verified holder; `discord_grant` re-adds the role for linked users who regain eligibility. Both honor Discord 429 `retry_after` through job backoff.
  - Nightly `/api/cron/discord-reconcile` compares active links with eligibility.
  - Support page states: eligible (Join), linked (Open Discord · Unlink), not eligible (explanation + catalog CTA), error (retry + email support).
  - **Done when:** a verified buyer lands in the welcome channel with the role; refunding their only order removes the role within 5 minutes.

- [ ] **P6.10 — Resend + React Email templates** _(6 h)_ [FR-EM-01..08, FR-EM-10..14, SG §5.10]
  - DNS for `mail.lumira.dev` (SPF, DKIM, DMARC `p=quarantine`). Resend configures open/click tracking **per domain**, so transactional mail (keys, tokens) is sent from `mail.lumira.dev` with tracking **off** [FR-EM-11]; `release-available` goes from `news.lumira.dev` and links only to the authenticated Library.
  - Templates in `src/emails/`: `order-confirmation`, `license-key-ready`, `all-access-welcome`, `release-available`, `payment-failed`, `subscription-ended`, `refund-processed`; shared `LumiraLayout`, `LicenseKeyBlock` (SG §5.10), `DownloadCard`.

  ```tsx
  // src/emails/order-confirmation.tsx (excerpt; styles from src/emails/theme.ts, SG §5.10 hex tokens)
  import { Button, Hr, Link, Section, Text } from '@react-email/components'
  import { LicenseKeyBlock } from './components/license-key-block'
  import { LumiraLayout } from './components/layout'
  import * as s from './theme'

  export type OrderConfirmationProps = {
    firstName?: string
    orderNumber: number
    receiptUrl: string
    libraryUrl: string // single-use Clerk sign-in link (P6.12)
    items: {
      productName: string; tier: string; version: string; sizeLabel: string
      downloadUrl: string; docsUrl: string; licenseKey?: string; activationCommand?: string
    }[]
  }

  export default function OrderConfirmationEmail({ firstName, orderNumber, receiptUrl, libraryUrl, items }: OrderConfirmationProps) {
    return (
      <LumiraLayout preview={`Your ${items[0]?.productName} license and download are ready`}>
        <Text style={s.h1}>You're all set{firstName ? `, ${firstName}` : ''}.</Text>
        <Text style={s.muted}>Order #{orderNumber}. Your files and license keys are below.</Text>
        {items.map((item) => (
          <Section key={item.productName} style={s.card}>
            <Text style={s.eyebrow}>{item.tier} license · v{item.version}</Text>
            <Text style={s.h2}>{item.productName}</Text>
            <Button href={item.downloadUrl} style={s.primaryButton}>Download v{item.version} · {item.sizeLabel}</Button>
            {item.licenseKey
              ? <LicenseKeyBlock value={item.licenseKey} />
              : <Text style={s.muted}>Your license key is being generated. We'll email it within a few minutes.</Text>}
            {item.activationCommand ? <Text style={s.code}>{item.activationCommand}</Text> : null}
            <Link href={item.docsUrl} style={s.link}>Read the getting-started guide</Link>
          </Section>
        ))}
        <Button href={libraryUrl} style={s.secondaryButton}>Open your Lumira Library</Button>
        <Hr style={s.hr} />
        <Text style={s.footnote}>
          Download links work for 72 hours (up to 5 downloads); after that, download any version from your Library.{' '}
          <Link href={receiptUrl} style={s.link}>View your receipt</Link> from Lemon Squeezy, our Merchant of Record.
        </Text>
      </LumiraLayout>
    )
  }
  ```
  - `renderTemplate(template, payload)` loads data at send time (order, items, releases, **decrypted** keys, fresh download tokens, sign-in link), so secrets never sit in the outbox.
  - Preview with `pnpm email dev`; snapshot-test rendered HTML with fixture data in light and dark.

- [ ] **P6.11 — Outbox dispatchers** _(4 h)_ [FR-SYS-03, FR-EM-10]

  ```ts
  // src/server/outbox/dispatch.ts (email half; the job half mirrors it with a handler map per job kind)
  import 'server-only'
  import { and, asc, eq, inArray, lte } from 'drizzle-orm'
  import { Resend } from 'resend'
  import { db } from '@/db/client'
  import { emailOutbox } from '@/db/schema'
  import { renderTemplate } from '@/lib/email/render'
  import { env } from '@/lib/env'

  const resend = new Resend(env.RESEND_API_KEY)
  const MAX_ATTEMPTS = 8

  export async function drainEmailOutbox(limit = 20) {
    // Lease a batch with SKIP LOCKED so concurrent drains (after() + cron) never double-send.
    const batch = await db.transaction(async (tx) => {
      const rows = await tx.select().from(emailOutbox)
        .where(and(eq(emailOutbox.status, 'pending'), lte(emailOutbox.nextAttemptAt, new Date())))
        .orderBy(asc(emailOutbox.nextAttemptAt)).limit(limit)
        .for('update', { skipLocked: true })
      if (rows.length > 0) {
        await tx.update(emailOutbox).set({ nextAttemptAt: new Date(Date.now() + 5 * 60 * 1000) })
          .where(inArray(emailOutbox.id, rows.map((r) => r.id)))
      }
      return rows
    })

    for (const row of batch) {
      try {
        const { subject, react, from } = await renderTemplate(row.template, row.payload)
        const { data, error } = await resend.emails.send(
          { from: from ?? env.EMAIL_FROM, to: row.to, replyTo: 'support@lumira.dev', subject, react },
          { idempotencyKey: row.idempotencyKey }, // Resend dedupes for 24 h
        )
        if (error) throw new Error(error.message)
        await db.update(emailOutbox).set({ status: 'sent', resendId: data!.id, sentAt: new Date(), attempts: row.attempts + 1 })
          .where(eq(emailOutbox.id, row.id))
      } catch (err) {
        const attempts = row.attempts + 1
        await db.update(emailOutbox).set({
          attempts, lastError: String(err),
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          nextAttemptAt: new Date(Date.now() + Math.min(30_000 * 2 ** attempts, 6 * 60 * 60 * 1000)),
        }).where(eq(emailOutbox.id, row.id))
      }
    }
  }

  export async function drainOutboxes({ limit }: { limit: number }) {
    await Promise.allSettled([drainJobOutbox(limit), drainEmailOutbox(limit)])
  }
  ```
  - Job handler map: `license_keys_fetch` (P5.09), `license_key_disable` / `license_key_enable` (`PATCH /v1/license-keys/{id}`), `discord_grant` / `discord_revoke` (P6.09), `analytics_capture` (`posthog-node`), `release_notify` (P7.12). `RetryableJobError` uses a short backoff (2 s → 30 s); other errors use the email schedule. A job that reaches `failed` alerts the admin.
  - `/api/cron/outbox` (every 5 min, `CRON_SECRET`) drains both queues.
  - **Done when:** killing Resend (invalid key) queues emails, and restoring it sends each exactly once.

- [ ] **P6.12 — One-click Library sign-in link** _(2 h)_ [F-13, NFR-SEC-15]

  ```ts
  // src/server/auth/library-link.ts
  import 'server-only'
  import { clerkClient } from '@clerk/nextjs/server'
  import { env } from '@/lib/env'

  export async function createLibrarySignInLink(userId: string) {
    const client = await clerkClient()
    const { token } = await client.signInTokens.createSignInToken({ userId, expiresInSeconds: 7 * 24 * 60 * 60 }) // single use
    return `${env.NEXT_PUBLIC_APP_URL}/auth/continue?ticket=${encodeURIComponent(token)}`
  }
  ```

  ```tsx
  // src/app/(app)/(auth)/auth/continue/continue-button.tsx
  'use client'
  import { useState } from 'react'
  import { useRouter, useSearchParams } from 'next/navigation'
  import { useSignIn } from '@clerk/nextjs'
  import { Button } from '@/components/ui/button'

  // Redeemed only on an explicit click, so link-scanning mail gateways cannot consume the ticket.
  export function ContinueButton() {
    const { isLoaded, signIn, setActive } = useSignIn()
    const ticket = useSearchParams().get('ticket')
    const router = useRouter()
    const [state, setState] = useState<'idle' | 'working' | 'error'>('idle')

    async function redeem() {
      if (!isLoaded || !ticket) return
      setState('working')
      try {
        const attempt = await signIn.create({ strategy: 'ticket', ticket })
        if (attempt.status !== 'complete') throw new Error(attempt.status ?? 'incomplete')
        await setActive({ session: attempt.createdSessionId })
        router.replace('/account/library?welcome=1')
      } catch {
        setState('error') // expired or used: fall back to normal sign-in (email code)
      }
    }

    return state === 'error'
      ? <Button asChild size="lg"><a href="/sign-in">Sign in with your email</a></Button>
      : <Button size="lg" onClick={redeem} disabled={state === 'working'}>Continue to your Library</Button>
  }
  ```
  - Verify the ticket-strategy hook signatures against the installed `@clerk/nextjs` major before shipping. The page wraps the button in `<Suspense>` (it reads search params).
  - **Done when:** the emailed link signs the buyer in after one click, and a second use falls back to email-code sign-in.

- [ ] **P6.13 — Resend webhooks** _(1.5 h)_ ⇄ [FR-EM-13]
  - `/api/webhooks/resend`: verify with `svix` (`new Webhook(env.RESEND_WEBHOOK_SECRET).verify(raw, headers)`), then `recordWebhook('resend', …)` → update `email_outbox` by `resend_id` (`delivered`, `bounced`, `complained`); a hard bounce flags the customer in admin.

- [ ] **P6.14 — Delivery & support tests** _(4 h)_
  - Unit: `authorizeDownload` table; token redemption races (10 parallel redeems of a 5-use token → exactly 5 succeed).
  - E2E (LS test mode + Resend test recipient `delivered@resend.dev`): purchase → success-page download → email interstitial → download → refund → 403. Discord flow against MSW mocks (201 and 204 branches).
  - **Done when:** AC-01 and AC-02 pass end to end on staging.

**Phase 6 exit criteria (M3):** LS test-mode purchase → key → email → download for one-time and subscription; refund revokes access; Discord gate works; Buyer Dashboard complete.

---

## Phase 7 — Admin Dashboard Analytics & Management (Weeks 10–11 · ~68 h)

**Goal:** the owner's cockpit: revenue (MRR and one-time), conversion and cart abandonment, discounts, buyer activity logs, R2 releases and an auditable admin trail.

- [ ] **P7.01 — Admin shell, guard & audit helper** _(4 h)_ [FR-AD-01, FR-AD-02, FR-AD-47]
  - Extend `requireAdmin()` (P1.09) with the Postgres check `users.role = 'admin'`.
  - `(app)/admin/layout.tsx`: shadcn Sidebar, date-range picker (URL `?preset=30d` or `?from=&to=`), Test/Live badge, admin ⌘K (customer by email, order #, or license key via `key_hash`).
  - Destructive actions (delete discount, revoke entitlement, hard-delete release, raise limits) use Clerk step-up reverification: the Server Action checks `has({ reverification: 'strict' })` and returns `reverificationError('strict')`; the client wraps the call in `useReverification`.

  ```ts
  // src/server/admin/audit.ts
  import 'server-only'
  import { headers } from 'next/headers'
  import { db } from '@/db/client'
  import { auditLog } from '@/db/schema'
  import { requireAdmin } from '@/lib/auth'
  import { hashIp } from '@/lib/crypto'

  export async function withAudit<T>(
    entry: { action: string; targetType: string; targetId: string; reason?: string; before?: unknown },
    mutate: () => Promise<T>,
  ): Promise<T> {
    const { userId } = await requireAdmin()
    const h = await headers()
    const result = await mutate()
    await db.insert(auditLog).values({
      actorUserId: userId, action: entry.action, targetType: entry.targetType, targetId: entry.targetId,
      before: entry.before ?? null, after: (result ?? null) as object | null, reason: entry.reason,
      ipHash: hashIp(h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'), userAgent: h.get('user-agent'),
    })
    return result
  }
  ```
  - **Done when:** every admin mutation in P7.x goes through `withAudit` (grep-able lint rule: `src/app/(app)/admin/**/actions.ts` must import it).

- [ ] **P7.02 — Revenue metrics layer** _(6 h)_ [FR-AD-10, FR-AD-11, PRD §8.1]

  ```ts
  // src/server/metrics/revenue.ts
  import 'server-only'
  import { cacheLife, cacheTag } from 'next/cache'
  import { sql } from 'drizzle-orm'
  import { db } from '@/db/client'

  export type RevenueDay = {
    day: string; one_time_gross: number; one_time_net: number
    subscription_gross: number; subscription_net: number; refunds: number
  }

  /** Daily revenue in integer cents (UTC days). Subscription first orders are counted once, via their invoice. */
  export async function revenueByDay(fromIso: string, toIso: string): Promise<RevenueDay[]> {
    'use cache'
    cacheLife('minutes')
    cacheTag('admin-metrics')
    return db.execute<RevenueDay>(sql`
      with days as (
        select generate_series(${fromIso}::date, ${toIso}::date, interval '1 day')::date as day
      ),
      one_time as (
        select o.created_at::date as day, sum(o.total_usd) as gross, sum(o.total_usd - o.tax_usd) as net
        from app.orders o
        where o.status in ('paid', 'refunded', 'partial_refund') and not o.test_mode
          and o.created_at >= ${fromIso}::date and o.created_at < ${toIso}::date + 1
          and not exists (
            select 1 from app.order_items oi join app.variants v on v.ls_variant_id = oi.ls_variant_id
            where oi.order_id = o.id and v.tier = 'all_access')
        group by 1
      ),
      subs as (
        select i.created_at::date as day, sum(i.total_usd) as gross, sum(i.total_usd - i.tax_usd) as net
        from app.subscription_invoices i
        where i.status in ('paid', 'refunded', 'partial_refund')
          and i.created_at >= ${fromIso}::date and i.created_at < ${toIso}::date + 1
        group by 1
      ),
      refunds as (
        select o.refunded_at::date as day, sum(o.total_usd - o.tax_usd) as amount
        from app.orders o
        where o.status = 'refunded' and not o.test_mode
          and o.refunded_at >= ${fromIso}::date and o.refunded_at < ${toIso}::date + 1
        group by 1
      )
      select d.day::text as day,
             coalesce(ot.gross, 0)::int as one_time_gross, coalesce(ot.net, 0)::int as one_time_net,
             coalesce(s.gross, 0)::int  as subscription_gross, coalesce(s.net, 0)::int as subscription_net,
             coalesce(r.amount, 0)::int as refunds
      from days d
      left join one_time ot on ot.day = d.day
      left join subs s on s.day = d.day
      left join refunds r on r.day = d.day
      order by d.day`)
  }
  ```
  - KPI queries (orders, AOV, refund rate, estimated payout with `LS_FEE_PCT` / `LS_FEE_FIXED_CENTS`) follow the PRD §8.1 formulas; each LS webhook handler calls `revalidateTag('admin-metrics', 'max')`.
  - **Done when:** for a fixture month, totals match hand-computed values exactly, and staging totals are within ±0.5 % of the LS dashboard for the same range.

- [ ] **P7.03 — MRR snapshots & movements** _(4 h)_ [FR-AD-13, FR-SYS-05]
  - `subscription_payment_success` refreshes `subscriptions.unit_price_usd` from the latest paid renewal invoice (ex-tax, after discounts), so MRR reflects what customers actually pay.

  ```sql
  -- /api/cron/mrr-snapshot, daily 00:10 UTC; :day = yesterday (UTC)
  insert into app.mrr_subscription_days (subscription_id, date, mrr_cents)
  select s.id, :day::date,
         case s.interval when 'year' then round(s.unit_price_usd / 12.0)::int else s.unit_price_usd end
  from app.subscriptions s
  where s.status = 'active'
     or (s.status = 'past_due' and s.past_due_since > :day::date - interval '14 days')
  on conflict do nothing;

  insert into app.mrr_snapshots (date, mrr_cents, active_subscriptions, new_cents, expansion_cents,
                                 contraction_cents, churned_cents, reactivated_cents)
  select :day::date,
         coalesce(sum(t.mrr_cents), 0),
         count(t.subscription_id),
         coalesce(sum(t.mrr_cents) filter (where y.subscription_id is null and e.subscription_id is null), 0),
         coalesce(sum(t.mrr_cents - y.mrr_cents) filter (where t.mrr_cents > y.mrr_cents), 0),
         coalesce(sum(y.mrr_cents - t.mrr_cents) filter (where t.mrr_cents < y.mrr_cents), 0),
         (select coalesce(sum(y2.mrr_cents), 0) from app.mrr_subscription_days y2
           where y2.date = :day::date - 1
             and not exists (select 1 from app.mrr_subscription_days t2
                             where t2.date = :day::date and t2.subscription_id = y2.subscription_id)),
         coalesce(sum(t.mrr_cents) filter (where y.subscription_id is null and e.subscription_id is not null), 0)
  from app.mrr_subscription_days t
  left join app.mrr_subscription_days y
         on y.subscription_id = t.subscription_id and y.date = :day::date - 1
  left join lateral (
    select p.subscription_id from app.mrr_subscription_days p
    where p.subscription_id = t.subscription_id and p.date < :day::date - 1
    limit 1
  ) e on true
  where t.date = :day::date
  on conflict (date) do update set
    mrr_cents = excluded.mrr_cents, active_subscriptions = excluded.active_subscriptions,
    new_cents = excluded.new_cents, expansion_cents = excluded.expansion_cents,
    contraction_cents = excluded.contraction_cents, churned_cents = excluded.churned_cents,
    reactivated_cents = excluded.reactivated_cents;
  ```
  - Backfill script replays history from `subscription_invoices` for launch-day charts.
  - **Done when:** unit fixtures classify new, expansion, contraction, churn and reactivation correctly, and the snapshot is idempotent (running twice changes nothing).

- [ ] **P7.04 — Overview page** _(6 h)_ [FR-AD-10, SG §5.11]
  - KPI stat tiles (label · value · delta vs previous period · 12-point sparkline), the MRR hero figure with `NumberTicker`, the stacked One-time vs Subscription chart (2 px gaps, one axis, table toggle), and a recent-activity feed (orders, failed payments, activations).

- [ ] **P7.05 — Revenue & subscription pages** _(5 h)_ [FR-AD-11..13]
  - Revenue by line and product (horizontal bars ≤ 24 px), gross/net toggle, refunds; MRR trend + movements waterfall (diverging palette, SG §2.6); logo and revenue churn; CSV export on every table.

- [ ] **P7.06 — Conversion & cart abandonment** _(6 h)_ [FR-AD-20, FR-AD-21, FR-AD-23]

  ```ts
  // src/server/metrics/funnel.ts: PostHog Query API, server-side only
  import 'server-only'
  import { cacheLife, cacheTag } from 'next/cache'
  import { env } from '@/lib/env'

  type Step = { name: string; count: number }

  export async function posthogFunnel(events: string[], dateFrom: string, dateTo: string): Promise<Step[]> {
    'use cache'
    cacheLife({ stale: 300, revalidate: 900, expire: 3600 })
    cacheTag('admin-funnel')
    const res = await fetch(`https://us.posthog.com/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          kind: 'FunnelsQuery',
          series: events.map((event) => ({ kind: 'EventsNode', event })),
          dateRange: { date_from: dateFrom, date_to: dateTo },
          funnelsFilter: { funnelWindowInterval: 7, funnelWindowIntervalUnit: 'day', funnelOrderType: 'ordered' },
        },
      }),
    })
    if (!res.ok) throw new Error(`PostHog query failed: ${res.status}`)
    const json = (await res.json()) as { results: Step[] }
    return json.results.map(({ name, count }) => ({ name, count }))
  }

  // Purchase funnel and preview-engagement funnel (PRD FR-AD-20)
  export const PURCHASE_FUNNEL = ['$pageview', 'product_viewed', 'checkout_started', 'purchase_completed']
  export const PREVIEW_FUNNEL = ['product_viewed', 'preview_opened', 'preview_buy_clicked']
  ```
  - Funnel chart: horizontal bars in the ordinal Lumen ramp (SG §2.6) with step-to-step drop-off as text; breakdowns by product and UTM source; a "data unavailable" state if PostHog is down.
  - Abandonment: rate trend from `checkout_sessions` (`abandoned` + `expired` vs `completed`), table (product, tier, email if known, UTM, discount, started at) and streamed CSV export.
  - **Done when:** AC-07 is visible in the table, and the funnel counts match PostHog's UI for the same range.

- [ ] **P7.07 — Discount & promo code management** _(6 h)_ [FR-AD-30..34, F-11]

  ```ts
  // src/app/(app)/admin/discounts/actions.ts (create; delete and clone-edit follow the same pattern)
  'use server'
  import { z } from 'zod'
  import { db } from '@/db/client'
  import { discounts } from '@/db/schema'
  import { lsFetch } from '@/lib/billing/lemonsqueezy/client'
  import { withAudit } from '@/server/admin/audit'
  import { env } from '@/lib/env'

  const DiscountInput = z.object({
    name: z.string().min(2).max(100),
    code: z.string().regex(/^[A-Z0-9]{3,256}$/, 'Uppercase letters and digits, 3–256 characters'),
    amountType: z.enum(['percent', 'fixed']),
    amount: z.number().int().positive(), // percent (1–100) or cents
    variantIds: z.array(z.number().int().positive()).default([]),
    maxRedemptions: z.number().int().positive().optional(),
    startsAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    duration: z.enum(['once', 'repeating', 'forever']).default('once'),
    durationInMonths: z.number().int().positive().optional(),
  }).refine((d) => d.amountType === 'fixed' || d.amount <= 100, { message: 'Percent discounts must be 1–100', path: ['amount'] })

  export async function createDiscount(raw: z.input<typeof DiscountInput>) {
    const input = DiscountInput.parse(raw)
    return withAudit({ action: 'discount.created', targetType: 'discount', targetId: input.code }, async () => {
      const res = await lsFetch<{ data: { id: string } }>('/discounts', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'discounts',
            attributes: {
              name: input.name, code: input.code, amount: input.amount, amount_type: input.amountType,
              is_limited_to_products: input.variantIds.length > 0,
              is_limited_redemptions: Boolean(input.maxRedemptions), max_redemptions: input.maxRedemptions,
              starts_at: input.startsAt?.toISOString(), expires_at: input.expiresAt?.toISOString(),
              duration: input.duration, duration_in_months: input.durationInMonths, test_mode: env.LS_TEST_MODE,
            },
            relationships: {
              store: { data: { type: 'stores', id: String(env.LS_STORE_ID) } },
              ...(input.variantIds.length > 0
                ? { variants: { data: input.variantIds.map((id) => ({ type: 'variants', id: String(id) })) } }
                : {}),
            },
          },
        }),
      })
      const [row] = await db.insert(discounts).values({
        lsDiscountId: Number(res.data.id), code: input.code, name: input.name, amount: input.amount,
        amountType: input.amountType, duration: input.duration, durationInMonths: input.durationInMonths,
        variantIds: input.variantIds, maxRedemptions: input.maxRedemptions, startsAt: input.startsAt,
        expiresAt: input.expiresAt, testMode: env.LS_TEST_MODE,
      }).returning()
      return row
    })
  }
  ```
  - Delete → `DELETE /v1/discounts/{id}` + mirror `status = 'deleted'`. "Edit" = snapshot → delete → create with the same code; if the create fails, re-create the snapshot. The UI warns that redemption counts restart.
  - Share link `https://lumira.dev/?code=CODE`; the site-banner toggle patches Sanity `siteSettings.promoBanner`; per-code performance from `orders.discount_code` + `GET /v1/discount-redemptions?filter[discount_id]=`.
  - **Done when:** AC-08 passes.

- [ ] **P7.08 — Customers & unified timeline** _(6 h)_ [FR-AD-40, FR-AD-41]

  ```ts
  // src/server/admin/timeline.ts (paginated, newest first)
  export const customerTimeline = (userId: string, email: string, offset = 0) => db.execute(sql`
    select * from (
      select 'order' as kind, o.created_at as at,
             jsonb_build_object('orderNumber', o.order_number, 'totalUsd', o.total_usd, 'status', o.status) as data
      from app.orders o where o.user_id = ${userId}
      union all
      select 'payment_' || p.type, p.created_at, jsonb_build_object('amountUsd', p.amount_usd)
      from app.payment_events p where p.user_id = ${userId}
      union all
      select 'license_' || e.type, e.created_at,
             jsonb_build_object('keyShort', k.key_short, 'instance', i.name, 'country', e.country, 'actor', e.actor)
      from app.license_events e
      join app.license_keys k on k.id = e.license_key_id
      left join app.license_instances i on i.id = e.instance_id
      where k.user_id = ${userId}
      union all
      select 'download_' || d.status, d.created_at,
             jsonb_build_object('version', r.semver, 'channel', d.channel, 'country', d.country)
      from app.download_events d join app.releases r on r.id = d.release_id
      where d.user_id = ${userId}
      union all
      select 'email_' || m.status, m.created_at, jsonb_build_object('template', m.template)
      from app.email_outbox m where m.to = ${email}
    ) t
    order by at desc
    limit 100 offset ${offset}`)
  ```
  - Quick actions (all `withAudit` + reverification): resend an email (new outbox row with a fresh idempotency key), grant a comp entitlement, raise the activation limit (`PATCH /v1/license-keys/{id}`), revoke an entitlement.

- [ ] **P7.09 — Activity logs & webhook inspector** _(5 h)_ [FR-AD-42..46]
  - Downloads log with anomaly flags (SQL window: > 30 downloads/24 h or > 5 countries/24 h per user); failed/recovered/refunded payments; license activations by source; email log; webhook inspector (last 500 per source, filters, payload viewer with secrets redacted).

  ```ts
  // Replay: bypasses the ledger's "processed" short-circuit on purpose; handlers are upsert-safe.
  export async function replayWebhook(id: string) {
    return withAudit({ action: 'webhook.replayed', targetType: 'webhook_event', targetId: id }, async () => {
      const event = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, id) })
      if (!event) throw new Error('Webhook event not found')
      const handlers = { lemonsqueezy: dispatchLemonSqueezyEvent, clerk: handleClerkEvent, sanity: handleSanityEvent, resend: handleResendEvent }
      await handlers[event.source](event.payload as never)
      await db.update(webhookEvents).set({ status: 'processed', error: null, processedAt: new Date() }).where(eq(webhookEvents.id, id))
      return { replayed: id }
    })
  }
  ```

- [ ] **P7.10 — Admin audit log page** _(2 h)_ [FR-AD-47]
  - Filters (actor, action, target, date); before/after JSON diff viewer; CSV export. The table is append-only at the database level (P2.04).

- [ ] **P7.11 — R2 release uploader** _(8 h)_ [FR-AD-52, FR-AD-53, F-10]

  ```ts
  // src/app/(app)/admin/products/[id]/releases/new/actions.ts
  'use server'
  import {
    AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, HeadObjectCommand, UploadPartCommand,
  } from '@aws-sdk/client-s3'
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
  import semver from 'semver'
  import { z } from 'zod'
  import { db } from '@/db/client'
  import { releases } from '@/db/schema'
  import { requireAdmin } from '@/lib/auth'
  import { r2Write } from '@/lib/r2'
  import { env } from '@/lib/env'
  import { assertNewerThanLatest, getProductOrThrow } from '@/server/catalog'
  import { withAudit } from '@/server/admin/audit'

  const MiB = 1024 * 1024
  const Bucket = env.R2_BUCKET

  export async function createUpload(raw: { productId: string; version: string; size: number }) {
    await requireAdmin()
    const { productId, version, size } = z.object({
      productId: z.string(), version: z.string().refine((v) => semver.valid(v) !== null, 'Invalid semver'),
      size: z.number().int().positive().max(5 * 1024 * MiB),
    }).parse(raw)
    const product = await getProductOrThrow(productId)
    await assertNewerThanLatest(productId, version)
    // R2: every part except the last must be the same size; at most 10,000 parts.
    const partSize = Math.max(16 * MiB, Math.ceil(size / 10_000 / MiB) * MiB)
    const key = `products/${productId}/releases/${version}/${product.slug}-${version}.zip`
    const { UploadId } = await r2Write.send(new CreateMultipartUploadCommand({ Bucket, Key: key, ContentType: 'application/zip' }))
    return { key, uploadId: UploadId!, partSize, partCount: Math.ceil(size / partSize) }
  }

  export async function signParts(raw: { key: string; uploadId: string; partNumbers: number[] }) {
    await requireAdmin()
    const { key, uploadId, partNumbers } = z.object({
      key: z.string().startsWith('products/'), uploadId: z.string(),
      partNumbers: z.array(z.number().int().min(1).max(10_000)).max(50),
    }).parse(raw)
    return Promise.all(partNumbers.map(async (PartNumber) => ({
      partNumber: PartNumber,
      url: await getSignedUrl(r2Write, new UploadPartCommand({ Bucket, Key: key, UploadId: uploadId, PartNumber }), { expiresIn: 3600 }),
    })))
  }

  export async function completeUpload(raw: {
    productId: string; version: string; key: string; uploadId: string; size: number; sha256: string
    parts: { PartNumber: number; ETag: string }[]
  }) {
    const input = z.object({
      productId: z.string(), version: z.string(), key: z.string().startsWith('products/'), uploadId: z.string(),
      size: z.number().int().positive(), sha256: z.string().regex(/^[0-9a-f]{64}$/),
      parts: z.array(z.object({ PartNumber: z.number().int(), ETag: z.string() })).min(1),
    }).parse(raw)
    return withAudit({ action: 'release.uploaded', targetType: 'release', targetId: input.key }, async () => {
      await r2Write.send(new CompleteMultipartUploadCommand({
        Bucket, Key: input.key, UploadId: input.uploadId,
        MultipartUpload: { Parts: [...input.parts].sort((a, b) => a.PartNumber - b.PartNumber) },
      }))
      const head = await r2Write.send(new HeadObjectCommand({ Bucket, Key: input.key }))
      if (head.ContentLength !== input.size) throw new Error('Uploaded size does not match the local file')
      const v = semver.parse(input.version)!
      const [release] = await db.insert(releases).values({
        productId: input.productId, semver: input.version, major: v.major, minor: v.minor, patch: v.patch,
        r2Key: input.key, sizeBytes: input.size, sha256: input.sha256,
      }).returning()
      return release!
    })
  }

  export async function abortUpload(raw: { key: string; uploadId: string }) {
    await requireAdmin()
    await r2Write.send(new AbortMultipartUploadCommand({ Bucket, Key: raw.key, UploadId: raw.uploadId }))
  }
  ```

  ```ts
  // src/workers/sha256.worker.ts: streaming hash, constant memory for multi-GB files
  import { createSHA256 } from 'hash-wasm'

  self.onmessage = async (event: MessageEvent<File>) => {
    const hasher = await createSHA256()
    hasher.init()
    const reader = event.data.stream().getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      hasher.update(value)
    }
    self.postMessage(hasher.digest('hex'))
  }
  ```

  ```ts
  // src/components/admin/release-uploader/upload.ts (client): 4 parts in flight, 3 retries per part
  export async function uploadRelease(file: File, productId: string, version: string, onProgress: (bytes: number) => void, signal: AbortSignal) {
    const worker = new Worker(new URL('../../../workers/sha256.worker.ts', import.meta.url), { type: 'module' })
    const hashing = new Promise<string>((resolve) => { worker.onmessage = (e) => { resolve(e.data); worker.terminate() } })
    worker.postMessage(file) // hashes in parallel with the upload

    const { key, uploadId, partSize, partCount } = await createUpload({ productId, version, size: file.size })
    const queue = Array.from({ length: partCount }, (_, i) => i + 1)
    const parts: { PartNumber: number; ETag: string }[] = []
    let uploaded = 0

    async function lane() {
      for (let partNumber = queue.shift(); partNumber !== undefined; partNumber = queue.shift()) {
        const [{ url }] = await signParts({ key, uploadId, partNumbers: [partNumber] })
        const blob = file.slice((partNumber - 1) * partSize, Math.min(partNumber * partSize, file.size))
        for (let attempt = 0; ; attempt++) {
          try {
            const res = await fetch(url, { method: 'PUT', body: blob, signal })
            if (!res.ok) throw new Error(`Part ${partNumber}: HTTP ${res.status}`)
            parts.push({ PartNumber: partNumber, ETag: res.headers.get('ETag')! })
            onProgress((uploaded += blob.size))
            break
          } catch (error) {
            if (signal.aborted || attempt === 2) throw error
            await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
          }
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: 4 }, lane))
      return await completeUpload({ productId, version, key, uploadId, size: file.size, sha256: await hashing, parts })
    } catch (error) {
      worker.terminate()
      await abortUpload({ key, uploadId })
      throw error
    }
  }
  ```
  - UI: drop zone (zip only), progress with throughput (EMA) and ETA, cancel, `beforeunload` guard, then the release form (type, title, summary, change list; rich notes via the Studio deep link).
  - **Done when:** AC-06 passes (2 GB upload with an injected failing part; checksum equals local `shasum -a 256`).

- [ ] **P7.12 — Publish & notify** _(4 h)_ [FR-AD-53, FR-EM-04, FR-SYS-08]
  - `publishRelease` (Server Action, `withAudit`): create the Sanity `release` document with the write client (`releaseId` set), mark `releases.status = 'published'`, then `updateTag('release:{slug}')`, `updateTag('changelog')`, `updateTag('product:{slug}')`, `updateTag('catalog')` (read-your-writes inside the Server Action). If "notify" is on, publish to QStash with `deduplicationId: release-notify:{releaseId}`.

  ```ts
  // src/app/api/queue/release-notify/route.ts
  import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
  import { Resend } from 'resend'
  import { env } from '@/lib/env'
  import { eligibleReleaseRecipients, renderReleaseEmail } from '@/server/releases/notify'

  const resend = new Resend(env.RESEND_API_KEY)

  export const POST = verifySignatureAppRouter(async (req: Request) => {
    const { releaseId } = (await req.json()) as { releaseId: string }
    const recipients = await eligibleReleaseRecipients(releaseId) // entitled owners with release emails on
    for (let i = 0; i < recipients.length; i += 100) {
      const batch = await Promise.all(recipients.slice(i, i + 100).map((r) => renderReleaseEmail(r, releaseId)))
      const { error } = await resend.batch.send(batch, { idempotencyKey: `release:${releaseId}:batch:${i / 100}` })
      if (error) throw new Error(error.message) // QStash retries; sent batches are deduplicated by their keys
    }
    return Response.json({ recipients: recipients.length })
  })
  ```
  - **Done when:** publishing a release updates `/changelog` immediately and emails eligible owners once, even if QStash retries.

- [ ] **P7.13 — Integrations health page** _(2 h)_ [FR-AD-60]
  - Checks: LS `GET /v1/users/me` (mode + reachability), last webhook per source (amber > 24 h), R2 `HeadBucket` with both tokens, Resend domain status, Discord bot permissions (`GET /guilds/{id}/members/@me`), Sanity token scope, PostHog Query API; each green/amber/red with "how to fix" copy.

- [ ] **P7.14 — Admin tests** _(4 h)_
  - Metrics SQL against fixtures (known totals, the double-count guard for subscription first orders); MRR movement classification; authorization (buyer → 404 on every admin route and action); audit rows written for every mutation; upload E2E with a generated 200 MB file against the staging bucket.

**Phase 7 exit criteria:** admin revenue within ±0.5 % of the LS dashboard; funnels and abandonment populated; discounts, activity logs, uploads and audit working.

---

## Phase 8 — Launch Hardening (Week 12 · ~32 h)

- [ ] **P8.01 — Content Security Policy** _(5 h)_ [NFR-SEC-07]
  - Move CSP into `proxy.ts` so every response carries exactly one policy. `(site)` routes get the static allowlist from PRD NFR-SEC-07. `(app)` routes get a per-request nonce:

  ```ts
  // src/proxy.ts (Phase 8 excerpt)
  const APP_ROUTES = /^\/(account|admin|checkout|auth|sign-in|sign-up|d)(\/|$)/

  function strictCsp(nonce: string) {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://clerk.lumira.dev https://*.lemonsqueezy.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.sanity.io https://img.clerk.com",
      "font-src 'self'",
      "connect-src 'self' https://clerk.lumira.dev https://*.r2.cloudflarestorage.com",
      'frame-src https://*.lemonsqueezy.com https://challenges.cloudflare.com',
      "worker-src 'self' blob:",
      "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
    ].join('; ')
  }

  // inside clerkMiddleware(async (_auth, req) => { … }):
  if (APP_ROUTES.test(req.nextUrl.pathname)) {
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    const csp = strictCsp(nonce)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', csp) // Next.js applies the nonce to its own scripts
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res // plus the promo/region cookies from P5.07
  }
  ```
  - `(app)/layout.tsx` reads `(await headers()).get('x-nonce')` and passes it to `<ClerkProvider nonce>` and `next-themes` `<ThemeProvider nonce>`.
  - Ship as `Content-Security-Policy-Report-Only` with Sentry's security endpoint for 7 days, then enforce.
  - **Done when:** zero CSP reports for a week of staging traffic (checkout, admin upload, Clerk flows and Discord included) and enforcement is on.

- [ ] **P8.02 — Abuse controls review** _(2 h)_ [NFR-SEC-10, NFR-SEC-16]
  - Verify every limit in NFR-SEC-10 with a load script; enable Vercel BotID on `startCheckout` and the license proxy; Vercel Firewall rule rate-limiting `/api/webhooks/*` to known sender behavior.

- [ ] **P8.03 — Performance verification** _(3 h)_ [NFR-PERF]
  - Lighthouse CI on production-like data; Speed Insights RUM on staging traffic for a week; confirm PostHog, Lemon.js and clerk-js stay out of first-load JS; fix any p75 regressions.

- [ ] **P8.04 — Accessibility audit** _(4 h)_ [NFR-A11Y]
  - axe on every route in both themes; manual keyboard passes (purchase, preview player, licenses, admin uploader); VoiceOver (macOS/iOS) and NVDA (Windows) passes of purchase → success → Library; reduced-motion pass against SG §6.8.

- [ ] **P8.05 — Backups & disaster-recovery drill** _(3 h)_ [NFR-OPS-02]
  - Restore Supabase PITR into a scratch project and run the smoke suite against it; nightly `sanity dataset export` to `lumira-backups`; weekly R2 → `lumira-backups` sync (rclone with the backup token); document the measured RTO.

- [ ] **P8.06 — Observability & alerting** _(3 h)_ [NFR-OPS-03..05]
  - Sentry alerts (webhook 5xx, outbox `failed`, download 5xx > 1 %, checkout errors); uptime monitor on `/api/health` (Postgres, Redis, R2 `HeadBucket`) every minute; reconciliation mismatch email; a PostHog alert on the preview failure rate.

- [ ] **P8.07 — Legal & consent** _(3 h)_ [PRD §5.6, FR-AN-04]
  - License terms (Personal, Team, Extended, All-Access), refund policy (PRD Q2), privacy policy with the processor list, terms of sale referencing LS as Merchant of Record; the EU consent banner toggling PostHog persistence and replay; legal review.

- [ ] **P8.08 — Lemon Squeezy live-mode cutover** _(4 h)_
  - Activate the store for live payments; create a live API key; set `LS_TEST_MODE=false` in production.
  - Confirm live product and variant IDs, run `ls:sync`, and update Sanity IDs.
  - Create the production webhook (new signing secret, every FR-SYS-01 event); re-create launch discounts in live mode; enable the affiliate program.
  - Make a real purchase with a real card → verify key, email, download, Discord → refund it → verify revocation (AC-02 in production).
  - **Done when:** the real purchase and refund complete cleanly and appear in the admin dashboard.

- [ ] **P8.09 — Demo sweep** _(2 h)_ [FR-LP-11]
  - Every demo: headers (`frame-ancestors`, `noindex`), bridge `ready` within 3 s, Lighthouse mobile LCP ≤ 2.5 s, fallback gallery present.

- [ ] **P8.10 — Launch runbook & go-live** _(3 h)_
  - Pre-flight checklist (DNS, env parity, crons enabled, webhooks green on the health page); cache warm-up of top pages; 48-hour watch window with Sentry and PostHog dashboards; rollback via Vercel Instant Rollback (database migrations are backward-compatible for one release); support macros for "download link expired", "activation limit reached" and "didn't receive email".

**Phase 8 exit criteria (M4):** every P0 requirement verified, AC-01 through AC-09 green in production, live mode on.

---

## Appendix A — Test Matrix

| Layer | Tool | Scope | Runs |
|---|---|---|---|
| Unit | Vitest | Eligibility rules, HMAC verification, license crypto, `validateBands`, `computeFrame`, reducer, token redemption, discount validation, MRR classification | Every PR |
| Integration | Vitest + disposable Postgres + MSW | Webhook handlers with recorded LS, Clerk, Sanity and Resend fixtures; outbox dispatch; metrics SQL | Every PR |
| Contract | Vitest + recorded HTTP | LS client (checkout, license keys, discounts), License API guard | Every PR |
| E2E | Playwright | Purchase (LS test mode), success page, email interstitial, downloads, license activation, registry install, preview player, Discord (mocked), admin upload | Preview deployments |
| Visual | Playwright snapshots | Bento presets, tiles, preview player, key UI, both themes, three breakpoints | Every PR |
| Accessibility | @axe-core/playwright + manual screen readers | All routes (automated); purchase and preview flows (manual, pre-launch) | Every PR / P8.04 |
| Performance | Lighthouse CI + Speed Insights | Budgets in PRD §5.1 | Every PR / continuous |
| Security | CSP report-only, dependency audit, secret scanning | Headers, dependencies, secrets | Continuous |

## Appendix B — Runbooks (stored in `docs/runbooks/`)

| Runbook | Key steps |
|---|---|
| **Webhook replay** | Admin → Webhooks → filter `failed` → inspect error → fix → Replay (handlers are idempotent). For a bulk outage, run the reconciliation cron manually. |
| **"I didn't receive my email"** | Customer timeline → email status → if bounced, correct the address in Clerk → Resend from the timeline (new idempotency key). |
| **Activation limit reached** | Customer timeline → license → review instances → deactivate a stale instance or raise the limit (reason required, audited). |
| **Refund with revocation** | Refund in LS → verify `order_refunded` processed → confirm keys disabled and Discord role removed on the customer timeline. |
| **Secret rotation** | LS signing secret: add the new secret in LS → deploy → remove the old one. Encryption key: add a `v2` key, re-encrypt in a background job, retire `v1`. R2 and Discord tokens: rotate in the provider → update Vercel env → redeploy. |
| **Lemon Squeezy outage** | Health page red → storefront banner "Checkout temporarily unavailable" → hosted checkout fallback links (PRD §6.7) → reconcile after recovery. |
| **R2 outage** | Health page red → incident banner on the Library → downloads resume automatically; no data loss (backups verified weekly). |
| **Provider migration (contingency, PRD R1)** | Implement a new `BillingProvider` / `LicenseProvider` adapter → dual-write period → migrate keys → switch the storefront CTA → keep LS webhooks until the last subscription renews. |

## Appendix C — Post-Launch Backlog (P2)

- Team seats with Clerk Organizations (shared library for Team and Extended licenses).
- Private GitHub repository access for boilerplates via a GitHub App (PRD Q5).
- Automated abandoned-checkout reminders for opted-in, signed-in buyers (FR-AD-22).
- Product-specific Discord roles; `affiliate_activated` notifications (FR-GS-04).
- Buyer reviews with moderation; localized storefront copy.
- Versioned documentation per major version with a version switcher.
