/// <reference lib="webworker" />
// Streaming SHA-256 for multi-GB release zips (FR-AD-52): constant memory, reports progress.
import { createSHA256 } from 'hash-wasm'

self.onmessage = async (event: MessageEvent<File>) => {
  try {
    const hasher = await createSHA256()
    hasher.init()
    const reader = event.data.stream().getReader()
    let hashed = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      hasher.update(value)
      hashed += value.byteLength
      self.postMessage({ type: 'progress', bytes: hashed })
    }
    self.postMessage({ type: 'done', digest: hasher.digest('hex') })
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Hashing failed' })
  }
}
