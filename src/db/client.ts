import 'server-only'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { env } from '@/lib/env'

const globalForDb = globalThis as unknown as { sql?: postgres.Sql }

// Supavisor transaction-mode pooler: prepared statements must be disabled. A small pool per
// function instance keeps total connections under the pooler limit.
const sql = globalForDb.sql ?? postgres(env.DATABASE_URL, { prepare: false, max: 5, idle_timeout: 20 })
if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql

export const db = drizzle(sql, { schema, casing: 'snake_case' })
export type Db = typeof db
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
/** Either the root client or a transaction; lets services join a caller's transaction. */
export type DbOrTx = Db | Tx
