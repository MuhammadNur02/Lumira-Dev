import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { JsonLd } from '@/components/lumira/json-ld'
import { PortableText } from '@/components/lumira/portable-text'
import { PageTransition } from '@/components/motion/page-transition'
import { env } from '@/lib/env'
import { formatDate } from '@/lib/format'
import { getPost, getPosts } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.length ? posts.map((p) => ({ slug: p.slug })) : [{ slug: '__placeholder__' }]
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const post = await getPost((await params).slug)
  if (!post) return { title: 'Blog' }
  return buildMetadata({
    title: post.title,
    description: post.excerpt ?? post.title,
    path: `/blog/${post.slug}`,
    seo: post.seo,
  })
}

export default async function PostPage({ params }: PageProps<'/blog/[slug]'>) {
  const post = await getPost((await params).slug)
  if (!post) notFound()
  return (
    <PageTransition>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          datePublished: post.publishedAt,
          author: { '@type': 'Organization', name: post.author?.name ?? 'Lumira' },
          url: `${env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}`,
        }}
      />
      <article className="mx-auto flex max-w-[45rem] flex-col gap-8 px-4 py-16 sm:px-6 lg:py-24">
        <Link
          href="/blog"
          transitionTypes={['nav-back']}
          className="inline-flex w-fit items-center gap-1 rounded-sm text-caption text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" aria-hidden /> Blog
        </Link>
        <header className="flex flex-col gap-4">
          <time dateTime={post.publishedAt} className="eyebrow">
            {formatDate(post.publishedAt)}
          </time>
          <h1 className="text-display-lg text-balance">{post.title}</h1>
          {post.excerpt ? <p className="text-body-lg text-pretty text-muted-foreground">{post.excerpt}</p> : null}
        </header>
        <PortableText value={post.body} />
      </article>
    </PageTransition>
  )
}
