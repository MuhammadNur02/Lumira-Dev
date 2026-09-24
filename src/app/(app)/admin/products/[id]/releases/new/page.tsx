import { notFound } from 'next/navigation'
import semver from 'semver'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { ReleaseUploader } from '@/components/admin/release-uploader/release-uploader'
import { requireAdmin } from '@/lib/auth'
import { productReleases } from '@/server/admin/queries'
import { getProductOrThrow } from '@/server/catalog'

export const metadata = { title: 'Upload release' }

export default async function NewReleasePage({ params }: PageProps<'/admin/products/[id]/releases/new'>) {
  await requireAdmin()
  const product = await getProductOrThrow(decodeURIComponent((await params).id)).catch(() => null)
  if (!product) notFound()
  const latest = (await productReleases(product.id)).map((r) => r.semver).sort(semver.rcompare)[0]
  const suggested = latest ? (semver.inc(latest, 'minor') ?? '') : '1.0.0'
  return (
    <>
      <AdminPageHeader
        title={`Upload a ${product.name} release`}
        description="The zip goes straight from this browser to private R2 in 16 MiB parts; the SHA-256 is computed locally and verified before the release is recorded."
      />
      <Panel className="max-w-3xl">
        <ReleaseUploader productId={product.id} productName={product.name} suggestedVersion={suggested} />
      </Panel>
    </>
  )
}
