import type { PortableTextBlock } from '@portabletext/react'
import type { Preset, TileKind } from '@lumira/bento'

// Shapes returned by the GROQ projections in ./queries.ts (and by ./fixtures.ts). Kept explicit so
// the storefront compiles independently of Sanity TypeGen output (src/sanity/types.ts).

export type ProductLine = 'boilerplate' | 'ui_kit' | 'template'
export type TemplateType = 'portfolio' | 'landing' | 'docs' | 'blog'
export type Tier = 'personal' | 'team' | 'extended'
export type ChangeKind = 'added' | 'improved' | 'fixed' | 'removed' | 'deprecated' | 'security' | 'breaking'

export type ImageRef = {
  url: string
  alt: string
  width: number
  height: number
  lqip: string | null
}

export type StackItem = { name: string; slug: string; kind: string; logo: string | null; version: string | null }

export type License = {
  tier: Tier
  lsProductId: number
  lsVariantId: number
  priceCents: number | null
  activationLimit: number | null
  rights: string[]
  buyUrl: string | null
}

export type Compatibility = {
  next?: string | null
  react?: string | null
  tailwind?: string | null
  node?: string | null
}

export type ReleaseSummary = {
  version: string
  type: 'major' | 'minor' | 'patch'
  title: string
  releasedAt: string
  compatibility: Compatibility | null
}

export type ProductCard = {
  _id: string
  name: string
  slug: string
  line: ProductLine
  templateType: TemplateType | null
  tagline: string
  hero: ImageRef
  video: string | null
  stack: StackItem[]
  capabilities: string[]
  priceFromCents: number | null
  inAllAccess: boolean
  popularity: number
  createdAt: string
  latestRelease: ReleaseSummary | null
}

export type FeatureTile = {
  eyebrow: string | null
  title: string
  body: string | null
  icon: string | null
  size: 'sm' | 'md' | 'lg' | null
}
export type Faq = { _id: string; question: string; answer: PortableTextBlock[] }
export type DemoPage = { label: string; path: string }
export type GalleryImage = ImageRef & { device: 'desktop' | 'tablet' | 'mobile' | null }
export type Demo = {
  origin: string | null
  pages: DemoPage[]
  supportsTheme: boolean
  gallery: GalleryImage[]
  lighthouse: { performance?: number; accessibility?: number; bestPractices?: number; seo?: number } | null
}
export type PlaygroundComponent = { name: string; title: string; description: string | null; code: string | null }
export type Seo = {
  title: string | null
  description: string | null
  ogImage: ImageRef | null
  noindex: boolean | null
}

export type Change = { kind: ChangeKind; text: string; docsPath: string | null }

export type ChangelogEntry = {
  _id: string
  version: string
  type: 'major' | 'minor' | 'patch'
  releasedAt: string
  title: string
  summary: string
  highlights: PortableTextBlock[] | null
  changes: Change[]
  upgradeGuide: PortableTextBlock[] | null
  compatibility: Compatibility | null
  status: 'published' | 'withdrawn'
  releaseId: string | null
  product: { name: string; slug: string; line: ProductLine }
}

export type ProductDetail = ProductCard & {
  description: PortableTextBlock[] | null
  heroDark: ImageRef | null
  features: FeatureTile[]
  fileTree: string | null
  faq: Faq[]
  licenses: License[]
  demo: Demo | null
  components: PlaygroundComponent[]
  related: ProductCard[]
  recentReleases: ChangelogEntry[]
  seo: Seo | null
}

export type Testimonial = {
  _id: string
  quote: string
  name: string
  role: string | null
  company: string | null
  avatar: ImageRef | null
}

export type TileDoc = {
  _key: string
  kind: TileKind
  cols: number
  rows: number
  hero: boolean | null
  eyebrow: string | null
  title: string | null
  body: string | null
  href: string | null
  product: ProductCard | null
  testimonial: Testimonial | null
  stat: { value: string | null; label: string | null; source: 'manual' | 'assetCount' | 'releaseCount' | null } | null
  video: string | null
  poster: ImageRef | null
  snippet: string | null
  stack: Omit<TileDoc, 'cols' | 'stack'>[] | null
}

export type BandDoc = { _key: string; preset: Preset; rows: 1 | 2 | 3; tiles: TileDoc[] }

export type HomePage = {
  hero: { eyebrow: string | null; title: string; lead: string | null } | null
  bands: BandDoc[]
  previewTeaser: {
    title: string | null
    body: string | null
    video: string | null
    poster: ImageRef | null
    product: ProductCard | null
  } | null
  testimonials: Testimonial[]
  faq: Faq[]
  closingCta: { title: string | null; body: string | null } | null
  seo: Seo | null
}

export type Plan = { lsVariantId: number | null; priceCents: number | null; buyUrl: string | null }

export type SiteSettings = {
  promoBanner: { enabled: boolean; text: string | null; code: string | null; href: string | null } | null
  affiliate: { commissionRate: number; cookieDays: number; payoutNote: string | null }
  allAccess: {
    lsProductId: number | null
    monthly: Plan | null
    yearly: Plan | null
    activationLimit: number | null
    perks: string[]
  } | null
  social: { label: string; url: string }[]
  supportEmail: string
  statusUrl: string | null
}

export type Bundle = {
  _id: string
  name: string
  slug: string
  tagline: string | null
  hero: ImageRef | null
  tier: Tier
  lsProductId: number
  lsVariantId: number
  priceCents: number | null
  buyUrl: string | null
  includes: (ProductCard & { licenses: License[] })[]
  seo: Seo | null
}

export type PostCard = {
  _id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: string
  cover: ImageRef | null
  author: { name: string; role: string | null } | null
}

export type Post = PostCard & { body: PortableTextBlock[]; seo: Seo | null }

export type LegalPage = { title: string; slug: string; updatedAt: string; body: PortableTextBlock[] }

export type Redirect = { source: string; destination: string; permanent: boolean }

/** Product-to-Lemon Squeezy mapping mirrored into Postgres (FR-SYS-09). */
export type ProductMirror = {
  _id: string
  name: string
  slug: string
  line: ProductLine
  inAllAccess: boolean
  licenses: License[]
}
