import { defineArrayMember, defineField, defineType } from 'sanity'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', type: 'string' }),
    defineField({ name: 'avatar', type: 'image' }),
  ],
})

export const post = defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(90) }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({ name: 'excerpt', type: 'text', rows: 3, validation: (r) => r.max(200) }),
    defineField({ name: 'publishedAt', type: 'datetime', validation: (r) => r.required() }),
    defineField({ name: 'author', type: 'reference', to: [{ type: 'author' }] }),
    defineField({
      name: 'cover',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string' })],
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image', fields: [defineField({ name: 'alt', type: 'string' })] }),
        defineArrayMember({
          type: 'object',
          name: 'codeBlock',
          fields: [defineField({ name: 'language', type: 'string' }), defineField({ name: 'code', type: 'text' })],
        }),
      ],
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  orderings: [{ title: 'Newest', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
})

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      type: 'string',
      options: { list: ['license', 'refund-policy', 'terms', 'privacy'] },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'updatedAt', type: 'date', validation: (r) => r.required() }),
    defineField({ name: 'body', type: 'array', of: [defineArrayMember({ type: 'block' })] }),
  ],
})

export const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  description: 'Compiled into next.config.ts redirects() at build time (NFR-SEO-08)',
  fields: [
    defineField({ name: 'source', type: 'string', validation: (r) => r.required().regex(/^\//) }),
    defineField({ name: 'destination', type: 'string', validation: (r) => r.required().regex(/^(\/|https:\/\/)/) }),
    defineField({ name: 'permanent', type: 'boolean', initialValue: true }),
  ],
  preview: { select: { title: 'source', subtitle: 'destination' } },
})
