import 'server-only'
import { brandHex } from '@/lib/brand-hex'
import { env } from '@/lib/env'
import type { BillingProvider, CreateCheckoutInput, CreateDiscountInput } from '../types'
import type {
  LsLicenseKeyAttributes,
  LsLicenseKeyInstanceAttributes,
  LsLicenseKeyResource,
  LsList,
  LsResource,
  LsSubscriptionAttributes,
  LsVariantAttributes,
} from './types'

const BASE = 'https://api.lemonsqueezy.com/v1'

export class LemonSqueezyError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Lemon Squeezy API error ${status}`)
    this.name = 'LemonSqueezyError'
  }

  /** First JSON:API error detail, for admin-facing messages. */
  get detail(): string | undefined {
    const errors = (this.body as { errors?: { detail?: string }[] } | null)?.errors
    return errors?.[0]?.detail
  }
}

/** Sleep hook, replaceable in tests so retries do not wait. */
export const timing = { sleep: (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) }

/**
 * JSON:API fetch with jittered exponential backoff on 429 / 5xx (PRD §6.4), honoring
 * `Retry-After`. Never cached: every call reflects the store's current state.
 */
export async function lsFetch<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<T> {
  const res = await fetch(path.startsWith('http') ? path : `${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${env.LS_API_KEY}`,
      ...init.headers,
    },
  })
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    const retryAfterMs = Number(res.headers.get('retry-after') ?? 0) * 1000
    await timing.sleep(Math.max(retryAfterMs, 500 * 2 ** attempt) + Math.random() * 250)
    return lsFetch<T>(path, init, attempt + 1)
  }
  if (!res.ok) throw new LemonSqueezyError(res.status, await res.json().catch(() => null))
  return (res.status === 204 ? null : await res.json()) as T
}

export async function createCheckout(i: CreateCheckoutInput) {
  const res = await lsFetch<{ data: { id: string; attributes: { url: string } } }>('/checkouts', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: { email: i.email, name: i.name, discount_code: i.discountCode, custom: i.custom },
          checkout_options: {
            embed: true,
            media: false,
            logo: true,
            desc: true,
            discount: true,
            dark: i.dark,
            button_color: brandHex.brand,
          },
          product_options: {
            redirect_url: i.redirectUrl,
            receipt_button_text: 'Open your Lumira Library',
            receipt_link_url: `${env.NEXT_PUBLIC_APP_URL}/account/library`,
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          test_mode: i.testMode,
        },
        relationships: {
          store: { data: { type: 'stores', id: String(env.LS_STORE_ID) } },
          variant: { data: { type: 'variants', id: String(i.variantId) } },
        },
      },
    }),
  })
  return { checkoutId: res.data.id, url: res.data.attributes.url }
}

/** Signed, short-lived URLs: always fetched on click, never cached or stored (PRD §6.6). */
export async function getSubscriptionUrls(lsSubscriptionId: number) {
  const res = await lsFetch<{ data: LsResource<LsSubscriptionAttributes> }>(`/subscriptions/${lsSubscriptionId}`)
  return {
    customerPortal: res.data.attributes.urls.customer_portal,
    updatePaymentMethod: res.data.attributes.urls.update_payment_method,
  }
}

export async function listLicenseKeysForOrder(lsOrderId: number): Promise<LsLicenseKeyResource[]> {
  const res = await lsFetch<LsList<LsLicenseKeyAttributes, 'license-keys'>>(
    `/license-keys?filter[order_id]=${lsOrderId}&page[size]=100`,
  )
  return res.data
}

export async function getLicenseKey(lsLicenseKeyId: number): Promise<LsLicenseKeyResource | null> {
  try {
    const res = await lsFetch<{ data: LsLicenseKeyResource }>(`/license-keys/${lsLicenseKeyId}`)
    return res.data
  } catch (error) {
    if (error instanceof LemonSqueezyError && error.status === 404) return null
    throw error
  }
}

export async function updateLicenseKey(
  lsLicenseKeyId: number,
  patch: { activation_limit?: number | null; expires_at?: string | null; disabled?: boolean },
) {
  await lsFetch(`/license-keys/${lsLicenseKeyId}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: 'license-keys', id: String(lsLicenseKeyId), attributes: patch } }),
  })
}

export async function listLicenseKeyInstances(lsLicenseKeyId: number) {
  const res = await lsFetch<LsList<LsLicenseKeyInstanceAttributes>>(
    `/license-key-instances?filter[license_key_id]=${lsLicenseKeyId}&page[size]=100`,
  )
  return res.data.map((i) => ({
    id: i.attributes.identifier,
    name: i.attributes.name,
    createdAt: i.attributes.created_at,
  }))
}

/**
 * Newest-first page walk over `/orders` or `/subscriptions` for this store, stopping once records
 * are older than `since` (FR-SYS-04 reconciliation).
 */
export async function listRecent<A extends { created_at: string }>(
  resource: 'orders' | 'subscriptions',
  since: Date,
  maxPages = 20,
) {
  const out: LsResource<A>[] = []
  for (let page = 1; page <= maxPages; page++) {
    const res = await lsFetch<LsList<A>>(
      `/${resource}?filter[store_id]=${env.LS_STORE_ID}&page[size]=100&page[number]=${page}`,
    )
    for (const row of res.data) {
      if (new Date(row.attributes.created_at) < since) return out
      out.push(row)
    }
    if (!res.links?.next || res.data.length === 0) break
  }
  return out
}

export async function listVariants(lsProductId: number) {
  const res = await lsFetch<LsList<LsVariantAttributes, 'variants'>>(
    `/variants?filter[product_id]=${lsProductId}&page[size]=100`,
  )
  return res.data
}

export async function createDiscount(input: CreateDiscountInput) {
  const res = await lsFetch<{ data: { id: string } }>('/discounts', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'discounts',
        attributes: {
          name: input.name,
          code: input.code,
          amount: input.amount,
          amount_type: input.amountType,
          is_limited_to_products: input.variantIds.length > 0,
          is_limited_redemptions: Boolean(input.maxRedemptions),
          max_redemptions: input.maxRedemptions,
          starts_at: input.startsAt?.toISOString(),
          expires_at: input.expiresAt?.toISOString(),
          duration: input.duration,
          duration_in_months: input.durationInMonths,
          test_mode: input.testMode,
        },
        relationships: {
          store: { data: { type: 'stores', id: String(env.LS_STORE_ID) } },
          ...(input.variantIds.length > 0
            ? { variants: { data: input.variantIds.map((id) => ({ type: 'variants', id: String(id) })) } }
            : {}),
        },
      },
    }),
  })
  return { id: Number(res.data.id) }
}

export async function deleteDiscount(lsDiscountId: number) {
  await lsFetch(`/discounts/${lsDiscountId}`, { method: 'DELETE' })
}

export const lemonSqueezy: BillingProvider = {
  createCheckout,
  getSubscriptionUrls,
  listLicenseKeysForOrder,
  getLicenseKey,
  updateLicenseKey,
  listLicenseKeyInstances,
  createDiscount,
  deleteDiscount,
}
