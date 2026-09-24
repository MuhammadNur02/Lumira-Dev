import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/lumira/error-state'
import { ProductGrid } from '@/components/lumira/product-grid'
import { getCatalog } from '@/lib/sanity/fetchers'

/** Unknown product or page (PRD Stage 1.3): branded 404 with three popular picks. */
export default async function NotFound() {
  const popular = (await getCatalog({ sort: 'popular' })).slice(0, 3)
  return (
    <ErrorState
      code="404"
      title="This page moved, or never existed."
      body="The link may be out of date. Browse the catalog or search with ⌘K."
      actions={
        <>
          <Button size="lg" asChild>
            <Link href="/">Back to the store</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/templates">Browse templates</Link>
          </Button>
        </>
      }
    >
      {popular.length ? (
        <div className="mt-12 w-full">
          <h2 className="mb-6 eyebrow">Popular right now</h2>
          <ProductGrid products={popular} />
        </div>
      ) : null}
    </ErrorState>
  )
}
