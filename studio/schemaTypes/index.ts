import { bundle } from './bundle'
import { category } from './category'
import { author, legalPage, post, redirect } from './editorial'
import { faq } from './faq'
import { featureTile } from './featureTile'
import { bentoTile, homePage } from './homePage'
import { product } from './product'
import { release } from './release'
import { seo } from './seo'
import { siteSettings } from './siteSettings'
import { techStack } from './techStack'
import { testimonial } from './testimonial'

export const schemaTypes = [
  // documents
  product,
  release,
  bundle,
  category,
  techStack,
  faq,
  testimonial,
  homePage,
  siteSettings,
  post,
  author,
  legalPage,
  redirect,
  // objects
  seo,
  featureTile,
  bentoTile,
]

/** Documents with exactly one instance, pinned in the desk and never created or deleted. */
export const SINGLETONS = ['homePage', 'siteSettings'] as const
