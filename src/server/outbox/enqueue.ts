import 'server-only'
import type { DbOrTx } from '@/db/client'
import { emailOutbox, jobOutbox, type JobKind } from '@/db/schema'

/**
 * Side effects are written in the same transaction as the state change and dispatched later with
 * retries (PRD glossary "Outbox"). Idempotency keys make every enqueue safe to repeat.
 */
export function enqueueJob(
  tx: DbOrTx,
  kind: JobKind,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  runAt?: Date,
) {
  return tx
    .insert(jobOutbox)
    .values({ kind, payload, idempotencyKey, ...(runAt ? { nextAttemptAt: runAt } : {}) })
    .onConflictDoNothing()
}

/** Payloads hold references only (ids), never secrets; templates load data at send time (FR-EM-10). */
export function enqueueEmail(
  tx: DbOrTx,
  input: {
    template: EmailTemplate
    to: string
    payload: Record<string, unknown>
    idempotencyKey: string
    runAt?: Date
  },
) {
  return tx
    .insert(emailOutbox)
    .values({
      template: input.template,
      to: input.to,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      ...(input.runAt ? { nextAttemptAt: input.runAt } : {}),
    })
    .onConflictDoNothing()
}

export type EmailTemplate =
  | 'order-confirmation'
  | 'license-key-ready'
  | 'all-access-welcome'
  | 'release-available'
  | 'payment-failed'
  | 'subscription-ended'
  | 'refund-processed'
  | 'admin-alert'
  | 'support-request'
