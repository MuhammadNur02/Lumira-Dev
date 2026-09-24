import { Suspense } from 'react'
import { Rss } from 'lucide-react'
import { ChangelogEntry, KIND_LABEL } from '@/components/lumira/changelog-entry'
import { ChangelogFilter } from '@/components/lumira/changelog-filter'
import { SectionHeader } from '@/components/lumira/section-header'
import { PageTransition } from '@/components/motion/page-transition'
import { formatMonth } from '@/lib/format'
import { getChangelog } from '@/lib/sanity/fetchers'
import type { ChangeKind, ChangelogEntry as Entry } from '@/lib/sanity/models'
import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  title: 'Changelog',
  description: 'Every release of every Lumira asset: versions, highlights, breaking changes and upgrade guides.',
  path: '/changelog',
})

function byMonth(entries: Entry[]) {
  const groups = new Map<string, Entry[]>()
  for (const e of entries) {
    const key = e.releasedAt.slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  return [...groups]
}

/** Global changelog (FR-CL-02): reverse-chronological, grouped by month, indexable, with an Atom feed. */
export default async function ChangelogPage() {
  const entries = await getChangelog()
  const products = [...new Map(entries.map((e) => [e.product.slug, e.product.name])).entries()].map(([slug, name]) => ({
    slug,
    name,
  }))
  const kinds = (Object.keys(KIND_LABEL) as ChangeKind[])
    .filter((k) => entries.some((e) => e.changes.some((c) => c.kind === k)))
    .map((value) => ({ value, label: KIND_LABEL[value] }))

  return (
    <PageTransition>
      <div className="hero-glow">
        <div className="mx-auto flex max-w-[56rem] flex-col gap-8 px-4 pt-16 pb-8 sm:px-6 lg:pt-24">
          <SectionHeader
            as="h1"
            eyebrow="Changelog"
            title="What shipped, and when."
            lead="Every release across the catalog. Buyers get every release within their major version; All-Access members get all of them."
          >
            <a
              href="/changelog/feed.xml"
              className="inline-flex w-fit items-center gap-1.5 text-caption text-brand-text hover:underline"
            >
              <Rss className="size-3.5" aria-hidden /> Atom feed
            </a>
          </SectionHeader>
          <Suspense fallback={<div className="h-8" aria-hidden />}>
            <ChangelogFilter products={products} kinds={kinds} />
          </Suspense>
        </div>
      </div>
      <div className="mx-auto flex max-w-[56rem] flex-col gap-12 px-4 pb-24 sm:px-6">
        {byMonth(entries).map(([month, items]) => (
          <section key={month} data-month={month} className="flex flex-col gap-4">
            <h2 className="sticky top-16 z-10 w-fit rounded-full bg-background py-1 pr-2 eyebrow">
              {formatMonth(`${month}-01T00:00:00Z`)}
            </h2>
            <ol className="flex flex-col gap-(--bento-gap)">
              {items.map((entry) => (
                <ChangelogEntry key={entry._id} entry={entry} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </PageTransition>
  )
}
