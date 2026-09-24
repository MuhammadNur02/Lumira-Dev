import 'server-only'
import { GetObjectCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { cacheLife, cacheTag } from 'next/cache'
import { env } from '@/lib/env'

// Pre-signing works only on the S3 API domain, never on a custom domain (PRD §6.4).
const endpoint = () => `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// Newer AWS SDK versions add default CRC32 checksums that break pre-signed PUT/UploadPart on R2.
const compat = { requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' } as const

let read: S3Client | null = null
let write: S3Client | null = null

/** Read-only token: signs download URLs and reads registry items (NFR-SEC-04). */
export function r2Read() {
  return (read ??= new S3Client({
    region: 'auto',
    endpoint: endpoint(),
    ...compat,
    credentials: { accessKeyId: env.R2_READ_ACCESS_KEY_ID, secretAccessKey: env.R2_READ_SECRET_ACCESS_KEY },
  }))
}

/** Read-write token: admin multipart uploads only. */
export function r2Write() {
  return (write ??= new S3Client({
    region: 'auto',
    endpoint: endpoint(),
    ...compat,
    credentials: { accessKeyId: env.R2_WRITE_ACCESS_KEY_ID, secretAccessKey: env.R2_WRITE_SECRET_ACCESS_KEY },
  }))
}

/** Pre-signed GET (FR-DL-03): 300 s by default, forced download, never cached by intermediaries. */
export function presignDownload(key: string, filename: string, expiresIn = 300) {
  return getSignedUrl(
    r2Read(),
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
      ResponseCacheControl: 'private, no-store',
    }),
    { expiresIn },
  )
}

export async function r2GetText(key: string) {
  const res = await r2Read().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }))
  if (!res.Body) throw new Error(`R2 object ${key} has no body`)
  return res.Body.transformToString()
}

export type RegistryIndex = Record<string, { productId: string; key: string }>

/** `registry/index.json` written by the UI-kit release pipeline (P5.14): item name → product + object key. */
export async function getRegistryIndex(): Promise<RegistryIndex> {
  'use cache'
  cacheLife('hours')
  cacheTag('registry')
  try {
    return JSON.parse(await r2GetText('registry/index.json')) as RegistryIndex
  } catch {
    return {}
  }
}

/** Health probe (P7.13, NFR-OPS-05). */
export async function r2Healthy(client: 'read' | 'write' = 'read') {
  try {
    await (client === 'read' ? r2Read() : r2Write()).send(new HeadBucketCommand({ Bucket: env.R2_BUCKET }))
    return true
  } catch {
    return false
  }
}
