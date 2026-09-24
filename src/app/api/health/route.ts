import { connection } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { r2Healthy } from '@/lib/r2'
import { redis } from '@/lib/rate-limit'

const timeout = <T>(p: Promise<T>, ms = 3000) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

async function probe(fn: () => Promise<unknown>) {
  const started = Date.now()
  try {
    const ok = await timeout(fn())
    return { ok: ok !== false, ms: Date.now() - started }
  } catch {
    return { ok: false, ms: Date.now() - started }
  }
}

/**
 * NFR-OPS-05: Postgres, Redis and an R2 `HeadBucket`, each with a 3 s budget. 200 when all pass,
 * 503 otherwise. No secrets, versions or hostnames in the body.
 */
export async function GET() {
  await connection() // always a live probe, never prerendered
  const [postgres, upstash, r2] = await Promise.all([
    probe(() => db.execute(sql`select 1`)),
    probe(() => redis.ping()),
    probe(() => r2Healthy('read')),
  ])
  const ok = postgres.ok && upstash.ok && r2.ok
  return Response.json(
    { status: ok ? 'ok' : 'degraded', checks: { postgres, redis: upstash, r2 } },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
