import { defineArrayMember, defineField, defineType } from 'sanity'

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/

export const release = defineType({
  name: 'release',
  title: 'Release',
  type: 'document',
  fields: [
    defineField({ name: 'product', type: 'reference', to: [{ type: 'product' }], validation: (r) => r.required() }),
    defineField({ name: 'version', type: 'string', validation: (r) => r.required().regex(SEMVER, { name: 'semver' }) }),
    defineField({
      name: 'type',
      type: 'string',
      options: { list: ['major', 'minor', 'patch'], layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'releasedAt', type: 'datetime', validation: (r) => r.required() }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(80) }),
    defineField({ name: 'summary', type: 'text', rows: 3, validation: (r) => r.required().max(280) }),
    defineField({
      name: 'highlights',
      type: 'array',
      of: [defineArrayMember({ type: 'block' }), defineArrayMember({ type: 'image' })],
    }),
    defineField({
      name: 'changes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'change',
          fields: [
            defineField({
              name: 'kind',
              type: 'string',
              options: { list: ['added', 'improved', 'fixed', 'removed', 'deprecated', 'security', 'breaking'] },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'text', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'docsPath', type: 'string', validation: (r) => r.regex(/^\/docs\//) }),
          ],
          preview: { select: { title: 'text', subtitle: 'kind' } },
        }),
      ],
    }),
    defineField({
      name: 'upgradeGuide',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
      validation: (r) =>
        r.custom((value, ctx) =>
          ctx.document?.type === 'major' && !(value as unknown[] | undefined)?.length
            ? 'Major releases need an upgrade guide'
            : true,
        ),
    }),
    defineField({
      name: 'compatibility',
      type: 'object',
      fields: ['next', 'react', 'tailwind', 'node'].map((name) => defineField({ name, type: 'string' })),
    }),
    defineField({
      name: 'releaseId',
      type: 'string',
      readOnly: true,
      description: 'Postgres releases.id (written by the admin publish flow)',
    }),
    defineField({
      name: 'status',
      type: 'string',
      readOnly: true,
      options: { list: ['published', 'withdrawn'] },
      initialValue: 'published',
      description: 'Set to "withdrawn" by the admin yank flow; withdrawn releases stay in history (FR-CL-07)',
    }),
  ],
  orderings: [{ title: 'Newest', name: 'releasedAtDesc', by: [{ field: 'releasedAt', direction: 'desc' }] }],
  preview: {
    select: { version: 'version', product: 'product.name' },
    prepare: ({ version, product }) => ({ title: `v${version}`, subtitle: product }),
  },
})
