import { notFound } from 'next/navigation'
import { PortableText } from '@/components/lumira/portable-text'
import { PageTransition } from '@/components/motion/page-transition'
import { formatDate } from '@/lib/format'
import { getLegalPage } from '@/lib/sanity/fetchers'

/** Legal pages (P3.11, P8.07) from Sanity `legalPage` documents. */
export async function LegalPage({ slug }: { slug: 'license' | 'refund-policy' | 'terms' | 'privacy' }) {
  const page = await getLegalPage(slug)
  if (!page) notFound()
  return (
    <PageTransition>
      <article className="mx-auto flex max-w-[45rem] flex-col gap-8 px-4 py-16 sm:px-6 lg:py-24">
        <header className="flex flex-col gap-3">
          <span className="eyebrow">Legal</span>
          <h1 className="text-heading-1 text-balance">{page.title}</h1>
          <p className="text-caption text-muted-foreground">Last updated {formatDate(page.updatedAt)}</p>
        </header>
        <PortableText value={page.body} />
      </article>
    </PageTransition>
  )
}
