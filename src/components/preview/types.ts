import type { PurchaseOption } from '@/components/commerce/purchase'
import type { DemoPage, GalleryImage, ProductLine } from '@/lib/sanity/models'

/** Everything the player needs, serialized from the (cached) server page. */
export type PreviewProduct = {
  slug: string
  name: string
  line: ProductLine
  version: string | null
  heroUrl: string
  demo: { origin: string; pages: DemoPage[]; supportsTheme: boolean; gallery: GalleryImage[] }
}

export type PreviewPricing = { options: PurchaseOption[]; allAccess: PurchaseOption | null }

/** UI-kit Component Playground entry (FR-LP-08): server-highlighted, first 30 lines only. */
export type PlaygroundEntry = {
  name: string
  title: string
  description: string | null
  codeHtml: string | null
  truncated: boolean
}
