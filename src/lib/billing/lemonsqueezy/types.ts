// Lemon Squeezy JSON:API resource and webhook shapes used by Lumira (fields we read only).

export type LsResource<A, T extends string = string> = { type: T; id: string; attributes: A }

export type LsOrderItem = {
  id: number
  order_id: number
  product_id: number
  variant_id: number
  product_name: string
  variant_name: string
  price: number
  quantity?: number
  test_mode?: boolean
}

export type LsOrderAttributes = {
  store_id: number
  customer_id: number
  identifier: string
  order_number: number
  user_name: string
  user_email: string
  currency: string
  subtotal: number
  discount_total: number
  tax: number
  total: number
  subtotal_usd: number
  discount_total_usd: number
  tax_usd: number
  total_usd: number
  status: 'pending' | 'failed' | 'paid' | 'refunded' | 'partial_refund'
  refunded: boolean
  refunded_at: string | null
  refunded_amount?: number
  refunded_amount_usd?: number
  first_order_item: LsOrderItem
  urls: { receipt: string }
  test_mode: boolean
  created_at: string
  updated_at: string
}

export type LsSubscriptionStatus = 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'

export type LsSubscriptionAttributes = {
  store_id: number
  customer_id: number
  order_id: number
  order_item_id: number
  product_id: number
  variant_id: number
  product_name: string
  variant_name: string
  user_name: string
  user_email: string
  status: LsSubscriptionStatus
  status_formatted: string
  card_brand: string | null
  card_last_four: string | null
  pause: { mode: 'void' | 'free'; resumes_at: string | null } | null
  cancelled: boolean
  trial_ends_at: string | null
  billing_anchor: number
  first_subscription_item: { id: number; subscription_id: number; price_id: number; quantity: number } | null
  urls: { update_payment_method: string; customer_portal: string; customer_portal_update_subscription?: string }
  renews_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
  test_mode: boolean
}

export type LsInvoiceAttributes = {
  store_id: number
  subscription_id: number
  customer_id: number
  user_name: string
  user_email: string
  billing_reason: 'initial' | 'renewal' | 'updated'
  card_brand: string | null
  card_last_four: string | null
  currency: string
  status: 'pending' | 'paid' | 'void' | 'refunded' | 'partial_refund'
  refunded: boolean
  refunded_at: string | null
  subtotal_usd: number
  discount_total_usd: number
  tax_usd: number
  total_usd: number
  urls: { invoice_url: string | null }
  created_at: string
  updated_at: string
  test_mode: boolean
}

export type LsLicenseKeyAttributes = {
  store_id: number
  customer_id: number
  order_id: number
  order_item_id: number
  product_id: number
  user_name: string
  user_email: string
  key: string
  key_short: string
  activation_limit: number | null
  instances_count: number
  disabled: boolean
  status: 'inactive' | 'active' | 'expired' | 'disabled'
  status_formatted: string
  expires_at: string | null
  created_at: string
  updated_at: string
  test_mode: boolean
}

export type LsLicenseKeyResource = LsResource<LsLicenseKeyAttributes, 'license-keys'>

export type LsLicenseKeyInstanceAttributes = {
  license_key_id: number
  identifier: string
  name: string
  created_at: string
  updated_at: string
}

export type LsVariantAttributes = {
  product_id: number
  name: string
  slug: string
  price: number
  is_subscription: boolean
  interval: 'day' | 'week' | 'month' | 'year' | null
  interval_count: number | null
  has_license_keys: boolean
  license_activation_limit: number
  is_license_limit_unlimited: boolean
  status: 'pending' | 'draft' | 'published'
  test_mode: boolean
}

export type LsDiscountAttributes = {
  store_id: number
  name: string
  code: string
  amount: number
  amount_type: 'percent' | 'fixed'
  is_limited_to_products: boolean
  is_limited_redemptions: boolean
  max_redemptions: number
  starts_at: string | null
  expires_at: string | null
  duration: 'once' | 'repeating' | 'forever'
  duration_in_months: number
  status: 'draft' | 'published'
  test_mode: boolean
}

export type LsWebhookMeta = {
  event_name: string
  test_mode?: boolean
  webhook_id?: string
  custom_data?: Record<string, string>
}

export type LsWebhook<A = Record<string, unknown>> = {
  meta: LsWebhookMeta
  data: { type: string; id: string; attributes: A & { updated_at?: string } }
}

export type LsList<A, T extends string = string> = {
  data: LsResource<A, T>[]
  meta?: { page?: { currentPage: number; lastPage: number; total: number } }
  links?: { next?: string | null }
}
