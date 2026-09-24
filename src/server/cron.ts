import 'server-only'
import { safeEqual } from '@/lib/crypto'
import { env } from '@/lib/env'

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; anything else is refused. */
export function cronUnauthorized(req: Request): Response | null {
  return safeEqual(req.headers.get('authorization') ?? '', `Bearer ${env.CRON_SECRET}`)
    ? null
    : new Response('Unauthorized', { status: 401 })
}

/** Structured log + JSON body for every cron run (visible in Vercel logs and the admin health page). */
export function cronResult(job: string, result: Record<string, unknown>, started: number) {
  const body = { job, ...result, durationMs: Date.now() - started }
  console.info(JSON.stringify({ level: 'info', msg: 'cron_done', ...body }))
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
