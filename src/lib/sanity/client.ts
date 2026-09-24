import 'server-only'
import { createClient } from 'next-sanity'
import { env } from '@/lib/env'

export const apiVersion = '2026-09-01'

/**
 * Published content through the CDN. Pages cache the results with `"use cache"` + tags and are
 * invalidated by the Sanity webhook (NFR-PERF-06), so the CDN client is only hit on revalidation.
 */
export const sanity = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion,
  useCdn: true,
  perspective: 'published',
})

/** Drafts for Draft Mode / Visual Editing (P2.14). Viewer token, server-only. */
export const sanityPreview = sanity.withConfig({
  useCdn: false,
  token: env.SANITY_API_READ_TOKEN,
  perspective: 'drafts',
  stega: { enabled: true, studioUrl: 'https://lumira.sanity.studio' },
})

/** Editor-token client for server-side writes: price sync (P5.02) and the release publish flow (P7.12). */
export const sanityWrite = sanity.withConfig({ useCdn: false, token: env.SANITY_API_WRITE_TOKEN, perspective: 'raw' })
