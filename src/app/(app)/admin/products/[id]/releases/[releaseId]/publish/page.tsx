import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { PublishForm } from '@/components/admin/release-uploader/publish-form'
import { db } from '@/db/client'
import { products, releases } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

export const metadata = { title: 'Publish release' }

export default async function PublishReleasePage({
  params,
}: PageProps<'/admin/products/[id]/releases/[releaseId]/publish'>) {
  await requireAdmin()
  const { id, releaseId } = await params
  const rid = z.uuid().safeParse(releaseId)
  if (!rid.success) notFound()
  const productId = decodeURIComponent(id)
  const [row] = await db
    .select({ release: releases, product: products })
    .from(releases)
    .innerJoin(products, eq(products.id, releases.productId))
    .where(and(eq(releases.id, rid.data), eq(releases.productId, productId)))
    .limit(1)
  if (!row || row.release.status !== 'draft') notFound()
  return (
    <>
      <AdminPageHeader
        title={`Publish ${row.product.name} v${row.release.semver}`}
        description="Writes the Sanity release, marks it published and optionally emails eligible owners."
      />
      <Panel className="max-w-3xl">
        <PublishForm
          releaseId={row.release.id}
          version={row.release.semver}
          productName={row.product.name}
          backHref={`/admin/products/${encodeURIComponent(productId)}`}
        />
      </Panel>
    </>
  )
}
