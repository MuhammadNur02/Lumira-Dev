import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'
import { publicDocsEntries } from '@/lib/docs/sitemap'
import { getAllProducts, getBundles, getChangelog, getPosts } from '@/lib/sanity/fetchers'

/** Every public page with `lastModified` (NFR-SEO-03): products, categories, bundles, changelog, blog, public docs. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = env.NEXT_PUBLIC_APP_URL
  const [products, bundles, changelog, posts] = await Promise.all([
    getAllProducts(),
    getBundles(),
    getChangelog(),
    getPosts(),
  ])
  const latest = changelog[0]?.releasedAt ?? new Date('2026-01-01').toISOString()
  const lineUpdated = (line: string) =>
    products
      .filter((p) => p.line === line)
      .map((p) => p.latestRelease?.releasedAt ?? p.createdAt)
      .sort()
      .at(-1) ?? latest

  const statics: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/boilerplates`, lastModified: lineUpdated('boilerplate'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site}/ui-kits`, lastModified: lineUpdated('ui_kit'), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site}/templates`, lastModified: lineUpdated('template'), changeFrequency: 'weekly', priority: 0.9 },
    ...['portfolio', 'landing', 'docs', 'blog'].map((t) => ({
      url: `${site}/templates/${t}`,
      lastModified: lineUpdated('template'),
    })),
    { url: `${site}/all-access`, lastModified: latest, priority: 0.8 },
    { url: `${site}/bundles`, lastModified: latest },
    { url: `${site}/changelog`, lastModified: latest, changeFrequency: 'weekly' },
    { url: `${site}/blog`, lastModified: posts[0]?.publishedAt ?? latest },
    { url: `${site}/affiliates` },
    ...['license', 'refund-policy', 'terms', 'privacy'].map((p) => ({ url: `${site}/${p}` })),
  ]

  return [
    ...statics,
    ...products.flatMap((p) => {
      const lastModified = p.latestRelease?.releasedAt ?? p.createdAt
      return [
        { url: `${site}/products/${p.slug}`, lastModified, priority: 0.9 },
        { url: `${site}/products/${p.slug}/changelog`, lastModified },
      ]
    }),
    ...bundles.map((b) => ({ url: `${site}/bundles/${b.slug}`, lastModified: latest })),
    ...posts.map((p) => ({ url: `${site}/blog/${p.slug}`, lastModified: p.publishedAt })),
    ...publicDocsEntries(site),
  ]
}
