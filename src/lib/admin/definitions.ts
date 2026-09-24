/** FR-AD-14: every metric exposes its PRD §8.1 definition in a tooltip. */
export const DEFINITIONS = {
  gross:
    'Σ one-time order totals (paid, incl. tax) + Σ paid subscription invoices, by transaction date. A subscription’s first order counts once, via its initial invoice.',
  net: 'Gross sales − tax − refunds (ex-tax).',
  payout:
    'Net revenue − estimated Lemon Squeezy fees (LS_FEE_PCT of gross + LS_FEE_FIXED_CENTS per transaction). An estimate.',
  mrr: 'Σ normalized monthly price (yearly ÷ 12, ex-tax) of active subscriptions, plus past-due ones for up to 14 days. Trials, paused and expired excluded.',
  subscribers: 'Subscriptions counted in MRR at the latest snapshot in range.',
  orders: 'Paid one-time orders (refunded ones included), by order date.',
  aov: 'One-time gross sales ÷ paid one-time orders.',
  conversion: 'Paid orders ÷ unique visitors (PostHog persons with $pageview) in range.',
  abandonment: '(abandoned + expired) ÷ (abandoned + expired + completed) for checkout sessions initiated in range.',
  refundRate: 'Refunded orders ÷ paid orders, by order date.',
  logoChurn: 'Subscriptions that expired in range ÷ active subscriptions at the start of the range.',
  revenueChurn: 'Churned MRR in range ÷ MRR at the start of the range.',
} as const

export type MetricKey = keyof typeof DEFINITIONS
