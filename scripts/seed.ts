// P2.06: `pnpm db:seed` — deterministic demo data for local development and staging.
//
// Mirrors the fixture catalog into Postgres (products, variants, releases), creates an admin row
// and ~90 days of synthetic buyers, orders, keys, activations, downloads, subscriptions, invoices
// and MRR snapshots so every admin chart has data. It TRUNCATES the app schema first and refuses
// to run against production.
//
//   SEED_ADMIN_CLERK_ID=user_xxx SEED_ADMIN_EMAIL=you@example.com pnpm db:seed
//
// The admin row matters only if its id matches a real Clerk user with `publicMetadata.role = "admin"`.
import { db } from '../src/db/client'
import { env } from '../src/lib/env'
import { seedDatabase } from './seed-data'

function guard() {
  const url = new URL(env.DATABASE_URL) // the seed runs as this role; staging needs the owner connection here
  const local = ['localhost', '127.0.0.1', '::1', 'db', 'postgres'].includes(url.hostname)
  if (process.env.VERCEL_ENV === 'production') throw new Error('Refusing to seed a production database.')
  if (!local && process.env.SEED_ALLOW_REMOTE !== '1') {
    throw new Error(
      `DATABASE_URL points at ${url.hostname}. Set SEED_ALLOW_REMOTE=1 to seed a remote staging database (it is truncated first).`,
    )
  }
}

async function main() {
  guard()
  const summary = await seedDatabase(db, {
    adminId: process.env.SEED_ADMIN_CLERK_ID ?? 'user_seed_admin',
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@lumira.test',
    log: (msg) => console.log(msg),
  })
  console.log(`Done: ${summary.products} products, ${summary.buyers} buyers, ${summary.orders} orders.`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
