import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { Resend } from 'resend'
import { env } from '@/lib/env'
import { eligibleReleaseRecipients, renderReleaseEmail } from '@/server/releases/notify'

/**
 * QStash consumer for release fan-out (FR-SYS-08): Resend batch API, 100 per call. QStash retries
 * on failure; batches already sent are deduplicated by their idempotency keys.
 */
export const POST = verifySignatureAppRouter(async (req: Request) => {
  const { releaseId } = (await req.json()) as { releaseId: string }
  const resend = new Resend(env.RESEND_API_KEY)
  const recipients = await eligibleReleaseRecipients(releaseId)
  for (let i = 0; i < recipients.length; i += 100) {
    const batch = await Promise.all(recipients.slice(i, i + 100).map((r) => renderReleaseEmail(r, releaseId)))
    const { error } = await resend.batch.send(batch, { idempotencyKey: `release:${releaseId}:batch:${i / 100}` })
    if (error) throw new Error(error.message)
  }
  return Response.json({ recipients: recipients.length })
})
