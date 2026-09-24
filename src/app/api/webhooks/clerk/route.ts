import type { NextRequest } from 'next/server'
import { verifyWebhook } from '@clerk/nextjs/webhooks'
import { handleClerkEvent } from '@/server/webhooks/clerk'
import { recordWebhook } from '@/server/webhooks/ledger'

export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req) // CLERK_WEBHOOK_SIGNING_SECRET (Standard Webhooks)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }
  const dedupeKey = `${evt.type}:${'id' in evt.data ? (evt.data.id ?? '') : ''}:${req.headers.get('svix-id') ?? ''}`
  return recordWebhook('clerk', evt.type, dedupeKey, evt, () => handleClerkEvent(evt))
}
