import 'server-only'
import { lemonSqueezy } from './lemonsqueezy/client'
import type { BillingProvider } from './types'

/** The active billing adapter. Swapping providers means implementing BillingProvider (PRD R1). */
export const billing: BillingProvider = lemonSqueezy
