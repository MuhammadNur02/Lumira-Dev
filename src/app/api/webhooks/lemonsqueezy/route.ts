import { env } from '@/lib/env'
import { readTextCapped } from '@/lib/http'
import type { LsWebhook } from '@/lib/billing/lemonsqueezy/types'
import { recordWebhook } from '@/server/webhooks/ledger'
import { dispatchLemonSqueezyEvent } from '@/server/webhooks/lemonsqueezy'
import { redactLemonSqueezyEvent, verifyLemonSqueezySignature } from '@/server/webhooks/lemonsqueezy/verify'

export async function POST(req: Request) {
  const raw = await readTextCapped(req) // the HMAC covers the raw body, so read it before parsing
  if (raw === null) return new Response('Payload too large', { status: 413 })
  if (!verifyLemonSqueezySignature(raw, req.headers.get('x-signature'), env.LS_WEBHOOK_SECRET)) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'ls_webhook_bad_signature' }))
    return new Response('Invalid signature', { status: 401 })
  }

  let event: LsWebhook
  try {
    event = JSON.parse(raw) as LsWebhook
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }
  const name = event.meta?.event_name
  if (!name || !event.data?.id) return new Response('Invalid event', { status: 400 })

  const dedupeKey = `${name}:${event.data.id}:${event.data.attributes?.updated_at ?? ''}`
  return recordWebhook('lemonsqueezy', name, dedupeKey, redactLemonSqueezyEvent(event), () =>
    dispatchLemonSqueezyEvent(event),
  )
}
