import { CatalogView } from '../_catalog/catalog-view'
import { catalogMetadata } from '../_catalog/metadata'

const META = {
  title: 'SaaS boilerplates',
  description: 'Next.js SaaS foundations with auth, billing and multi-tenancy already wired. Try each one live.',
  path: '/boilerplates',
}

export function generateMetadata({ searchParams }: PageProps<'/boilerplates'>) {
  return catalogMetadata(searchParams, META)
}

export default function BoilerplatesPage({ searchParams }: PageProps<'/boilerplates'>) {
  return (
    <CatalogView
      line="boilerplate"
      eyebrow="SaaS boilerplates"
      title="Start from code you would have written yourself."
      lead="Auth, billing, multi-tenancy and an admin console, typed end to end. Activate each project with one command."
      searchParams={searchParams}
    />
  )
}
