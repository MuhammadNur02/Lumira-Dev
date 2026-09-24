import { defineDocs } from 'fumadocs-mdx/macro'
import { loader } from 'fumadocs-core/source'
import { pageSchema } from 'fumadocs-core/source/schema'
import { z } from 'zod'

// Frontmatter schema (FR-DOC-02): invalid frontmatter fails the build.
const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      product: z.string(),
      access: z.enum(['public', 'licensed']).default('public'),
      since: z
        .string()
        .regex(/^\d+\.\d+\.\d+$/, 'since must be a semver like 2.1.0')
        .optional(),
      updated: z.coerce.date().optional(),
    }),
  },
})

export const source = loader({ baseUrl: '/docs', source: docs.toFumadocsSource() })

export type DocsPage = NonNullable<ReturnType<typeof source.getPage>>
