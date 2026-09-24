import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDb } from '../helpers/db'

describe('migrations & privileges (P2.04, NFR-SEC-12)', () => {
  let client: PGlite
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ client, close } = await createTestDb())
  })
  afterAll(() => close())

  it('creates every table in schema app with RLS enabled', async () => {
    const { rows } = await client.query<{ tablename: string; rowsecurity: boolean }>(
      `select tablename, rowsecurity from pg_tables where schemaname = 'app' order by tablename`,
    )
    expect(rows).toHaveLength(24)
    expect(rows.every((r) => r.rowsecurity)).toBe(true)
  })

  it('gives lumira_app a policy on every table', async () => {
    const { rows } = await client.query<{ n: number }>(
      `select count(*)::int as n from pg_policies where schemaname = 'app' and policyname = 'lumira_app_all'`,
    )
    expect(rows[0]!.n).toBe(24)
  })

  it('keeps audit_log append-only for the runtime role', async () => {
    await client.exec(`insert into app.users (id, email, role) values ('user_admin', 'owner@lumira.test', 'admin')`)
    await client.exec(`set role lumira_app`)
    try {
      await client.exec(
        `insert into app.audit_log (actor_user_id, action, target_type, target_id) values ('user_admin', 'test.created', 'test', '1')`,
      )
      await expect(client.exec(`update app.audit_log set reason = 'tamper'`)).rejects.toThrow(/permission denied/)
      await expect(client.exec(`delete from app.audit_log`)).rejects.toThrow(/permission denied/)
    } finally {
      await client.exec(`reset role`)
    }
  })
})
