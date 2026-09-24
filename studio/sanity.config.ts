import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { defineDocuments, defineLocations, presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'
import { SINGLETONS, schemaTypes } from './schemaTypes'
import { structure } from './structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? 'replace-me'
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'
const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_ORIGIN ?? 'https://lumira.dev'

const singletons = new Set<string>(SINGLETONS)

export default defineConfig({
  name: 'lumira',
  title: 'Lumira',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure }),
    presentationTool({
      previewUrl: { origin: previewOrigin, previewMode: { enable: '/api/draft-mode/enable' } },
      resolve: {
        mainDocuments: defineDocuments([
          { route: '/', filter: `_type == "homePage"` },
          { route: '/products/:slug', filter: `_type == "product" && slug.current == $slug` },
          { route: '/bundles/:slug', filter: `_type == "bundle" && slug.current == $slug` },
          { route: '/blog/:slug', filter: `_type == "post" && slug.current == $slug` },
        ]),
        locations: {
          product: defineLocations({
            select: { title: 'name', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [
                { title: doc?.title ?? 'Product', href: `/products/${doc?.slug}` },
                { title: 'Changelog', href: `/products/${doc?.slug}/changelog` },
              ],
            }),
          }),
          release: defineLocations({
            select: { version: 'version', product: 'product.slug.current' },
            resolve: (doc) => ({
              locations: [
                { title: `v${doc?.version}`, href: `/products/${doc?.product}/changelog` },
                { title: 'Changelog', href: '/changelog' },
              ],
            }),
          }),
          bundle: defineLocations({
            select: { title: 'name', slug: 'slug.current' },
            resolve: (doc) => ({ locations: [{ title: doc?.title ?? 'Bundle', href: `/bundles/${doc?.slug}` }] }),
          }),
          post: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({ locations: [{ title: doc?.title ?? 'Post', href: `/blog/${doc?.slug}` }] }),
          }),
        },
      },
    }),
    visionTool({ defaultApiVersion: '2026-09-01' }),
  ],
  schema: {
    types: schemaTypes,
    // Singletons can't be created from "New document".
    templates: (templates) => templates.filter(({ schemaType }) => !singletons.has(schemaType)),
  },
  document: {
    // …nor duplicated or deleted.
    actions: (input, context) =>
      singletons.has(context.schemaType)
        ? input.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : input,
  },
})
