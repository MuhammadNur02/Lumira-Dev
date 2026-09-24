/**
 * PostHog event taxonomy (PRD §8.2). `object_action`, snake_case, no PII: never emails, keys or
 * names. An event name missing from these maps fails the typecheck (FR-AN-07).
 */
type Tier = 'personal' | 'team' | 'extended' | 'all_access'
type Line = 'boilerplate' | 'ui_kit' | 'template'
type Device = 'desktop' | 'tablet' | 'mobile' | 'fit'
type DownloadChannel = 'dashboard' | 'success_page' | 'email_link' | 'admin'

/** Fired in the browser through `track()`. */
export type ClientEvents = {
  catalog_filtered: { filters: Record<string, string | number | string[] | null>; result_count: number }
  product_viewed: { product_slug: string; line: Line; price_from_usd: number | null }
  preview_opened: { product_slug: string; entry: 'pdp' | 'card' | 'direct' }
  preview_device_changed: { from: Device; to: Device }
  preview_page_changed: { path: string }
  preview_load_failed: { reason: 'timeout' | 'bridge_error' | 'network'; elapsed_ms: number; device: Device }
  preview_buy_clicked: { device: Device; seconds_in_preview: number }
  license_selector_opened: { product_slug: string; source: 'pdp' | 'preview' | 'card' | 'all_access' }
  license_tier_selected: { tier: Tier; variant_id: number }
  checkout_success_client: { cs_id: string | null }
  download_clicked: { product_slug: string; version: string; channel: DownloadChannel }
  license_key_revealed: { product_slug: string }
  license_key_copied: { product_slug: string }
  docs_searched: { query: string; results_count: number }
  discord_join_clicked: Record<string, never>
  affiliate_link_clicked: { placement: 'footer' | 'affiliates_page' | 'header' }
}

/** Fired from the server through `captureServer()` (posthog-node). */
export type ServerEvents = {
  checkout_started: {
    cs_id: string
    variant_id: number
    tier: Tier
    price_usd: number
    has_discount: boolean
    has_affiliate?: boolean
  }
  purchase_completed: {
    order_id: string
    cs_id?: string | null
    variant_ids: number[]
    revenue_usd: number
    tier: Tier
    is_bundle: boolean
    discount_code: string | null
  }
  subscription_started: { interval: 'month' | 'year'; mrr_usd: number }
  subscription_churned: { interval: 'month' | 'year'; mrr_usd: number }
  refund_processed: { order_id: string; amount_usd: number }
  download_granted: { product_slug: string; version: string; channel: DownloadChannel }
  license_activated: { product_slug: string | null; source: 'cli' | 'registry' | 'dashboard' | 'external' }
  discord_joined: Record<string, never>
}

export type ClientEventName = keyof ClientEvents
export type ServerEventName = keyof ServerEvents
