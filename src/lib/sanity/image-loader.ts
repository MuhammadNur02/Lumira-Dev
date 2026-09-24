'use client'
import type { ImageLoaderProps } from 'next/image'

/**
 * Global `next/image` loader (next.config.ts `images.loaderFile`). Sanity's image pipeline resizes
 * and negotiates AVIF/WebP (`auto=format`), so images never pass through the Vercel optimizer
 * (NFR-PERF-02). Local fixture art and other hosts are served as-is.
 */
export default function sanityLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.startsWith('https://cdn.sanity.io/')) return src
  const url = new URL(src)
  url.searchParams.set('w', String(width))
  url.searchParams.set('q', String(quality ?? 70))
  url.searchParams.set('auto', 'format')
  url.searchParams.set('fit', 'max')
  return url.toString()
}
