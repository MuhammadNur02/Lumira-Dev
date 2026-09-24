import { notFound } from 'next/navigation'
import { TEMPLATE_TYPES } from '@/lib/catalog-params'
import type { TemplateType } from '@/lib/sanity/models'
import { CatalogView } from '../../_catalog/catalog-view'
import { catalogMetadata } from '../../_catalog/metadata'

const COPY: Record<TemplateType, { title: string; lead: string; description: string }> = {
  portfolio: {
    title: 'Portfolio templates',
    lead: 'Case studies first: full-bleed media, a calm index and transitions that carry the work between pages.',
    description: 'Portfolio templates for designers and developers, with case studies in MDX.',
  },
  landing: {
    title: 'Landing page templates',
    lead: 'Launch pages with waitlists, pricing and changelog sections built to convert.',
    description: 'Landing page templates with waitlist, pricing and changelog sections.',
  },
  docs: {
    title: 'Documentation templates',
    lead: 'Docs readers trust: instant search, API tables and code blocks with copy buttons.',
    description: 'Documentation site templates with search, API pages and versioned sidebars.',
  },
  blog: {
    title: 'Blog templates',
    lead: 'Typography-first blogs with RSS, tags and reading time.',
    description: 'Blog templates with RSS, tags and a typography-first layout.',
  },
}

const isType = (t: string): t is TemplateType => (TEMPLATE_TYPES as readonly string[]).includes(t)

export function generateStaticParams() {
  return TEMPLATE_TYPES.map((type) => ({ type }))
}

export async function generateMetadata({ params, searchParams }: PageProps<'/templates/[type]'>) {
  const { type } = await params
  if (!isType(type)) notFound()
  return catalogMetadata(searchParams, {
    title: COPY[type].title,
    description: COPY[type].description,
    path: `/templates/${type}`,
  })
}

export default async function TemplateTypePage({ params, searchParams }: PageProps<'/templates/[type]'>) {
  const { type } = await params
  if (!isType(type)) notFound()
  return (
    <CatalogView
      line="template"
      fixedType={type}
      eyebrow="Website templates"
      title={COPY[type].title}
      lead={COPY[type].lead}
      searchParams={searchParams}
    />
  )
}
