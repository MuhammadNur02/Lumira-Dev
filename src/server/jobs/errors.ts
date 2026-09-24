/** A transient condition worth retrying soon (2 s → 30 s backoff), e.g. keys not generated yet. */
export class RetryableJobError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableJobError'
  }
}

/** Backoff for a failed attempt `n` (1-based). Retryable errors retry fast; others use the email schedule. */
export function nextAttemptDelayMs(attempts: number, retryable: boolean, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) return retryAfterMs
  if (retryable) return Math.min(2_000 * 2 ** (attempts - 1), 30_000)
  return Math.min(30_000 * 2 ** attempts, 6 * 60 * 60 * 1000)
}

export const MAX_JOB_ATTEMPTS = { retryable: 5, default: 8 } as const
