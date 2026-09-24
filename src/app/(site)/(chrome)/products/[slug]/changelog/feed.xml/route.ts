import { env } from '@/lib/env'
import { atomFeed } from '@/lib/feed'
import { getChangelog, getProduct, getProductSlugs } from '@/lib/sanity/fetchers'

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: '__placeholder__' }]
}

export async function GET(_req: Request, { params }: RouteContext<'/products/[slug]/changelog/feed.xml'>) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return new Response('Not found', { status: 404 })
  return atomFeed({
    site: env.NEXT_PUBLIC_APP_URL,
    title: `${product.name} changelog`,
    selfPath: `/products/${slug}/changelog/feed.xml`,
    htmlPath: `/products/${slug}/changelog`,
    releases: await getChangelog(slug),
  })
}
