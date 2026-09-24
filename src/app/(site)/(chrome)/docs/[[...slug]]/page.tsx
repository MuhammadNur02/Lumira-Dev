import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page'
import { LicensedGate, LicensedTeaser } from '@/components/docs/licensed-gate'
import { getMDXComponents } from '@/components/docs/mdx-components'
import { VersionPill } from '@/components/lumira/version-pill'
import { source } from '@/lib/docs/source'

export default async function DocPage({ params }: PageProps<'/docs/[[...slug]]'>) {
  const { slug } = await params
  const page = source.getPage(slug)
  if (!page) notFound()
  const MDX = page.data.body
  const body = (
    <DocsBody>
      <MDX components={getMDXComponents()} />
    </DocsBody>
  )

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      {page.data.since || page.data.access === 'licensed' ? (
        <div className="not-prose -mt-2 mb-2 flex flex-wrap items-center gap-2">
          {page.data.since ? (
            <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
              Added in <VersionPill version={page.data.since} />
            </span>
          ) : null}
          {page.data.access === 'licensed' ? (
            <span className="rounded-full bg-brand-subtle px-2.5 py-0.5 text-micro text-brand-subtle-foreground">
              Licensed
            </span>
          ) : null}
        </div>
      ) : null}
      {page.data.access === 'licensed' ? (
        // The static shell holds only the teaser; the body streams for owners (F-08).
        <Suspense fallback={<LicensedTeaser product={page.data.product} />}>
          <LicensedGate product={page.data.product}>{body}</LicensedGate>
        </Suspense>
      ) : (
        body
      )}
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata({ params }: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const page = source.getPage((await params).slug)
  if (!page) notFound()
  const path = page.url
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: path },
    openGraph: { title: page.data.title, description: page.data.description, url: path, type: 'article' },
    robots: page.data.access === 'licensed' ? { index: false, follow: true } : undefined,
  }
}
