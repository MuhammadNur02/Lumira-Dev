import { Webhook } from 'svix'
import { env } from '@/lib/env'
import { readTextCapped } from '@/lib/http'
import { recordWebhook } from '@/server/webhooks/ledger'
import { handleResendEvent, type StoredResendEvent } from '@/server/webhooks/resend'

type ResendEvent = {
  type: string
  created_at: string
  data: { email_id: string; to?: string[]; bounce?: { type?: string; subType?: string; message?: string } }
}

/** Resend delivery events (P6.13, FR-EM-13): svix-verified on the raw body, then the shared ledger. */
export async function POST(req: Request) {
  const raw = await readTextCapped(req, 256 * 1024)
  if (raw === null) return new Response('Payload too large', { status: 413 })

  let evt: ResendEvent
  try {
    evt = new Webhook(env.RESEND_WEBHOOK_SECRET).verify(raw, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    }) as unknown as ResendEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const dedupeKey = `${evt.type}:${evt.data.email_id}:${req.headers.get('svix-id') ?? ''}`
  // The ledger keeps references only: the recipient address is not stored.
  const stored: StoredResendEvent = {
    type: evt.type,
    created_at: evt.created_at,
    email_id: evt.data.email_id,
    bounce: evt.data.bounce ?? null,
  }
  return recordWebhook('resend', evt.type, dedupeKey, stored, () => handleResendEvent(stored))
}
