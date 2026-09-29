import { describe, expect, it } from 'vitest'
import { isPostgresUrl } from '@/lib/env'

describe('isPostgresUrl', () => {
  it('accepts Supabase pooler and direct URLs', () => {
    expect(
      isPostgresUrl('postgresql://postgres.ref:secret@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres'),
    ).toBe(true)
    expect(isPostgresUrl('postgres://user:p%40ss@db.example.com:5432/app?sslmode=require')).toBe(true)
  })

  // Regression: a stray quote after the scheme turns the authority into a path. `z.url()` accepted it
  // and every query failed with ECONNREFUSED against localhost.
  it('rejects a value with quotes inside the URL', () => {
    expect(isPostgresUrl('postgresql:"//postgres.ref:secret@host.supabase.com:6543/postgres"')).toBe(false)
  })

  it('rejects a duplicated scheme, other protocols and garbage', () => {
    expect(isPostgresUrl('postgresql:postgresql://user:pw@host:5432/db')).toBe(false)
    expect(isPostgresUrl('mysql://user:pw@host:3306/db')).toBe(false)
    expect(isPostgresUrl('not a url')).toBe(false)
  })
})
