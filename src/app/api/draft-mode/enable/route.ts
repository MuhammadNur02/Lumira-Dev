import { defineEnableDraftMode } from 'next-sanity/draft-mode'
import { sanity } from '@/lib/sanity/client'
import { env } from '@/lib/env'

// Presentation tool entry point (Task.md P2.14): validates the preview secret with the viewer token.
export const { GET } = defineEnableDraftMode({ client: sanity.withConfig({ token: env.SANITY_API_READ_TOKEN }) })
