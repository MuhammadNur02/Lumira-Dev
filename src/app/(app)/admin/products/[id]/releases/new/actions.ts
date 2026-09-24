'use server'

import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import semver from 'semver'
import { z } from 'zod'
import { db } from '@/db/client'
import { releases } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { env } from '@/lib/env'
import { r2Write } from '@/lib/r2'
import { withAudit } from '@/server/admin/audit'
import { assertNewerThanLatest, getProductOrThrow } from '@/server/catalog'

const MiB = 1024 * 1024
const Bucket = () => env.R2_BUCKET
const Key = z.string().regex(/^products\/[^/]+\/releases\/[0-9A-Za-z.+-]+\/[^/]+\.zip$/)

/**
 * FR-AD-52 step 1: validate semver (must exceed the latest) and open a multipart upload.
 * R2 requires every part except the last to be the same size, with at most 10,000 parts.
 */
export async function createUpload(raw: { productId: string; version: string; size: number }) {
  await requireAdmin()
  const { productId, version, size } = z
    .object({
      productId: z.string().min(1),
      version: z
        .string()
        .refine((v) => semver.valid(v) !== null && semver.clean(v) === v, 'Use plain semver, e.g. 2.4.0'),
      size: z
        .number()
        .int()
        .positive()
        .max(5 * 1024 * MiB),
    })
    .parse(raw)
  const product = await getProductOrThrow(productId)
  await assertNewerThanLatest(productId, version)
  const partSize = Math.max(16 * MiB, Math.ceil(size / 10_000 / MiB) * MiB)
  const key = `products/${productId}/releases/${version}/${product.slug}-${version}.zip`
  const { UploadId } = await r2Write().send(
    new CreateMultipartUploadCommand({ Bucket: Bucket(), Key: key, ContentType: 'application/zip' }),
  )
  return { key, uploadId: UploadId!, partSize, partCount: Math.ceil(size / partSize) }
}

/** Pre-signed `UploadPart` URLs (1 h), requested in small batches as lanes need them. */
export async function signParts(raw: { key: string; uploadId: string; partNumbers: number[] }) {
  await requireAdmin()
  const { key, uploadId, partNumbers } = z
    .object({
      key: Key,
      uploadId: z.string().min(1),
      partNumbers: z.array(z.number().int().min(1).max(10_000)).min(1).max(50),
    })
    .parse(raw)
  return Promise.all(
    partNumbers.map(async (PartNumber) => ({
      partNumber: PartNumber,
      url: await getSignedUrl(
        r2Write(),
        new UploadPartCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId, PartNumber }),
        { expiresIn: 3600 },
      ),
    })),
  )
}

/** FR-AD-53: complete → HeadObject size check → checksum stored → draft release row. */
export async function completeUpload(raw: {
  productId: string
  version: string
  key: string
  uploadId: string
  size: number
  sha256: string
  parts: { PartNumber: number; ETag: string }[]
}) {
  const input = z
    .object({
      productId: z.string().min(1),
      version: z.string().refine((v) => semver.valid(v) !== null),
      key: Key,
      uploadId: z.string().min(1),
      size: z.number().int().positive(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
      parts: z.array(z.object({ PartNumber: z.number().int().min(1), ETag: z.string().min(1) })).min(1),
    })
    .parse(raw)
  return withAudit({ action: 'release.uploaded', targetType: 'release', targetId: input.key }, async () => {
    await assertNewerThanLatest(input.productId, input.version)
    await r2Write().send(
      new CompleteMultipartUploadCommand({
        Bucket: Bucket(),
        Key: input.key,
        UploadId: input.uploadId,
        MultipartUpload: { Parts: [...input.parts].sort((a, b) => a.PartNumber - b.PartNumber) },
      }),
    )
    const head = await r2Write().send(new HeadObjectCommand({ Bucket: Bucket(), Key: input.key }))
    if (head.ContentLength !== input.size) throw new Error('Uploaded size does not match the local file')
    const v = semver.parse(input.version)!
    const [release] = await db
      .insert(releases)
      .values({
        productId: input.productId,
        semver: input.version,
        major: v.major,
        minor: v.minor,
        patch: v.patch,
        r2Key: input.key,
        sizeBytes: input.size,
        sha256: input.sha256,
        status: 'draft',
        createdBy: (await requireAdmin()).userId,
      })
      .returning({ id: releases.id, semver: releases.semver })
    return release!
  })
}

/** Cancel or failure: abort so R2 frees the parts (the bucket lifecycle rule is the backstop). */
export async function abortUpload(raw: { key: string; uploadId: string }) {
  await requireAdmin()
  const { key, uploadId } = z.object({ key: Key, uploadId: z.string().min(1) }).parse(raw)
  await r2Write().send(new AbortMultipartUploadCommand({ Bucket: Bucket(), Key: key, UploadId: uploadId }))
}
