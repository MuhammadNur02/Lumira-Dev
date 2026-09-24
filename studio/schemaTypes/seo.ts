import { defineField, defineType } from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.max(60).warning('Titles over 60 characters get truncated'),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      validation: (r) => r.max(155).warning('Keep descriptions under 155 characters'),
    }),
    defineField({ name: 'ogImage', type: 'image', description: 'Overrides the generated OG image (1200 × 630)' }),
    defineField({ name: 'noindex', type: 'boolean', initialValue: false }),
  ],
})
