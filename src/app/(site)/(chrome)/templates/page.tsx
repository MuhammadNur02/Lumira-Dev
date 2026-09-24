import { CatalogView } from '../_catalog/catalog-view'
import { catalogMetadata } from '../_catalog/metadata'

const META = {
  title: 'Website templates',
  description: 'Portfolio, landing page, documentation and blog templates. Drive each one live at every device width.',
  path: '/templates',
}

export function generateMetadata({ searchParams }: PageProps<'/templates'>) {
  return catalogMetadata(searchParams, META)
}

export default function TemplatesPage({ searchParams }: PageProps<'/templates'>) {
  return (
    <CatalogView
      line="template"
      eyebrow="Website templates"
      title="Look finished on day one."
      lead="Portfolio, landing, docs and blog templates with real content models, dark mode and page transitions."
      searchParams={searchParams}
    />
  )
}
