import type { NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'
import { env } from '@/lib/env'
import { recordWebhook } from '@/server/webhooks/ledger'
import { handleSanityEvent, type SanityWebhookPayload } from '@/server/webhooks/sanity'

// Sanity → API → Webhooks: filter `_type in ["product","release","homePage","siteSettings","category","bundle","post"]`,
// projection `{_type, _id, "slug": slug.current, "product": product->slug.current}`, secret = SANITY_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const { isValidSignature, body } = await parseBody<SanityWebhookPayload>(req, env.SANITY_WEBHOOK_SECRET, true)
  if (!isValidSignature || !body?._type) return new Response('Invalid signature', { status: 401 })
  const dedupeKey = `${body._type}:${body._id}:${req.headers.get('idempotency-key') ?? Date.now()}`
  return recordWebhook('sanity', body._type, dedupeKey, body, () => handleSanityEvent(body))
}
