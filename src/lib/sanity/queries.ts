import { defineQuery } from 'next-sanity'

// GROQ projections. Each result shape is declared in ./models.ts.

const IMAGE = `{
  "url": asset->url,
  "alt": coalesce(alt, ""),
  "width": coalesce(asset->metadata.dimensions.width, 1600),
  "height": coalesce(asset->metadata.dimensions.height, 1000),
  "lqip": asset->metadata.lqip
}`

const SEO = `{ title, description, noindex, "ogImage": ogImage${IMAGE} }`

const STACK = `{ name, "slug": slug.current, kind, logo, version }`

const RELEASE_SUMMARY = `{ version, type, title, releasedAt, compatibility }`

/** The latest *published* (not withdrawn) release of the product in scope (FR-CL-05). */
const LATEST_RELEASE = `*[_type == "release" && product._ref == ^._id && coalesce(status, "published") != "withdrawn"]
  | order(releasedAt desc)[0]${RELEASE_SUMMARY}`

const CARD = `
  _id, name, "slug": slug.current, line, "templateType": coalesce(templateType, null), tagline,
  "hero": hero${IMAGE},
  "video": hoverVideo.asset->url,
  "stack": coalesce(stack[]->${STACK}, []),
  "capabilities": coalesce(capabilities, []),
  "priceFromCents": math::min(licenses[defined(priceCents)].priceCents),
  "inAllAccess": coalesce(inAllAccess, true),
  "popularity": coalesce(popularity, 0),
  "createdAt": _createdAt,
  "latestRelease": ${LATEST_RELEASE}
`

const CHANGELOG_ENTRY = `
  _id, version, type, releasedAt, title, summary, highlights,
  "changes": coalesce(changes[]{ kind, text, "docsPath": coalesce(docsPath, null) }, []),
  upgradeGuide, compatibility,
  "status": coalesce(status, "published"),
  "releaseId": coalesce(releaseId, null),
  "product": product->{ name, "slug": slug.current, line }
`

const LICENSES = `coalesce(licenses[]{
  tier, lsProductId, lsVariantId, priceCents, activationLimit, "rights": coalesce(rights, []), "buyUrl": coalesce(buyUrl, null)
}, [])`

export const ALL_PRODUCTS_QUERY = defineQuery(
  `*[_type == "product" && defined(slug.current)] | order(name asc) { ${CARD} }`,
)

export const PRODUCT_SLUGS_QUERY = defineQuery(`*[_type == "product" && defined(slug.current)].slug.current`)

export const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug][0]{
  ${CARD},
  description,
  "heroDark": heroDark${IMAGE},
  "features": coalesce(features[]{ eyebrow, title, body, icon, size }, []),
  fileTree,
  "faq": coalesce(faq[]->{ _id, question, answer }, []),
  "licenses": ${LICENSES},
  "demo": demo{
    origin,
    "pages": coalesce(pages[]{ label, path }, []),
    "supportsTheme": coalesce(supportsTheme, false),
    "gallery": coalesce(gallery[]{ ...${IMAGE}, device }, []),
    lighthouse
  },
  "components": coalesce(components[]{ name, title, description, code }, []),
  "related": coalesce(related[]->{ ${CARD} }, []),
  "recentReleases": *[_type == "release" && product._ref == ^._id] | order(releasedAt desc)[0...3]{ ${CHANGELOG_ENTRY} },
  "seo": seo${SEO}
}`)

export const PRODUCT_MIRROR_QUERY = defineQuery(`*[_type == "product" && _id == $id][0]{
  _id, name, "slug": slug.current, line, "inAllAccess": coalesce(inAllAccess, true), "licenses": ${LICENSES}
}`)

export const CHANGELOG_QUERY =
  defineQuery(`*[_type == "release" && defined(product) && (!defined($product) || product->slug.current == $product)]
  | order(releasedAt desc) { ${CHANGELOG_ENTRY} }`)

const TILE = `
  _key, kind, cols, rows, hero, eyebrow, title, body, href, snippet,
  "product": product->{ ${CARD} },
  "testimonial": testimonial->{ _id, quote, name, role, company, "avatar": avatar${IMAGE} },
  stat,
  "video": video.asset->url,
  "poster": poster${IMAGE}
`

export const HOME_QUERY = defineQuery(`*[_type == "homePage"][0]{
  hero,
  "bands": coalesce(bands[]{ _key, preset, rows, "tiles": coalesce(tiles[]{ ${TILE}, "stack": stack[]{ ${TILE} } }, []) }, []),
  "previewTeaser": previewTeaser{ title, body, "video": video.asset->url, "poster": poster${IMAGE}, "product": product->{ ${CARD} } },
  "testimonials": coalesce(testimonials[]->{ _id, quote, name, role, company, "avatar": avatar${IMAGE} }, []),
  "faq": coalesce(faq[]->{ _id, question, answer }, []),
  closingCta,
  "seo": seo${SEO}
}`)

export const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0]{
  promoBanner,
  "affiliate": { "commissionRate": coalesce(affiliate.commissionRate, 30), "cookieDays": coalesce(affiliate.cookieDays, 30), "payoutNote": affiliate.payoutNote },
  "allAccess": allAccess{ lsProductId, monthly, yearly, activationLimit, "perks": coalesce(perks, []) },
  "social": coalesce(social, []),
  "supportEmail": coalesce(supportEmail, "support@lumira.dev"),
  statusUrl
}`)

export const BUNDLES_QUERY = defineQuery(`*[_type == "bundle" && defined(slug.current)] | order(name asc){
  _id, name, "slug": slug.current, tagline, "hero": hero${IMAGE}, "tier": coalesce(tier, "team"),
  lsProductId, lsVariantId, priceCents, "buyUrl": coalesce(buyUrl, null),
  "includes": includes[]->{ ${CARD}, "licenses": ${LICENSES} },
  "seo": seo${SEO}
}`)

export const POSTS_QUERY = defineQuery(`*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
  _id, title, "slug": slug.current, excerpt, publishedAt, "cover": cover${IMAGE}, "author": author->{ name, role }
}`)

export const POST_QUERY = defineQuery(`*[_type == "post" && slug.current == $slug][0]{
  _id, title, "slug": slug.current, excerpt, publishedAt, "cover": cover${IMAGE}, "author": author->{ name, role },
  body, "seo": seo${SEO}
}`)

export const LEGAL_PAGE_QUERY = defineQuery(
  `*[_type == "legalPage" && slug == $slug][0]{ title, slug, updatedAt, body }`,
)

export const REDIRECTS_QUERY = defineQuery(`*[_type == "redirect" && defined(source) && defined(destination)]{
  source, destination, "permanent": coalesce(permanent, true)
}`)
