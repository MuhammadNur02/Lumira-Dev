import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadPreview } from '@/components/preview/load-preview'
import { PreviewPlayer } from '@/components/preview/preview-player'
import { PreviewSkeleton } from '@/components/preview/preview-skeleton'
import { getProductSlugs } from '@/lib/sanity/fetchers'

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: '__placeholder__' }]
}

export async function generateMetadata({ params }: PageProps<'/products/[slug]/preview'>): Promise<Metadata> {
  const data = await loadPreview((await params).slug)
  return {
    title: data ? `Live Preview · ${data.product.name}` : 'Live Preview',
    robots: { index: false, follow: false },
  }
}

/** Full-screen player for hard loads and shared links (P4.05). Outside the site chrome on purpose. */
export default async function PreviewPage({ params }: PageProps<'/products/[slug]/preview'>) {
  const data = await loadPreview((await params).slug)
  if (!data) notFound()
  return (
    <main>
      <Suspense fallback={<PreviewSkeleton name={data.product.name} />}>
        <PreviewPlayer mode="page" product={data.product} pricing={data.pricing} playground={data.playground} />
      </Suspense>
    </main>
  )
}
