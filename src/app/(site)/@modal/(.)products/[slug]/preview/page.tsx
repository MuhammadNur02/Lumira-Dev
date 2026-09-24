import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { loadPreview } from '@/components/preview/load-preview'
import { PreviewModal } from '@/components/preview/preview-modal'
import { PreviewSkeleton } from '@/components/preview/preview-skeleton'
import { getProductSlugs } from '@/lib/sanity/fetchers'

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: '__placeholder__' }]
}

/** Soft navigation from a PDP or card opens the player over the page (P4.05). */
export default async function InterceptedPreview({ params }: PageProps<'/products/[slug]/preview'>) {
  const data = await loadPreview((await params).slug)
  if (!data) notFound()
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-70">
          <PreviewSkeleton name={data.product.name} />
        </div>
      }
    >
      <PreviewModal product={data.product} pricing={data.pricing} playground={data.playground} />
    </Suspense>
  )
}
