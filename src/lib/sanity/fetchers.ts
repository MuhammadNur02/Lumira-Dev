import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { draftMode } from 'next/headers'
import { env } from '@/lib/env'
import { filterCatalog, type CatalogFilters } from './catalog-filter'
import { sanity, sanityPreview } from './client'
import {
  fixtureBundles,
  fixtureCards,
  fixtureChangelog,
  fixtureHome,
  fixtureLegal,
  fixturePosts,
  fixtureProducts,
  fixtureSiteSettings,
} from './fixtures'
import type {
  Bundle,
  ChangelogEntry,
  HomePage,
  LegalPage,
  Post,
  PostCard,
  ProductCard,
  ProductDetail,
  SiteSettings,
} from './models'
import {
  ALL_PRODUCTS_QUERY,
  BUNDLES_QUERY,
  CHANGELOG_QUERY,
  HOME_QUERY,
  LEGAL_PAGE_QUERY,
  POST_QUERY,
  POSTS_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  PRODUCT_SLUGS_QUERY,
  SITE_SETTINGS_QUERY,
} from './queries'

// Cached content layer (NFR-PERF-06). Every function is `"use cache"` with `cacheLife('max')` and
// tags that the Sanity webhook invalidates (P2.13), so anonymous traffic never triggers a CMS
// request. In Draft Mode the cache is bypassed and drafts are read with the viewer token.

const fixtures = () => env.CONTENT_SOURCE === 'fixtures'

async function client() {
  return (await draftMode()).isEnabled ? sanityPreview : sanity
}

async function query<T>(groq: string, params: Record<string, unknown> = {}): Promise<T> {
  return (await client()).fetch<T>(groq, params)
}

export async function getAllProducts(): Promise<ProductCard[]> {
  'use cache'
  cacheLife('max')
  cacheTag('catalog')
  if (fixtures()) return fixtureCards
  return query<ProductCard[]>(ALL_PRODUCTS_QUERY)
}

/** Keyed by its arguments: one cache entry per filter combination, all tagged `catalog`. */
export async function getCatalog(filters: CatalogFilters): Promise<ProductCard[]> {
  'use cache'
  cacheLife('max')
  cacheTag('catalog')
  return filterCatalog(await getAllProducts(), filters)
}

export async function getProductSlugs(): Promise<string[]> {
  'use cache'
  cacheLife('max')
  cacheTag('catalog')
  if (fixtures()) return fixtureCards.map((p) => p.slug)
  return query<string[]>(PRODUCT_SLUGS_QUERY)
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  'use cache'
  cacheLife('max')
  cacheTag(`product:${slug}`, 'catalog')
  if (fixtures()) return fixtureProducts.find((p) => p.slug === slug) ?? null
  return query<ProductDetail | null>(PRODUCT_BY_SLUG_QUERY, { slug })
}

export async function getHome(): Promise<HomePage> {
  'use cache'
  cacheLife('max')
  cacheTag('home', 'catalog')
  if (fixtures()) return fixtureHome
  return (await query<HomePage | null>(HOME_QUERY)) ?? { ...fixtureHome, bands: [], testimonials: [] }
}

export async function getChangelog(productSlug?: string): Promise<ChangelogEntry[]> {
  'use cache'
  cacheLife('max')
  cacheTag('changelog', ...(productSlug ? [`release:${productSlug}`] : []))
  if (fixtures()) return fixtureChangelog.filter((r) => !productSlug || r.product.slug === productSlug)
  return query<ChangelogEntry[]>(CHANGELOG_QUERY, { product: productSlug ?? null })
}

export async function getSiteSettings(): Promise<SiteSettings> {
  'use cache'
  cacheLife('max')
  cacheTag('site-settings')
  if (fixtures()) return fixtureSiteSettings
  return (await query<SiteSettings | null>(SITE_SETTINGS_QUERY)) ?? fixtureSiteSettings
}

export async function getBundles(): Promise<Bundle[]> {
  'use cache'
  cacheLife('max')
  cacheTag('bundle', 'catalog')
  if (fixtures()) return fixtureBundles
  return query<Bundle[]>(BUNDLES_QUERY)
}

export async function getBundle(slug: string): Promise<Bundle | null> {
  return (await getBundles()).find((b) => b.slug === slug) ?? null
}

export async function getPosts(): Promise<PostCard[]> {
  'use cache'
  cacheLife('max')
  cacheTag('post')
  if (fixtures()) return fixturePosts
  return query<PostCard[]>(POSTS_QUERY)
}

export async function getPost(slug: string): Promise<Post | null> {
  'use cache'
  cacheLife('max')
  cacheTag('post', `post:${slug}`)
  if (fixtures()) return fixturePosts.find((p) => p.slug === slug) ?? null
  return query<Post | null>(POST_QUERY, { slug })
}

export async function getLegalPage(slug: string): Promise<LegalPage | null> {
  'use cache'
  cacheLife('max')
  cacheTag('legalPage')
  if (fixtures()) return fixtureLegal.find((p) => p.slug === slug) ?? null
  return query<LegalPage | null>(LEGAL_PAGE_QUERY, { slug })
}
