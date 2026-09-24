import { CatalogView } from '../_catalog/catalog-view'
import { catalogMetadata } from '../_catalog/metadata'

const META = {
  title: 'UI component libraries',
  description: 'Marketing and dashboard blocks for shadcn/ui, installed from a license-gated registry.',
  path: '/ui-kits',
}

export function generateMetadata({ searchParams }: PageProps<'/ui-kits'>) {
  return catalogMetadata(searchParams, META)
}

export default function UiKitsPage({ searchParams }: PageProps<'/ui-kits'>) {
  return (
    <CatalogView
      line="ui_kit"
      eyebrow="UI component libraries"
      title="Blocks you install, then own."
      lead="Every component reads your tokens and ships light and dark. Add any block with the shadcn CLI and your license key."
      searchParams={searchParams}
    />
  )
}
