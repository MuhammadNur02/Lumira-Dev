import 'server-only'
import { allAccessOption, licenseOptions } from '@/components/commerce/purchase'
import { highlight } from '@/lib/highlight'
import { getProduct, getSiteSettings } from '@/lib/sanity/fetchers'
import type { PlaygroundEntry, PreviewPricing, PreviewProduct } from './types'

const PLAYGROUND_LINES = 30

/** Serializable player props from the cached catalog. Null when the product has no demo. */
export async function loadPreview(
  slug: string,
): Promise<{ product: PreviewProduct; pricing: PreviewPricing; playground: PlaygroundEntry[] } | null> {
  const [product, settings] = await Promise.all([getProduct(slug), getSiteSettings()])
  if (!product?.demo?.origin) return null

  const playground: PlaygroundEntry[] =
    product.line === 'ui_kit'
      ? await Promise.all(
          product.components.map(async (c) => {
            const lines = c.code?.split('\n') ?? []
            return {
              name: c.name,
              title: c.title,
              description: c.description,
              truncated: lines.length > PLAYGROUND_LINES,
              codeHtml: c.code ? await highlight(lines.slice(0, PLAYGROUND_LINES).join('\n'), 'tsx') : null,
            }
          }),
        )
      : []

  return {
    product: {
      slug: product.slug,
      name: product.name,
      line: product.line,
      version: product.latestRelease?.version ?? null,
      heroUrl: product.hero.url,
      demo: {
        origin: product.demo.origin,
        pages: product.demo.pages.length ? product.demo.pages : [{ label: 'Home', path: '/' }],
        supportsTheme: product.demo.supportsTheme,
        gallery: product.demo.gallery,
      },
    },
    pricing: {
      options: licenseOptions(product.licenses),
      allAccess: product.inAllAccess ? allAccessOption(settings.allAccess) : null,
    },
    playground,
  }
}
