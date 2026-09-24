import {
  abortUpload,
  completeUpload,
  createUpload,
  signParts,
} from '@/app/(app)/admin/products/[id]/releases/new/actions'

export type UploadProgress = { uploaded: number; hashed: number }

const LANES = 4
const RETRIES = 3

/**
 * Direct-to-R2 multipart upload (FR-AD-52, Task.md P7.11): the file never passes through our
 * functions. SHA-256 is computed in a Web Worker in parallel; 4 parts in flight; each part retries
 * 3 times with backoff; any failure or cancel aborts the multipart upload.
 */
export async function uploadRelease(
  file: File,
  productId: string,
  version: string,
  onProgress: (p: UploadProgress) => void,
  signal: AbortSignal,
) {
  const progress: UploadProgress = { uploaded: 0, hashed: 0 }
  const worker = new Worker(new URL('../../../workers/sha256.worker.ts', import.meta.url), { type: 'module' })
  const hashing = new Promise<string>((resolve, reject) => {
    worker.onmessage = (
      e: MessageEvent<
        { type: 'progress'; bytes: number } | { type: 'done'; digest: string } | { type: 'error'; message: string }
      >,
    ) => {
      if (e.data.type === 'progress') {
        progress.hashed = e.data.bytes
        onProgress({ ...progress })
      } else if (e.data.type === 'done') {
        resolve(e.data.digest)
        worker.terminate()
      } else {
        reject(new Error(e.data.message))
        worker.terminate()
      }
    }
  })
  worker.postMessage(file) // hashes in parallel with the upload

  const { key, uploadId, partSize, partCount } = await createUpload({ productId, version, size: file.size })
  const queue = Array.from({ length: partCount }, (_, i) => i + 1)
  const parts: { PartNumber: number; ETag: string }[] = []

  async function lane() {
    for (let partNumber = queue.shift(); partNumber !== undefined; partNumber = queue.shift()) {
      const blob = file.slice((partNumber - 1) * partSize, Math.min(partNumber * partSize, file.size))
      for (let attempt = 0; ; attempt++) {
        try {
          if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError')
          // Signed per attempt: a URL can expire during long retries on slow links.
          const [signed] = await signParts({ key, uploadId, partNumbers: [partNumber] })
          const res = await fetch(signed!.url, { method: 'PUT', body: blob, signal })
          if (!res.ok) throw new Error(`Part ${partNumber}: HTTP ${res.status}`)
          const etag = res.headers.get('ETag')
          if (!etag) throw new Error('R2 did not expose the ETag header. Add ETag to the bucket CORS ExposeHeaders.')
          parts.push({ PartNumber: partNumber, ETag: etag })
          progress.uploaded += blob.size
          onProgress({ ...progress })
          break
        } catch (error) {
          if (signal.aborted || attempt === RETRIES - 1) throw error
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
        }
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(LANES, partCount) }, lane))
    return await completeUpload({ productId, version, key, uploadId, size: file.size, sha256: await hashing, parts })
  } catch (error) {
    worker.terminate()
    await abortUpload({ key, uploadId }).catch(() => undefined)
    throw error
  }
}
