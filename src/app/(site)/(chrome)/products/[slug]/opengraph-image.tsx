import { formatPrice, LINE_LABEL } from '@/lib/format'
import { OG_SIZE, ogCard } from '@/lib/og'
import { getProduct, getProductSlugs } from '@/lib/sanity/fetchers'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Lumira product'

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: '__placeholder__' }]
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug)
  if (!product) return ogCard({ eyebrow: 'Lumira', title: 'Premium web assets' })
  return ogCard({
    eyebrow: product.templateType ?? LINE_LABEL[product.line],
    title: product.name,
    subtitle: product.tagline,
    price: product.priceFromCents != null ? `from ${formatPrice(product.priceFromCents)}` : null,
    version: product.latestRelease?.version,
    image: product.hero.url.startsWith('https://') ? `${product.hero.url}?w=920&h=1000&fit=crop&auto=format` : null,
  })
}
