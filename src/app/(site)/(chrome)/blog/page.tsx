import Link from 'next/link'
import Image from 'next/image'
import { SectionHeader } from '@/components/lumira/section-header'
import { PageTransition } from '@/components/motion/page-transition'
import { formatDate } from '@/lib/format'
import { getPosts } from '@/lib/sanity/fetchers'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Blog',
  description: 'Notes on building, shipping and maintaining premium web assets.',
  path: '/blog',
})

export default async function BlogPage() {
  const posts = await getPosts()
  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto max-w-[80rem] px-4 pt-16 pb-10 sm:px-6 lg:px-8 lg:pt-24">
          <SectionHeader as="h1" eyebrow="Blog" title="Notes from the workshop." />
        </div>
      </div>
      <div className="mx-auto max-w-[80rem] px-4 pb-24 sm:px-6 lg:px-8">
        <ul className="grid gap-(--bento-gap) md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post._id}>
              <article className="bento-surface flex h-full flex-col gap-4 p-2">
                {post.cover ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-stage">
                    <Image
                      src={post.cover.url}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <time dateTime={post.publishedAt} className="eyebrow">
                    {formatDate(post.publishedAt)}
                  </time>
                  <Link
                    href={`/blog/${post.slug}`}
                    transitionTypes={['nav-forward']}
                    className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                  >
                    <h2 className="text-heading-4 text-balance">{post.title}</h2>
                  </Link>
                  {post.excerpt ? (
                    <p className="line-clamp-3 text-body-sm text-muted-foreground">{post.excerpt}</p>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </PageTransition>
  )
}
