import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

const secret = z.string().min(32)
const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Loosens a schema to optional in development only; builds and production always require the real
 * value. Kept distinct from a bare `.optional()` so it's obvious at the call site why the rule
 * differs between dev and prod, and easy to retarget (e.g. if a future Clerk version reintroduces
 * keyless dev mode, this is the one place to flip back).
 */
const devOptional = <T extends z.ZodType>(schema: T) => (isDevelopment ? schema.optional() : schema)

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DATABASE_URL_DIRECT: z.url().optional(),
    CLERK_SECRET_KEY: devOptional(z.string().startsWith('sk_')),
    CLERK_WEBHOOK_SIGNING_SECRET: devOptional(z.string().startsWith('whsec_')),
    /**
     * `fixtures` serves the seed catalog from `src/lib/sanity/fixtures.ts` instead of the Content Lake,
     * so the storefront renders before a Sanity project exists. Never allowed in production.
     */
    CONTENT_SOURCE: z.enum(['sanity', 'fixtures']).default('sanity'),
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
    /** Release notices go from a separate domain with tracking allowed (FR-EM-12). */
    EMAIL_FROM_NEWS: z.string().default('Lumira <releases@news.lumira.dev>'),
    /** Where job failures, reconciliation mismatches and hard bounces are reported. */
    ADMIN_ALERT_EMAIL: z.string().default('support@lumira.dev'),
    SUPPORT_EMAIL: z.string().default('support@lumira.dev'),
    POSTHOG_PERSONAL_API_KEY: z.string(),
    POSTHOG_PROJECT_ID: z.string(),
    /** Query API host for server-side funnels (us.posthog.com or eu.posthog.com). */
    POSTHOG_API_HOST: z.url().default('https://us.posthog.com'),
    /** Deployed Sanity Studio, for admin deep links. */
    SANITY_STUDIO_URL: z.url().default('https://lumira.sanity.studio'),
    UPSTASH_REDIS_REST_URL: z.url(),
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
    LICENSE_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64'),
    LICENSE_HASH_PEPPER: secret,
    DOWNLOAD_TOKEN_SECRET: secret,
    GUEST_SCOPE_SECRET: secret,
    IP_HASH_SALT: z.string().min(16),
    CRON_SECRET: secret,
    SENTRY_AUTH_TOKEN: z.string().optional(),
    /** P8.01: ship CSP as Report-Only for 7 days of clean reports, then enforce. Read by proxy.ts. */
    CSP_MODE: z.enum(['report-only', 'enforce']).default('report-only'),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: devOptional(z.string().startsWith('pk_')),
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string(),
    NEXT_PUBLIC_SANITY_DATASET: z.string(),
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string(),
    NEXT_PUBLIC_LS_STORE_SLUG: z.string(),
    NEXT_PUBLIC_DEMO_ORIGIN_SUFFIX: z.string().default('lumira-demos.dev'),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
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
  // CI lint/typecheck/unit jobs run without secrets. Builds and the running app always validate.
  skipValidation: process.env.SKIP_ENV_VALIDATION === '1',
})

if (!isDevelopment && process.env.VERCEL_ENV === 'production' && env.CONTENT_SOURCE !== 'sanity') {
  throw new Error('CONTENT_SOURCE=fixtures is for local development only.')
}
