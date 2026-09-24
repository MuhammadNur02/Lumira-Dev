import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Rss } from 'lucide-react'
import { ChangelogEntry } from '@/components/lumira/changelog-entry'
import { PageTransition } from '@/components/motion/page-transition'
import { getChangelog, getProduct, getProductSlugs } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.length ? slugs.map((slug) => ({ slug })) : [{ slug: '__placeholder__' }]
}

export async function generateMetadata({ params }: PageProps<'/products/[slug]/changelog'>): Promise<Metadata> {
  const product = await getProduct((await params).slug)
  if (!product) return { title: 'Changelog' }
  return buildMetadata({
    title: `${product.name} changelog`,
    description: `Every ${product.name} release with highlights, breaking changes and upgrade guides.`,
    path: `/products/${product.slug}/changelog`,
  })
}

/** Product changelog (FR-CL-03): latest highlighted, breaking-change callouts, upgrade guides. */
export default async function ProductChangelogPage({ params }: PageProps<'/products/[slug]/changelog'>) {
  const { slug } = await params
  const [product, entries] = await Promise.all([getProduct(slug), getChangelog(slug)])
  if (!product) notFound()

  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto flex max-w-[56rem] flex-col gap-6 px-4 pt-12 pb-10 sm:px-6 lg:pt-16">
          <Link
            href={`/products/${slug}`}
            transitionTypes={['nav-back']}
            className="inline-flex w-fit items-center gap-1 rounded-sm text-caption text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronLeft className="size-4" aria-hidden /> {product.name}
          </Link>
          <h1 className="text-display-lg text-balance">{product.name} changelog</h1>
          <a
            href={`/products/${slug}/changelog/feed.xml`}
            className="inline-flex w-fit items-center gap-1.5 text-caption text-brand-text hover:underline"
          >
            <Rss className="size-3.5" aria-hidden /> Atom feed
          </a>
        </div>
      </div>
      <ol className="mx-auto flex max-w-[56rem] flex-col gap-(--bento-gap) px-4 pb-24 sm:px-6">
        {entries.length ? (
          entries.map((entry, i) => (
            <ChangelogEntry key={entry._id} entry={entry} showProduct={false} detailed highlight={i === 0} />
          ))
        ) : (
          <li className="text-body text-muted-foreground">No releases yet.</li>
        )}
      </ol>
    </PageTransition>
  )
}
