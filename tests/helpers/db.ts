import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/db/schema'

/**
 * A disposable Postgres (PGlite, in-process WASM) with every migration applied: the "disposable
 * Postgres" of Task.md Appendix A without Docker. Each call returns an isolated database.
 */
export async function createTestDb() {
  const client = new PGlite()
  const db = drizzle(client, { schema, casing: 'snake_case' })
  await migrate(db, { migrationsFolder: 'src/db/migrations' })
  return { db, client, close: () => client.close() }
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>['db']

let shared: ReturnType<typeof createTestDb> | undefined

/**
 * One PGlite per test file, shared between the test and `vi.mock('@/db/client')`, so server modules
 * that import `db` directly run against the migrated in-memory database:
 *
 *   vi.mock('@/db/client', async () => ({ db: (await (await import('../helpers/db')).sharedTestDb()).db }))
 */
export function sharedTestDb() {
  shared ??= createTestDb()
  return shared
}
