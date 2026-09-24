import 'server-only'
import { revalidateTag } from 'next/cache'
import type {
  LsInvoiceAttributes,
  LsLicenseKeyResource,
  LsOrderAttributes,
  LsSubscriptionAttributes,
  LsWebhook,
} from '@/lib/billing/lemonsqueezy/types'
import { upsertLicenseKey } from '@/server/licensing'
import { onLicenseKeyUpserted } from './license-key'
import { onOrderCreated } from './order-created'
import { onOrderRefunded } from './order-refunded'
import { onCustomerUpdated, onSubscriptionChanged, onSubscriptionPayment } from './subscription'

/** Routes every FR-SYS-01 event; anything else is recorded in the ledger and intentionally ignored. */
export async function dispatchLemonSqueezyEvent(event: LsWebhook): Promise<void> {
  switch (event.meta.event_name) {
    case 'order_created':
      await onOrderCreated(event as LsWebhook<LsOrderAttributes>)
      break
    case 'order_refunded':
      await onOrderRefunded(event as LsWebhook<LsOrderAttributes>)
      break
    case 'license_key_created':
    case 'license_key_updated': {
      const result = await upsertLicenseKey(event.data as unknown as LsLicenseKeyResource)
      if (result) await onLicenseKeyUpserted(result.id, event.meta.event_name)
      break
    }
    case 'subscription_created':
    case 'subscription_updated':
    case 'subscription_cancelled':
    case 'subscription_resumed':
    case 'subscription_expired':
    case 'subscription_paused':
    case 'subscription_unpaused':
      await onSubscriptionChanged(event as LsWebhook<LsSubscriptionAttributes>)
      break
    case 'subscription_payment_success':
    case 'subscription_payment_failed':
    case 'subscription_payment_recovered':
    case 'subscription_payment_refunded':
      await onSubscriptionPayment(event as LsWebhook<LsInvoiceAttributes>)
      break
    case 'customer_updated':
      await onCustomerUpdated(event as LsWebhook<{ email?: string }>)
      break
    case 'affiliate_activated':
      // Kept in the ledger; surfaced as an admin notification (FR-GS-04, P2).
      return
    default:
      return
  }
  revalidateTag('admin-metrics', 'max') // every commerce event can move a KPI (P7.02)
}
