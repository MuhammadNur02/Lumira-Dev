import Link from 'next/link'
import type { Route } from 'next'
import { notFound } from 'next/navigation'
import { ArrowUpRight, Rocket, UploadCloud } from 'lucide-react'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { CopyButton } from '@/components/lumira/copy-button'
import { VersionPill } from '@/components/lumira/version-pill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireAdmin } from '@/lib/auth'
import { env } from '@/lib/env'
import { formatBytes, formatDate, LINE_LABEL } from '@/lib/format'
import { productReleases } from '@/server/admin/queries'
import { getProductOrThrow } from '@/server/catalog'
import { DeleteReleaseButton, YankReleaseButton } from '../product-actions'

export const metadata = { title: 'Product' }

const TONE = { published: 'success', draft: 'info', yanked: 'neutral' } as const

export default async function ProductPage({ params }: PageProps<'/admin/products/[id]'>) {
  await requireAdmin()
  const id = decodeURIComponent((await params).id)
  const product = await getProductOrThrow(id).catch(() => null)
  if (!product) notFound()
  const list = await productReleases(product.id)
  const base = `/admin/products/${encodeURIComponent(product.id)}`

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`${LINE_LABEL[product.line]} · /${product.slug} · Sanity id ${product.id}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <a
                href={`${env.SANITY_STUDIO_URL}/structure/product;${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Edit in Studio <ArrowUpRight aria-hidden />
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href={`${base}/releases/new` as Route}>
                <UploadCloud aria-hidden /> Upload release
              </Link>
            </Button>
          </>
        }
      />
      <Panel
        title="Releases"
        description="Newest first. Releases are immutable; yank to withdraw."
        bodyClassName="-mx-5 md:-mx-6"
      >
        {list.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 md:pl-6">Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>SHA-256</TableHead>
                  <TableHead className="pr-5 text-right md:pr-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id} className="h-11">
                    <TableCell className="pl-5 md:pl-6">
                      <VersionPill version={r.semver} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={TONE[r.status]}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.publishedAt ? formatDate(r.publishedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatBytes(r.sizeBytes)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <code className="font-mono text-caption text-muted-foreground">{r.sha256.slice(0, 12)}…</code>
                        <CopyButton
                          value={r.sha256}
                          label={`Copy SHA-256 for v${r.semver}`}
                          copiedLabel="Checksum copied"
                          className="size-7"
                        />
                      </span>
                    </TableCell>
                    <TableCell className="pr-5 md:pr-6">
                      <div className="flex justify-end gap-0.5">
                        {r.status === 'draft' ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`${base}/releases/${r.id}/publish` as Route}>
                              <Rocket aria-hidden /> Publish
                            </Link>
                          </Button>
                        ) : null}
                        {r.status === 'published' ? <YankReleaseButton id={r.id} version={r.semver} /> : null}
                        <DeleteReleaseButton id={r.id} version={r.semver} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="px-5 text-body-sm text-muted-foreground md:px-6">No releases yet. Upload the first zip.</p>
        )}
      </Panel>
    </>
  )
}
