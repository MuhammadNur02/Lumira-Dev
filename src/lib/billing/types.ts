import type { LsLicenseKeyResource } from './lemonsqueezy/types'

// The seam that makes a future provider migration an adapter swap (PRD §10 R1).

export type CreateCheckoutInput = {
  variantId: number
  email?: string
  name?: string
  discountCode?: string
  custom: Record<string, string>
  redirectUrl: string
  dark: boolean
  testMode: boolean
}

export type CreateDiscountInput = {
  name: string
  code: string
  amount: number
  amountType: 'percent' | 'fixed'
  variantIds: number[]
  maxRedemptions?: number
  startsAt?: Date
  expiresAt?: Date
  duration: 'once' | 'repeating' | 'forever'
  durationInMonths?: number
  testMode: boolean
}

export type LicenseApiResult = {
  activated?: boolean
  valid?: boolean
  deactivated?: boolean
  error: string | null
  license_key?: {
    id: number
    status: 'inactive' | 'active' | 'expired' | 'disabled'
    key: string
    activation_limit: number | null
    activation_usage: number
    expires_at: string | null
  }
  instance?: { id: string; name: string; created_at: string } | null
  meta?: { store_id: number; order_id: number; order_item_id: number; product_id: number; variant_id: number }
}

export interface BillingProvider {
  createCheckout(input: CreateCheckoutInput): Promise<{ checkoutId: string; url: string }>
  getSubscriptionUrls(lsSubscriptionId: number): Promise<{ customerPortal: string; updatePaymentMethod: string }>
  listLicenseKeysForOrder(lsOrderId: number): Promise<LsLicenseKeyResource[]>
  getLicenseKey(lsLicenseKeyId: number): Promise<LsLicenseKeyResource | null>
  updateLicenseKey(
    lsLicenseKeyId: number,
    patch: { activation_limit?: number | null; expires_at?: string | null; disabled?: boolean },
  ): Promise<void>
  listLicenseKeyInstances(lsLicenseKeyId: number): Promise<{ id: string; name: string; createdAt: string }[]>
  createDiscount(input: CreateDiscountInput): Promise<{ id: number }>
  deleteDiscount(lsDiscountId: number): Promise<void>
}

export interface LicenseProvider {
  activate(key: string, instanceName: string): Promise<LicenseApiResult>
  validate(key: string, instanceId?: string): Promise<LicenseApiResult>
  deactivate(key: string, instanceId: string): Promise<LicenseApiResult>
}
