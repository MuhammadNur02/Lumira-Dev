import 'server-only'
import { headers } from 'next/headers'
import { auth, reverificationError } from '@clerk/nextjs/server'
import { db } from '@/db/client'
import { auditLog } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { hashIp } from '@/lib/crypto'
import { clientIp } from '@/lib/http'
import { ratelimit } from '@/lib/rate-limit'

export type AuditEntry = { action: string; targetType: string; targetId: string; reason?: string; before?: unknown }

/**
 * Every admin mutation runs through here (FR-AD-47, P7.01): admin guard → rate limit → mutation →
 * append-only `audit_log` row with before/after JSON. The lint rule `lumira/admin-actions-audited`
 * requires admin `actions.ts` files to import it.
 */
export async function withAudit<T>(entry: AuditEntry, mutate: () => Promise<T>): Promise<T> {
  const { userId } = await requireAdmin()
  if (!(await ratelimit.admin.limit(userId)).success) throw new Error('Too many admin actions. Wait a minute.')
  const h = await headers()
  const result = await mutate()
  await db.insert(auditLog).values({
    actorUserId: userId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    before: (entry.before ?? null) as object | null,
    after: (result ?? null) as object | null,
    reason: entry.reason,
    ipHash: hashIp(clientIp(h)),
    userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
  })
  return result
}

/**
 * Step-up for destructive actions (FR-AD-01): returns Clerk's reverification hint when the session
 * has not re-verified recently; the client wraps the action in `useReverification`, which prompts
 * and retries. `null` means the caller may proceed.
 */
export async function needsReverification() {
  await requireAdmin()
  const { has } = await auth()
  return has({ reverification: 'strict' }) ? null : reverificationError('strict')
}

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string }

/** Admin guard first, then a uniform error shape for Server Actions: messages only, never stack traces. */
export async function adminAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  await requireAdmin() // non-admins get notFound() before any query runs
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    // notFound()/redirect() from the guard must propagate.
    if (error && typeof error === 'object' && 'digest' in error) throw error
    return { ok: false, error: error instanceof Error ? error.message : 'Action failed' }
  }
}
