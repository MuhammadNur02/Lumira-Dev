import 'server-only'
import type { WebhookEvent } from '@clerk/nextjs/webhooks'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { claimByVerifiedEmail } from '@/server/identity'
import { enqueueJob } from '@/server/outbox/enqueue'

type ClerkUser = {
  id: string
  first_name: string | null
  last_name: string | null
  primary_email_address_id: string | null
  email_addresses: { id: string; email_address: string; verification: { status: string } | null }[]
}

/**
 * Clerk → Postgres sync (Task.md P2.07). Users are mirrored by Clerk id; guest orders are claimed
 * only for *verified* addresses (F-13). The Postgres role is never synced from Clerk metadata: an
 * admin needs both (FR-AD-01), so the database role is set by hand.
 */
export async function handleClerkEvent(evt: WebhookEvent): Promise<void> {
  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const u = evt.data as unknown as ClerkUser
      const primary = u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0]
      if (!primary) return
      const email = primary.email_address.trim().toLowerCase()
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || null
      await db
        .insert(users)
        .values({ id: u.id, email, name })
        .onConflictDoUpdate({ target: users.id, set: { email, name, deletedAt: null } })
      for (const address of u.email_addresses) {
        if (address.verification?.status === 'verified') await claimByVerifiedEmail(u.id, address.email_address)
      }
      return
    }
    case 'user.deleted': {
      const id = (evt.data as { id?: string }).id
      if (!id) return
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ email: `deleted+${id}@lumira.invalid`, name: null, deletedAt: new Date() })
          .where(eq(users.id, id))
        await enqueueJob(tx, 'discord_revoke', { userId: id, force: true }, `discord_revoke:user_deleted:${id}`)
      })
      return
    }
    case 'session.created':
      // Kept in webhook_events; the admin customer timeline reads sign-ins from the ledger (FR-AD-41).
      return
    default:
      return
  }
}
